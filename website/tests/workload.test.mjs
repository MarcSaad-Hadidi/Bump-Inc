import test from 'node:test';
import assert from 'node:assert/strict';
import {weeklyWorkload,installWorkloadCalculators} from '../src/bump/seo/workload.js';

test('manual workload converts task minutes to weekly hours without promising savings',()=>{
  assert.deepEqual(weeklyWorkload(25,12),{minutes:300,hours:5});
  assert.deepEqual(weeklyWorkload(40,30),{minutes:1200,hours:20});
  assert.deepEqual(weeklyWorkload(0,12),{minutes:0,hours:0});
  assert.equal(weeklyWorkload(1,0.1).minutes,0.1);
  for(const args of [[1.5,12],[-1,12],[100001,12],[1,0],[1,-1],[1,481],[NaN,12],[1,Infinity],['25',12]]) assert.equal(weeklyWorkload(...args),null);
});

function harness(lang) {
  const input = value => ({value,listeners:new Map(),addEventListener(type,fn){this.listeners.set(type,fn);},removeEventListener(type,fn){assert.equal(this.listeners.get(type),fn);this.listeners.delete(type);}});
  const volume=input('25'),minutes=input('12'),output={},formula={};
  const nodes={'[data-workload-volume]':volume,'[data-workload-minutes]':minutes,output,'[data-workload-formula]':formula};
  const root={lang,querySelector:selector=>nodes[selector]};
  const dispose=installWorkloadCalculators({querySelectorAll:()=>[root]});
  return {volume,minutes,output,formula,dispose,change:(field,value)=>{field.value=value;field.listeners.get('input')();}};
}

test('the real field listeners recalculate, distinguish empty values and retain sub-hour precision',()=>{
  const ui=harness('fr-CA');
  assert.equal(ui.output.textContent,'5 h / semaine');
  ui.change(ui.volume,'50');assert.equal(ui.output.textContent,'10 h / semaine');
  ui.change(ui.volume,'');assert.equal(ui.output.textContent,'Vérifiez les deux valeurs.');
  ui.change(ui.volume,'1');ui.change(ui.minutes,'0.1');
  assert.equal(ui.output.textContent,'0,1 min / semaine');
  assert.equal(ui.formula.textContent,'1 × 0,1 = 0,1 min');
  ui.change(ui.volume,'0');assert.equal(ui.output.textContent,'0 min / semaine');
  ui.dispose();assert.equal(ui.volume.listeners.size,0);assert.equal(ui.minutes.listeners.size,0);
});

test('English calculations and invalid ranges produce readable local feedback',()=>{
  const ui=harness('en-CA');
  assert.equal(ui.output.textContent,'5 h / week');
  ui.change(ui.minutes,'481');assert.equal(ui.output.textContent,'Check the two values.');
  ui.change(ui.minutes,'30');assert.equal(ui.output.textContent,'12.5 h / week');
  assert.equal(ui.formula.textContent,'25 × 30 ÷ 60 = 12.5 h');
  ui.dispose();
});
