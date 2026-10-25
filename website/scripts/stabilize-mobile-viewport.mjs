import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import postcss from 'postcss';
import {parse} from '@babel/parser';

function guarded(selector,condition){
  return /^(html|:root)(?=[\s.#:[>+~]|$)/.test(selector)?selector.replace(/^(html|:root)/,'$1:where('+condition+')'):`:where(html${condition}) `+selector;
}
export function stableViewportCss(source){
  const sheet=postcss.parse(source);
  sheet.walkDecls(decl=>{
    if(decl.prop==='content'||/bump-(dialog|brief|hero-search|search|location|hero-dropdown)/.test(decl.parent.selector||''))return;
    decl.value=decl.value.replace(/url\([^)]*\)|"[^"]*"|'[^']*'|(-?(?:\d*\.)?\d+)(svh|dvh|lvh|vh)\b/g,(match,n,unit,offset)=>{
      if(n===undefined||decl.value.slice(0,offset).trimEnd().endsWith('--bump-viewport-unit,'))return match;
      return `calc(var(--bump-viewport-unit,1${unit}) * ${n})`;
    });
  });
  sheet.walkAtRules('media',media=>{
    const heights=[...media.params.matchAll(/\((max|min)-height\s*:\s*(\d+)px\)/g)];
    if(!heights.length||/width\s*>=\s*\(/.test(media.params))return;
    let already=false;media.walkRules(rule=>{if(rule.selector.includes('data-bump-height-')||rule.selector.includes('data-bump-stable-viewport'))already=true;});
    if(already)return;
    const clone=media.clone();
    clone.params=media.params.replace(/\((max|min)-height\s*:\s*\d+px\)/g,'').replace(/\s+and\s+and\s+/g,' and ').replace(/^\s*and\s*|\s*and\s*$/g,'').trim()||'all';
    media.walkRules(rule=>{rule.selectors=rule.selectors.map(selector=>guarded(selector,':not([data-bump-stable-viewport])'));});
    const condition=heights.map(([,kind,value])=>'[data-bump-height-'+kind+'-'+value+']').join('');
    clone.walkRules(rule=>{rule.selectors=rule.selectors.map(selector=>guarded(selector,condition));});
    media.after(clone);
  });
  return sheet.toString();
}

export function stableNativeRuntime(source){
  if(source.includes('getBumpViewportHeight as __bumpViewportHeight'))return source;
  const ast=parse(source,{sourceType:'module'}),edits=[];
  function visit(node){
    if(!node||typeof node!=='object')return;
    if(node.type==='MemberExpression'&&!node.computed&&node.object?.name==='window'&&['innerHeight','outerHeight'].includes(node.property?.name))edits.push([node.start,node.end,node.property.name==='outerHeight'?'__bumpBackgroundHeight()':'__bumpViewportHeight()']);
    for(const[key,value]of Object.entries(node)){if(['loc','extra','comments','tokens'].includes(key))continue;if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}
  }
  visit(ast.program);if(!edits.length)return source;
  let output=source;for(const[start,end,text]of edits.sort((a,b)=>b[0]-a[0]))output=output.slice(0,start)+text+output.slice(end);
  return 'import{getBumpViewportHeight as __bumpViewportHeight,getBumpBackgroundHeight as __bumpBackgroundHeight}from"/runtime/assets/BumpViewport.js";\n'+output;
}

