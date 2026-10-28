import{C as He,a as s,b,o as Pe,q as J,r as De,u as me,x as g,y as I}from"./bump-shared-GFYDHDSM.js";import{a as Oe}from"./bump-shared-2BAP6YQN.js";import{a as be,d as ze,f as Fe}from"./bump-shared-EYY4DIXJ.js";import{g as fe}from"./bump-shared-MIXLNBES.js";He();He();var Me=1500/1.15,Ge=280/1.15,Ve=1500/1.15,We=460/1.15,at=1400,Ue="cubic-bezier(0.22, 1, 0.36, 1)",st=a=>1-(1-a)**5,ut=a=>-(Math.cos(Math.PI*a)-1)/2,qe=typeof window>"u"?J:me;function je({left:a=[],right:E=[],center:v={name:"Bump"},className:x,label:S,onInspect:A}){let y="ui-ib"+De().replace(/[^a-zA-Z0-9_-]/g,""),k=[...a,...E],m=k.length,f=a.length,[_,$]=I(()=>new Set),[O,G]=I(null),[V,W]=I(null),[K,Z]=I(!1),[C,Q]=I(""),L=g(null),q=g(null),P=g(null),X=g(null),U=g(null),ee=g(null),ae=g(null),n=g([]),c=g([]),T=g([]),N=g([]),te=g([]),he=g(0),ie=g(_);ie.current=_;let ge=m-_.size,_e=ge===0?"Flux en pause":K?"Exploration\u2026":"Vision future";qe(()=>{let o=L.current,t=q.current,h=P.current,R=X.current;if(!o||!t||!h||!R)return;let D=window.matchMedia("(prefers-reduced-motion: reduce)"),H=D.matches,ve=[],xe=[],ye=[],B=0,se=null,we=null,Ne=[],et=e=>({x:e.offsetLeft+e.offsetWidth/2,y:e.offsetTop+e.offsetHeight/2}),Le=(e,i,r)=>{if(r){let l=(e.y+i.y)/2;return[e.x,e.y,e.x,l,i.x,l,i.x,i.y]}let d=(e.x+i.x)/2;return[e.x,e.y,d,e.y,d,i.y,i.x,i.y]},Te=e=>{ve=e,e.forEach((i,r)=>{let d=`M${i[0]} ${i[1]}C${i[2]} ${i[3]} ${i[4]} ${i[5]} ${i[6]} ${i[7]}`,l=T.current[r];l&&(l.setAttribute("d",d),N.current[r]?.querySelectorAll("path").forEach(p=>p.setAttribute("d",d)),Ne[r]=l.getTotalLength())})},Re=()=>{h.setAttribute("viewBox",`0 0 ${o.clientWidth} ${o.clientHeight}`);let e=getComputedStyle(t).getPropertyValue("--ui-ib-stack").trim()==="1",i=[...n.current.slice(0,m),R];if(i.some(p=>!p))return;let r=i.map(p=>et(p)),d=r[m],l=r.slice(0,m).map((p,u)=>u<f?Le(p,d,e):Le(d,p,e));se&&we!==null&&e!==we&&!H?(i.forEach((p,u)=>{let w=se[u].x-r[u].x,F=se[u].y-r[u].y;(w||F)&&p.animate([{transform:`translate(${w}px, ${F}px)`},{transform:"none"}],{duration:We,easing:Ue})}),xe=ve.length===m?ve:l,ye=l,B=performance.now(),ce()):B?ye=l:Te(l),se=r,we=e},Y=Array(m).fill(null),z=[],ne=0,ke=0,ue=0,le=!1,oe=!1,M=0,Ee=e=>{Y[e]=null;let i=N.current[e];i&&(i.style.opacity="0")},tt=e=>e?.animate([{opacity:0,transform:"scale(0.96)"},{opacity:1,transform:"scale(1)",offset:.3},{opacity:0,transform:"scale(1.14)"}],{duration:760/1.15,easing:"ease-out"}),it=e=>{let i=Array.from({length:f},(u,w)=>w).filter(u=>!ie.current.has(u)),r=Array.from({length:m-f},(u,w)=>f+w).filter(u=>!ie.current.has(u));if(!i.length&&!r.length){ne=e+Ve;return}let d=e,l=i.length?d+Me:d;z=[...i.map((u,w)=>({beam:u,at:d+w*Ge})),...r.map((u,w)=>({beam:u,at:l+w*Ge}))];let p=Math.max(...z.map(u=>u.at))+Me;ke=i.length?l:d,ue=p,ne=p+Ve},nt=(e,i)=>{let r=T.current[e],d=N.current[e],l=te.current[e];if(!r||!d||!l)return;let p=Ne[e]||0,u=Math.min(84,p*.42),w=ut(i)*(p+u);d.querySelectorAll("path").forEach(Ie=>{Ie.style.strokeDasharray=`${u} ${p+u}`,Ie.style.strokeDashoffset=`${u-w}`});let F=r.getPointAtLength(Math.max(0,Math.min(p,w-u))),pe=r.getPointAtLength(Math.max(0,Math.min(p,w)));l.setAttribute("x1",`${F.x}`),l.setAttribute("y1",`${F.y}`),l.setAttribute("x2",`${pe.x+(pe.x===F.x&&pe.y===F.y?.01:0)}`),l.setAttribute("y2",`${pe.y}`),d.style.opacity="1"},Se=e=>{if(M=0,!be(o)){if(B){let i=Math.min(1,(e-B)/We),r=st(i);Te(ye.map((d,l)=>d.map((p,u)=>(xe[l]?.[u]??p)+(p-(xe[l]?.[u]??p))*r))),i>=1&&(B=0)}if(oe&&!H){e>=ne&&it(e),z=z.filter(r=>r.at>e?!0:(!ie.current.has(r.beam)&&Y[r.beam]===null&&(Y[r.beam]=r.at),!1));for(let r=0;r<m;r++){let d=Y[r];if(d===null)continue;if(ie.current.has(r)){Ee(r);continue}let l=(e-d)/Me;if(l>=1){Ee(r),tt(r<f?U.current:c.current[r]);continue}nt(r,l)}let i=e>=ke&&e<ue;i!==le&&(le=i,Z(i))}(B||oe&&!H)&&(M=requestAnimationFrame(Se))}},ce=()=>{M||(M=requestAnimationFrame(Se))};Re();let $e=new ResizeObserver(Re);$e.observe(o);let Ce=()=>{z=[],ne=performance.now()+400;for(let e=0;e<m;e++)Ee(e);ue=0,le&&Z(le=!1)},ot=fe(o,e=>{oe=e,Ce(),e&&!H?ce():(cancelAnimationFrame(M),M=0)}),de=0,rt=ze(o,e=>{if(e)de=performance.now(),cancelAnimationFrame(M),M=0;else{if(de){let i=performance.now()-de;ne+=i,z=z.map(r=>({...r,at:r.at+i})),Y.forEach((r,d)=>{r!==null&&(Y[d]=r+i)}),ke+=i,ue+=i,B&&(B+=i),de=0}oe&&!H&&ce()}}),Be=()=>{H=D.matches,Ce(),oe&&!H?ce():(cancelAnimationFrame(M),M=0)};return D.addEventListener("change",Be),()=>{$e.disconnect(),ot(),rt(),D.removeEventListener("change",Be),cancelAnimationFrame(M),[U.current,...c.current].forEach(e=>e?.getAnimations().forEach(i=>i.cancel()))}},[m,f]),qe(()=>{let o=ee.current,t=ae.current;o&&t&&(o.style.width=`${t.offsetWidth}px`)},[_e]),J(()=>()=>window.clearTimeout(he.current),[]);let j=Pe(o=>{G(o),o===null&&W(null),A?.(o)},[A]);J(()=>{let o=L.current;if(!o)return;let t=h=>{let R=h.target.closest(".ui-ib__tool"),D=n.current.indexOf(R);D>=0&&j(h.detail.active?D:null)};return o.addEventListener("bump:beam-inspect",t),()=>o.removeEventListener("bump:beam-inspect",t)},[j]);let Ze=o=>{let t=!_.has(o);$(h=>{let R=new Set(h);return R.has(o)?R.delete(o):R.add(o),R}),Q(`${k[o].name} : flux illustr\xE9 ${t?"en pause":"r\xE9activ\xE9"}.`),A?.(o),W(o),window.clearTimeout(he.current),he.current=window.setTimeout(()=>W(null),at)},Qe=o=>t=>{t.pointerType==="mouse"&&j(o)},Xe=o=>t=>{t.currentTarget.matches(":focus-visible")&&j(o)},Ae=(o,t)=>b("button",{id:o.id,ref:h=>{n.current[t]=h},type:"button",className:"ui-ib__tool","aria-pressed":!_.has(t),"aria-label":`${o.name}, flux illustr\xE9 ${_.has(t)?"en pause":"actif"}`,"data-off":_.has(t)||void 0,"data-focus":O===t||void 0,"data-tip":O===t||V===t||void 0,onClick:()=>Ze(t),onPointerEnter:Qe(t),onPointerLeave:()=>j(null),onFocus:Xe(t),onBlur:()=>j(null),children:[s("span",{className:"ui-ib__ring",ref:h=>{c.current[t]=h}}),s("span",{className:"ui-ib__logo","aria-hidden":"true",children:o.logo}),s("span",{className:"ui-ib__tool-label","aria-hidden":"true",children:o.name}),b("span",{className:"ui-ib__tip","aria-hidden":"true",children:[o.name,_.has(t)&&s("span",{className:"ui-ib__tip-state",children:" \xB7 Flux en pause"})]})]},t);return b("div",{ref:L,className:["ui-ib",x].filter(Boolean).join(" "),role:"group","aria-label":S??`Vision future de ${v.name}, avec ${k.map(o=>o.name).join(", ")}`,"data-focus":O!==null||void 0,children:[s("style",{children:ct}),b("svg",{ref:P,className:"ui-ib__beams","aria-hidden":"true",children:[b("defs",{children:[s("filter",{id:`${y}-blur`,filterUnits:"userSpaceOnUse",x:"-100",y:"-100",width:"1400",height:"700",children:s("feGaussianBlur",{stdDeviation:"3"})}),k.map((o,t)=>b("linearGradient",{id:`${y}-g${t}`,gradientUnits:"userSpaceOnUse",ref:h=>{te.current[t]=h},children:[s("stop",{offset:"0",className:"ui-ib__stop-tail"}),s("stop",{offset:"0.6",className:"ui-ib__stop-mid"}),s("stop",{offset:"1",className:"ui-ib__stop-head"})]},t))]}),k.map((o,t)=>s("path",{className:"ui-ib__line","data-off":_.has(t)||void 0,"data-focus":O===t||void 0,ref:h=>{T.current[t]=h}},t)),k.map((o,t)=>b("g",{className:"ui-ib__pulse","data-focus":O===t||void 0,ref:h=>{N.current[t]=h},children:[s("path",{className:"ui-ib__glow",stroke:`url(#${y}-g${t})`,filter:`url(#${y}-blur)`}),s("path",{className:"ui-ib__core",stroke:`url(#${y}-g${t})`})]},t))]}),b("div",{ref:q,className:"ui-ib__scene",children:[s("div",{className:"ui-ib__group ui-ib__group--in",children:a.map((o,t)=>Ae(o,t))}),b("div",{ref:X,className:"ui-ib__center","data-syncing":K&&ge>0||void 0,children:[s("span",{className:"ui-ib__ring ui-ib__ring--center",ref:U}),s("span",{className:"ui-ib__mark","aria-hidden":"true",children:v.logo??s(lt,{})}),s("span",{ref:ee,className:"ui-ib__chip",children:b("span",{ref:ae,className:"ui-ib__chip-inner",children:[s("span",{className:"ui-ib__dot","data-idle":ge===0||void 0}),s("span",{className:"ui-ib__status",children:_e},_e)]})})]}),s("div",{className:"ui-ib__group ui-ib__group--out",children:E.map((o,t)=>Ae(o,f+t))})]}),s("span",{className:"ui-ib__sr","aria-live":"polite",children:C})]})}function lt(){return s("span",{className:"bump-brand-mark"})}var ct=`
.ui-ib {
  --ui-ib-ink: #171717;
  --ui-ib-text: #404040;
  --ui-ib-muted: #8f8f8f;
  --ui-ib-faint: #b5b5b5;
  --ui-ib-line: #e2e2e2;
  --ui-ib-line-hi: #a9c0ff;
  --ui-ib-card: #ffffff;
  --ui-ib-tray: #f0f0f0;
  --ui-ib-accent: #2f6bff;
  /* Pulse: clear tail, accent body, a pale tip that reads as light */
  --ui-ib-pulse: #2f6bff;
  --ui-ib-tip-color: #b9cdff;
  --ui-ib-ring: rgba(47, 107, 255, 0.2);
  --ui-ib-glow: rgba(47, 107, 255, 0.26);
  --ui-ib-hub: #171717;
  --ui-ib-hub-mark: #ffffff;
  --ui-ib-hub-edge: rgba(0, 0, 0, 0.9);
  --ui-ib-tooltip: #171717;
  --ui-ib-tooltip-text: #ffffff;
  --ui-ib-shadow: 0 0 0 1px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 18px -10px rgba(0, 0, 0, 0.18);
  --ui-ib-focus: rgba(23, 23, 23, 0.22);
  --ui-ib-ease: ${Ue};
  position: relative;
  width: 100%;
  container-type: inline-size;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 13px;
  color: var(--ui-ib-text);
  -webkit-tap-highlight-color: transparent;
}
.ui-ib *, .ui-ib *::before, .ui-ib *::after { box-sizing: border-box; }

/* ---------- Beams ---------- */

/* Absolute, so it paints below the (positioned) tiles */
.ui-ib__beams {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.ui-ib__line {
  fill: none;
  stroke: var(--ui-ib-line);
  stroke-width: 1.5;
  stroke-linecap: round;
  transition: stroke 300ms var(--ui-ib-ease), opacity 300ms var(--ui-ib-ease);
}
.ui-ib__line[data-off] { stroke: var(--ui-ib-faint); stroke-dasharray: 2 5; opacity: 0.75; }
.ui-ib[data-focus] .ui-ib__line:not([data-focus]) { opacity: 0.35; }
.ui-ib__line[data-focus]:not([data-off]) { stroke: var(--ui-ib-line-hi); }

.ui-ib__pulse { opacity: 0; transition: opacity 240ms ease; }
.ui-ib__pulse path { fill: none; stroke-linecap: round; transition: opacity 300ms var(--ui-ib-ease); }
.ui-ib__core { stroke-width: 2; }
.ui-ib__glow { stroke-width: 6; opacity: 0.45; }
.ui-ib[data-focus] .ui-ib__pulse:not([data-focus]) path { opacity: 0.25; }
.ui-ib__pulse[data-focus] .ui-ib__glow { opacity: 0.7; }
.ui-ib__stop-tail { stop-color: var(--ui-ib-pulse); stop-opacity: 0; }
.ui-ib__stop-mid { stop-color: var(--ui-ib-pulse); stop-opacity: 0.9; }
.ui-ib__stop-head { stop-color: var(--ui-ib-tip-color); stop-opacity: 1; }

/* ---------- Layout: side by side, stacked on narrow widths ---------- */

.ui-ib__scene {
  --ui-ib-stack: 0;
  display: grid;
  grid-template-columns: auto minmax(40px, 1fr) auto minmax(40px, 1fr) auto;
  grid-template-areas: "in . hub . out";
  align-items: center;
  padding: 6px 0;
}
.ui-ib__group { display: flex; flex-direction: column; gap: 26px; }
.ui-ib__group--in { grid-area: in; }
.ui-ib__group--out { grid-area: out; }

/* ---------- Tools ---------- */

.ui-ib__tool {
  position: relative;
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  padding: 0;
  border: 0;
  border-radius: 18px;
  background: var(--ui-ib-card);
  box-shadow: var(--ui-ib-shadow);
  color: var(--ui-ib-ink);
  font: inherit;
  cursor: pointer;
  transition: background-color 300ms var(--ui-ib-ease), box-shadow 300ms var(--ui-ib-ease);
}
.ui-ib__tool:focus-visible { outline: 2px solid var(--ui-ib-focus); outline-offset: 3px; }
.ui-ib__logo {
  display: grid;
  width: 28px;
  height: 28px;
  transition: transform 300ms var(--ui-ib-ease), filter 300ms var(--ui-ib-ease), opacity 300ms var(--ui-ib-ease);
}
.ui-ib__logo > svg { width: 100%; height: 100%; }
.ui-ib__tool[data-focus] .ui-ib__logo { transform: scale(1.08); }
.ui-ib__tool[data-focus] { box-shadow: var(--ui-ib-shadow), 0 0 0 2px var(--ui-ib-ring); }
.ui-ib__tool[data-off] { background: var(--ui-ib-tray); }
.ui-ib__tool[data-off] .ui-ib__logo { filter: grayscale(1); opacity: 0.4; }

/* Arrival glow \u2013 played with the Web Animations API */
.ui-ib__ring {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 0 3px var(--ui-ib-ring), 0 0 22px 2px var(--ui-ib-glow);
  opacity: 0;
  pointer-events: none;
}

/* Tooltip: points toward the centre, so it never leaves the scene */
.ui-ib__tip {
  --ui-ib-tip-from: translate(-4px, -50%);
  position: absolute;
  z-index: 3;
  top: 50%;
  left: calc(100% + 10px);
  padding: 5px 9px;
  border-radius: 8px;
  background: var(--ui-ib-tooltip);
  color: var(--ui-ib-tooltip-text);
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: var(--ui-ib-tip-from);
  transition: opacity 180ms ease, transform 260ms var(--ui-ib-ease);
}
.ui-ib__group--out .ui-ib__tip { --ui-ib-tip-from: translate(4px, -50%); left: auto; right: calc(100% + 10px); }
.ui-ib__tip-state { opacity: 0.6; font-weight: 400; }
.ui-ib__tool[data-tip] .ui-ib__tip { opacity: 1; transform: translate(0, -50%); }

/* ---------- Centre ---------- */

.ui-ib__center {
  grid-area: hub;
  position: relative;
  display: grid;
  place-items: center;
  width: 80px;
  height: 80px;
  border-radius: 24px;
  background: var(--ui-ib-hub);
  box-shadow: 0 0 0 1px var(--ui-ib-hub-edge), inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 14px 28px -12px rgba(0, 0, 0, 0.38);
  color: var(--ui-ib-hub-mark);
}
.ui-ib__mark { display: grid; width: 36px; height: 36px; fill: currentColor; }
.ui-ib__mark > svg { width: 100%; height: 100%; }
.ui-ib__ring--center { inset: -1px; }

/* Status chip under the hub \u2013 absolute, so the hub itself stays centred on the beams */
.ui-ib__chip {
  position: absolute;
  top: calc(100% + 12px);
  left: 50%;
  translate: -50% 0;
  display: block;
  height: 26px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--ui-ib-card);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: width 320ms var(--ui-ib-ease);
}
.ui-ib__chip-inner {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: max-content;
  height: 26px;
  padding: 0 11px 0 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ui-ib-text);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ui-ib__status { display: inline-block; animation: ui-ib-in 320ms var(--ui-ib-ease) both; }
.ui-ib__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ui-ib-accent);
  transition: background-color 300ms ease;
}
.ui-ib__dot[data-idle] { background: var(--ui-ib-faint); }
.ui-ib__center[data-syncing] .ui-ib__dot { animation: ui-ib-breathe 1.1s ease-in-out infinite; }

.ui-ib__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@keyframes ui-ib-in { from { opacity: 0; transform: translateY(6px); filter: blur(2px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes ui-ib-breathe { 50% { box-shadow: 0 0 0 3px var(--ui-ib-ring); } }

/* Narrow: senders above, receivers below, vertical beams */
@container (max-width: 459px) {
  .ui-ib__scene {
    --ui-ib-stack: 1;
    grid-template-columns: 1fr;
    grid-template-areas: "in" "hub" "out";
    justify-items: center;
    row-gap: 78px;
    padding: 0 0 4px;
  }
  .ui-ib__group { flex-direction: row; gap: clamp(14px, 7cqw, 34px); }
  .ui-ib__tool { width: 56px; height: 56px; border-radius: 17px; }
  .ui-ib__center { width: 76px; height: 76px; border-radius: 23px; }
  /* Tooltips sit between the rows; the outer tools align theirs to their edge */
  .ui-ib__tip,
  .ui-ib__group--out .ui-ib__tip {
    --ui-ib-tip-from: translate(-50%, -4px);
    top: calc(100% + 8px);
    right: auto;
    left: 50%;
  }
  .ui-ib__group--out .ui-ib__tip { --ui-ib-tip-from: translate(-50%, 4px); top: auto; bottom: calc(100% + 8px); }
  .ui-ib__tool[data-tip] .ui-ib__tip { transform: translate(-50%, 0); }
  .ui-ib__tool:first-child .ui-ib__tip { left: 0; translate: 50% 0; }
  .ui-ib__tool:last-child .ui-ib__tip { left: 100%; translate: -50% 0; }
}

/* Touch: the tiles are already 56px+; tooltips are shown after a tap instead of on hover */
@media (hover: none) and (pointer: coarse) {
  .ui-ib__tool { min-width: 44px; min-height: 44px; }
}

@media (prefers-reduced-motion: reduce) {
  .ui-ib__line, .ui-ib__tool, .ui-ib__logo, .ui-ib__tip, .ui-ib__chip, .ui-ib__dot { transition: none; }
  .ui-ib__status, .ui-ib__center[data-syncing] .ui-ib__dot { animation: none; }
}

`;var dt=[{tile:0,hold:2600},{tile:1,hold:2600},{tile:3,action:"off",hold:2600},{tile:4,hold:3e3},{tile:0,action:"off",hold:2200},{tile:3,action:"on",hold:2600},{tile:5,hold:3e3},{tile:0,action:"on",hold:2200},{tile:2,hold:2600}];function Ye(a){let E=matchMedia("(prefers-reduced-motion: reduce)"),v=document.createElement("span"),x=document.createElement("i");v.className="bump-demo-cursor",v.innerHTML='<svg viewBox="0 0 28 32"><path d="m3 2 20 17-9 1-4 9z"/></svg>',x.className="bump-demo-click";for(let n of[v,x])n.hidden=!0,n.setAttribute("aria-hidden","true"),a.append(n);let S=!1,A=!1,y=0,k=0,m=null,f=null,_=0,$=new Set,G=Fe(a,()=>!A&&S&&!E.matches&&!document.hidden&&!m&&performance.now()>=k&&!be(a)),V=(n,c)=>{G.clear(),G.schedule(n,c)},W=n=>f?.dispatchEvent(new CustomEvent("bump:beam-inspect",{bubbles:!0,detail:{active:n}})),K=()=>W(!1),Z=n=>{for(let c of $)c!==n&&(c.getAttribute("aria-pressed")==="false"&&c.click(),$.delete(c))},C=n=>{G.clear(),cancelAnimationFrame(y),Z(n),K(),f=null,v.hidden=!0,x.hidden=!0,a.dataset.beamCursor="none"},Q=n=>{if(!f)return;let c=f.getBoundingClientRect(),T=a.getBoundingClientRect(),N=c.left-T.left+c.width*.55,te=c.top-T.top+c.height*.55;v.style.left=N-(n?65:0)+"px",v.style.top=te+(n?42:0)+"px",x.style.left=N-11+"px",x.style.top=te-10+"px"},L=(n=1400)=>{A||!S||E.matches||m||V(Math.max(n,k-performance.now()),()=>{_=0,q()})};function q(){let n=dt[_],c=[...a.querySelectorAll(".ui-ib__tool")];if(!n||!c.length){C(),L(7e3);return}K(),f=c[n.tile],x.hidden=!0,a.dataset.beamJourneyStep=String(_),a.dataset.beamCursor="move";let T=v.hidden;v.hidden=!1,T?(Q(!0),y=requestAnimationFrame(()=>{y=requestAnimationFrame(()=>Q(!1))})):Q(!1),V(Oe(800),()=>{W(!0),a.dataset.beamCursor="hover",V(n.action?900:n.hold,()=>{if(n.action){let N=f.getAttribute("aria-pressed")==="true";n.action==="off"&&N?(f.click(),$.add(f),x.hidden=!1,a.dataset.beamCursor="click"):n.action==="on"&&$.has(f)&&(N||f.click(),$.delete(f),x.hidden=!1,a.dataset.beamCursor="click"),V(n.hold,()=>{_++,q()})}else _++,q()})})}let P=n=>{if(!n.isTrusted)return;let c=n.target.closest?.(".ui-ib__tool");(n.type==="pointerdown"&&(n.button===void 0||n.button===0)||n.type==="keydown"&&["Enter"," "].includes(n.key))&&c&&$.delete(c),C(),k=performance.now()+3e4,L()},X=n=>{if(!n.isTrusted)return;let c=n.target.closest?.(".ui-ib__tool");c&&(m=c,C(c))},U=n=>{!n.isTrusted||!m||n.relatedTarget?.closest?.(".ui-ib__tool")!==m&&(m=null,Z(),L())},ee=()=>{C(),L()};a.addEventListener("pointerdown",P,!0),a.addEventListener("keydown",P,!0),a.addEventListener("pointerover",X,!0),a.addEventListener("pointerout",U,!0),E.addEventListener("change",ee);let ae=fe(a,n=>{S=n,C(),n&&L()});return()=>{A=!0,C(),G.destroy(),ae(),E.removeEventListener("change",ee),a.removeEventListener("pointerdown",P,!0),a.removeEventListener("keydown",P,!0),a.removeEventListener("pointerover",X,!0),a.removeEventListener("pointerout",U,!0),v.remove(),x.remove()}}var pt={crm:"M4 5h16v14H4z M4 10h16 M9 10v9 M7 7.5h.01 M10 7.5h.01",erp:"M4 3h16v18H4z M8 7h2 M14 7h2 M8 11h2 M14 11h2 M10 21v-6h4v6",data:"M4 6c0-4 16-4 16 0s-16 4-16 0m0 0v12c0 4 16 4 16 0V6 M4 12c0 4 16 4 16 0",workflow:"M3 3h6v6H3z M15 15h6v6h-6z M9 6h9v9 M6 9v9h9",developer:"m8 6-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18",cyber:"M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z M8 12l3 3 5-6"};function mt({kind:a,color:E}){return s("svg",{viewBox:"0 0 24 24",fill:"none",stroke:E,strokeWidth:"1.45",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:s("path",{d:pt[a]})})}var Ke=[{name:"CRM",kind:"crm",color:"#087f63",title:"Les relations, au m\xEAme endroit.",detail:"Clients, demandes, suivis : partir des informations que vos \xE9quipes utilisent d\xE9j\xE0."},{name:"ERP",kind:"erp",color:"#356aa5",title:"Comprendre vos op\xE9rations.",detail:"Rapprocher les informations de gestion pour mieux comprendre les besoins du terrain."},{name:"Donn\xE9es",kind:"data",color:"#bc791b",title:"Donner du sens aux informations.",detail:"Des formulaires aux syst\xE8mes internes, identifier ce qui peut rendre vos outils plus utiles."},{id:"vision-workflow-ai",name:"Workflow AI",kind:"workflow",color:"#087f63",title:"Workflow AI",detail:"Notre ambition : aider les \xE9quipes \xE0 coordonner leurs t\xE2ches et leurs processus, avec une validation humaine."},{id:"vision-developer-ai",name:"Developer AI",kind:"developer",color:"#7f53ad",title:"Developer AI",detail:"Notre ambition : accompagner le d\xE9veloppement et l\u2019\xE9volution des logiciels utiles aux entreprises."},{id:"vision-cyber-ai",name:"Cyber AI",kind:"cyber",color:"#c45041",title:"Cyber AI",detail:"Notre ambition : aider \xE0 analyser les risques et \xE0 suivre les correctifs, sous supervision humaine."}],Je=Ke.map(a=>({...a,logo:s(mt,{kind:a.kind,color:a.color})}));function ft(){let a=g(null),[E,v]=I(null);J(()=>Ye(a.current),[]),me(()=>{let S=a.current,A=S.parentElement,y=()=>{let m=A.getBoundingClientRect();S.style.setProperty("--bump-research-offset",(innerWidth>700?innerWidth/2-m.left-m.width/2:0)+"px")},k=new ResizeObserver(y);return k.observe(A),window.addEventListener("resize",y),y(),()=>{k.disconnect(),window.removeEventListener("resize",y)}},[]);let x=E===null?null:Ke[E];return b("section",{ref:a,className:"bump-research","aria-labelledby":"bump-research-title","data-bump-fixed-timing":"true",children:[b("header",{className:"bump-research-heading",children:[s("p",{className:"bump-research-eyebrow",children:"NOTRE AMBITION \xC0 LONG TERME"}),b("h3",{id:"bump-research-title",children:["Des outils reli\xE9s.",s("br",{}),s("em",{children:"Des intelligences sp\xE9cialis\xE9es."})]}),s("p",{children:"Une vision nourrie par les besoins r\xE9els de votre entreprise."})]}),b("div",{className:"bump-research-diagram",children:[b("div",{className:"bump-research-axis","aria-hidden":"true",children:[s("span",{children:"VOTRE R\xC9ALIT\xC9"}),s("span",{children:"NOTRE VISION"})]}),s(je,{left:Je.slice(0,3),right:Je.slice(3),center:{name:"Bump",logo:s("span",{className:"bump-brand-mark"})},onInspect:v,label:"Sch\xE9ma illustratif de notre vision \xE0 long terme : relier les outils de l\u2019entreprise \xE0 Workflow AI, Developer AI et Cyber AI."})]}),b("div",{className:"bump-research-explanation",id:"vision-infrastructure",children:[s("h4",{children:x?.title||"Une infrastructure \xE0 construire."}),s("p",{children:x?.detail||"Nous voulons faire \xE9merger des agents sp\xE9cialis\xE9s \xE0 partir des solutions d\xE9velopp\xE9es avec les entreprises."})]})]})}export{ft as default};
