import{BUMP_PLAYBACK_RATE}from'/runtime/assets/BumpPlayback.js';
import * as T from 'three';

const RADIUS=1.3, LAT=45.5019, LON=-73.5674, RAD=Math.PI/180;
const clamp=t=>Math.max(0,Math.min(1,t));
const point=(lat,lon,r=RADIUS)=>new T.Vector3(Math.cos(lat*RAD)*Math.cos(lon*RAD)*r,Math.sin(lat*RAD)*r,-Math.cos(lat*RAD)*Math.sin(lon*RAD)*r);
let atlasPromise;
async function makeAtlas(){
  if(atlasPromise)return atlasPromise;
  atlasPromise=(async()=>{
    const image=new Image();image.src='/bump/globe/earth-blue-marble.webp';await image.decode();
    const canvas=document.createElement('canvas');canvas.width=4096;canvas.height=2048;
    const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0,4096,2048);
    const pixels=c.getImageData(0,0,4096,2048).data;
    const localImage=new Image();localImage.src='/bump/globe/montreal-sentinel.webp';await localImage.decode();
    const localCanvas=document.createElement('canvas');localCanvas.width=localCanvas.height=2048;
    const localContext=localCanvas.getContext('2d',{willReadFrequently:true});localContext.drawImage(localImage,0,0);
    const detail={canvas:localCanvas,pixels:localContext.getImageData(0,0,2048,2048).data,width:2048,height:2048};
    return {canvas,pixels,width:4096,height:2048,detail};
  })();
  return atlasPromise;
}

function makePin(){
  const group=new T.Group();
  group.position.copy(point(LAT,LON,RADIUS+.000015));
  group.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),group.position.clone().normalize());
  const brass=new T.MeshStandardMaterial({color:'#b08b52',metalness:.48,roughness:.3});
  const wine=new T.MeshPhysicalMaterial({color:'#af3347',metalness:.12,roughness:.23,clearcoat:1,clearcoatRoughness:.16});
  const profile=[[0,0],[.007,.015],[.018,.041],[.043,.075],[.049,.105],[.041,.135],[.02,.15],[0,.154]].map(([x,y])=>new T.Vector2(x,y));
  const body=new T.Mesh(new T.LatheGeometry(profile,32),wine);group.add(body);
  const gem=new T.Mesh(new T.SphereGeometry(.016,20,12),new T.MeshStandardMaterial({color:'#f7e7bf',metalness:.4,roughness:.28}));
  gem.position.set(0,.103,.043);group.add(gem);
  const base=new T.Mesh(new T.TorusGeometry(.034,.003,6,48),brass);base.rotation.x=-Math.PI/2;base.position.y=.006;group.add(base);
  return group;
}

