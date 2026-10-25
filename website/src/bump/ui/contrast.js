import {getBumpViewportHeight} from './viewport.js';
import {getBumpFallbackFrame} from '/runtime/assets/BumpAssistedScroll.js';
import {fallbackPaperContains,fallbackPaperClip} from './chapterMotion.js';
// Surface-aware editorial ink, sampled immediately after the existing native
// compositor renders. No second scroll controller, screenshot UI or render loop.
const selector=[
 'main section>div:first-child>div:first-child>h2',
 'main section>div:first-child>div:first-child>[data-nav-style=solid] .narrative-1',
 '.bump-editorial-title','.bump-nav-logo','.bump-header .bump-nav-trigger','.bump-header .bump-location',
 'aside[data-section-name=side-nav] .sidebar-link','aside[data-section-name=side-nav]>p','aside[data-section-name=side-nav] .title-link',
 '.bump-group-title','.bump-research-heading h3','.bump-research-heading>p:last-child','.bump-research-explanation h4','.bump-research-explanation p','.bsd-editorial h3','.bsd-editorial p','.bsd-editorial-link','.bsd-handwritten','.bsd-ops-annotation',
 '.bsc-editorial h3','.bsc-editorial p','.bsc-editorial .bsc-eyebrow','.bsc-text-link','.bsc-row-annotation h4','.bsc-row-annotation p',
 '.bump-flow-intro h3','.bump-flow-intro p','.bump-flow-narration strong','.bump-flow-narration p','.bump-lab-footnote',
 '.bump-company-manifesto>h3','.bump-company-columns p','.bump-service-copy h4','.bump-service-copy p','.bump-method-copy h3','.bump-method-copy p','.bump-method-copy li','.bump-vision-description h3','.bump-vision-description p','.bump-vision-description li',
 '.bump-workflow-description h3','.bump-workflow-description p','.bump-tools-heading','.bump-tools-description h4','.bump-tools-description p','.bump-security-heading','.bump-security-description h4','.bump-security-description p','.bump-method-heading','.bump-method-description h4','.bump-method-description p','.bump-company-flow h3','.bump-company-flow-caption h4','.bump-company-flow-caption p','.bump-port-heading','.bump-port-explanation h4','.bump-port-explanation p','.bump-vision-heading','.bump-vision-explanation h4','.bump-vision-explanation p'
].join(',');
let targets=[],stale=true,lastAt=-Infinity,lastScroll=-1,lastPosition=null,lastSize='',observer,fallbackFrame=null;
function refresh(){
 if(!observer&&document.body){observer=new MutationObserver(records=>{if(records.some(record=>!record.target.closest?.('.iso-stage,.bvs-art,.bsc-ui,.bsd-app')&&[...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1)))stale=true;});observer.observe(document.body,{childList:true,subtree:true});}
 if(stale){targets=[...document.querySelectorAll(selector)].filter(e=>!e.closest('dialog,.bsc-ui,.bsc-orbit-panel,.bsd-app,.bsd-assistant,.bump-ops-screen'));stale=false;}
}
function ink(node,paper){const value=paper?'#302e28':'#fff9ed',surface=paper?'paper':'scene';if(node.dataset.bumpSurface!==surface){node.dataset.bumpContrast='true';node.dataset.bumpSurface=surface;node.style.setProperty('--bump-adaptive-ink',value);}}
function fallbackPaper(node,x,y){if(fallbackFrame)return fallbackPaperContains(fallbackFrame.paper,x/innerWidth,y/getBumpViewportHeight());if(node.closest('.bump-group,.bg-light'))return true;return [...document.querySelectorAll('main section>div:first-child>.bg-light')].some(e=>{const b=e.getBoundingClientRect();return b.top<=1&&b.bottom>=getBumpViewportHeight()-1||x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom;});}
export function updateBumpSurfaceContrast(canvas,position,color=[.862745,.862745,.815686]){
 if(typeof document==='undefined'||document.hidden)return;
 const now=performance.now(),size=innerWidth+':'+getBumpViewportHeight(),edge=typeof position==='number'&&Math.abs(position)>.002&&Math.abs(position)<.995;
 if(now-lastAt<80)return;
 if(!stale&&!edge&&scrollY===lastScroll&&position===lastPosition&&size===lastSize)return;
 lastAt=now;lastScroll=scrollY;lastPosition=position;lastSize=size;refresh();
 // The compositor already supplies the exact paper uniform. Analytic sampling
 // avoids drawImage/getImageData forcing a GPU-to-CPU stall on every wipe frame.
 const paperAt=(x,y)=>fallbackPaperContains(position??-1,x/innerWidth,y/getBumpViewportHeight());
 for(const node of targets){if(!node.isConnected)continue;const b=node.getBoundingClientRect();if(b.width<1||b.height<1||b.bottom<0||b.top>getBumpViewportHeight())continue;let paper=0,total=0;
  for(const fy of [.3,.7])for(const fx of [.12,.35,.6,.86]){const x=b.left+b.width*fx,y=b.top+b.height*fy;if(x<0||x>innerWidth||y<0||y>getBumpViewportHeight())continue;total++;paper+=canvas?+paperAt(x,y):+fallbackPaper(node,x,y);}
  if(total)ink(node,paper/total>(node.dataset.bumpSurface==='paper'?.45:.6));
 }
 document.documentElement.dataset.bumpContrast='active';
}
export function updateFallbackContrast(force=false){if(!document.querySelector('canvas[data-engine]')){
 const root=document.documentElement;
 if(root.dataset.bumpAssistedScroll==='true'){
  fallbackFrame=getBumpFallbackFrame();root.style.setProperty('--bump-fallback-paper-clip',fallbackPaperClip(fallbackFrame.paper));root.dataset.bumpPaperPosition=fallbackFrame.paper.toFixed(4);
  for(const layer of document.querySelectorAll('[data-bump-fallback-index]')){const index=Number(layer.dataset.bumpFallbackIndex),opacity=index===fallbackFrame.current?1-fallbackFrame.blend:index===fallbackFrame.next?fallbackFrame.blend:0;layer.style.opacity=String(opacity);}
 }
 if(force){lastAt=-Infinity;stale=true;}
 document.documentElement.dataset.bumpFallbackSurface=fallbackPaper(document.body,innerWidth*.6,getBumpViewportHeight()*.5)?'paper':'scene';
 updateBumpSurfaceContrast(null,fallbackFrame?.paper);
}}
