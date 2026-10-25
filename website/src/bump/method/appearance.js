// Grade the exact authored KTX2 paint in place. Color and local head/neck masks
// leave the original UVs, rig and silhouette intact, including every cloth seam.
export function styleMethodMaterial(source,material){
 const hand=source.name==='Bump_Method_Hand_v21';
 if(!hand&&!/^Bump_Method_Consultant_v2[01]$/.test(source.name))return material;
 if(material.userData.bumpMethodAppearance===21)return material;
 material.userData.bumpConsultantStyle=true;material.userData.bumpMethodAppearance=21;
 const compile=material.onBeforeCompile;
 material.onBeforeCompile=function(shader,renderer){
  compile.call(this,shader,renderer);
  if(!hand){
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 bumpMakerPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nbumpMakerPosition=position;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 bumpMakerPosition;');
  }
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec3 bumpPaint=diffuseColor.rgb;
   float bumpLuma=dot(bumpPaint,vec3(.2126,.7152,.0722));
   float bumpWarm=smoothstep(1.03,1.3,bumpPaint.r/max(.003,bumpPaint.g));
   vec3 bumpSkinPaint=vec3(.54,.38,.19)*pow(max(bumpLuma,.0001),.55)*1.65;
   ${hand?`
    diffuseColor.rgb=mix(bumpPaint,bumpSkinPaint,bumpWarm);
   `:`
    float bumpHead=smoothstep(.08,.16,bumpMakerPosition.y);
    float bumpCool=smoothstep(.70,1.05,(bumpPaint.g+bumpPaint.b)/max(.006,2.0*bumpPaint.r));
    float bumpHair=bumpHead*bumpCool*(1.0-smoothstep(.10,.18,bumpLuma));
    float bumpCoat=smoothstep(1.5,2.3,bumpPaint.r/max(.006,bumpPaint.g))*(1.0-smoothstep(.025,.09,bumpMakerPosition.y));
    float bumpLinen=smoothstep(.18,.45,bumpLuma)*(1.0-bumpCoat);
    diffuseColor.rgb=mix(bumpPaint,bumpPaint*vec3(.64,.42,1.18),bumpCoat);
    diffuseColor.rgb=mix(diffuseColor.rgb,bumpPaint*vec3(.88,.81,.70),bumpLinen*.7);
    diffuseColor.rgb=mix(diffuseColor.rgb,bumpSkinPaint,bumpHead*bumpWarm*(1.0-bumpHair));
    // Lift the original nearly black brushwork into natural chestnut, retaining
    // its small painted highlights instead of filling the hair with flat gray.
    vec3 bumpHairPaint=vec3(2.1,.9,.36)*pow(max(bumpLuma,.0001),.83);
    diffuseColor.rgb=mix(diffuseColor.rgb,bumpHairPaint,bumpHair);
   `}
  `);
 };
 material.customProgramCacheKey=()=>hand?'bump-method-olive-hand-v21':'bump-method-chestnut-olive-v21';
 return material;
}