export function stabilizeMobileViewport(){
  const directory='public/runtime/assets';
  for(const file of readdirSync(directory).filter(name=>name.endsWith('.css'))){const path=directory+'/'+file,source=readFileSync(path,'utf8'),output=stableViewportCss(source);if(output!==source)writeFileSync(path,output);}
  for(const file of ['(_locale).editions.winter2026-CdSmWtXg.js','Background-DpyJh-o1.js']){const path=directory+'/'+file,source=readFileSync(path,'utf8'),output=stableNativeRuntime(source);if(output!==source)writeFileSync(path,output);}
  const cameraPath=directory+'/Butterflies-pNugjQAd.js';
  let camera=readFileSync(cameraPath,'utf8');
  const nativeSource=readFileSync('src/bump/ui/nativeCamera.js','utf8'),preamble=nativeSource.slice(0,nativeSource.indexOf('export function Pa'));
  camera=camera.split(preamble).join('');
  const start=camera.indexOf('function Pa('),end=camera.indexOf('function Oa(',start);
  if(start<0||end<0)throw new Error('The retained camera boundary needs updating.');
  const replacement=nativeSource.slice(nativeSource.indexOf('export function Pa')).replace('export function Pa','function Pa');
  camera=camera.slice(0,start)+replacement+'\n'+camera.slice(end);
  if(!camera.includes('applySceneProjection as __bumpApplySceneProjection'))camera='import{resolveSceneCamera as __bumpResolveSceneCamera,applySceneProjection as __bumpApplySceneProjection}from"/runtime/assets/BumpSceneCamera.js";\n'+camera;
  if(!camera.includes('usesMobileSceneFraming as __bumpMobileScene'))camera='import{getBumpScenePointer as __bumpScenePointer,usesMobileSceneFraming as __bumpMobileScene}from"/runtime/assets/BumpDeviceMotion.js";\n'+camera;
  if(!camera.includes('registerBumpSceneAsset as __bumpRegisterSceneAsset')){
    camera='import{registerBumpSceneAsset as __bumpRegisterSceneAsset}from"/runtime/assets/BumpScenePreparation.js";\n'+camera;
    const group='return ee.jsx("group",{ref:b,visible:D,children:a?';
    if(!camera.includes(group))throw new Error('Native asset registration needs updating.');
    camera=camera.replace(group,'return ee.jsx("group",{ref:U=>{if(b.current)__bumpRegisterSceneAsset(b.current,null);b.current=U;if(U)__bumpRegisterSceneAsset(U,{background:a&&!o,layoutRef:A,meshRef:R});},visible:D,children:a?');
  }
  if(!camera.includes('createBumpAssetReadiness as __bumpAssetReadiness')){
    camera='import{createBumpAssetReadiness as __bumpAssetReadiness}from"/runtime/assets/BumpAssetReadiness.js";\n'+camera;
    const start=camera.indexOf('p.useEffect(()=>t===void 0?void 0:',camera.indexOf('function Qo(')),end=camera.indexOf(';const{viewport:x}',start);
    if(start<0||end<0)throw new Error('Native preload lifecycle needs updating.');
    camera=camera.slice(0,start)+`const bumpReadiness=p.useRef(null);if(!bumpReadiness.current)bumpReadiness.current=__bumpAssetReadiness({start:()=>{se.current=!0;le.current(t,e)},finish:()=>{k.current=!0;fe.current(t,e)},notify:()=>{Wt.getState().activeSection===t&&vt.getState().isSceneLoaded(t)&&ui.getState().setIsLoaded(!0)}});
 p.useEffect(()=>{if(t===void 0)return;const enter=()=>bumpReadiness.current.enter();if(Wt.getState().activeSection===t)enter();return Wt.subscribe(L=>L.activeSection,L=>{if(L===t)enter()});},[t,e])`+camera.slice(end);
    const complete='const oe=p.useCallback(()=>{if(t===void 0||k.current||!se.current)return;k.current=!0,fe.current(t,e),Wt.getState().activeSection===t&&vt.getState().isSceneLoaded(t)&&ui.getState().setIsLoaded(!0)},[t,e])';
    if(!camera.includes(complete))throw new Error('Native asset completion needs updating.');
    camera=camera.replace(complete,'const oe=p.useCallback(()=>{if(t!==void 0)bumpReadiness.current.loaded()},[t,e])');
  }
  // Native scene entries identify their own camera. No global first-camera
  // lookup or section-specific projection writer is involved in mobile fitting.
  const entries={'HeroScene-CQfa8zjw.js':'hero','SidekickScene-BGrFo1zW.js':'workflow','AgenticScene-6ANDe0E9.js':'software','OperationsScene-C6j68HCe.js':'security','RetailScene-B0aB0Kby.js':'method','DeveloperScene-lYU-7T_c.js':'vision','B2BScene-CLnkLJDW.js':'company'};
  for(const [file,id]of Object.entries(entries)){
    const path=directory+'/'+file,source=readFileSync(path,'utf8');
    const output=source.replace(/theatreKey:(["'])camera\1(?!,bumpSceneId)/g,'theatreKey:"camera",bumpSceneId:"'+id+'"');
    if(!output.includes('bumpSceneId:"'+id+'"'))throw new Error('Missing stable camera owner: '+file);
    if(output!==source)writeFileSync(path,output);
  }
  // The wider mobile frustum stays covered while the phone orbits. Reserve
  // room for the maximum gaze on the first draw, then keep scenery scale fixed.
  if(!camera.includes('bumpBackdropKey')){
    camera=camera.replace('camera.updateMatrixWorld();camera.getWorldPosition(bumpLandscapeOrigin);',`const mobile=!!camera.userData.bumpMobileScene;
 const bumpBackdropKey=mobile?[camera.userData.bumpMobileScene,camera.aspect,camera.fov,layout.scale.x,layout.scale.y,layout.scale.z,mesh.scale.x,mesh.scale.y].join(':'):null;
 const cached=group.userData.bumpBackdropFit;
 if(mobile&&cached?.key===bumpBackdropKey){group.scale.set(cached.x,cached.y,cached.z);return;}
 camera.updateMatrixWorld();camera.getWorldPosition(bumpLandscapeOrigin);`)
      .replace('cover*=1.015;','cover*=mobile?1.25:1.015;')
      .replace('group.scale.set(layout.scale.x*cover,layout.scale.y*cover,layout.scale.z*cover);','group.scale.set(layout.scale.x*cover,layout.scale.y*cover,layout.scale.z*cover);\n if(mobile)group.userData.bumpBackdropFit={key:bumpBackdropKey,x:group.scale.x,y:group.scale.y,z:group.scale.z};');
  }
  if(!camera.includes('bumpNeutralBackdrop'))camera=camera
    .replace('camera.updateMatrixWorld();camera.getWorldPosition(bumpLandscapeOrigin);',`if(mobile&&camera.userData.bumpMobileView){
  const view=camera.userData.bumpMobileView,bumpNeutralBackdrop=camera.clone();
  bumpNeutralBackdrop.position.set(view.position.x,view.position.y,view.position.z);
  bumpNeutralBackdrop.lookAt(view.target.x,view.target.y,view.target.z);camera=bumpNeutralBackdrop;
 }
 camera.updateMatrixWorld();camera.getWorldPosition(bumpLandscapeOrigin);`)
    .replace('cover*=mobile?1.25:1.015;',`const halfY=camera.fov*Math.PI/360,halfX=Math.atan(Math.tan(halfY)*camera.aspect),margin=.16;
 cover*=mobile?Math.max(1.25,Math.tan(halfY+margin)/Math.tan(halfY),Math.tan(halfX+margin)/Math.tan(halfX)):1.015;`);
  camera=camera.replace('halfX=Math.atan(Math.tan(halfY)*camera.aspect),margin=.13;','halfX=Math.atan(Math.tan(halfY)*camera.aspect),margin=.16;');
  camera=camera.replace('if(n.includes("hero-landscape-v2")||n.includes("software-atelier-v3")||(a&&!o&&__bumpMobileScene()&&w.current.width<w.current.height))coverBumpLandscape','if(!__bumpMobileScene()&&(n.includes("hero-landscape-v2")||n.includes("software-atelier-v3")))coverBumpLandscape');
  writeFileSync(cameraPath,camera);
  const backgroundPath=directory+'/Background-DpyJh-o1.js',background=readFileSync(backgroundPath,'utf8');
  if(!background.includes('n?.getExtension("WEBGL_lose_context")?.loseContext()')){
    const probe='getContext("webgl2");e(n!==null)';
    if(!background.includes(probe))throw new Error('The WebGL capability probe needs updating.');
    writeFileSync(backgroundPath,background.replace(probe,probe+',n?.getExtension("WEBGL_lose_context")?.loseContext()'));
  }
  const fallback=readFileSync(backgroundPath,'utf8');
  if(!fallback.includes('bumpRefreshFallback')){
    writeFileSync(backgroundPath,fallback
      .replace('const mobile=window.innerWidth<=768?','const mobile=window.innerWidth<=939&&window.innerWidth<__bumpViewportHeight()?')
      .replace('function fC({sections:i}){const e=','function fC({sections:i}){const[,bumpRefreshFallback]=oe.useReducer(n=>n+1,0);const e=')
      .replace('p.current=__bumpViewportHeight()};return m()','p.current=__bumpViewportHeight();bumpRefreshFallback()};return m()'));
  }
  const compositor=readFileSync(backgroundPath,'utf8');
  if(!compositor.includes('prepareBumpSceneForRender as __bumpPrepareScene')){
    const current='h.render(Re,we)',next='h.render(W,Ae)';
    if(!compositor.includes(current)||!compositor.includes(next))throw new Error('The native compositor preparation needs updating.');
    writeFileSync(backgroundPath,'import{prepareBumpSceneForRender as __bumpPrepareScene}from"/runtime/assets/BumpScenePreparation.js";\n'+compositor
      .replace(current,'(__bumpPrepareScene(Re,we,p,ye),h.render(Re,we))')
      .replace(next,'(__bumpPrepareScene(W,Ae,p,lt),h.render(W,Ae))'));
  }
  const routePath=directory+'/(_locale).editions.winter2026-CdSmWtXg.js',route=readFileSync(routePath,'utf8');
  if(!route.includes('const bumpMobileQuality=')){
    const loader='function lo({hero:e,collections:t,globalBackgroundAssets:n,forceWebGL:i,quality:s,noBloom:a,useFallbackImages:o}){var C;';
    if(!route.includes(loader))throw new Error('The mobile rendering budget needs updating.');
    writeFileSync(routePath,route.replace(loader,loader+'const bumpMobileQuality=typeof window!=="undefined"&&window.innerWidth<=939;if(bumpMobileQuality&&s==="high")s="low";'));
  }
  const budgetRoute=readFileSync(routePath,'utf8');
  if(!budgetRoute.includes('if(bumpMobileQuality&&s){h.startTransition')){
    const detection='(async()=>{try{const{getGPUTier:M}';
    if(!budgetRoute.includes(detection))throw new Error('The mobile startup budget needs updating.');
    writeFileSync(routePath,budgetRoute.replace(detection,'(async()=>{try{if(bumpMobileQuality&&s){h.startTransition(()=>{f(s),p(!0)});return;}const{getGPUTier:M}'));
  }
}
