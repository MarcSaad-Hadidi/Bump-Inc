// Regrade the registered native paint on its real 3D surface. Color masks are
// continuous in texture space: no repainted atlas, shifted features or new alpha.
export function styleCompanyMaterial(material,kind){
 if(!material||material.userData.bumpCompanyStyle===kind)return;
 material.userData.bumpCompanyStyle=kind;
 const before=material.onBeforeCompile;
 material.onBeforeCompile=function(shader,renderer){
  before.call(this,shader,renderer);
  let paint='';
  if(kind==='wardrobe'){
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 bumpCompanyRestPosition;\nvarying float bumpCompanyWoman;').replace('#include <begin_vertex>',`#include <begin_vertex>\nbumpCompanyRestPosition=position;\nbumpCompanyWoman=smoothstep(.10,.14,position.x);\n#ifdef USE_SKINNING\n bumpCompanyWoman=max(bumpCompanyWoman,dot(skinWeight,step(vec4(15.5),skinIndex)*(vec4(1.0)-step(vec4(31.5),skinIndex))));\n#endif`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 bumpCompanyRestPosition;\nvarying float bumpCompanyWoman;');
  }
  if(kind==='man-face')paint=`
   vec2 bumpPx=vMapUv*vec2(1024.0,512.0);
   float bumpHairArea=max(1.0-smoothstep(122.0,155.0,bumpPx.y),(1.0-smoothstep(315.0,350.0,bumpPx.x))*(1.0-smoothstep(330.0,365.0,bumpPx.y)));
   float bumpHair=(1.0-smoothstep(.045,.075,bumpLuma))*bumpHairArea;
   vec3 bumpSilver=vec3(.75,.79,.70)*pow(max(bumpLuma,.00001),.55);
   float bumpSkin=smoothstep(163.0,210.0,bumpPx.x)*smoothstep(125.0,175.0,bumpPx.y)*(1.0-bumpHair);
   vec3 bumpBronze=bumpPaint*vec3(.78,.76,.70);
   float bumpCoat=(1.0-smoothstep(153.0,188.0,bumpPx.x))*smoothstep(337.0,408.0,bumpPx.y);
   diffuseColor.rgb=mix(bumpPaint,bumpBronze,bumpSkin*.88);
   diffuseColor.rgb=mix(diffuseColor.rgb,bumpPaint*vec3(1.45,.39,.62),bumpCoat);
   diffuseColor.rgb=mix(diffuseColor.rgb,bumpSilver,bumpHair);
  `;
  else if(kind==='woman-face')paint=`
   vec2 bumpPx=vMapUv*vec2(1024.0,512.0);
   float bumpCrown=1.0-smoothstep(111.0,141.0,bumpPx.y);
   float bumpBack=smoothstep(752.0,779.0,bumpPx.x)*(1.0-smoothstep(326.0,351.0,bumpPx.y));
   float bumpGoldHair=smoothstep(2.4,3.4,bumpPaint.g/max(.002,bumpPaint.b))*(1.0-smoothstep(325.0,350.0,bumpPx.y));
   float bumpHair=max(max(bumpCrown,bumpBack),bumpGoldHair);
   vec3 bumpCopper=bumpPaint*vec3(.76,.48,.40);
   vec3 bumpOlive=bumpPaint*vec3(.86,.90,.73);
   diffuseColor.rgb=mix(bumpPaint,bumpOlive,.70*(1.0-bumpHair));
   diffuseColor.rgb=mix(diffuseColor.rgb,bumpCopper,bumpHair);
   float bumpDress=smoothstep(454.0,480.0,bumpPx.y);
   diffuseColor.rgb=mix(diffuseColor.rgb,bumpPaint*vec3(.11,.50,.28),bumpDress);
  `;
  else if(kind==='wardrobe')paint=`
   float bumpWoman=smoothstep(.35,.65,bumpCompanyWoman);
   float bumpRestingHand=smoothstep(.96,1.02,bumpCompanyRestPosition.x)*(1.0-smoothstep(-.59,-.57,bumpCompanyRestPosition.y))*smoothstep(-1.02,-.92,bumpCompanyRestPosition.y);
   bumpRestingHand*=(1.0-smoothstep(.65,.78,bumpPaint.b/max(.003,bumpPaint.g)))*smoothstep(1.15,1.30,bumpPaint.r/max(.003,bumpPaint.g));
   vec3 bumpForest=bumpPaint*vec3(.11,.50,.28);
   vec3 bumpWine=bumpPaint*vec3(1.45,.39,.62);
   vec3 bumpDress=bumpForest;
   diffuseColor.rgb=mix(bumpPaint,bumpDress,bumpWoman*(1.0-bumpRestingHand));
   float bumpCool=smoothstep(.82,.97,(bumpPaint.g+bumpPaint.b)/max(.004,2.0*bumpPaint.r));
   diffuseColor.rgb=mix(diffuseColor.rgb,bumpWine,bumpCool*(1.0-bumpWoman));
  `;
  else if(kind==='hands')paint=`
   float bumpSkin=smoothstep(1.05,1.24,bumpPaint.r/max(.003,bumpPaint.g));
   diffuseColor.rgb=mix(bumpPaint,bumpPaint*vec3(.72,.77,.61),bumpSkin*.85);
  `;
  else if(kind==='bench')paint=`
   diffuseColor.rgb=bumpPaint*vec3(.28,.22,.16);
  `;
  else if(kind==='brass')paint=`diffuseColor.rgb=vec3(.48,.29,.085);`;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec3 bumpPaint=diffuseColor.rgb;
   float bumpLuma=dot(bumpPaint,vec3(.2126,.7152,.0722));
   ${paint}`);
 };
 material.customProgramCacheKey=()=>`bump-company-${kind}-v22`;
 material.needsUpdate=true;
}
export function companyMaterialKind(object){
 if(object.name==='face-man')return'man-face';
 if(object.name==='face-woman')return'woman-face';
 if(object.name==='MP_Body'||object.name==='MP Body')return'wardrobe';
 if(/^(man-lhand|manrhand|hand[._])/.test(object.name))return'hands';
 if(object.name.startsWith('Bench'))return'bench';
 if(object.name.startsWith('BumpCompany_'))return'brass';
 return null;
}
