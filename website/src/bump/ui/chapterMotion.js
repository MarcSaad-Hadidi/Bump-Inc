const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const ordinary=t=>{t=clamp(t);return t*t*t*(10+t*(-15+6*t));};
const CHAPTER_TRANSITION_RATE=1.5;

// Match the retained section store's earlyCrossfade and hero-height mapping.
export function nativeBlendRange(boundary,height,viewport,early=0){
 const lead=viewport*early;
 return {start:boundary-viewport-lead,end:boundary-lead+viewport*lead/(height+viewport)};
}

export function compactChapterTail(viewport,lastStop,contentEnd,early=0){
 return Math.ceil(Math.max(viewport*.28,lastStop+viewport*(1+early+.06)-contentEnd));
}

// One continuous, reversible paper pose for each painting/content/exit.
// +1 and -1 both mean no paper; the sign change at a painting is invisible.
export function chapterPaperPosition(y,routes,native=-1){
 for(const route of routes){
  if(y<route.painting)continue;
  if(y<=route.first)return -1+smooth((y-route.painting)/Math.max(1,route.first-route.painting));
  if(y<=route.last)return 0;
  if(route.nextPainting!==null&&y<=route.nextPainting){
   return smooth((y-route.exitStart)/Math.max(1,route.nextPainting-route.exitStart));
  }
  if(route.nextPainting===null)return 0;
 }
 return native;
}

// Allocate real time to the animated windows, rather than to empty page travel.
// Bounded quintic Hermite slopes keep velocity and acceleration continuous.
export function planChapterJourney({from,to,viewport,windows=[],firstEntrance=false,reduced=false}){
 const distance=Math.abs(to-from);
 if(reduced||distance<.5)return {duration:0,easing:smooth,paced:false};
 if(firstEntrance)return {duration:3.8/CHAPTER_TRANSITION_RATE,easing:smooth,paced:true};
 const direction=Math.sign(to-from),spans=windows.map(w=>{
  const a=(w.start-from)*direction,b=(w.end-from)*direction;
  return {start:clamp(Math.min(a,b),0,distance),end:clamp(Math.max(a,b),0,distance),length:Math.abs(w.end-w.start),seconds:w.kind==='paper'?2.45:2.35};
 }).filter(w=>w.end-w.start>1);
 if(!spans.length)return {duration:clamp(.58+distance/3000,.68,1.25)/CHAPTER_TRANSITION_RATE,easing:ordinary,paced:false};
 const positions=[...new Set([0,distance,...spans.flatMap(w=>[w.start,w.end])])].sort((a,b)=>a-b),points=[{t:0,y:0}];
 for(let i=1;i<positions.length;i++){
  const a=positions[i-1],b=positions[i],mid=(a+b)/2,active=spans.filter(w=>mid>=w.start&&mid<=w.end);
  const seconds=active.length?Math.max(...active.map(w=>w.seconds*(b-a)/Math.max(1,w.length))):clamp((b-a)/viewport*.45,.3,.65);
  points.push({t:points.at(-1).t+Math.max(.05,seconds),y:b/distance});
 }
 const duration=points.at(-1).t,slopes=points.slice(1).map((p,i)=>(p.y-points[i].y)/(p.t-points[i].t)),tangents=points.map(()=>0);
 for(let i=1;i<points.length-1;i++){
  const h0=points[i].t-points[i-1].t,h1=points[i+1].t-points[i].t,w0=2*h1+h0,w1=h1+2*h0;
  tangents[i]=Math.min((w0+w1)/(w0/slopes[i-1]+w1/slopes[i]),1.4*Math.min(slopes[i-1],slopes[i]));
 }
 const easing=progress=>{
  const time=clamp(progress)*duration;let i=0;while(i<points.length-2&&time>points[i+1].t)i++;
  const a=points[i],b=points[i+1],h=b.t-a.t,u=clamp((time-a.t)/h),u2=u*u,u3=u2*u;
  const u4=u3*u,u5=u4*u,blend=10*u3-15*u4+6*u5;
  return clamp(a.y+(b.y-a.y)*blend+(u-6*u3+8*u4-3*u5)*h*tangents[i]+(-4*u3+7*u4-3*u5)*h*tangents[i+1],a.y,b.y);
 };
 return {duration:duration/CHAPTER_TRANSITION_RATE,easing,paced:true};
}

// The non-WebGL paper uses the same curved threshold as the native shader,
// without its GPU noise. The ink test and the visible clip share this formula.
const bend=u=>smooth((Math.abs(u-.4)-.6)/-1)*.5;
export function fallbackPaperContains(position,x,y){
 if(Math.abs(position)>=1)return false;if(Math.abs(position)<1e-6)return true;
 const threshold=(((1-y)*(1-bend(x))+x*bend(x))*2-1)/1.2*.5+.5;
 return position<=0?position+1>threshold:threshold>position;
}
export function fallbackPaperClip(position){
 if(Math.abs(position)>=1)return 'inset(100% 0 0 0)';if(Math.abs(position)<1e-6)return 'inset(0)';
 const value=position<=0?position+1:position;
 const curve=Array.from({length:17},(_,i)=>{const x=i/16,b=bend(x),y=clamp(1-(1.2*(value-.5)+.5-x*b)/(1-b));return `${(x*100).toFixed(3)}% ${(y*100).toFixed(3)}%`;});
 return 'polygon('+(position<=0?['0% 100%','100% 100%',...curve.reverse()]:['0% 0%','100% 0%',...curve.reverse()]).join(',')+')';
}
