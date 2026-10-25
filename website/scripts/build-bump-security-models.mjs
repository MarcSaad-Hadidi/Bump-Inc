import {readFileSync,writeFileSync,statSync} from 'node:fs';
import './retarget-bump-security-faces.mjs';
const loader='src/bump/loader-data.json',data=JSON.parse(readFileSync(loader)),chapter=data.loaderData['routes/($locale).editions.winter2026'].collections.find(c=>c.handle==='operations');
chapter.backgroundAssets[0]={...chapter.backgroundAssets[0],url:'__RENAISSANCE_ORIGIN__/bump/models/security-1-v20.glb',id:'bump-security-team-v20',filesize:statSync('public/bump/models/security-1-v20.glb').size};
writeFileSync(loader,JSON.stringify(data)+'\n');console.log('Registered complete Bump heads and five native blinking eyelid meshes; room and globe retained.');
