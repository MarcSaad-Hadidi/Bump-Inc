import english from './en.json' with {type:'json'};

export function translateText(value){
 if(typeof value!=='string')return value;
 const compact=value.trim().replace(/\s+/g,' '),translated=Object.hasOwn(english,compact)?english[compact]:undefined;
 if(translated!==undefined)return value.replace(value.trim(),translated);
 // These selectors carry a user-visible risk name as their value.
 if(value.includes('risk-filter:Élevée'))return value.replaceAll('risk-filter:Élevée','risk-filter:High');
 return value;
}
export function translateHtml(html){
 return html.replace(/>([^<>]+)</g,(whole,text)=>'>'+translateText(text)+'<')
 .replace(/\b(aria-label|aria-description|title|alt|placeholder|content)=("([^"]*)"|'([^']*)')/g,(whole,key,quoted,double,single)=>{const quote=quoted[0],value=double??single;return key+'='+quote+translateText(value).replaceAll(quote,quote==='"'?'&quot;':'&#39;')+quote;})
 .replace(/href=("|')\/#/g,'href=$1/en#');
}
export function translateValue(value){
 if(typeof value==='string')return value.includes('<')?translateHtml(value):translateText(value);
 if(Array.isArray(value))return value.map(translateValue);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,['lang','locale','language'].includes(key)&&item==='fr'?'en':translateValue(item)]));
 return value;
}
