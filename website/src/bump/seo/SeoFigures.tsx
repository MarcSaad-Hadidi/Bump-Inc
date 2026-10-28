import {useEffect,useRef,useState,type ComponentType} from 'react';
import {hydratePoster} from './react-root.js';
import {LazyFigure} from '../../components/bump-anatomy/shared/LazyFigure';
import {figureProps,seoFigures} from './figures.js';
import {figureStories,currentFigureStep} from './figure-stories.js';
import {mountDemoTransport,createDemoTimeout,demoIsPaused} from '../ui/demoTransport.js';
import {observeDemoReady} from '../ui/demoReady.js';
import {mountVaultRecovery} from './vault-recovery.js';

function present(Native:ComponentType,kind:string) {
 return function SeoNativeFigure() {
  const root=useRef<HTMLDivElement>(null),[revision,restart]=useState(0),[reading,setReading]=useState(''),[current,setCurrent]=useState(0);
  const paused=useRef(false);
  const story=figureStories[kind as keyof typeof figureStories];
  useEffect(()=>{
   const node=root.current;if(!node)return;
   const motion=matchMedia('(prefers-reduced-motion: reduce)');
   const replay=()=>{setCurrent(0);restart(n=>n+1);};
   const motionChanged=replay;motion.addEventListener('change',motionChanged);
   let ready=false;
   const transport=mountDemoTransport(node,'la démonstration');
   if(paused.current)node.querySelector<HTMLButtonElement>('.bump-demo-toggle')?.click();
   const timer=createDemoTimeout(node,()=>ready);
   const recovery=kind==='security-engine'&&!motion.matches?mountVaultRecovery(node,{restart:replay,cancelReplay:()=>timer.clear()}):null;
   const readout=node.querySelector('[data-readout]');
   const steps=[...node.querySelectorAll('[data-step]')];
   const sync=()=>{
    const text=readout?.textContent||'';setReading(text);
    setCurrent(currentFigureStep(steps,story.length));
    // The delivered workflow/vault play one native tour. Repeat by remounting
    // that same component after its settled final step, like the landing.
    const last=steps.length>0&&steps.at(-1)?.hasAttribute('data-current');
    if(recovery?.pending){timer.clear();return;}
    if(['workflow','security-engine'].includes(kind)&&last&&!text.includes('→')&&!motion.matches)timer.schedule(4500,replay);
    else timer.clear();
   };
   // Follow only the native reading and stage controls, not the SVG's many
   // moving shapes/counters or this React caption's own text updates.
   const observer=new MutationObserver(sync);
   if(readout)observer.observe(readout,{subtree:true,childList:true,characterData:true});
   steps.forEach(step=>observer.observe(step,{attributes:true,attributeFilter:['data-current']}));
   const stopReady=observeDemoReady(node,(value:boolean)=>{ready=value;recovery?.setReady(value);if(ready)timer.resume();else timer.suspend();},{onReenter:replay});
   sync();
   return()=>{paused.current=demoIsPaused(node);stopReady();observer.disconnect();recovery?.destroy();timer.destroy();transport();motion.removeEventListener('change',motionChanged);};
  },[revision]);
  return <div ref={root} className="seo-anatomy-live" data-bump-transport="true" data-bump-fixed-timing="true" data-seo-native={kind} data-seo-step={current} data-seo-run={revision}>
   <div className="seo-native-drawing"><Native key={revision}/></div>
   <div className="seo-stage-copy" aria-live="off">
    {story.map(([title,detail],index)=><div key={index} className="seo-step-panel" data-active={String(current===index)} aria-hidden={current!==index}>
     <span className="seo-step-number">{String(index+1).padStart(2,'0')}<span> / {String(story.length).padStart(2,'0')}</span></span>
     <div><h3>{title}</h3><p>{detail}</p></div>
    </div>)}
   </div>
   <p className="seo-native-reading" aria-hidden="true">{reading}</p>
  </div>;
 };
}

// Stable module-level loaders: only the visible figure's native module loads.
const loaders={
 workflow:()=>import('../../components/bump-anatomy/workflow/Workflow').then(m=>({default:present(m.default,'workflow')})),
 ai:()=>import('../../components/bump-anatomy/ia/AssistantIA').then(m=>({default:present(m.default,'ia')})),
 software:()=>import('../../components/bump-anatomy/logiciel/TableauOperations').then(m=>({default:present(m.default,'logiciel')})),
 security:()=>import('../../components/bump-anatomy/security-engine/SecurityEngine').then(m=>({default:present(m.default,'security-engine')})),
 expertise:()=>import('../../components/bump-anatomy/aiguillage/Aiguillage').then(m=>({default:present(m.default,'aiguillage')})),
 approach:()=>import('../../components/bump-anatomy/methode/MethodLab').then(m=>({default:present(m.default,'methode')})),
 about:()=>import('../../components/bump-anatomy/port/BumpPort').then(m=>({default:present(m.default,'port')})),
};
export function mountSeoFigures() {
 if(!document.documentElement.lang.startsWith('fr'))return()=>{};
 const mounted:{node:HTMLElement,root:{unmount():void},poster:string}[]=[];
 for(const node of document.querySelectorAll<HTMLElement>('[data-seo-figure]:not([data-poster-only])')) {
  const id=node.dataset.seoFigure as keyof typeof loaders;if(!seoFigures[id]||!loaders[id])continue;
  const props=figureProps(id,'fr');if(!props)continue;
  const poster=node.innerHTML;
  const root=hydratePoster(node,<LazyFigure {...props} load={loaders[id]}/>);
  mounted.push({node,root,poster});
 }
 return()=>{for(const{node,root,poster}of mounted){root.unmount();node.innerHTML=poster;}};
}
