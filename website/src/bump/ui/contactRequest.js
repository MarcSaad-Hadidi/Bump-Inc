export async function postContact(values,token,website='',fetcher=fetch){
  const response=await fetcher('/api/contact',{
    method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),
    body:JSON.stringify({...values,website,turnstileToken:token}),
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok||result?.ok!==true){
    const error=new Error('Contact request was not confirmed');
    error.code=response.status===429?'rate_limited':response.status>=500?'unavailable':'failed';
    throw error;
  }
}
