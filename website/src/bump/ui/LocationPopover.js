import {r as React,j as R} from '/runtime/assets/components-BdJai906.js';
import {MotionPanel} from './motion.js';
import {LocationGlobe} from './globe/Globe.js';
import {CloseIcon,ReplayIcon,ArrowUpRight} from './Icons.js';

const h=(tag,props,...children)=>R.jsxs(tag,{...props,...(children.length?{children:children.flat()}:{})});
const mapLink='https://www.openstreetmap.org/?mlat=45.5019&mlon=-73.5674#map=12/45.5019/-73.5674';

export function LocationPopover({onOpen}){
  const [open,setOpen]=React.useState(false),[flight,setFlight]=React.useState(0);
  const anchor=React.useRef(null),trigger=React.useRef(null);
  const openTimer=React.useRef(null),closeTimer=React.useRef(null);
  const inputMode=React.useRef('pointer'),skipFocus=React.useRef(false);

  const clearTimers=()=>{clearTimeout(openTimer.current);clearTimeout(closeTimer.current);openTimer.current=closeTimer.current=null;};
  const show=()=>{clearTimers();onOpen?.();setOpen(true);};
  const hide=(restoreFocus=false)=>{
    clearTimers();setOpen(false);
    if(restoreFocus){skipFocus.current=true;trigger.current?.focus({preventScroll:true});skipFocus.current=false;}
  };
  const enter=event=>{
    if(event.pointerType==='touch')return;
    inputMode.current='pointer';clearTimers();openTimer.current=setTimeout(show,100);
  };
  const leave=event=>{
    if(event?.pointerType==='touch')return;
    clearTimeout(openTimer.current);openTimer.current=null;
    if(!closeTimer.current)closeTimer.current=setTimeout(()=>hide(),140);
  };
  React.useEffect(()=>()=>clearTimers(),[]);
  React.useEffect(()=>{
    const keyboard=event=>{if(event.key==='Tab')inputMode.current='keyboard';};
    document.addEventListener('keydown',keyboard,true);
    return()=>document.removeEventListener('keydown',keyboard,true);
  },[]);
  React.useEffect(()=>{
    if(!open)return;
    const outside=event=>{if(!anchor.current?.contains(event.target))hide();};
    const move=event=>{
      if(event.pointerType==='touch')return;
      inputMode.current='pointer';
      // Test only the label and the real panel, not the header's flex space.
      const target=event.target.closest?.('.bump-location,.bump-location-popover');
      if(target&&anchor.current?.contains(target)){clearTimeout(closeTimer.current);closeTimer.current=null;}
      else leave(event);
    };
    const escape=event=>{if(event.key==='Escape'){event.preventDefault();hide(true);}};
    const blur=()=>{if(inputMode.current==='pointer')hide();};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('pointermove',move,{capture:true,passive:true});
    document.documentElement.addEventListener('pointerleave',blur);
    document.addEventListener('keydown',escape);
    window.addEventListener('blur',blur);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('pointermove',move,true);document.documentElement.removeEventListener('pointerleave',blur);document.removeEventListener('keydown',escape);window.removeEventListener('blur',blur);};
  },[open]);

  return h('div',{
    ref:anchor,className:'bump-location-anchor',onPointerLeave:leave,
    onBlur:event=>{
      if(!event.currentTarget.contains(event.relatedTarget)){
        clearTimers();
        closeTimer.current=setTimeout(()=>{if(!anchor.current?.contains(document.activeElement))setOpen(false);},200);
      }
    }
  },
    h('button',{
      ref:trigger,type:'button',className:'bump-location','aria-expanded':open,
      'aria-controls':'bump-montreal-map','aria-haspopup':'dialog','aria-label':'Montréal, Québec',
      onPointerEnter:enter,
      onPointerDown:event=>{inputMode.current=event.pointerType==='touch'?'touch':'pointer';},
      onFocus:event=>{if(!skipFocus.current&&inputMode.current==='keyboard'&&event.currentTarget.matches(':focus-visible'))show();},
      onClick:event=>{if(inputMode.current==='touch'||event.detail===0){if(open)hide();else show();}else show();}
    },h('span',{className:'bump-location-word'},'Montréal',h('span',{className:'bump-location-region'},', Québec')),h('svg',{className:'bump-location-symbol',viewBox:'0 0 24 24',fill:'none','aria-hidden':true},h('circle',{cx:12,cy:12,r:9,stroke:'currentColor',strokeWidth:1.5}),h('ellipse',{cx:12,cy:12,rx:4,ry:9,stroke:'currentColor',strokeWidth:1.2}),h('path',{d:'M3 12h18',stroke:'currentColor',strokeWidth:1.2}))),
    h(MotionPanel,{
      open,id:'bump-montreal-map',className:'bump-location-popover',role:'dialog',
      'aria-modal':false,'aria-labelledby':'bump-montreal-title',
      onPointerEnter:()=>clearTimers(),onPointerLeave:leave,
      onFocus:()=>clearTimers()
    },
      h('div',{className:'bump-location-copy'},
        h('div',{},h('strong',{id:'bump-montreal-title'},'Montréal'),h('span',{},'Québec, Canada')),
        h('button',{type:'button',className:'bump-location-close','aria-label':'Fermer le globe',onClick:()=>hide(true)},h(CloseIcon,{}))),
      h(LocationGlobe,{replay:flight}),
      h('div',{className:'bump-location-foot'},
        h('button',{type:'button',className:'bump-globe-replay','aria-label':'Rejouer le voyage vers Montréal',onClick:()=>setFlight(n=>n+1)},h(ReplayIcon,{}),'Revoir le voyage'),
        h('a',{href:mapLink,target:'_blank',rel:'noopener noreferrer'},'Ouvrir la carte',h(ArrowUpRight,{}))),
      h('details',{className:'bump-globe-attribution'},
        h('summary',{},'Images : NASA / GSFC · EOX / Copernicus'),
        h('p',{},'Terre : NASA/GSFC, Reto Stockli. Montréal : ',h('a',{href:'https://s2maps.eu',target:'_blank',rel:'noopener noreferrer'},'Sentinel-2 cloudless'),' par ',h('a',{href:'https://eox.at',target:'_blank',rel:'noopener noreferrer'},'EOX IT Services GmbH'),' (données Copernicus Sentinel 2016 & 2017 modifiées), ',h('a',{href:'https://creativecommons.org/licenses/by/4.0/',target:'_blank',rel:'noopener noreferrer'},'CC BY 4.0'),'.'))
    )
  );
}
