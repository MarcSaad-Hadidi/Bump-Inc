// Keep native bundles completely out of the English edition. The optional
// arguments let the lazy-loading lifecycle be exercised without a browser.
export function installSeoFigureLoading(doc=document,load=()=>import('/runtime/seo/BumpSeoFigures.js'),createObserver=(fn,options)=>new IntersectionObserver(fn,options)) {
 if(!doc.documentElement.lang.startsWith('fr'))return()=>{};
 const nodes=[...doc.querySelectorAll('[data-seo-figure]:not([data-poster-only])')];if(!nodes.length)return()=>{};
 let disposed=false,stop=null,loading=false;
 const observer=createObserver(entries=>{
  if(loading||!entries.some(entry=>entry.isIntersecting))return;
  loading=true;observer.disconnect();
  load().then(module=>disposed?()=>{}:module.mountSeoFigures()).then(cleanup=>{if(disposed)cleanup();else stop=cleanup;}).catch(()=>{if(!disposed)console.error('Bump illustrations could not be enhanced; posters remain available');});
 },{rootMargin:'600px 0px'});
 nodes.forEach(node=>observer.observe(node));
 return()=>{disposed=true;observer.disconnect();stop?.();};
}
