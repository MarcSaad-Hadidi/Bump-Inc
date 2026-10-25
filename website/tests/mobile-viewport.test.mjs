import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveViewport,viewportBreakpoints} from '../src/bump/ui/viewport.js';
import {readFileSync,readdirSync} from 'node:fs';
import {stableViewportCss,stableNativeRuntime} from '../scripts/stabilize-mobile-viewport.mjs';

const phone={width:390,height:780,smallHeight:744,mobile:true,orientation:0,resizableWindow:false};
test('mobile chapters retain the small viewport through browser chrome and keyboard changes',()=>{
 const initial=resolveViewport(null,phone);assert.equal(initial.height,744);
 for(const height of [860,900,430,780])assert.equal(resolveViewport(initial,{...phone,height,smallHeight:height}),initial);
});
test('rotation and width changes remeasure; a normal desktop window can still resize',()=>{
 const initial=resolveViewport(null,phone);
 assert.equal(resolveViewport(initial,{...phone,width:844,height:390,smallHeight:360,orientation:90}).height,360);
 assert.equal(resolveViewport(initial,{...phone,width:360,height:700,smallHeight:680}).height,680);
 const desktop={width:1363,height:936,mobile:false,resizableWindow:true};
 assert.equal(resolveViewport(resolveViewport(null,desktop),{...desktop,height:800}).height,800);
 assert.equal(resolveViewport(initial,{...phone,resizableWindow:true,height:600,smallHeight:600}).height,600);
});
test('compiled heights share one mobile unit while desktop units and modal keyboard sizing remain available',()=>{
 const source='.h-screen{height:100vh;margin-bottom:-100lvh}.bump-dialog{max-height:90dvh}.label{content:"100vh";background:url("image-100vh.svg")}';
 const output=stableViewportCss(source);
 assert.match(output,/height:calc\(var\(--bump-viewport-unit,1vh\) \* 100\)/);
 assert.match(output,/margin-bottom:calc\(var\(--bump-viewport-unit,1lvh\) \* -100\)/);
 assert.match(output,/max-height:90dvh/);assert.match(output,/content:"100vh"/);assert.match(output,/image-100vh.svg/);
 assert.equal(stableViewportCss(output),output);
});
test('height breakpoints use the frozen phone height without changing desktop selector specificity',()=>{
 const source='@media(max-width:700px) and (max-height:760px){html .panel{height:80svh}.copy{font-size:16px}}';
 const output=stableViewportCss(source);
 assert.match(output,/html:where\(:not\(\[data-bump-stable-viewport\]\)\) \.panel/);
 assert.match(output,/@media\(max-width:700px\)\{html:where\(\[data-bump-height-max-760\]\)/);
 assert.equal(stableViewportCss(output),output);
});
test('native scene sizing reads the shared height, preserving the desktop background path',()=>{
 const source='const height=window.innerHeight;const fallback=window.outerHeight;const untouched="window.innerHeight";';
 const output=stableNativeRuntime(source);
 assert.match(output,/height=__bumpViewportHeight\(\)/);assert.match(output,/fallback=__bumpBackgroundHeight\(\)/);
 assert.match(output,/untouched="window.innerHeight"/);assert.equal(stableNativeRuntime(output),output);
});

test('every compiled height breakpoint has a matching mobile viewport flag',()=>{
 for(const file of readdirSync('public/runtime/assets').filter(name=>name.endsWith('.css'))){
  const css=readFileSync('public/runtime/assets/'+file,'utf8');
  for(const [,value]of css.matchAll(/data-bump-height-(?:max|min)-(\d+)/g))assert.ok(viewportBreakpoints.includes(Number(value)),file+' needs '+value+'px');
 }
});
