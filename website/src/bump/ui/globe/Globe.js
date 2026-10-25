import {r as React,j as R} from '/runtime/assets/components-BdJai906.js';

// The renderer is loaded only when Montréal is opened. The globe has its own
// camera and resources, independent of the approved full-screen hero scene.
export function LocationGlobe({replay=0}){
  const host=React.useRef(null);
  const [phase,setPhase]=React.useState('globe');
  React.useEffect(()=>{
    let cancelled=false,dispose;
    setPhase('globe');
    import('/runtime/assets/BumpGlobe.js').then(async({createGlobe})=>{
      if(cancelled)return;
      const cleanup=await createGlobe(host.current,{onPhase:setPhase});
      if(cancelled)cleanup();else dispose=cleanup;
    }).catch(()=>{if(!cancelled)setPhase('unavailable');});
    return()=>{cancelled=true;dispose?.();};
  },[replay]);
  return R.jsxs('div',{className:'bump-location-globe',ref:host,'data-phase':phase,role:'img','aria-label':'Globe en trois dimensions : la caméra rejoint le pin puis zoome sur Montréal, au Québec.',children:[
    R.jsx('div',{className:'bump-globe-shadow','aria-hidden':true}),
    R.jsx('div',{className:'bump-globe-viewport','aria-hidden':true}),
    R.jsxs('div',{className:'bump-globe-caption','aria-hidden':true,children:[
      R.jsx('span',{className:'bump-globe-caption-rule'}),
      R.jsx('span',{className:'bump-globe-city',children:'Montréal'}),
      R.jsx('span',{className:'bump-globe-coordinates',children:'45.5019° N · 73.5674° O'})
    ]}),
    R.jsx('span',{className:'bump-globe-unavailable',children:phase==='unavailable'?'45.5019° N · 73.5674° O':null})
  ]});
}
