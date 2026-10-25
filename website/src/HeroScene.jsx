import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

const ASSET_ROOT = '/assets/hero-motion/';
const MODEL_URL = `${ASSET_ROOT}EW26_Hero_251207v3_compressed-optimized.glb`;
const PAINTING_URL = `${ASSET_ROOT}Hero-bg-hires-optimized.ktx2`;
const STATE_URL = `${ASSET_ROOT}HeroScene.theatre-project-state_15.json`;
const ENVIRONMENT_URL = `${ASSET_ROOT}studio_small_09_1k.pmrem.ktx2`;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

// The animation state is data, not executable source. Read the authored cubic
// curves directly so the component does not need the original app or Theatre.
function cubic(a, b, t) {
  const s = 1 - t;
  return 3 * s * s * t * a + 3 * s * t * t * b + t * t * t;
}

function sampleTrack(keyframes, time, fallback) {
  if (!keyframes?.length) return fallback;
  if (time <= keyframes[0].position) return keyframes[0].value;
  const last = keyframes[keyframes.length - 1];
  if (time >= last.position) return last.value;
  let left = keyframes[0];
  let right = last;
  for (let index = 1; index < keyframes.length; index += 1) {
    if (time === keyframes[index].position) return keyframes[index].value;
    if (time <= keyframes[index].position) {
      right = keyframes[index];
      left = keyframes[index - 1];
      break;
    }
  }
  if (!left.connectedRight || typeof left.value !== 'number') return left.value;
  const fraction = (time - left.position) / (right.position - left.position);
  if (left.type !== 'bezier') return THREE.MathUtils.lerp(left.value, right.value, fraction);
  const outgoing = left.handles || [0.5, 1, 0.5, 0];
  const incoming = right.handles || [0.5, 1, 0.5, 0];
  let lower = 0;
  let upper = 1;
  let parameter = fraction;
  // Invert the cubic's time coordinate. Bisection also behaves well for the
  // nearly vertical handles present in the source animation state.
  for (let step = 0; step < 18; step += 1) {
    if (cubic(outgoing[2], incoming[0], parameter) < fraction) lower = parameter;
    else upper = parameter;
    parameter = (lower + upper) * 0.5;
  }
  return THREE.MathUtils.lerp(left.value, right.value, cubic(outgoing[3], incoming[1], parameter));
}

function createStateReader(state) {
  const sheet = state.sheetsById.Scene;
  const objects = sheet.staticOverrides?.byObject || {};
  const tracks = sheet.sequence?.tracksByObject || {};
  return (objectName, path, time, fallback) => {
    let value = objects[objectName];
    for (const key of path) value = value?.[key];
    const objectTracks = tracks[objectName];
    const trackId = objectTracks?.trackIdByPropPath?.[JSON.stringify(path)];
    return sampleTrack(objectTracks?.trackData?.[trackId]?.keyframes, time, value ?? fallback);
  };
}

