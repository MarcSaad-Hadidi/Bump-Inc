import {demoIsPaused,observeDemoPaused} from '../ui/demoTransport.js';
import{motionMilliseconds}from'/runtime/assets/BumpPlayback.js';
import {r as React} from '/runtime/assets/components-BdJai906.js';
import {d as Rive} from '/runtime/assets/rive-DN8nxF7J.js';
import config from './reference-hand.json';

// The original articulated thumb supplies the tap events. The software interface
// is Bump's own DOM, rather than re-labelled commerce artboards.
export function BumpSoftwareHand({onLoadError}={}){
 const root=React.useRef(null),canvas=React.useRef(null),foreground=React.useRef(null);
 const [screen,setScreen]=React.useState(0),[pressed,setPressed]=React.useState(false),[rendered,setRendered]=React.useState(false);
 const errorHandler=React.useRef(onLoadError);errorHandler.current=onLoadError;
 React.useEffect(()=>{
  // Rive needs WebGL2 independently of the chapter renderer's quality choice.
  // Avoid entering its WASM renderer with a null graphics context.
  try{
   const probe=document.createElement('canvas'),gl=probe.getContext('webgl2');
   if(!gl){errorHandler.current?.(new Error('Phone graphics unavailable'));return;}
   gl.getExtension('WEBGL_lose_context')?.loseContext();
  }catch(error){errorHandler.current?.(error);return;}
  let active=true,instance,ready=false,failed=false,visible=false,restartOnEntry=false,stage=0,nativeElapsed=0,release=0,releaseRemaining=0,releaseStarted=0,rest=0,restRemaining=0,restStarted=0,resting=false,copyFrame=0,boot=0;
  const media=matchMedia('(prefers-reduced-motion: reduce)'),images=new Set(),jobs=[],bindings=[];
  const fail=error=>{if(!active||failed)return;failed=true;clearTimeout(boot);instance?.pause();errorHandler.current?.(error);};
  const assetLoader=asset=>{
   const key=asset.name.toLowerCase().replace(/\.(webp|png|ttf|woff2?)$/,'');
   if(key.includes('-mobile'))return false;
   const item=config.assetsMap[key];if(!item)return false;
   const job=fetch(item.url).then(r=>r.arrayBuffer()).then(async buffer=>{
    const decoded=await (asset.isFont?Rive.decodeFont:Rive.decodeImage)(new Uint8Array(buffer));
    if(active){asset.isFont?asset.setFont(decoded):asset.setRenderImage(decoded);images.add(decoded);}else decoded.unref();
   }).catch(fail);jobs.push(job);return true;
  };
  const hideCommerce=()=>{for(const name of ['chatGPT','productPage','checkout','buyWidget']){const node=instance.artboard.node(name);if(node)node.scaleX=node.scaleY=0;}};
  const copyThumb=()=>{
   const target=foreground.current,source=canvas.current;if(!active||!target||!source||!source.width)return;
   if(target.width!==source.width||target.height!==source.height){target.width=source.width;target.height=source.height;}
   const ctx=target.getContext('2d');ctx.clearRect(0,0,target.width,target.height);ctx.drawImage(source,0,0);
  };
  const queueThumb=()=>{cancelAnimationFrame(copyFrame);copyFrame=requestAnimationFrame(copyThumb);};
  const clearFeedback=()=>{clearTimeout(release);release=0;releaseRemaining=0;if(active)setPressed(false);};
  const resetUI=()=>{clearFeedback();stage=0;nativeElapsed=0;if(active)setScreen(0);};
  const clearRest=()=>{clearTimeout(rest);rest=0;restRemaining=0;resting=false;};
  const pauseRest=()=>{if(!rest)return;clearTimeout(rest);rest=0;restRemaining=Math.max(0,restRemaining-(performance.now()-restStarted));};
  const resumeRest=()=>{
   if(!resting||rest)return;
   restStarted=performance.now();rest=setTimeout(()=>{rest=0;resting=false;restartNative();syncPlayback();},restRemaining);
  };
  const pauseFeedback=()=>{if(!release)return;clearTimeout(release);release=0;releaseRemaining=Math.max(0,releaseRemaining-(performance.now()-releaseStarted));};
  const resumeFeedback=()=>{
   if(release)return;if(!releaseRemaining){if(active)setPressed(false);return;}
   releaseStarted=performance.now();release=setTimeout(()=>{release=0;releaseRemaining=0;if(active)setPressed(false);},releaseRemaining);
  };
  const press=next=>{
   if(!active||resting||next!==stage+1||!visible||document.hidden||media.matches)return;
   // Each physical contact advances once: request → plan → approval → sync.
   stage=next;setScreen(next);setPressed(true);clearTimeout(release);release=0;releaseRemaining=motionMilliseconds(360);resumeFeedback();
  };
  const unbindTriggers=()=>{for(const [trigger,handler] of bindings)trigger.off(handler);bindings.length=0;};
  const bindTriggers=()=>{
   const vm=instance.viewModelByName('View Model 1').instanceByName('desktop');instance.bindViewModelInstance(vm);
   for(const [name,handler] of [['reset',()=>{
    if(stage!==3){resetUI();return;}
    // The asset can report its next prompt in the same slow frame as reset.
    // Rest at the finished pose so all three tap results remain perceptible.
    if(!resting){clearFeedback();resting=true;restRemaining=motionMilliseconds(1100);syncPlayback();}
   }],['buy button',()=>press(2)],['shop pay',()=>press(3)]]){
    const trigger=vm.trigger(name);trigger.on(handler);bindings.push([trigger,handler]);
   }
  };
  const restartNative=()=>{
   clearRest();resetUI();unbindTriggers();
   // Rive.reset recreates the artboard/state machine, so bind a fresh desktop VM
   // and its native trigger listeners before restarting the retained hand.
   instance.reset({artboard:'main',stateMachines:'State Machine 1',autoplay:false,autoBind:true});
   bindTriggers();hideCommerce();instance.resizeDrawingSurfaceToCanvas();instance.drawFrame();queueThumb();restartOnEntry=false;
  };
  const syncPlayback=()=>{
   if(!active||failed||!ready)return;
   if(visible&&!document.hidden&&!media.matches&&!demoIsPaused(root.current)){
    if(restartOnEntry)restartNative();
    if(resting){instance.pause();resumeRest();}else{resumeFeedback();instance.play();}
   }else{instance.pause();pauseFeedback();pauseRest();}
  };
  instance=new Rive.Rive({src:config.src,canvas:canvas.current,artboard:'main',stateMachines:'State Machine 1',autoplay:false,autoBind:true,useOffscreenRenderer:true,assetLoader,onLoadError:fail,
   onLoad:async()=>{
    await Promise.all(jobs);if(!active||failed)return;
    bindTriggers();instance.on(Rive.EventType.Advance,event=>{
     if(ready&&instance.isPlaying&&visible&&!document.hidden&&!media.matches&&!resting){
      nativeElapsed+=Number(event.data)||0;
      // In this retained .riv, `prompt` is a startup cue at 0.2s. The thumb's
      // first real contact is at 5.0s, before buy/shop supply contacts two/three.
      if(stage===0&&nativeElapsed>=5)press(1);
     }
     hideCommerce();queueThumb();
    });ready=true;clearTimeout(boot);boot=0;
    hideCommerce();instance.resizeDrawingSurfaceToCanvas();instance.drawFrame();queueThumb();syncPlayback();
    setRendered(true);
   }
  });
  // The retained runtime advances from RAF timestamps. Bound long catch-up
  // frames locally so a slow texture upload cannot skip an entire thumb tap.
  const draw=instance._boundDraw;
  instance._boundDraw=(time,callback)=>{
   if(instance.isPlaying&&instance.lastRenderTime&&time-instance.lastRenderTime>100)instance.lastRenderTime=time-100;
   draw(time,callback);
  };
  const observer=new IntersectionObserver(([entry])=>{
   const wasVisible=visible;visible=entry.isIntersecting;
   if(!visible){clearTimeout(boot);boot=0;}else if(!ready&&!failed&&!boot){boot=setTimeout(()=>fail(new Error('Phone renderer unavailable')),12000);}
   if(wasVisible&&!visible){restartOnEntry=true;clearRest();resetUI();}
   syncPlayback();
  });observer.observe(root.current);
  const resize=new ResizeObserver(()=>{if(ready)instance.resizeDrawingSurfaceToCanvas();});resize.observe(root.current);
  const stopPause=observeDemoPaused(root.current,syncPlayback);
  media.addEventListener('change',syncPlayback);document.addEventListener('visibilitychange',syncPlayback);
  return()=>{active=false;stopPause();clearTimeout(boot);clearTimeout(release);clearTimeout(rest);cancelAnimationFrame(copyFrame);observer.disconnect();resize.disconnect();media.removeEventListener('change',syncPlayback);document.removeEventListener('visibilitychange',syncPlayback);unbindTriggers();instance.cleanup();for(const image of images)image.unref();};
 },[]);
 const heading=[['Une demande.','Le bon contexte, au même endroit.'],['Un plan clair.','L’IA prépare. Vous décidez.'],['Votre accord.','Le plan est validé, prêt à être lancé.'],['Tout est relié.','Votre CRM et votre équipe sont à jour.']][screen];
 return <div ref={root} className="bump-ops-hand" data-screen={screen} data-pressed={pressed} data-ready={rendered}>
  <canvas ref={canvas} className="bump-ops-hand-base" aria-hidden="true"/>
  <div className="bump-ops-screen" aria-hidden="true">
   <div className="bump-ops-status"><b>9:41</b><i/>▰</div>
   <header><span className="bump-brand-mark"/><b>Bump</b><span>ESPACE ÉQUIPE</span></header>
   <div className="bump-ops-heading"><span>VOTRE QUOTIDIEN, SIMPLIFIÉ</span><h5>{heading[0]}</h5><p>{heading[1]}</p></div>
   {screen===0?<div key="request" className="bump-ops-request"><small>NOUVEAU DOSSIER · 024</small><strong>Préparer le suivi client</strong><p>Rassembler le contexte utile.</p><div><i>↗</i><span>Votre CRM<small>Dossier et historique</small></span><b>✓</b></div><div><i>▤</i><span>Documents<small>3 sources réunies</small></span><b>✓</b></div><div className="bump-ops-tap">Analyser la demande <span>↗</span></div></div>:screen===1?<div key="plan" className="bump-ops-review"><small>ANALYSE PRÉPARÉE</small><strong>Deux actions à valider.</strong><p>Un résumé, puis votre accord.</p><ol><li>Mettre le dossier à jour<small>Résumé et prochaine étape</small></li><li>Informer votre équipe<small>Notification dans votre outil</small></li></ol><div className="bump-ops-approval"><i>◇</i> Validation humaine requise</div><div className="bump-ops-tap">Valider le plan <span>✓</span></div></div>:screen===2?<div key="ready" className="bump-ops-ready"><small>VALIDATION ENREGISTRÉE</small><strong>Plan approuvé.</strong><p>Votre accord est enregistré.</p><div className="bump-ops-approval"><i>✓</i> Prêt selon vos règles et vos accès</div><div className="bump-ops-tap">Exécuter les actions <span>↗</span></div><div className="bump-ops-next"><span>CRM<small>Mettre le dossier à jour</small></span><span>Équipe<small>Partager la prochaine étape</small></span></div></div>:<div key="synced" className="bump-ops-complete"><span className="bump-ops-seal">✓</span><strong>Suivi synchronisé.</strong><p>Les deux actions ont été exécutées avec les accès autorisés.</p><div><i>✓</i><span>CRM mis à jour<small>Contexte et suivi synchronisés</small></span></div><div><i>✓</i><span>Équipe informée<small>Prochaine étape partagée</small></span></div><small>VOTRE ÉQUIPE GARDE LA MAIN</small></div>}
   <footer><span>⌂</span><b>Opérations</b><span>◎</span></footer>
  </div>
  <canvas ref={foreground} className="bump-ops-thumb" aria-hidden="true"/>
  {!rendered&&<span className="bump-ops-loading">Préparation de la scène…</span>}
  <svg width="0" height="0" aria-hidden="true"><defs><filter id="bump-bronze-thumb" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  16 0 -16 0 -.035"/></filter></defs></svg>
 </div>;
}
