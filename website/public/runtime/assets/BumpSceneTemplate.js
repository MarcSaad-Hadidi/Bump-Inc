import {j as jsx} from './components-BdJai906.js';
import {u as useSheet,S as Sheet,E as Effects} from './Effects-Co92NzQw.js';
import {E as Environment,C as Camera,P as Particles,a as Light,A as Asset} from './Butterflies-pNugjQAd.js';

export function BumpScene({sectionIndex,data,name}) {
  const sheet=useSheet({name,stateUrl:data.backgroundAnimation?.url,sectionIndex});
  if(!sheet)return null;
  return jsx.jsxs(Sheet,{sheet,children:[
    jsx.jsx(Environment,{}),
    jsx.jsx(Camera,{theatreKey:'camera',position:[0,0,6],target:[0,0,0],fov:35}),
    jsx.jsx(Effects,{theatreKey:'effects'}),
    jsx.jsx(Particles,{theatreKey:'particles'}),
    jsx.jsx(Light,{theatreKey:'light-1',position:[-3,3,4],intensity:2,color:'#ffe5c2'}),
    jsx.jsx(Light,{theatreKey:'light-2',position:[3,0,2],intensity:1,color:'#c9d1e8'}),
    ...data.backgroundAssets.map((asset,index)=>jsx.jsx(Asset,{
      url:asset.url,theatreKey:`asset-${index+1}`,sectionIndex,
      metalness:index===0?.2:0,roughness:.65
    },asset.id))
  ]});
}
