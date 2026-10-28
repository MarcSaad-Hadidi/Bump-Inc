import {createDemoTimeout} from '../ui/demoTransport.js';

export const NATIVE_INSPECTION_GRACE_MS = 30000;

// These supplied models end their one-shot tour after manual input.
// Recover by replaying that same component after idle time, without changing it.
export function mountNativeTourRecovery(root, {restart, cancelReplay, kind}) {
 let ready = false, inspecting = false, disposed = false;
 const held = new Set();
 const timer = createDemoTimeout(root, () => ready && !held.size);
 timer.suspend();
 const mark = value => {if(root.dataset.seoRecovery !== value)root.dataset.seoRecovery = value;};
 const sync = () => {if(ready && !held.size)timer.resume();else timer.suspend();};
 const idle = () => {
  if(disposed || !inspecting)return;
  timer.clear();
  mark(held.size ? 'holding' : 'waiting');
  timer.schedule(NATIVE_INSPECTION_GRACE_MS, () => {
   inspecting = false;mark('replaying');restart();
  });
  sync();
 };
 const begin = () => {inspecting = true;cancelReplay();};
 const controls = kind === 'workflow' ? '[data-btn],[data-accept],[data-refuse],[data-kind],[data-step],[data-insert],[data-next],[data-prev],[data-replay],[data-reset]' : '[data-drawer],[data-step],[data-next],[data-prev],[data-replay],[data-reset]';
 const control = event => event.target?.closest?.(controls);
 const stage = event => event.target?.closest?.('.iso-stage');
 const pointerDown = event => {
  if(!event.isTrusted || !control(event))return;
  begin();held.add('pointer:' + event.pointerId);idle();
 };
 const click = event => {if(event.isTrusted && control(event)){begin();idle();}};
 const keyDown = event => {
  if(!event.isTrusted || !stage(event) || event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  // Space belongs to the shared explicit pause control, not the native tour.
  if(!['ArrowRight','ArrowLeft','Home','Enter'].includes(event.key) && !/^[1-9]$/.test(event.key) && !(kind === 'workflow' && /^[aArR]$/.test(event.key)))return;
  begin();held.add('key:' + event.code);idle();
 };
 const release = event => {
  const key = event.type === 'keyup' ? 'key:' + event.code : 'pointer:' + event.pointerId;
  if(held.delete(key))idle();
 };
 const move = event => {if(inspecting && event.isTrusted && stage(event))idle();};
 const blur = () => {held.clear();idle();};
 const listeners = [
  [root,'pointerdown',pointerDown,true], [root,'click',click,true],
  [root,'change',click,true],
  [root,'keydown',keyDown,true], [root,'pointermove',move,false],
  [window,'pointerup',release,false], [window,'pointercancel',release,false],
  [window,'keyup',release,false],
  [window,'blur',blur,false],
 ];
 for(const [node,type,fn,capture] of listeners)node.addEventListener(type,fn,capture);
 return {
  get pending(){return inspecting;},
  setReady(value){ready = value;sync();},
  destroy(){disposed = true;timer.destroy();held.clear();for(const [node,type,fn,capture] of listeners)node.removeEventListener(type,fn,capture);delete root.dataset.seoRecovery;},
 };
}
