import {mount} from '../../components/bump-anatomy/calibration/live';
import {DATA} from '../../components/bump-anatomy/calibration/art.generated';
import {mountMethodAnnotations} from '../machines/suppliedCalibrationPresentation.js';
import {mountDemoTransport} from '../ui/demoTransport.js';
import {mountHoverDemonstration} from '../ui/hoverDemonstration.js';
import {mountCaptionTransitions} from '../ui/captionTransitions.js';
import {observeDemoReady} from '../ui/demoReady.js';

// This is the preserved laboratory's own renderer, not a second simulation or
// a landing-page iframe. The original native loop still owns its only RAF.
export function mountCalibrationLesson(root:HTMLElement){
 const figure=root.querySelector<HTMLElement>('.iso-figure');
 const live=root.querySelector<HTMLElement>('.bump-method-live');
 if(!figure||!live)return()=>{};
 let stopNative=mount(figure,DATA as never);
 const stopNotes=mountMethodAnnotations(root);
 const stopCaptions=mountCaptionTransitions(root);
 const stopTransport=mountDemoTransport(root,'le laboratoire illustratif');
 const stopTour=mountHoverDemonstration(root,'method');
 const stopReady=observeDemoReady(live,(ready:boolean)=>{live.dataset.methodActive=String(ready);},{onReenter:()=>{stopNative();stopNative=mount(figure,DATA as never);}});
 return()=>{stopReady();stopTour();stopTransport();stopCaptions();stopNotes();stopNative();};
}
