// Run before hydration or scroll restoration. A refresh starts the film again;
// an intentional incoming chapter link can still open that chapter directly.
(()=>{
 const navigation=performance.getEntriesByType('navigation')[0];
 const replay=navigation?.type==='reload'||(!location.hash||location.hash==='#hero')&&navigation?.type!=='back_forward';
 document.documentElement.dataset.bumpReplayOpening=String(replay);
 if(!replay)return;
 history.scrollRestoration='manual';
 if(location.hash)history.replaceState(history.state,'',location.pathname+location.search);
 window.scrollTo(0,0);
})();
