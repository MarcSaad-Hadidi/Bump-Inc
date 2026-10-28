import {getBumpViewportHeight} from './viewport.js';

// Fit the supplied figure around its real controls and caption. Its geometry,
// viewBox and animation are unchanged; only the host's available display width.
export function mountModelViewportFit(root, kind) {
  if (!['workflow','integration','security','method','vision','port'].includes(kind)) return;
  let frame=0, live, stage, lastWidth=-1, disposed=false;
  const number=value=>parseFloat(value)||0;
  const outer=element=>{const css=getComputedStyle(element);return css.display==='none'||['absolute','fixed'].includes(css.position)?0:element.getBoundingClientRect().height+number(css.marginTop)+number(css.marginBottom);};
  const fit=()=>{
    frame=0;
    // The existing narrow/landscape layouts and reading stops own phones.
    if(innerWidth<=939){root.removeAttribute('data-bump-model-fit');root.style.removeProperty('--bump-model-stage-width');return;}
    stage=root.querySelector('.iso-stage');
    live=stage?.closest('.bump-workflow-live,.bump-tools-live,.bump-security-live,.bump-method-live,.bump-vision-live,.bump-port-live');
    const figure=stage?.closest('.iso-figure'),svg=stage?.matches('svg[viewBox]')?stage:stage?.querySelector('svg[viewBox]');
    if(!live||!figure||!svg||!root.clientWidth)return;
    const box=svg.viewBox.baseVal;if(!box.width||!box.height)return;
    const vh=getBumpViewportHeight(),header=document.querySelector('.bump-header')?.getBoundingClientRect().bottom||60;
    const clearance=Math.max(84,vh*.105,header+16),inset=['method','security'].includes(kind)?0:clearance;
    const css=getComputedStyle(live);
    const drawing=[...live.children].find(child=>child.contains(stage));
    const extras=[...live.children].filter(child=>child!==drawing).reduce((sum,child)=>sum+outer(child),0);
    const figureExtras=Math.max(0,outer(drawing)-stage.getBoundingClientRect().height);
    const overhead=extras+figureExtras+number(css.paddingTop)+number(css.paddingBottom);
    const width=Math.min(root.clientWidth,Math.max(120,vh-inset-28-overhead)*box.width/box.height);
    root.dataset.bumpModelFit='true';
    const value=Math.floor(width)+'px';
    if(root.style.getPropertyValue('--bump-model-stage-width')!==value)root.style.setProperty('--bump-model-stage-width',value);
    if(live!==observed){observed=live;for(const child of live.children)if(child!==drawing)resize.observe(child);}
  };
  const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(fit);};
  let observed;
  const resize=new ResizeObserver(entries=>{if(entries.some(entry=>entry.target!==root)||root.clientWidth!==lastWidth){lastWidth=root.clientWidth;schedule();}});
  resize.observe(root);
  const mutation=new MutationObserver(records=>{if(records.some(record=>!record.target.closest?.('.iso-stage')))schedule();});
  mutation.observe(root,{childList:true,subtree:true});
  window.addEventListener('resize',schedule);window.addEventListener('bump:viewport-changed',schedule);
  document.fonts?.ready.then(schedule);schedule();
  return()=>{disposed=true;resize.disconnect();mutation.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);window.removeEventListener('bump:viewport-changed',schedule);};
}
