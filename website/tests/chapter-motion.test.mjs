import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeBlendRange,planChapterJourney,chapterPaperPosition,fallbackPaperContains,fallbackPaperClip,compactChapterTail} from '../src/bump/ui/chapterMotion.js';
const inverse=(fn,y)=>{let a=0,b=1;for(let i=0;i<60;i++){const m=(a+b)/2;if(fn(m)<y)a=m;else b=m;}return(a+b)/2;};

test('visible scene animation gets time even after a long blank approach',()=>{
 // Measured desktop Workflow cloud -> IA painting, 1363 x 936.
 const from=4049.829375,to=6520.775,viewport=936,start=5210.375,end=6146.375;
 const old=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
 const share=y=>(y-from)/(to-from);
 const before=(inverse(old,share(end))-inverse(old,share(start)))*1.7;
 assert.ok(before<.4);
 const plan=planChapterJourney({from,to,viewport,windows:[{start,end,kind:'painting'}]});
 const visible=(inverse(plan.easing,share(end))-inverse(plan.easing,share(start)))*plan.duration;
 assert.ok(visible>1.2);assert.ok(plan.duration>1.8);assert.equal(plan.easing(0),0);assert.equal(plan.easing(1),1);
});
test('paced paths stay monotone and continuous in both scroll directions',()=>{
 for(const[from,to]of [[1000,7000],[7000,1000]]){
  const p=planChapterJourney({from,to,viewport:936,windows:[{start:4800,end:6500,kind:'painting'}]});let previous=0;
  for(let i=0;i<=2000;i++){const y=p.easing(i/2000);assert.ok(y>=previous-1e-12&&y<=1);assert.ok(y-previous<.005);previous=y;}
  const epsilon=1e-6;assert.ok(p.easing(epsilon)/epsilon<.001);assert.ok((1-p.easing(1-epsilon))/epsilon<.001);
 }
});
test('compact exits preserve the complete native blend without a 130vh empty tail',()=>{
 const vh=936;
 for(const[last,end,early]of [[4049.83,4929.58,0],[17978.4,18914.4,.2],[27350.97,27758.73,.2]]){
  const padding=compactChapterTail(vh,last,end,early),blend=nativeBlendRange(end+padding,4000,vh,early);
  assert.ok(padding<vh*1.3);assert.ok(blend.start>=last);assert.ok(blend.start-last<vh*.3);
 }
});
test('quintic pacing has continuous acceleration across travel and painting windows',()=>{
 const from=1000,to=4500,start=1800,end=3900,p=planChapterJourney({from,to,viewport:936,windows:[{start,end,kind:'painting'}]});
 const h=1e-6,acc=t=>(p.easing(t+h)-2*p.easing(t)+p.easing(t-h))/(h*h);
 for(const y of [start,end]){const t=inverse(p.easing,(y-from)/(to-from));assert.ok(Math.abs(acc(t-h)-acc(t+h))<.05);}
});
test('native early crossfade range matches the retained section progress mapping',()=>{
 const boundary=12699.390625,height=7431.8125,vh=936,early=.2,r=nativeBlendRange(boundary,height,vh,early);
 const progress=y=>((y-r.start)/(height+vh+early*vh))*(height+vh)/vh;
 assert.equal(progress(r.start),0);assert.ok(Math.abs(progress(r.end)-1)<1e-12);
});
test('paper never snaps at content holds, exits or the following painting',()=>{
 const routes=[{painting:1000,first:2500,last:5000,exitStart:5600,nextPainting:7000},{painting:7000,first:8700,last:10000,exitStart:Infinity,nextPainting:null}];
 const coverage=y=>1-Math.abs(chapterPaperPosition(y,routes));
 for(const boundary of [1000,2500,5000,5600,7000,8700,10000])assert.ok(Math.abs(coverage(boundary+.01)-coverage(boundary-.01))<.0001);
 for(let y=2500;y<=5600;y+=100)assert.equal(chapterPaperPosition(y,routes),0);
 assert.equal(chapterPaperPosition(7000,routes),1);assert.equal(chapterPaperPosition(7000.01,routes)<-.999,true);
 assert.equal(chapterPaperPosition(11000,routes),0);
});
test('the first transition is faster while reduced motion stays immediate',()=>{
 const p=planChapterJourney({from:421,to:1853,viewport:936,firstEntrance:true});assert.ok(p.duration>2.5&&p.duration<2.6);assert.equal(p.easing(.5),.5);
 assert.equal(planChapterJourney({from:1000,to:7000,viewport:936,windows:[{start:4800,end:6500}],reduced:true}).duration,0);
});
test('fallback paper and its ink threshold agree with native incoming/outgoing orientation',()=>{
 assert.equal(fallbackPaperContains(-1,.5,.5),false);assert.equal(fallbackPaperContains(0,.5,.5),true);assert.equal(fallbackPaperContains(1,.5,.5),false);
 assert.equal(fallbackPaperContains(-.5,.8,.95),true);assert.equal(fallbackPaperContains(-.5,.8,.05),false);
 assert.equal(fallbackPaperContains(.5,.2,.05),true);assert.equal(fallbackPaperContains(.5,.2,.95),false);
 assert.match(fallbackPaperClip(-.5),/^polygon\(/);assert.equal(fallbackPaperClip(0),'inset(0)');
});

test('the faster chapter journey keeps a visible wipe and completes without a long wait',()=>{
 const first=planChapterJourney({from:421,to:1853,viewport:936,firstEntrance:true});
 assert.ok(first.duration>=2.4&&first.duration<=2.6,'First scene transition must also be accelerated');
 for(const [from,to]of [[1000,4500],[4500,1000]]){
  const plan=planChapterJourney({from,to,viewport:936,windows:[{start:1800,end:3900,kind:'painting'}]});
  assert.ok(plan.duration<2.2);assert.ok(plan.duration>1.4);assert.equal(plan.easing(0),0);assert.equal(plan.easing(1),1);
 }
});
