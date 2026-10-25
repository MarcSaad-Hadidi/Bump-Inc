// Move the painted irises inside their original feathered eye interiors. Native
// open faces, eyelid contours, depth and skinning remain intact; no blink layer.
const eyes=[[489,611,19,9],[543,615,13,8],[722,595,18,11],[773,621,12,10],[1008,611,18,9],[1064,608,15,9],[1317,622,14,10],[1368,619,18,11],[1545,699,16,11],[1604,704,21,12]];
export function styleSecurityGazeMaterial(material){
 if(material.userData.bumpGaze)return material;
 const pointer={value:[.5,.5]},resolution={value:[1,1]},strength={value:0},before=material.onBeforeCompile;
 material.userData.bumpGaze={pointer,resolution,strength};
 const renderBefore=material.onBeforeRender;
 material.onBeforeRender=function(renderer,...args){renderBefore?.call(this,renderer,...args);const target=renderer.getRenderTarget();resolution.value=[target?.width??renderer.domElement.width,target?.height??renderer.domElement.height];};
 material.onBeforeCompile=function(shader,renderer){
  before.call(this,shader,renderer);
  Object.assign(shader.uniforms,{bumpGazePointer:pointer,bumpGazeResolution:resolution,bumpGazeStrength:strength});
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   uniform vec2 bumpGazePointer;
   uniform vec2 bumpGazeResolution;
   uniform float bumpGazeStrength;`).replace('#include <map_fragment>',`#ifdef USE_MAP
   vec2 bumpEyeUV=vMapUv;
   vec2 bumpLook=clamp((bumpGazePointer-gl_FragCoord.xy/bumpGazeResolution)*2.4,vec2(-1.0),vec2(1.0));
   float bumpEye=0.0;
   ${eyes.map(([x,y,rx,ry])=>`bumpEye=max(bumpEye,1.0-smoothstep(.25,.95,length((vMapUv-vec2(${x/2048},${1-y/2048}))/vec2(${rx/2048},${ry*.72/2048}))));`).join('\n')}
   bumpEyeUV-=bumpLook*vec2(.0017,.0009)*bumpEye*bumpGazeStrength;
   diffuseColor*=texture2D(map,bumpEyeUV);
  #endif`);
 };
 material.customProgramCacheKey=()=> 'bump-open-eye-gaze-v21';material.needsUpdate=true;
 return material;
}
