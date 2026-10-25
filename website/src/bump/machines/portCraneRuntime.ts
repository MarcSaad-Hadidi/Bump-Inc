import {createLoop as suppliedLoop,type Loop} from './suppliedRuntime';
import {DATA} from '../../components/bump-anatomy/port/art.generated';
import {iso,translateAlong,segment,ring} from '../../components/bump-anatomy/kit/iso-kit';
import {portLoadPose,portShipX,portAnchorDrop,PORT_LOAD_START,PORT_LOAD_CYCLE} from './portCraneMotion';
import {portTugPose,portTugMatrix} from './portTugMotion';
export * from './suppliedRuntime';

const P={...DATA.P,origin:[...DATA.P.origin] as [number,number]};
const NS='http://www.w3.org/2000/svg';
export function createLoop(stage:Element,tick:(dt:number,clock:number,calm:boolean)=>boolean):Loop{
 const svg=stage.querySelector('svg')!,figure=stage.closest('.iso-figure')!,host=stage.closest<HTMLElement>('.bump-port-live')!;
 const hoverHost=host.closest<HTMLElement>('[data-bump-transport]');
 const cargo=[...svg.querySelectorAll<SVGGElement>('[data-cargo]')],ship=[...svg.querySelectorAll<SVGGElement>('[data-ship]')],gantry=[16,17,18,19,49].map(i=>svg.querySelector<SVGGElement>(`[data-i="${i}"]`)!);
 const tugs=[...svg.querySelectorAll<SVGGElement>('[data-tug]')];
 const carriage=svg.querySelector<SVGGElement>('[data-i="52"]')!,base=carriage.getBBox(),carriageAt={x:base.x+base.width/2,y:base.y+base.height/2};
 const drops=DATA.cargo.map((delta,j)=>{const a=iso([...delta],P),b=iso([...DATA.cargo[j-j%2]],P);return{x:a[0]-b[0],y:a[1]-b[1]};});
 const anchor=cargo.map(el=>{const b=el.getBBox();return{x:b.x+b.width/2,y:b.y+13};});
 const origin=iso([0,0,0],P),axis=iso([1,0,0],P),axisX=axis[0]-origin[0],axisY=axis[1]-origin[1];
 const hull=ship.map(el=>el.getBBox()),maxX=Math.max(...hull.map(b=>b.x+b.width));
 // Opposite edges share a period: the exiting portion is already visible on
 // the left. The returning copy is empty; six cargoes await it on the quay.
 const enter=(77.6-maxX)/axisX,period=(712-77.6)/axisX;
 const portal=document.createElementNS(NS,'g');portal.dataset.portPortal='';portal.setAttribute('clip-path','url(#bump-port-lane)');portal.setAttribute('aria-hidden','true');portal.style.pointerEvents='none';
 const copyParts=ship.map(el=>{const copy=el.cloneNode(true) as SVGGElement;copy.removeAttribute('data-ship');copy.removeAttribute('data-cargo');copy.querySelectorAll('[data-need]').forEach(n=>{n.removeAttribute('data-need');n.removeAttribute('role');n.removeAttribute('tabindex');});portal.append(copy);return copy;});svg.append(portal);
 const anchorGlyph=svg.querySelector<SVGGElement>('[data-anchor]')!,chain=svg.querySelector<SVGPathElement>('[data-chain]')!,swirl=svg.querySelector<SVGPathElement>('[data-swirl]')!;
 const portalAnchor=anchorGlyph.cloneNode(true) as SVGGElement;portalAnchor.removeAttribute('data-anchor');portalAnchor.dataset.portPortalAnchor='';portal.append(portalAnchor);
 const restock=document.createElementNS(NS,'g');restock.dataset.portRestockGroup='';restock.setAttribute('clip-path','url(#bump-port-lane)');
 cargo.forEach((el,j)=>{const copy=el.cloneNode(true) as SVGGElement;copy.removeAttribute('data-cargo');copy.dataset.portRestock=String(j);copy.setAttribute('transform',translateAlong(P,[...DATA.cargo[j]]));restock.append(copy);});svg.insertBefore(restock,portal);
 const rope=document.createElementNS(NS,'path'),spreader=document.createElementNS(NS,'path'),hook=document.createElementNS(NS,'g');
 hook.dataset.portHoist='';hook.setAttribute('aria-hidden','true');rope.setAttribute('class','port-hoist-rope');spreader.setAttribute('class','port-hoist-spreader');hook.append(rope,spreader);svg.append(hook);
 let clock=0,step=-1,stepAt=0,returning=false,loop:Loop|undefined;
 const index=()=>Number(figure.querySelector<HTMLElement>('[data-step][data-current]')?.dataset.step??0);
 const draw=(current:number,since:number,calm:boolean)=>{
  const shipX=current===0&&returning?0:portShipX(current,since,enter,period);
  tugs.forEach(el=>{const i=Number(el.dataset.tug),pose=portTugPose(calm?1:current,since,i),matrix=portTugMatrix(pose,DATA.tugs[i].at,DATA.waterZ,P);el.setAttribute('transform',`matrix(${matrix.join(' ')})`);});
  if(!calm){for(const el of ship)el.setAttribute('transform',translateAlong(P,[shipX,0,0]));
   // The supplied anchor used its original travel curve while this host moves
   // the hull along the portal curve. Keep both on the very same ship origin.
   const drop=portAnchorDrop(current,since),[hx,hy,hz]=DATA.hawse,az=hz-(hz-DATA.waterZ-2)*drop;
   const [ax,ay]=iso([hx+shipX,hy,az],P);anchorGlyph.setAttribute('transform',`translate(${ax} ${ay})`);
   chain.setAttribute('d',drop>.02?segment([hx+shipX,hy,hz],[hx+shipX,hy,az],P):'');
   swirl.setAttribute('d',drop>.9?ring(hx+shipX,hy+3,4+3*Math.sin(clock*2)**2,DATA.waterZ,P,24):'');
   const [wx,wy]=iso([hx+shipX-period,hy,hz],P);portalAnchor.setAttribute('transform',`translate(${wx} ${wy})`);
   svg.querySelectorAll<SVGPathElement>('[data-wake]').forEach((el,k)=>{const side=k?1:-1,[sx,sy,sz]=DATA.stern;el.setAttribute('d',current===0||current===4?segment([sx+shipX,sy+side*12,sz],[sx+shipX-46,sy+side*22,sz],P):'');});}
  portal.style.display=current===4&&!calm?'':'none';
  restock.style.display=current===4&&!calm&&maxX+shipX*axisX>=712?'':'none';
  if(current===4&&!calm){const wrapped=translateAlong(P,[shipX-period,0,0]);copyParts.forEach(el=>el.setAttribute('transform',wrapped));}
  hook.style.display=current===3&&!calm?'':'none';
  if(current!==3||calm){gantry.forEach(el=>el.removeAttribute('transform'));carriage.removeAttribute('transform');host.dataset.portLoading='';
   cargo.forEach((el,j)=>{el.style.opacity='1';const a=iso(current<3?[...DATA.cargo[j]]:[shipX,0,0],P);el.setAttribute('transform',`translate(${a[0]-origin[0]+(current<3?0:drops[j].x)} ${a[1]-origin[1]+(current<3?0:drops[j].y)})`);});return;}
  const job=Math.max(0,Math.min(5,Math.floor((since-PORT_LOAD_START)/PORT_LOAD_CYCLE))),pose=portLoadPose(since,job);
  if(host.dataset.portLoading!==String(job))host.dataset.portLoading=String(job);
  const loaded=String(job+(pose.complete?1:0));if(host.dataset.portLoaded!==loaded)host.dataset.portLoaded=loaded;
  cargo.forEach((el,j)=>{const p=portLoadPose(since,j),delta=DATA.cargo[j];const a=iso([delta[0]*(1-p.across),delta[1]*(1-p.across),delta[2]*(1-p.across)],P);el.setAttribute('transform',`translate(${a[0]-origin[0]+drops[j].x*p.across} ${a[1]-origin[1]+drops[j].y*p.across-p.lift})`);el.style.opacity='1';});
  const delta=DATA.cargo[job],pickup=iso([...delta],P),pickupX=anchor[job].x+pickup[0]-origin[0],pickupY=anchor[job].y+pickup[1]-origin[1];
  const dx=pickupX-carriageAt.x,dy=dx*axisY/axisX;
  gantry.forEach(el=>el.setAttribute('transform',`translate(${dx} ${dy})`));
  const x=pickupX+(anchor[job].x+drops[job].x-pickupX)*pose.across,y=pickupY+(anchor[job].y+drops[job].y-pickupY)*pose.across-pose.lift;
  const headY=carriageAt.y+dy+(anchor[job].y+drops[job].y-pickupY)*pose.across;
  carriage.setAttribute('transform',`translate(${x-carriageAt.x} ${headY-carriageAt.y})`);
  const resting=headY+13,reach=pose.t<.24?resting+(pickupY-resting)*Math.min(1,pose.t/.24):pose.t>.9?y+(resting-y)*Math.min(1,(pose.t-.9)/.1):y;
  rope.setAttribute('d',`M${x-7} ${headY+4}V${reach}M${x+7} ${headY+4}V${reach}`);
  spreader.setAttribute('d',`M${x-15} ${reach-4}l28 9 3-5-28-9z`);
 };
 loop=suppliedLoop(stage,(dt,_clock,calm)=>{
  const waitingForHover=!calm&&index()===3&&host.dataset.portLoaded==='6'&&hoverHost?.dataset.bumpHoverComplete==='false';
  if(waitingForHover||host.dataset.portInspect||['moving','hovering'].includes(hoverHost?.dataset.bumpHoverDemo||''))return false;
  clock+=dt*(index()===3?.85:1);
  const running=tick(dt*(index()===3?.85:1),clock,calm),current=index();
  if(current!==step){if(step===4&&current===0)returning=true;step=current;stepAt=clock;}
  draw(current,clock-stepAt,calm);return running;
 },{motion:1.15,stage:1.15});
 const hover=new MutationObserver(()=>loop?.kick());hover.observe(host,{attributes:true,attributeFilter:['data-port-inspect']});if(hoverHost)hover.observe(hoverHost,{attributes:true,attributeFilter:['data-bump-hover-demo','data-bump-hover-complete']});
 return{kick:()=>loop?.kick(),calm:()=>loop!.calm(),destroy:()=>{hover.disconnect();hook.remove();portal.remove();restock.remove();loop?.destroy();}};
}
