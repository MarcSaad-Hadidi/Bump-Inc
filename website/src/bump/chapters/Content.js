import {r as React,j as R} from '/runtime/assets/components-BdJai906.js';
import {Dialog,Brief} from '../ui/ProjectForm.js';
import {DeferredMachine} from '../machines/DeferredMachine.jsx';
import {WorkflowCloud} from '../workflow/WorkflowCloud.jsx';
const SecurityContentGroup=React.lazy(()=>import('/runtime/assets/BumpSecurityDemos.js').then(module=>({default:module.SecurityContentGroup})));
const SoftwareDemoSection=React.lazy(()=>import('/runtime/assets/BumpSoftwareDemos.js').then(module=>({default:module.SoftwareDemoSection})));
export {BumpSoftwareStory} from '../software/SoftwareStory.jsx';
export {Dialog,Brief};
const h=(tag,props,...children)=>R.jsxs(tag,{...props,...(children.length?{children:children.flat()}:{})});
const paths={
 flow:'M4 5h6v6H4z M16 13h6v6h-6z M10 8h7v5 M7 11v5h9',
 code:'m9 6-6 6 6 6 M15 6l6 6-6 6 M13 3l-2 18',
 shield:'M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6z M8 12l3 3 5-6',
 mail:'M3 5h18v14H3z m0 0 9 8 9-8',
 check:'m5 12 4 4 10-10',
 doc:'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',
 link:'m10 13 4-4 M9 15l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0 M13 9l2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
 spark:'m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z'
};
function Icon({name='flow',...props}){return h('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.35,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,...props},h('path',{d:paths[name]||paths.flow}));}
function Action({children,onClick,disabled=false,className=''}){return h('button',{type:'button',className:'bump-action '+className,onClick,disabled},children,h('span',{'aria-hidden':true},'↗'));}
const label=(text)=>h('p',{className:'bump-lab-label'},text);

function Detail({card,onClose}){
 return h(Dialog,{open:!!card,onClose,label:card?.title||'Détail du service'},card&&h(React.Fragment,{},h('p',{className:'bump-eyebrow'},card.divisionLabel),card.chapter==='developer'&&h('p',{className:'bump-future'},'VISION FUTURE · NON DISPONIBLE'),h('h2',{},card.title),h('div',{className:'bump-detail-intro',dangerouslySetInnerHTML:{__html:card.descriptionHtml}}),h('ol',{className:'bump-detail-list'},...card.details.map((text,i)=>h('li',{key:text},h('span',{},String(i+1).padStart(2,'0')),text))),h(Action,{onClick:()=>{onClose();window.dispatchEvent(new Event('bump:brief'));}},'Parlons de votre projet')));
}

function CompanyDemo(){return h(DeferredMachine,{kind:'port',id:'bump-port',className:'bump-company-manifesto'});}

export function BumpGroup({cards,title,isFirstSection,isLastSection}){
 const [selected,setSelected]=React.useState(null),chapter=cards[0]?.chapter;
 if(chapter==='sidekick')return h('div',{className:'bump-group '+(isFirstSection?'bump-group-first ':'')+(isLastSection?'bump-group-last':''),'data-nav-theme':'light','data-nav-style':'solid'},isFirstSection?h(DeferredMachine,{kind:'workflow',className:'bump-workflow-execution'}):h(WorkflowCloud,{}));
 if(chapter==='online')return h('div',{id:isFirstSection?'software-capabilities':undefined,className:'bump-group bump-software-capabilities '+(isFirstSection?'bump-group-first ':'')+(isLastSection?'bump-group-last':''),'data-nav-theme':'light','data-nav-style':'solid'},h(React.Suspense,{fallback:h('div',{className:'bsd-loading','aria-busy':true},h('h3',{},title))},h(SoftwareDemoSection,{kind:isFirstSection?'operations':'data',handles:cards.map(card=>card.handle)})),!isFirstSection&&h(DeferredMachine,{kind:'integration',id:'software-integration'}));
 if(chapter==='retail')return h('div',{className:'bump-group '+(isFirstSection?'bump-group-first ':'')+(isLastSection?'bump-group-last':''),'data-nav-theme':'light','data-nav-style':'solid'},h(DeferredMachine,{kind:'method',id:'method-workshop'}));
 if(chapter==='operations')return h('div',{className:'bump-group bump-security-content '+(isFirstSection?'bump-group-first ':'')+(isLastSection?'bump-group-last':''),'data-nav-theme':'light','data-nav-style':'solid'},h(React.Suspense,{fallback:h('div',{className:'bsc-loading','aria-busy':true},h('h3',{},title))},h(SecurityContentGroup,{first:isFirstSection})));
 if(chapter==='developer')return h('div',{className:'bump-group '+(isFirstSection?'bump-group-first ':'')+(isLastSection?'bump-group-last':''),'data-nav-theme':'light','data-nav-style':'solid'},isFirstSection?h(DeferredMachine,{kind:'vision',id:'vision-sculpture'}):h(DeferredMachine,{kind:'research',id:'vision-research-network'}));
 if(chapter==='b2b')return h('div',{className:'bump-group '+(isFirstSection?'bump-group-first ':'')+(isLastSection?'bump-group-last':''),'data-nav-theme':'light','data-nav-style':'solid'},isFirstSection?h(CompanyDemo,{}):h(DeferredMachine,{kind:'company-flow',id:'company-connections'}));
 const Demo={b2b:CompanyDemo}[chapter];
 return h('div',{className:'bump-group '+(isFirstSection?'bump-group-first ':'')+(isLastSection?'bump-group-last':''),'data-nav-theme':'light','data-nav-style':'solid'},
  title&&chapter!=='developer'&&!(chapter==='b2b'&&isFirstSection)&&h('h3',{className:'bump-group-title'},title),isFirstSection&&chapter==='developer'&&h(DeferredMachine,{kind:'vision',id:'vision-sculpture'}),isFirstSection&&Demo&&h(Demo,{}),h('div',{className:'bump-services'},...cards.map((card,i)=>h('article',{className:'bump-service',id:card.handle,key:card.handle},h('span',{className:'bump-service-number','aria-hidden':true},String(i+1).padStart(2,'0')),h('div',{className:'bump-service-copy'},chapter==='developer'&&h('span',{className:'bump-future'},'VISION FUTURE'),h('h4',{},card.title),h('div',{dangerouslySetInnerHTML:{__html:card.descriptionHtml}})),h('button',{type:'button',className:'bump-service-open','aria-label':card.title+' — découvrir',onClick:()=>card.handle==='bump-preparer-brief'?window.dispatchEvent(new Event('bump:brief')):setSelected(card)},h(Icon,{name:chapter==='developer'?'spark':chapter==='operations'?'shield':chapter==='online'?'code':'flow'}),h('span',{},card.handle==='bump-preparer-brief'?'Parlons-en':'Découvrir'),h('span',{'aria-hidden':true},'↗'))))),h(Detail,{card:selected,onClose:()=>setSelected(null)}));
}