function disposeTree(object) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  object.traverse((node) => {
    if (node.geometry) geometries.add(node.geometry);
    const list = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of list) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

function prepareModel(model) {
  const replacementMaterials = new Map();
  const originalMaterials = new Set();
  model.traverse((node) => {
    if (!node.isMesh) return;
    // Animated planes and skinned cloth need to remain visible throughout the
    // scroll sequence, even when their bind-pose bounds leave the viewport.
    node.frustumCulled = false;
    const convert = (material) => {
      if (replacementMaterials.has(material)) return replacementMaterials.get(material);
      originalMaterials.add(material);
      let replacement;
      if (material.emissiveMap) {
        replacement = new THREE.MeshBasicMaterial({
          map: material.emissiveMap,
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          alphaTest: material.alphaTest || 0.2,
        });
      } else {
        replacement = material.clone();
        replacement.metalness = 0;
        replacement.roughness = 0;
      }
      replacement.name = material.name;
      replacementMaterials.set(material, replacement);
      return replacement;
    };
    node.material = Array.isArray(node.material) ? node.material.map(convert) : convert(node.material);
  });
  originalMaterials.forEach((material) => material.dispose());
}

/**
 * Authored Shopify Winter '26 hero assets, driven by the host's scroll refs.
 * progressRef.current: 0..1 over the hero's scroll distance; zero is the settled
 * opening composition. activeRef.current controls rendering while offscreen.
 */
export default function HeroScene({ progressRef, activeRef, active: isActive = true, onReady, onError }) {
  const containerRef = useRef(null);
  const wakeRef = useRef(null);
  useEffect(() => { if(isActive) wakeRef.current?.(); }, [isActive]);
  const callbacksRef = useRef({ onReady, onError });
  callbacksRef.current = { onReady, onError };
  const controlRefs = useRef({ progressRef, activeRef });
  controlRefs.current = { progressRef, activeRef };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    let disposed = false;
    let ready = false;
    let requestId = 0;
    let dirty = true;
    let lastSequenceTime = -1;
    let readState;
    let model;
    let painting;
    let mixer;
    let action;
    let environment;
    let backgroundTexture;
    let locallyVisible = true;
    const abortController = new AbortController();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = new THREE.Vector2();
    const currentPointer = new THREE.Vector2();
    const target = new THREE.Vector3();
    const offset = new THREE.Vector3();
    const orbit = new THREE.Spherical();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(25, 1, 0.1, 1000);
    camera.position.set(0, 0, 6.45);
    camera.lookAt(0, 0, 1);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.setClearColor(0x111b15, 0);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' });
      container.appendChild(renderer.domElement);
    } catch (error) {
      callbacksRef.current.onError?.(error);
      return undefined;
    }

    const draco = new DRACOLoader().setDecoderPath('/assets/decoders/draco/').setWorkerLimit(2);
    const ktx2 = new KTX2Loader().setTranscoderPath('/assets/decoders/basis/').setWorkerLimit(2).detectSupport(renderer);
    const gltf = new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2);

    const active = () => locallyVisible && !document.hidden && controlRefs.current.activeRef?.current !== false;
    const wake = () => {
      if (!disposed && !requestId && active()) requestId = requestAnimationFrame(frame);
    };

    wakeRef.current = wake;

    function sizeScene() {
      if (disposed) return;
      const { width, height } = container.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      if (painting) {
        const cover = Math.max(1, camera.aspect);
        const imageRatio = backgroundTexture.image.height / backgroundTexture.image.width;
        painting.scale.set(12 * cover, 12 * cover * imageRatio, 12 * cover);
      }
      dirty = true;
      wake();
    }

    function updateScene(time) {
      const value = (name, path, fallback) => readState(name, path, time, fallback);
      camera.position.set(
        value('camera', ['position', 'x'], 0),
        value('camera', ['position', 'y'], 0),
        value('camera', ['position', 'z'], 6.45),
      );
      target.set(
        value('camera', ['target', 'x'], 0),
        value('camera', ['target', 'y'], 0),
        value('camera', ['target', 'z'], 1),
      );
      // A restrained orbit follows the pointer; reduced-motion mode keeps the
      // authored camera stationary while retaining direct scroll scrubbing.
      if (!reducedMotion.matches) {
        offset.copy(camera.position).sub(target);
        orbit.setFromVector3(offset);
        orbit.theta -= currentPointer.x * 0.05;
        orbit.phi -= currentPointer.y * 0.05;
        offset.setFromSpherical(orbit);
        camera.position.copy(target).add(offset);
      }
      camera.lookAt(target);
      camera.rotateX(value('camera', ['rotation', 'x'], 0));
      camera.rotateY(value('camera', ['rotation', 'y'], 0));
      camera.rotateZ(value('camera', ['rotation', 'z'], 0));
      const fov = value('camera', ['fov'], 25);
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      const clipProgress = clamp(value('asset-1', ['animations', 'Scene', 'progress'], 0));
      if (action) {
        action.time = Math.min(action.getClip().duration - 0.00001, clipProgress * action.getClip().duration);
        mixer.update(0);
      }
      model.visible = value('asset-1', ['visibility'], 1) > 0.001;
      painting.visible = value('asset-2', ['visibility'], 1) > 0.001;
    }

    function frame() {
      requestId = 0;
      if (disposed || !active()) return;
      const progress = clamp(Number(controlRefs.current.progressRef?.current) || 0);
      // The first second is the source site's loading introduction. The host
      // begins at its completed pose; scrolling then traverses the camera/rig
      // curves at one sequence second per viewport of scroll (a 150vh spacer).
      const sequenceTime = 1 + progress * 1.5;
      const movingPointer = !reducedMotion.matches && currentPointer.distanceToSquared(pointer) > 0.00000005;
      if (movingPointer) currentPointer.lerp(pointer, 0.1);
      if (ready && (dirty || movingPointer || Math.abs(lastSequenceTime - sequenceTime) > 0.00001)) {
        updateScene(sequenceTime);
        renderer.render(scene, camera);
        lastSequenceTime = sequenceTime;
        dirty = false;
      }
      // Keep reading the host's mutable refs while active, but render only
      // changed frames. No requestAnimationFrame remains scheduled offscreen.
      wake();
    }

    function pointerMove(event) {
      if (reducedMotion.matches) return;
      const rect = container.getBoundingClientRect();
      pointer.set(clamp((event.clientX - rect.left) / rect.width) * 2 - 1, 1 - clamp((event.clientY - rect.top) / rect.height) * 2);
      wake();
    }
    function resetPointer() { pointer.set(0, 0); wake(); }
    function motionChange() { currentPointer.set(0, 0); pointer.set(0, 0); dirty = true; wake(); }
    function visibilityChange() { if (document.hidden && requestId) { cancelAnimationFrame(requestId); requestId = 0; } else wake(); }

    const resizeObserver = new ResizeObserver(sizeScene);
    resizeObserver.observe(container);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      locallyVisible = entry.isIntersecting;
      if (!locallyVisible && requestId) { cancelAnimationFrame(requestId); requestId = 0; }
      else wake();
    });
    intersectionObserver.observe(container);
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', sizeScene, { passive: true });
    window.addEventListener('pointermove', pointerMove, { passive: true });
    window.addEventListener('pointerleave', resetPointer);
    document.addEventListener('visibilitychange', visibilityChange);
    reducedMotion.addEventListener('change', motionChange);
    sizeScene();

    const statePromise = fetch(STATE_URL, { signal: abortController.signal }).then((response) => {
      if (!response.ok) throw new Error(`Hero animation state returned ${response.status}`);
      return response.json();
    });
    const modelPromise = gltf.loadAsync(MODEL_URL).then((result) => {
      if (disposed) { disposeTree(result.scene); return null; }
      model = result.scene;
      prepareModel(model);
      return result;
    });
    const paintingPromise = ktx2.loadAsync(PAINTING_URL).then((texture) => {
      if (disposed) { texture.dispose(); return null; }
      backgroundTexture = texture;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      return texture;
    });
    // The environment only lights the small non-emissive metal parts. If it is
    // unavailable, the painted figures and background still render correctly.
    const environmentPromise = ktx2.loadAsync(ENVIRONMENT_URL).then((texture) => {
      if (disposed) { texture.dispose(); return null; }
      environment = texture;
      texture.mapping = THREE.CubeUVReflectionMapping;
      scene.environment = texture;
      scene.environmentIntensity = 1;
      return texture;
    }).catch(() => null);

    Promise.all([statePromise, modelPromise, paintingPromise, environmentPromise]).then(([state, result, texture]) => {
      if (disposed || !result || !texture) return;
      readState = createStateReader(state);
      const component = (name, path, fallback) => readState(name, path, 1, fallback);
      const modelGroup = new THREE.Group();
      modelGroup.position.set(component('asset-1', ['position', 'x'], -0.233), component('asset-1', ['position', 'y'], 0.141), component('asset-1', ['position', 'z'], -7.09));
      modelGroup.rotation.set(component('asset-1', ['rotation', 'x'], 0), component('asset-1', ['rotation', 'y'], 0.07), component('asset-1', ['rotation', 'z'], 0));
      modelGroup.scale.set(component('asset-1', ['scale', 'x'], 2), component('asset-1', ['scale', 'y'], 2), component('asset-1', ['scale', 'z'], 3));
      modelGroup.add(model);
      scene.add(modelGroup);
      mixer = new THREE.AnimationMixer(model);
      const clip = result.animations.find((animation) => animation.name === 'Scene') || result.animations[0];
      if (clip) {
        action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        action.timeScale = 0;
      }
      const paintingMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
      painting = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), paintingMaterial);
      painting.position.set(component('asset-2', ['position', 'x'], 0), component('asset-2', ['position', 'y'], 0), component('asset-2', ['position', 'z'], -25.46));
      painting.rotation.set(component('asset-2', ['rotation', 'x'], 3.16), component('asset-2', ['rotation', 'y'], 0), component('asset-2', ['rotation', 'z'], 0));
      painting.frustumCulled = false;
      scene.add(painting);
      ready = true;
      sizeScene();
      updateScene(1 + clamp(Number(controlRefs.current.progressRef?.current) || 0) * 1.5);
      renderer.render(scene, camera);
      callbacksRef.current.onReady?.();
      wake();
    }).catch((error) => {
      if (!disposed && error.name !== 'AbortError') callbacksRef.current.onError?.(error);
    });

    return () => {
      disposed = true;
      wakeRef.current = null;
      abortController.abort();
      if (requestId) cancelAnimationFrame(requestId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', sizeScene);
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerleave', resetPointer);
      document.removeEventListener('visibilitychange', visibilityChange);
      reducedMotion.removeEventListener('change', motionChange);
      if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(model); }
      disposeTree(scene);
      // These may have resolved before another essential asset failed.
      if (model && !model.parent) disposeTree(model);
      if (backgroundTexture && !painting) backgroundTexture.dispose();
      environment?.dispose();
      draco.dispose();
      ktx2.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={containerRef} className="hero-scene" aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} />;
}
