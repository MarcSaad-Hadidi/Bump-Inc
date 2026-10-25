import {r as React,j as R} from '/runtime/assets/components-BdJai906.js';
import {installDeviceMotion,subscribeDeviceMotion,toggleDeviceMotion,getDeviceMotionState} from '/runtime/assets/BumpDeviceMotion.js';

export default function DeviceMotionControl(){
 const [state,setState]=React.useState(getDeviceMotionState);
 React.useEffect(()=>{const unsubscribe=subscribeDeviceMotion(setState),stop=installDeviceMotion();return()=>{unsubscribe();stop();};},[]);
 if(!state.mobile||['unsupported','reduced'].includes(state.status))return null;
 const english=document.documentElement.lang==='en',label=state.enabled?(english?'Disable motion depth':'Désactiver l’effet 3D'):(english?'Enable motion depth':'Activer l’effet 3D'),prompt=state.needsPermission&&!state.enabled;
 return R.jsxs('button',{type:'button',className:'bump-device-motion','data-prompt':String(prompt),'aria-label':label,'aria-pressed':state.enabled,disabled:state.status==='requesting',title:state.status==='denied'?(english?'Motion access was denied by your browser':'L’accès au mouvement a été refusé par le navigateur'):label,onClick:()=>void toggleDeviceMotion(),children:[R.jsx('svg',{viewBox:'0 0 24 24',fill:'none','aria-hidden':true,children:R.jsx('path',{d:'m9 3 8 2-4 16-8-2z M10 6l4 1 M3 5 1 8l3-1 M21 19l2-3-3-1',stroke:'currentColor',strokeWidth:1.5,strokeLinecap:'round',strokeLinejoin:'round'})}),prompt&&R.jsx('span',{children:english?'Motion 3D':'Incliner en 3D'})]});
}
