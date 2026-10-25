import{styleMethodMaterial}from'./BumpMethodAppearance.js';
import{styleSecurityGazeMaterial}from'./BumpGaze.js';
// Texture grading belongs to the character's 3D material. It preserves the
// authored UVs, skinned geometry and painted cloth folds without atlas seams.
export function styleBumpMaterial(source,material){
  if(/^Bump_Method_(Consultant_v2[01]|Hand_v21)$/.test(source.name))return styleMethodMaterial(source,material);
  if(source.name==='Bump_Security_Gaze_v21')return styleSecurityGazeMaterial(material);

  if(source.name==='Bump_Woman_Cloth')material.vertexColors=true;
  if(['Bump_Navy_Cloak','Bump_Burgundy_Coat'].includes(source.name)){
    material.color.copy(source.color);
  }
  const image=source.map?.image;
  const landscape=(image?.currentSrc||image?.src||'').includes('hero-landscape-v2');
  const ivory=source.userData?.bumpPalette==='ivory';
  const woman=source.name==='Bump_Woman_Cloth';
  const coat=source.name==='Bump_Burgundy_Coat';
  if(!landscape&&!ivory&&!woman&&!coat)return material;
  const original=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,renderer){
    original.call(this,shader,renderer);
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      vec3 bumpOriginal = diffuseColor.rgb;
      float bumpLuma = dot(bumpOriginal, vec3(0.2126, 0.7152, 0.0722));
      ${landscape?'diffuseColor.rgb = pow(max(bumpOriginal, vec3(0.0)), vec3(1.5)) * 0.3;':coat?'float keepPaint = smoothstep(0.003,0.04,bumpLuma); vec3 filledShadow = vec3(0.115,0.009,0.012)*(0.90+clamp(bumpLuma*6.0,0.0,0.2)); diffuseColor.rgb = mix(filledShadow,bumpOriginal,keepPaint);':woman?`
        float bumpWarm = smoothstep(0.07, 0.25, max(bumpOriginal.r, max(bumpOriginal.g,bumpOriginal.b))-min(bumpOriginal.r,min(bumpOriginal.g,bumpOriginal.b)));
        diffuseColor.rgb = mix(bumpOriginal, vec3(0.87,0.81,0.69)*(0.35+sqrt(max(bumpLuma,0.0))),bumpWarm);
        float bumpIvory = (1.0-bumpWarm)*smoothstep(0.03,0.18,bumpLuma);
        #ifdef USE_COLOR
          bumpIvory *= smoothstep(0.70,0.95,min(vColor.r,min(vColor.g,vColor.b)));
        #endif
        diffuseColor.rgb *= mix(vec3(1.0),vec3(0.68,0.60,0.49),bumpIvory);
      `:'diffuseColor.rgb = vec3(0.80, 0.72, 0.61) * clamp(0.12 + pow(max(bumpLuma,0.0),0.25)*1.5,0.20,1.15);'}
    `);
  };
  material.customProgramCacheKey=()=> landscape?'bump-landscape-v2':coat?'bump-filled-coat-v3':woman?'bump-woman-cloth-v3':'bump-ivory-cloth-v2';
  return material;
}
