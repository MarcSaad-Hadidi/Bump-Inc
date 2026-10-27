import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('a stalled font cannot keep the whole landing blank, and unmount cancels readiness',async()=>{
  const source=readFileSync(new URL('../src/bump/ui/startupReady.js',import.meta.url),'utf8')
    .replace(/^import .*;\n/,'').replace('export function useStartupReady','function useStartupReady');
  for(const unmount of [false,true]){
    const timers=new Map();let sequence=0,ready=false,cleanup;
    const context={
      React:{useState:()=>[false,value=>{ready=value;}],useLayoutEffect:effect=>{cleanup=effect();}},
      document:{querySelectorAll:()=>[{sheet:{}}],fonts:{load:()=>new Promise(()=>{})}},
      setTimeout:(callback,delay)=>{timers.set(++sequence,{callback,delay});return sequence;},
      clearTimeout:id=>timers.delete(id),
    };
    vm.runInNewContext(source+';useStartupReady();',context);
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(ready,false);assert.equal(timers.size,1);
    const deadline=[...timers.values()][0];assert(deadline.delay<=2000);
    if(unmount)cleanup();else deadline.callback();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(ready,!unmount);
    cleanup();assert.equal(timers.size,0);
  }
});
