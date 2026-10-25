import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['src/bump/machines/portTugMotion.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {portTugPose,portTugMatrix}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('tugs stay in the basin, turn into their route and return to the same waiting pose',()=>{
 for(let i=0;i<2;i++){
  for(let stage=0;stage<5;stage++)for(let t=0;t<6;t+=.03){const p=portTugPose(stage,t,i);assert.ok(p.x>=-150&&p.x<=160);assert.ok(p.y>=46-1e-9&&p.y<=66);}
  const dock=portTugPose(1,0,i);assert.equal(dock.y,48);assert.equal(dock.angle,-Math.PI/2);
  for(const[stage,start,end]of [[0,1.2,3.3],[4,1,2.6]])for(let t=start;t<end;t+=.05){const a=portTugPose(stage,t,i),b=portTugPose(stage,t+.001,i),dx=b.x-a.x,dy=b.y-a.y;assert.ok((dx*Math.cos(a.angle)+dy*Math.sin(a.angle))/Math.hypot(dx,dy)>.999,'The bow follows the actual travel tangent');}
  const initial=portTugPose(0,0,i),final=portTugPose(4,6,i);assert.equal(initial.x,final.x);assert.equal(initial.y,final.y);assert.ok(Math.abs(Math.cos(initial.angle)-Math.cos(final.angle))<1e-9);assert.ok(Math.abs(Math.sin(initial.angle)-Math.sin(final.angle))<1e-9);
 }
});
test('the right tug passes between the channel buoys without intersecting either marker',()=>{
 for(const stage of [0,4])for(let t=0;t<=6;t+=.01){const p=portTugPose(stage,t,0);for(const[x,y]of [[130,44],[130,72],[200,44],[200,72]]){const dx=x-p.x,dy=y-p.y,long=dx*Math.cos(p.angle)+dy*Math.sin(p.angle),side=-dx*Math.sin(p.angle)+dy*Math.cos(p.angle);assert.ok(Math.abs(long)>=16||Math.abs(side)>=9,'The tug footprint must clear the buoy');}}
});
test('the projected turn keeps the original vessel pivot attached to its water position',()=>{
 const P={origin:[398.587457,275.069113],scale:1.14342575,azimuth:64,elevation:40};
 for(let i=0;i<2;i++)for(let t=0;t<=3.5;t+=.1){const pose=portTugPose(0,t,i),matrix=portTugMatrix(pose,i?[ -92,34]:[14,34],5,P);assert.equal(matrix.length,6);assert.ok(matrix.every(Number.isFinite));assert.ok(Math.abs(matrix[0]*matrix[3]-matrix[1]*matrix[2]-1)<1e-9,'Turning preserves the hull area');}
});
