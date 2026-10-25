import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['src/bump/machines/portCraneMotion.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {portLoadPose,portShipX,portAnchorDrop}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('the crane lifts, carries and lowers six cargoes individually without overlap',()=>{
 for(let t=0;t<=6.5;t+=.01){const poses=Array.from({length:6},(_,j)=>portLoadPose(t,j));assert.ok(poses.filter(p=>p.carried).length<=1);assert.ok(poses.every(p=>p.lift>=0&&p.lift<=42&&p.across>=0&&p.across<=1));}
 for(let j=0;j<6;j++){
  const at=p=>portLoadPose(.25+j+p,j);
  assert.equal(at(.1).across,0);assert.equal(at(.1).lift,0);
  assert.equal(at(.42).across,0);assert.ok(at(.42).lift>40,'Lift before moving horizontally');
  assert.ok(at(.6).across>0&&at(.6).across<1);assert.equal(at(.6).lift,42);
  assert.equal(at(.95).across,1);assert.equal(at(.95).lift,0);assert.equal(at(.95).complete,true);
 }
});
test('the ship crosses one exact portal period and meets the wrapped copy without a gap',()=>{
 const period=634.4,base=260,width=300;
 const x=portShipX(4,4,0,period),right=base+x,left=right-period;
 assert.ok(right<712&&right+width>712,'The original is partly through the right edge');
 assert.ok(left<77.6&&left+width>77.6,'That same portion is already appearing on the left');
 const fractionPastRight=right+width-712,fractionVisibleLeft=left+width-77.6;
 assert.ok(Math.abs(fractionPastRight-fractionVisibleLeft)<1e-9);
 assert.equal(portShipX(4,6,0,period)-period,0,'End of departure exactly matches the dock pose of the next cycle');
 assert.equal(portShipX(0,0,-420,period),-420);assert.ok(Math.abs(portShipX(0,3.4,-420,period))<1e-9);
});
test('the anchor is fully hoisted before departure and stays stowed throughout the portal crossing',()=>{
 assert.equal(portAnchorDrop(1,0),0);assert.equal(portAnchorDrop(1,1.8),1);
 assert.equal(portAnchorDrop(2,0),1);assert.equal(portAnchorDrop(3,6),1);
 assert.equal(portAnchorDrop(4,0),1);assert.equal(portAnchorDrop(4,.7),0);
 for(let t=.8;t<=6;t+=.05){assert.equal(portAnchorDrop(4,t),0);assert.ok(portShipX(4,t,0,600)>=0);}
 assert.equal(portAnchorDrop(0,0),0);
});
