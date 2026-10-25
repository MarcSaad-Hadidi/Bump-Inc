import { useEffect, useRef, useState } from 'react';
import { asset } from './assets';

let runtimePromise;
const runtime = () => runtimePromise ||= import('@rive-app/canvas').then((module) => {
  module.RuntimeLoader.setWasmUrl('/assets/rive.wasm');
  return module;
});
const normalize = (name) => name.toLowerCase().replace(' ', '-').replace(/\.(png|webp|jpg|jpeg|ttf|woff2?|otf)$/i, '');

export default function RiveDemo({ demo }) {
  const spec = demo.media.rive;
  const container = useRef(null);
  const canvas = useRef(null);
  const [status, setStatus] = useState('poster');
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 767px)').matches);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const size = matchMedia('(max-width: 767px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const sizeChange = event => setMobile(event.matches);
    const motionChange = event => setReduced(event.matches);
    size.addEventListener('change', sizeChange);motion.addEventListener('change', motionChange);
    return () => {size.removeEventListener('change', sizeChange);motion.removeEventListener('change', motionChange);};
  }, []);
  const poster = asset(spec.posterImage || spec.fallbackImage);
  const mobilePoster = asset(spec.posterImageMobile || spec.fallbackImageMobile) || poster;

  useEffect(() => {
    let animation;
    let stopped = false;
    let visible = false;
    let initializing = false;
    setStatus('poster');
    const resize = new ResizeObserver(() => animation?.resizeDrawingSurfaceToCanvas(Math.min(devicePixelRatio || 1, 1.5)));
    resize.observe(canvas.current);
    const init = async () => {
      if (initializing || stopped || reduced) return;
      initializing = true;
      try {
        const { Rive, Layout, Fit, Alignment, decodeImage, decodeFont } = await runtime();
        if (stopped) return;
        const map = Object.fromEntries(Object.entries(spec.assetsMap || {}).map(([key, value]) => [normalize(key), value]));
        animation = new Rive({
          src: asset(spec.source), canvas: canvas.current, artboard: spec.artboard,
          stateMachines: spec.stateMachines, autoBind: !!spec.viewModelName,
          autoplay: false, enableRiveAssetCDN: false,
          layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
          assetLoader: (file, bytes) => {
            if (bytes?.length) return false;
            const key = normalize(file.name);
            const entry = map[key] || map[`${key}-${mobile ? 'mobile' : 'desktop'}`];
            if (!entry) return false;
            if (spec.viewModelName && ((mobile && key.endsWith('-desktop')) || (!mobile && key.endsWith('-mobile')))) return true;
            fetch(asset(entry.asset)).then((r) => { if (!r.ok) throw Error('Missing demo asset'); return r.arrayBuffer(); })
              .then((buffer) => (entry.isFont ? decodeFont : decodeImage)(new Uint8Array(buffer)))
              .then((value) => { if (!stopped) { entry.isFont ? file.setFont(value) : file.setRenderImage(value); } value.unref?.(); })
              .catch((error) => { console.warn('Rive asset', demo.handle, error.message); if (!stopped) setStatus('fallback'); });
            return true;
          },
          onLoad: () => {
            if (stopped) return;
            try {
              if (spec.viewModelName) {
                const model = animation.viewModelByName(spec.viewModelName);
                const instance = model?.instanceByName(mobile ? 'mobile' : 'desktop');
                if (instance) animation.bindViewModelInstance(instance);
              }
              animation.resizeDrawingSurfaceToCanvas(Math.min(devicePixelRatio || 1, 1.5));
              if (visible) animation.play();
              setStatus('ready');
            } catch { setStatus('fallback'); }
          },
          onLoadError: () => !stopped && setStatus('fallback'),
        });
      } catch { if (!stopped) setStatus('fallback'); }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { init(); animation?.play(); } else animation?.pause();
    }, { rootMargin: '150px' });
    observer.observe(container.current);
    const visibility = () => document.hidden ? animation?.pause() : visible && animation?.play();
    document.addEventListener('visibilitychange', visibility);
    return () => { stopped = true; observer.disconnect(); resize.disconnect(); document.removeEventListener('visibilitychange', visibility); animation?.cleanup(); };
  }, [spec, mobile, reduced]);

  return <div ref={container} className={`rive-demo ${status}`} data-rive-status={status} data-rive-layout={mobile ? "mobile" : "desktop"} style={{ '--demo-ratio': spec.aspectRatio?.replace(':',' / ') || '4 / 3', '--mobile-ratio': (spec.mobileAspectRatio || spec.aspectRatio)?.replace(':',' / ') || '4 / 3' }}>
    <picture><source media="(max-width: 767px)" srcSet={mobilePoster}/><img src={poster} alt={demo.title} loading="lazy" /></picture>
    <canvas ref={canvas} aria-label={`${demo.title} animated demonstration`} role="img" />
  </div>;
}
