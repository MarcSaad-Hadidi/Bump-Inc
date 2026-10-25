import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {Color,SRGBColorSpace} from 'three';

const native=readFileSync(new URL('../public/runtime/assets/Background-DpyJh-o1.js',import.meta.url),'utf8');
const shader=native.match(/`(uniform sampler2D tMudNormal;\nuniform sampler2D tNoise;\nuniform float uPosition[\s\S]*?)`/)[1];
const helperURL=new URL('../src/bump/chapters/runtime/BumpPaper.js',import.meta.url);
const paper=existsSync(helperURL)?await import(helperURL):{};
// Evaluate the actual shipped uniform assignment, including the old Theatre
// grey input, so an unused new colour constant cannot make the test pass.
const binding=native.match(/gs&&\(gs\.value=([^)]*)\)/)[1];
const color=runInNewContext(binding,{q:[220/255,220/255,208/255],...paper});
function render(t,frames){
 const result=spawnSync('python',['tests/helpers/paper-egl.py'],{cwd:new URL('..',import.meta.url),input:JSON.stringify({shader,color,frames}),encoding:'utf8'});
 if(result.status===77){t.skip('No software EGL context in this environment');return null;}
 assert.equal(result.status,0,result.stderr);
 return JSON.parse(result.stdout);
}
const beige=[244,241,232,255],scene=[48,69,85,255];

test('the actual paper shader keeps the clear beige during entry, hold and exit',t=>{
 const result=render(t,[{position:-.4},{position:0},{position:0,time:14},{position:.4},{position:-1},{position:1}]);if(!result)return;
 t.diagnostic('Actual GLSL rendered by '+result.renderer);
 assert.deepEqual(result.frames[0][0],beige,'Incoming paper must not use the old green-grey tint');
 assert.deepEqual(result.frames[1],[beige,beige,beige]);
 assert.deepEqual(result.frames[2],[beige,beige,beige],'A settled paper must not change with elapsed time');
 assert.deepEqual(result.frames[3][2],beige,'Outgoing paper must use the same palette');
 assert.deepEqual(result.frames[4],[scene,scene,scene]);
 assert.deepEqual(result.frames[5],[scene,scene,scene],'Offscreen paper leaves the painting unfiltered');
});

test('the flat-paper fast path draws the same pixels without recycling a bloom buffer',t=>{
 assert.equal(typeof paper.drawBumpPaper,'function','Fully covered paper needs a fresh flat draw, not the previous effect buffer');
 let target='previous-scene',writable=false,clear=null,draw=null,alpha=.8;
 const sceneClear=new Color('#204060'),original=sceneClear.getRGB({},SRGBColorSpace);
 const renderer={
  setRenderTarget(value){target=value;},
  getClearColor(target){return target.copy(sceneClear);},getClearAlpha(){return alpha;},
  setClearColor(value,nextAlpha){sceneClear.set(value);alpha=nextAlpha;const rgb=sceneClear.getRGB({},SRGBColorSpace);clear=[rgb.r,rgb.g,rgb.b,alpha,false];},
  state:{buffers:{color:{setMask(value){writable=value;},setClear(...value){clear=value;}}}},
  clear(color,depth,stencil){assert.equal(target,null);assert.equal(writable,true);assert.deepEqual([color,depth,stencil],[true,false,false]);draw=clear.slice(0,4);}
 };
 paper.drawBumpPaper(renderer,new Color());
 for(const [i,value]of [original.r,original.g,original.b,.8].entries())assert.ok(Math.abs(clear[i]-value)<1e-10,'The next scene must keep its own clear colour and alpha');
 const result=render(t,[{position:0},{clear:draw},{position:0,time:22}]);if(!result)return;
 assert.deepEqual(result.frames[1],[beige,beige,beige]);
 assert.deepEqual(result.frames[0],result.frames[1]);
 assert.deepEqual(result.frames[2],result.frames[1],'Resuming the wipe preserves the same colour');
});
