import {readFileSync,writeFileSync} from 'node:fs';

// Keep the retained client stream and the interactive cards on the same content.
const content=JSON.parse(readFileSync('src/bump/content.json','utf8'));
const data=JSON.parse(readFileSync('src/bump/loader-data.json','utf8'));
const route=data.loaderData['routes/($locale).editions.winter2026'];
// Retain already complete portrait posters. The old Workflow / library / method
// phone captures baked the paper wipe into the painting itself.
const portraitPosters={operations:'security-fallback-mobile-v21.jpg',b2b:'company-atelier-fallback-mobile-v22.jpg'};
for(const scene of route.collections){
 const clean=scene.fallbackImageOptimized||scene.fallbackImage;
 if(clean){const mobile={...clean,...(portraitPosters[scene.handle]?{url:'__RENAISSANCE_ORIGIN__/bump/art/'+portraitPosters[scene.handle]}:{})};scene.fallbackImageMobile=mobile;scene.fallbackImageMobileOptimized={...mobile};}
}
route.hero.fallbackImageMobile={...route.hero.fallbackImage,url:'__RENAISSANCE_ORIGIN__/bump/art/hero-fallback-mobile-v2.webp'};
route.hero.fallbackImageMobileOptimized={...route.hero.fallbackImageMobile};
route.hero.subtitle=content.brand.subtitle.replace(/\.\s+/g,'.\n');
route.collections=content.chapters.map(chapter=>{const collection=route.collections.find(c=>c.handle===chapter.handle);if(!collection)throw new Error(`Missing Bump chapter: ${chapter.handle}`);return collection;});
for(const chapter of content.chapters){
  const collection=route.collections.find(c=>c.handle===chapter.handle);
  if(!collection)throw new Error(`Missing Bump chapter: ${chapter.handle}`);
  collection.title=chapter.title;
  collection.descriptionHtml=chapter.descriptionHtml;
  collection.nestedCollections=chapter.groups.map((group,index)=>({
    id:`bump-group-${chapter.handle}-${index}`,
    handle:`${chapter.handle}-group-${index}`,
    title:group.title,
    organizedContent:group.cards.map(card=>({...card,id:`bump-${card.handle}`,bumpCard:true,chapter:chapter.handle,divisionLabel:chapter.divisionLabel}))
  }));
}
route.sideNav=content.chapters.map(chapter=>({id:`bump-nav-${chapter.handle}`,title:chapter.title,handle:chapter.handle}));
const slots=[],memo=new Map();
function encode(value){
  if(value===null)return -5;
  if(typeof value!=='object'){
    const key=typeof value+':'+value;
    if(memo.has(key))return memo.get(key);
    const index=slots.length;slots.push(value);memo.set(key,index);return index;
  }
  const index=slots.length;slots.push(null);
  slots[index]=Array.isArray(value)?value.map(encode):Object.fromEntries(Object.entries(value).map(([key,item])=>['_'+encode(key),encode(item)]));
  return index;
}
encode(data);
const stream=JSON.stringify(JSON.stringify(slots)+'\n').replaceAll('</','<\\/');
const shell=readFileSync('src/reference-shell.html','utf8').replace(/window\.__remixContext\.streamController\.enqueue\([\s\S]*?\);<\/script>/,()=>`window.__remixContext.streamController.enqueue(${stream});</script>`);
writeFileSync('src/reference-shell.html',shell);
writeFileSync('src/bump/loader-data.json',JSON.stringify(data));
writeFileSync('public/runtime/assets/BumpData.js',`export const content=${JSON.stringify(content)};\n`);
writeFileSync('public/bump/content.json',JSON.stringify(content,null,2)+'\n');
console.log(`Synchronized ${content.chapters.length} Bump chapters.`);
