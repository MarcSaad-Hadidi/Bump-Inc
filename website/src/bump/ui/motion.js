import {r as React,j as R} from '/runtime/assets/components-BdJai906.js';
import {animate} from 'motion/mini';

const ease=[.22,1,.36,1];
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hidden='translateY(-7px) scale(.985)';
const shown='translateY(0px) scale(1)';

function searchLayout(element){
  const trigger=element.parentElement.querySelector('.bump-hero-search-trigger');
  const bounds=trigger.getBoundingClientRect();
  element.style.setProperty('--bump-search-height',bounds.height+'px');
  const edge=window.innerWidth<=600?12:20;
  const project=document.querySelector('.bump-header-actions');
  const right=project&&getComputedStyle(project).display!=='none'?project.getBoundingClientRect().left-20:innerWidth-edge;
  const available=right-bounds.left;
  if(available<260){
    Object.assign(element.style,{position:'fixed',top:bounds.top+'px',left:edge+'px',right:'auto',width:(innerWidth-edge*2)+'px'});
    return {collapsedWidth:bounds.width,collapsedTransform:`translateX(${bounds.left-edge}px)`};
  }
  Object.assign(element.style,{position:'absolute',top:'0px',left:'0px',right:'auto',width:Math.min(520,available)+'px'});
  return {collapsedWidth:bounds.width,collapsedTransform:shown};
}

// Retain the real panel until its exit finishes, including interrupted clicks.
export function MotionPanel({open,children,className='',onEntered,expand=false,...props}){
  const [present,setPresent]=React.useState(open);
  const ref=React.useRef(null),entered=React.useRef(onEntered);
  entered.current=onEntered;
  React.useLayoutEffect(()=>{
    if(!present){if(open)setPresent(true);return;}
    const element=ref.current;
    if(!element)return;
    let active=true;
    let collapsedTransform=shown,collapsedWidth=100;
    if(expand){
      ({collapsedWidth,collapsedTransform}=searchLayout(element));
    }
    const clip=expand?`inset(0px ${Math.max(0,element.offsetWidth-collapsedWidth)}px 0px 0px round 5px)`:'none';
    if(!element.dataset.motionState){element.style.opacity=expand?'1':'0';element.style.transform=expand?collapsedTransform:hidden;if(expand)element.style.clipPath=clip;}
    element.dataset.motionState=open?'opening':'closing';
    element.inert=!open;
    const animation=animate(element,expand?{clipPath:open?'inset(0px 0px 0px 0px round 5px)':clip,transform:open?shown:collapsedTransform,opacity:open?1:0}:{opacity:open?1:0,transform:open?shown:hidden},{duration:reduced()?0:open?.4:.26,ease});
    animation.then(()=>{
      if(!active)return;
      element.dataset.motionState=open?'open':'closed';
      if(open)entered.current?.(element);else setPresent(false);
    });
    return()=>{active=false;animation.stop();};
  },[open,present,expand]);
  React.useEffect(()=>{
    if(!present||!expand)return;
    const update=()=>{if(ref.current)searchLayout(ref.current);};
    window.addEventListener('resize',update);
    window.visualViewport?.addEventListener('resize',update);
    return()=>{window.removeEventListener('resize',update);window.visualViewport?.removeEventListener('resize',update);};
  },[present,expand]);
  if(!present)return null;
  return R.jsx('div',{...props,ref,className:'bump-motion-panel '+className,'aria-hidden':open?undefined:true,children});
}

// Native dialog keeps its focus trap/top layer; Motion handles its actual panel.
export function useAnimatedDialog(ref,open){
  React.useLayoutEffect(()=>{
    const dialog=ref.current;
    if(!dialog||(!open&&!dialog.open))return;
    const panel=dialog.querySelector('.bump-dialog-inner');
    if(!panel)return;
    let active=true;
    const fresh=!dialog.open;
    dialog.inert=!open;
    dialog.dataset.motionState=open?'opening':'closing';
    if(open&&fresh){
      panel.style.opacity='0';panel.style.transform='translateY(20px) scale(.975)';
      dialog.showModal();
      dialog.querySelector('input[type="search"]')?.focus({preventScroll:true});
    }
    const animation=animate(panel,{
      opacity:open?1:0,
      transform:open?'translateY(0px) scale(1)':'translateY(12px) scale(.985)'
    },{duration:reduced()?0:open?.38:.24,ease});
    animation.then(()=>{
      if(!active)return;
      dialog.dataset.motionState=open?'open':'closed';
      if(!open){dialog.close();dialog.inert=false;}
    });
    return()=>{active=false;animation.stop();};
  },[open,ref]);
}
