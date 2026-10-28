import {build} from 'esbuild';
import postcss from 'postcss';
import {readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';

export async function buildSeoFigures(sharedReact) {
 // Only this build owns the generated SEO module directory.
 rmSync('public/runtime/seo',{recursive:true,force:true});
 const clocks={name:'seo-native-clock',setup(b){b.onResolve({filter:/^(?:\.\.\/shared\/runtime|\.\/runtime)$/},args=>args.importer.replaceAll('\\','/').includes('/bump-anatomy/')?{path:resolve('src/bump/seo/figure-runtime.ts')}:undefined);}};
 const cssImports={name:'seo-scoped-css',setup(b){b.onLoad({filter:/\.css$/},()=>({contents:'',loader:'css'}));}};
 await build({entryPoints:{BumpSeoFigures:'src/bump/seo/SeoFigures.tsx'},bundle:true,splitting:true,chunkNames:'native-[name]-[hash]',format:'esm',platform:'browser',target:'es2022',minify:true,external:['/runtime/*'],plugins:[sharedReact,clocks,cssImports],outdir:'public/runtime/seo',legalComments:'linked'});
 rmSync('public/runtime/seo/BumpSeoFigures.css',{force:true});
 const css=postcss.parse(['kit/iso.css','shared/bump-theme.css'].map(p=>readFileSync('src/components/bump-anatomy/'+p,'utf8')).join('\n'));
 css.walkRules(rule=>{let parent=rule.parent;while(parent){if(parent.type==='atrule'&&/keyframes$/.test(parent.name))return;parent=parent.parent;}rule.selectors=rule.selectors.map(s=>'.seo-anatomy '+s);});
 mkdirSync('public/bump/seo',{recursive:true});writeFileSync('public/bump/seo/anatomy.css',css.toString());
}
