var b=[[489,611,19,9],[543,615,13,8],[722,595,18,11],[773,621,12,10],[1008,611,18,9],[1064,608,15,9],[1317,622,14,10],[1368,619,18,11],[1545,699,16,11],[1604,704,21,12]];function l(e){if(e.userData.bumpGaze)return e;let m={value:[.5,.5]},t={value:[1,1]},p={value:0},c=e.onBeforeCompile;e.userData.bumpGaze={pointer:m,resolution:t,strength:p};let r=e.onBeforeRender;return e.onBeforeRender=function(o,...u){r?.call(this,o,...u);let n=o.getRenderTarget();t.value=[n?.width??o.domElement.width,n?.height??o.domElement.height]},e.onBeforeCompile=function(o,u){c.call(this,o,u),Object.assign(o.uniforms,{bumpGazePointer:m,bumpGazeResolution:t,bumpGazeStrength:p}),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
   uniform vec2 bumpGazePointer;
   uniform vec2 bumpGazeResolution;
   uniform float bumpGazeStrength;`).replace("#include <map_fragment>",`#ifdef USE_MAP
   vec2 bumpEyeUV=vMapUv;
   vec2 bumpLook=clamp((bumpGazePointer-gl_FragCoord.xy/bumpGazeResolution)*2.4,vec2(-1.0),vec2(1.0));
   float bumpEye=0.0;
   ${b.map(([n,a,i,f])=>`bumpEye=max(bumpEye,1.0-smoothstep(.25,.95,length((vMapUv-vec2(${n/2048},${1-a/2048}))/vec2(${i/2048},${f*.72/2048}))));`).join(`
`)}
   bumpEyeUV-=bumpLook*vec2(.0017,.0009)*bumpEye*bumpGazeStrength;
   diffuseColor*=texture2D(map,bumpEyeUV);
  #endif`)},e.customProgramCacheKey=()=>"bump-open-eye-gaze-v21",e.needsUpdate=!0,e}export{l as styleSecurityGazeMaterial};
