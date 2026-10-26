import {BUMP_PLAYBACK_RATE} from '../src/bump/ui/playback.js';
import {BUMP_PAPER_CSS} from '../src/bump/chapters/runtime/BumpPaper.js';
import {build} from 'esbuild';
import {readFileSync,writeFileSync,existsSync,readdirSync,copyFileSync} from 'node:fs';
import postcss from 'postcss';
import {resolve} from 'node:path';
import {stabilizeMobileViewport} from './stabilize-mobile-viewport.mjs';
import {secureThreeIdentifiers,hardenRetainedIdentifiers} from './secure-render-identifiers.mjs';
import {preparePortableSceneAssets} from './portable-scene-assets.mjs';
await build({entryPoints:['src/bump/ui/secureUuid.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,outfile:'public/runtime/secure-uuid.js'});
await build({entryPoints:{BumpViewport:'src/bump/ui/viewport.js',BumpDeviceMotion:'src/bump/ui/deviceMotion.js',BumpSceneCamera:'src/bump/ui/sceneCamera.js'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,outdir:'public/runtime/assets'});
await build({entryPoints:{BumpUI:'src/bump/ui/index.js',BumpAssistedScroll:'src/bump/ui/assistedScroll.js',BumpPlayback:'src/bump/ui/playback.js',BumpContrast:'src/bump/ui/contrast.js',BumpGaze:'src/bump/security/gaze.js',BumpMethodSurfaces:'src/bump/method/MethodSurfaces.js',BumpMethodAppearance:'src/bump/method/appearance.js',BumpNav:'src/bump/ui/BumpNav.js',BumpContent:'src/bump/chapters/Content.js',BumpGlobe:'src/bump/ui/globe/renderer.js'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,external:['/runtime/*'],plugins:[secureThreeIdentifiers()],outdir:'public/runtime/assets',legalComments:'linked'});
// The retained scene is React 18. Share that exact runtime with the new UI
// libraries; bundling package.json's separate React would break their hooks.
const reactExports=['Children','Component','PureComponent','StrictMode','Suspense','Fragment','Profiler','createElement','cloneElement','createContext','createFactory','createRef','forwardRef','isValidElement','lazy','memo','startTransition','useCallback','useContext','useDebugValue','useDeferredValue','useEffect','useId','useImperativeHandle','useInsertionEffect','useLayoutEffect','useMemo','useReducer','useRef','useState','useSyncExternalStore','useTransition','version','__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'];
const runtime='/runtime/assets/components-BdJai906.js';
const methodClock={name:'bump-supplied-clocks',setup(builder){builder.onResolve({filter:/^\.\.\/shared\/runtime$/},args=>args.importer.endsWith('/bump-anatomy/methode/live.ts')?{path:resolve('src/bump/machines/methodRuntime.ts')}:args.importer.endsWith('/bump-anatomy/vision/live.ts')?{path:resolve('src/bump/machines/visionRuntime.ts')}:args.importer.endsWith('/bump-anatomy/security-engine/live.ts')?{path:resolve('src/bump/machines/securityRuntime.ts')}:args.importer.endsWith('/bump-anatomy/workflow/live.ts')?{path:resolve('src/bump/machines/workflowRuntime.ts')}:args.importer.endsWith('/bump-anatomy/port/live.ts')?{path:resolve('src/bump/machines/portCraneRuntime.ts')}:/\/bump-anatomy\/(workflow|vos-outils|security-engine|port)\/live\.ts$/.test(args.importer)?{path:resolve('src/bump/machines/suppliedRuntime.ts')}:undefined);}};
const sharedReact={name:'bump-existing-react',setup(builder){
 builder.initialOptions.jsx='automatic';
 builder.onResolve({filter:/^react(?:-dom)?(?:\/(?:client|jsx-runtime|jsx-dev-runtime))?$/},args=>({path:args.path,namespace:'bump-react'}));
 builder.onLoad({filter:/.*/,namespace:'bump-react'},args=>({loader:'js',contents:args.path==='react'?
  `import{r as React}from'${runtime}';export default React;${reactExports.map(name=>`export const ${name}=React.${name};`).join('')}`:
  args.path.startsWith('react-dom')?`import{p}from'${runtime}';const dom=p();export default dom;export const createPortal=dom.createPortal,flushSync=dom.flushSync,findDOMNode=dom.findDOMNode,unstable_batchedUpdates=dom.unstable_batchedUpdates,createRoot=dom.createRoot,hydrateRoot=dom.hydrateRoot;`:
  `import{j,r}from'${runtime}';export const jsx=j.jsx,jsxs=j.jsxs,jsxDEV=j.jsx,Fragment=r.Fragment;`}));
}};
await build({entryPoints:{BumpSoftwareDemos:'src/bump/software/demos/SoftwareDemos.jsx',BumpSecurityDemos:'src/bump/security/SecurityDemos.jsx',BumpWorkflowMachine:'src/bump/machines/SuppliedWorkflow.jsx',BumpWorkshop:'src/bump/machines/SuppliedMethod.jsx',BumpSecurityEngine:'src/bump/machines/SuppliedSecurityEngine.jsx',BumpVisionSculpture:'src/bump/machines/SuppliedVision.jsx',BumpResearchNetwork:'src/bump/vision/ResearchConnections.jsx',BumpPort:'src/bump/machines/SuppliedPort.jsx',BumpCompanyFlow:'src/bump/company/CompanyFlow.jsx',BumpIntegrationCore:'src/bump/machines/SuppliedVosOutils.jsx'},bundle:true,splitting:true,chunkNames:'bump-shared-[hash]',format:'esm',platform:'browser',target:'es2022',minify:true,external:['/runtime/*'],plugins:[sharedReact,methodClock],outdir:'public/runtime/assets',legalComments:'linked'});
const styles=['motion','location','typography','search','contact','navigation','chapters','workflow','task-cloud','software','responsive','software-demos','security-demos','contrast','assisted-scroll','music'].filter(name=>existsSync(`src/bump/ui/${name}.css`)).map(name=>readFileSync(`src/bump/ui/${name}.css`,'utf8')).join('\n');
const machineStyles=['src/bump/anatomy/kit/iso.css','src/bump/machines/workflow/workflow-machine.css','src/bump/machines/method/method-workshop.css','src/bump/machines/security/security-engine.css','src/bump/machines/vision/vision.css','src/bump/machines/integration/integration-core.css','src/bump/machines/machines.css','src/bump/vision/research-connections.css','src/bump/company/company-flow.css'].map(path=>readFileSync(path,'utf8')).join('\n');
// Keep every supplied file byte-for-byte. Prefix only the compiled CSS selectors
// so this kit's figure/theme cannot restyle the four existing Anatomy figures.
const suppliedStyles=['src/components/bump-anatomy/kit/iso.css','src/components/bump-anatomy/shared/bump-theme.css'].map(path=>{
 const sheet=postcss.parse(readFileSync(path,'utf8'));
 sheet.walkRules(rule=>{let parent=rule.parent;while(parent){if(parent.type==='atrule'&&/keyframes$/.test(parent.name))return;parent=parent.parent;}rule.selectors=rule.selectors.map(selector=>':is(.bump-workflow-import,.bump-tools-import,.bump-security-import,.bump-method-import,.bump-vision-import,.bump-port-import) '+selector);});
 return sheet.toString();
}).join('\n');
writeFileSync('public/runtime/assets/BumpUI.css',':root{--bump-paper:'+BUMP_PAPER_CSS+';--bump-motion-rate:'+BUMP_PLAYBACK_RATE+'}\n'+styles+'\n'+readFileSync('src/bump/software/phone-v21.css','utf8')+'\n'+readFileSync('src/bump/software/cascade.css','utf8')+'\n'+machineStyles+'\n'+suppliedStyles+'\n'+readFileSync('src/bump/ui/cursor.css','utf8'));
for(const name of readdirSync('src/bump/chapters/runtime'))copyFileSync('src/bump/chapters/runtime/'+name,'public/runtime/assets/'+name);
writeFileSync('public/runtime/assets/BumpUI.css',readFileSync('public/runtime/assets/BumpUI.css','utf8')+'\n'+readFileSync('src/bump/ui/mobile.css','utf8'));
writeFileSync('public/runtime/assets/BumpUI.css',readFileSync('public/runtime/assets/BumpUI.css','utf8')+'\n'+readFileSync('src/bump/ui/chapter-intros.css','utf8'));
stabilizeMobileViewport();
hardenRetainedIdentifiers();
// Ship source-controlled analytics consent styles with the public site assets.
copyFileSync('src/bump/ui/clarity-consent.css', 'public/runtime/clarity-consent.css');

preparePortableSceneAssets();
console.log('Built Bump motion components with the existing React runtime.');
