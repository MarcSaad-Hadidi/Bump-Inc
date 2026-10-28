export const viewportBreakpoints=[400,500,600,730,740,750,760,800,810,820,840,999];
const breakpoints=viewportBreakpoints;

export function resolveViewport(previous,next){
  if(next.mobile&&previous?.mobile&&Math.abs(previous.width-next.width)<1&&previous.orientation===next.orientation&&!next.resizableWindow)return previous;
  return {...next,height:next.mobile?Math.max(1,Math.min(next.height,next.smallHeight||next.height)):next.height};
}

export function getBumpViewportHeight(){
  const locked=typeof document!=='undefined'?Number(document.documentElement?.dataset.bumpViewportHeight):0;
  return locked||(typeof innerHeight==='number'?innerHeight:800);
}
export function getBumpBackgroundHeight(){
  return typeof document!=='undefined'&&document.documentElement?.dataset.bumpStableViewport?getBumpViewportHeight():typeof window!=='undefined'?window.outerHeight:800;
}

export function installBumpViewport(){
  if(typeof window==='undefined'||typeof document==='undefined'||typeof document.createElement!=='function')return()=>{};
  const root=document.documentElement;
  if(root.dataset.bumpViewportReady==='true')return()=>{};
  root.dataset.bumpViewportReady='true';
  let current=null;
  const update=()=>{
    const width=window.innerWidth,height=window.innerHeight,coarse=matchMedia('(pointer: coarse)').matches;
    const mobile=width<=939||coarse,orientation=window.screen?.orientation?.angle??window.orientation??0;
    const resizableWindow=!coarse&&!navigator.maxTouchPoints&&window.top===window;
    let smallHeight=height;
    if(mobile&&(!current||!current.mobile||Math.abs(current.width-width)>=1||current.orientation!==orientation||resizableWindow)){
      const probe=document.createElement('div');
      probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;width:1px;height:100svh;contain:strict;';
      root.append(probe);smallHeight=probe.getBoundingClientRect().height||height;probe.remove();
    }
    const next=resolveViewport(current,{width,height,smallHeight,mobile,orientation,resizableWindow});
    if(next===current)return;
    const changed=!current||current.width!==next.width||current.height!==next.height||current.mobile!==next.mobile;
    current=next;
    if(mobile){
      root.dataset.bumpStableViewport='true';root.dataset.bumpViewportHeight=String(next.height);
      root.style.setProperty('--bump-viewport-unit',next.height/100+'px');
      for(const point of breakpoints){root.toggleAttribute('data-bump-height-max-'+point,next.height<=point);root.toggleAttribute('data-bump-height-min-'+point,next.height>=point);}
    }else{
      delete root.dataset.bumpStableViewport;delete root.dataset.bumpViewportHeight;
      root.style.removeProperty('--bump-viewport-unit');root.style.removeProperty('--bump-header-space');
      for(const point of breakpoints){root.removeAttribute('data-bump-height-max-'+point);root.removeAttribute('data-bump-height-min-'+point);}
    }
    if(changed)window.dispatchEvent(new CustomEvent('bump:viewport-changed',{detail:{width,height:next.height}}));
  };
  window.addEventListener('resize',update);window.addEventListener('orientationchange',update);window.addEventListener('pageshow',update);update();
  return()=>{window.removeEventListener('resize',update);window.removeEventListener('orientationchange',update);window.removeEventListener('pageshow',update);delete root.dataset.bumpViewportReady;};
}

if(typeof window!=='undefined'&&typeof document!=='undefined')installBumpViewport();