function makeCitySurface(atlas){
  // A georeferenced, high-resolution patch on the sphere keeps the final
  // Montréal approach sharp. This is imagery on 3D geometry, not a flat scene.
  const steps=64,vertices=[],normals=[],uv=[],indices=[];
  for(let row=0;row<=steps;row++)for(let col=0;col<=steps;col++){
    const p=point(47-row/steps*3,-75+col/steps*3,RADIUS+.000002);
    vertices.push(p.x,p.y,p.z);const n=p.clone().normalize();normals.push(n.x,n.y,n.z);uv.push(col/steps,1-row/steps);
  }
  for(let row=0;row<steps;row++)for(let col=0;col<steps;col++){
    const a=row*(steps+1)+col,b=a+1,c=a+steps+1,d=c+1;indices.push(a,c,b,b,c,d);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  const texture=new T.CanvasTexture(atlas.detail.canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const material=new T.MeshStandardMaterial({map:texture,roughness:.9,transparent:true,opacity:0,depthWrite:false});
  const mesh=new T.Mesh(geometry,material);mesh.renderOrder=1;
  return {mesh,geometry,material,texture};
}

// A ray-traced software surface uses the same spherical coordinates, camera,
// atlas and actual pin mesh on browsers without WebGL. It remains a moving 3D
// object; no screenshot or static-map substitute is used.
function softwareRenderer(canvas,atlas,scene,camera,pin){
  const c=canvas.getContext('2d',{alpha:true});
  const width=canvas.width,height=canvas.height;
  const image=c.createImageData(width,height),rgba=image.data;
  const rays=[];const tan=Math.tan(camera.fov*RAD/2),aspect=width/height;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const dx=((x+.5)/width*2-1)*tan*aspect,dy=(1-(y+.5)/height*2)*tan;
    const norm=1/Math.sqrt(dx*dx+dy*dy+1);rays.push(dx*norm,dy*norm,-norm);
  }
  const light=new T.Vector3(-3,5,6).normalize();
  const p1=new T.Vector3(),p2=new T.Vector3(),p3=new T.Vector3();
  const edgeA=new T.Vector3(),edgeB=new T.Vector3(),normal=new T.Vector3();
  const pinMeshes=[];pin.traverse(o=>{if(o.isMesh)pinMeshes.push(o);});
  function drawPin(){
    // The city's normal must face the camera before drawing the marker.
    if(pin.position.dot(camera.position.clone().sub(pin.position))<=0)return;
    scene.updateMatrixWorld(true);const faces=[];
    for(const mesh of pinMeshes){
      const pos=mesh.geometry.attributes.position,idx=mesh.geometry.index;
      for(let i=0;i<(idx?.count??pos.count);i+=3){
        const vertices=[p1,p2,p3];
        for(let j=0;j<3;j++)vertices[j].fromBufferAttribute(pos,idx?idx.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);
        edgeA.subVectors(p2,p1);edgeB.subVectors(p3,p1);normal.crossVectors(edgeA,edgeB).normalize();
        const shade=.45+Math.max(0,normal.dot(light))*.65;
        const color=mesh.material.color.clone().convertLinearToSRGB();
        const pts=vertices.map(p=>{const q=p.clone().project(camera);return[(q.x+1)*width/2,(1-q.y)*height/2,q.z];});
        faces.push({pts,depth:pts.reduce((n,p)=>n+p[2],0),color:`rgb(${Math.min(255,Math.round(color.r*255*shade))} ${Math.min(255,Math.round(color.g*255*shade))} ${Math.min(255,Math.round(color.b*255*shade))})`});
      }
    }
    faces.sort((a,b)=>b.depth-a.depth);
    for(const f of faces){c.fillStyle=f.color;c.beginPath();f.pts.forEach((p,i)=>c[i?'lineTo':'moveTo'](p[0],p[1]));c.closePath();c.fill();}
    const center=pin.position.clone().project(camera),x=(center.x+1)*width/2,y=(1-center.y)*height/2;
    const ring=c.createRadialGradient(x,y,1,x,y,18);ring.addColorStop(0,'#713d4330');ring.addColorStop(1,'#713d4300');c.fillStyle=ring;c.beginPath();c.ellipse(x,y,18,6,0,0,Math.PI*2);c.fill();
  }
  return {render(_scene,_camera,zoom=1){
    camera.updateMatrixWorld();const m=camera.matrixWorld.elements,ox=camera.position.x,oy=camera.position.y,oz=camera.position.z;
    const cc=ox*ox+oy*oy+oz*oz-RADIUS*RADIUS;
    rgba.fill(0);
    for(let i=0,j=0;i<rays.length;i+=3,j+=4){
      const a=rays[i],b=rays[i+1],d=rays[i+2];
      const dx=m[0]*a+m[4]*b+m[8]*d,dy=m[1]*a+m[5]*b+m[9]*d,dz=m[2]*a+m[6]*b+m[10]*d;
      const dot=ox*dx+oy*dy+oz*dz,disc=dot*dot-cc;if(disc<0)continue;
      const dist=-dot-Math.sqrt(disc);if(dist<0)continue;
      const nx=(ox+dx*dist)/RADIUS,ny=(oy+dy*dist)/RADIUS,nz=(oz+dz*dist)/RADIUS;
      const u=(Math.atan2(-nz,nx)/(Math.PI*2)+.5),v=.5-Math.asin(Math.max(-1,Math.min(1,ny)))/Math.PI;
      const pixel=(Math.min(atlas.height-1,Math.floor(v*atlas.height))*atlas.width+Math.min(atlas.width-1,Math.floor(u*atlas.width)))*4;
      const lon=(u-.5)*360,lat=(.5-v)*180;
      const local=lon>-75&&lon<-72&&lat>44&&lat<47;
      let localPixel=0,blend=0;
      if(local){
        const x=Math.min(2047,Math.floor((lon+75)/3*2048)),y=Math.min(2047,Math.floor((47-lat)/3*2048));
        localPixel=(y*2048+x)*4;
        blend=Math.min(clamp((lon+75)*8),clamp((-72-lon)*8),clamp((lat-44)*8),clamp((47-lat)*8))*clamp((zoom-.4)/.25);
      }
      const lit=Math.max(0,nx*light.x+ny*light.y+nz*light.z),facing=-(nx*dx+ny*dy+nz*dz);
      const shade=.52+lit*.48,edge=Math.pow(1-Math.max(0,facing),3)*.19;
      for(let k=0;k<3;k++){const color=T.MathUtils.lerp(atlas.pixels[pixel+k],local?atlas.detail.pixels[localPixel+k]:0,blend);rgba[j+k]=Math.min(255,color*shade+235*edge);}
      rgba[j+3]=255;
    }
    c.putImageData(image,0,0);drawPin();
  },dispose(){}};
}

export async function createGlobe(host,{onPhase=()=>{}}={}){
  const atlas=await makeAtlas();
  if(!host?.isConnected)return()=>{};
  const viewport=host.querySelector('.bump-globe-viewport');
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');viewport.replaceChildren(canvas);
  const width=host.clientWidth,height=host.clientHeight;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(39,width/height,.00005,30);
  const pin=makePin();scene.add(pin);
  let renderer,gl;
  try{gl=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});}catch{}
  let texture,geometry,material,city;
  if(gl){
    renderer=new T.WebGLRenderer({canvas,context:gl,alpha:true,antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setSize(width,height,false);
    renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;
    texture=new T.CanvasTexture(atlas.canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    geometry=new T.SphereGeometry(RADIUS,96,64);
    material=new T.MeshStandardMaterial({map:texture,roughness:.79,metalness:.08});
    scene.add(new T.Mesh(geometry,material));
    city=makeCitySurface(atlas);scene.add(city.mesh);
    scene.add(new T.AmbientLight('#ffffff',1.7));
    const key=new T.DirectionalLight('#ffffff',2);key.position.set(-3,5,6);scene.add(key);
    const fill=new T.DirectionalLight('#a2c8ff',.8);fill.position.set(4,0,-3);scene.add(fill);
    canvas.dataset.renderer='webgl';
  }else{
    canvas.width=Math.round(width*1.05);canvas.height=Math.round(height*1.05);
    renderer=softwareRenderer(canvas,atlas,scene,camera,pin);canvas.dataset.renderer='software';
  }
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start=performance.now(),duration=2800;let frame,last=0,phase='';
  function render(now){
    const elapsed=reduced?duration:(performance.now()-start)*BUMP_PLAYBACK_RATE;
    const travel=1-Math.pow(1-clamp(elapsed/1250),3),zoom=(1-Math.cos(Math.PI*clamp(elapsed/duration)))/2;
    const lat=T.MathUtils.lerp(20,LAT,travel),lon=T.MathUtils.lerp(-24,LON,travel);
    const altitude=Math.exp(T.MathUtils.lerp(Math.log(3.85),Math.log(.012),zoom));
    camera.position.copy(point(lat,lon,RADIUS+altitude));
    const target=point(LAT,LON,T.MathUtils.lerp(0,RADIUS,zoom));
    camera.lookAt(target);camera.updateMatrixWorld();
    // Keep the 3D teardrop upright as the camera approaches its surface anchor.
    // A radial pin would be seen end-on and collapse into a plain circle.
    pin.quaternion.copy(camera.quaternion);
    pin.scale.setScalar(altitude/3.85*T.MathUtils.lerp(1,.7,zoom));
    if(city)city.material.opacity=clamp((zoom-.4)/.25);
    host.style.setProperty('--pin-scale',pin.scale.x.toFixed(5));
    host.style.setProperty('--view-km',(2*altitude*Math.tan(camera.fov*RAD/2)/RADIUS*6371).toFixed(1));
    const next=elapsed<duration?'flying':'montreal';
    if(next!==phase){phase=next;host.dataset.flight=next;onPhase(next);}
    // Software rendering is deliberately capped to keep the full-screen scene
    // responsive; it reaches exactly the same final camera and coordinates.
    if(gl||now-last>1000/24||elapsed>=duration){renderer.render(scene,camera,zoom);last=now;}
    const pinScreen=pin.position.clone().project(camera);
    host.style.setProperty('--pin-x',`${(pinScreen.x+1)*50}%`);
    host.style.setProperty('--pin-y',`${(1-pinScreen.y)*50}%`);
    host.style.setProperty('--globe-zoom',zoom.toFixed(3));
    if(elapsed<duration)frame=requestAnimationFrame(render);
  }
  frame=requestAnimationFrame(render);
  return()=>{
    cancelAnimationFrame(frame);renderer.dispose();if(gl)renderer.forceContextLoss();
    texture?.dispose();geometry?.dispose();material?.dispose();
    if(city){city.texture.dispose();city.geometry.dispose();city.material.dispose();}
    pin.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});canvas.remove();
  };
}
