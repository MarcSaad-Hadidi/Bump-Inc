import {r as React} from '/runtime/assets/components-BdJai906.js';

// createRoot(document) replaces the initial head. Wait for its new stylesheet
// nodes before mounting the scene, so the opening never paints an unstyled UI.
export function useStartupReady(){
  const [ready,setReady]=React.useState(false);
  React.useLayoutEffect(()=>{
    let active=true;
    const cleanups=[];
    const styles=[...document.querySelectorAll('link[rel~="stylesheet"]')];
    const waits=styles.map(link=>link.sheet?Promise.resolve():new Promise(resolve=>{
      let timer;
      const finish=()=>{clearTimeout(timer);link.removeEventListener('load',finish);link.removeEventListener('error',finish);resolve();};
      link.addEventListener('load',finish);link.addEventListener('error',finish);
      // A missing optional sheet must not leave the entire landing blank.
      timer=setTimeout(finish,8000);cleanups.push(finish);
    }));
    Promise.all(waits).then(()=>active&&document.fonts?new Promise(resolve=>{
      const timer=setTimeout(resolve,1500);
      const finish=()=>{clearTimeout(timer);resolve();};
      cleanups.push(finish);
      Promise.all([
        document.fonts.load('400 24px "EB Garamond"'),
        document.fonts.load('400 24px "IM FELL English"'),
      ]).catch(()=>{}).then(finish);
    }):undefined).then(()=>{if(active)setReady(true);});
    return()=>{active=false;cleanups.forEach(cleanup=>cleanup());};
  },[]);
  return ready;
}
