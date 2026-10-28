let loading;
export function loadTurnstile(){
  if(window.turnstile?.render)return Promise.resolve(window.turnstile);
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async=true;script.dataset.bumpTurnstile='true';
    const finish=error=>{
      clearTimeout(timer);script.onload=script.onerror=null;
      if(error){script.remove();loading=undefined;reject(error);}
      else resolve(window.turnstile);
    };
    const timer=setTimeout(()=>finish(new Error('Verification unavailable')),10000);
    script.onload=()=>finish(window.turnstile?.render?null:new Error('Verification unavailable'));
    script.onerror=()=>finish(new Error('Verification unavailable'));
    document.head.appendChild(script);
  });
  return loading;
}
