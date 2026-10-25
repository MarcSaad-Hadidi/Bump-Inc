import http from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import path from 'node:path';

const args=process.argv.slice(2);
const option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const port=Number(option('--port','4173'));
const host=option('--host','0.0.0.0');
const root=path.resolve('public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.wasm':'application/wasm','.glb':'model/gltf-binary','.ktx2':'image/ktx2','.riv':'application/octet-stream','.mp4':'video/mp4','.webm':'video/webm','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://preview.test');
    const name=decodeURIComponent(url.pathname);
    if(name==='/__mobile-review'){const data=await readFile(path.resolve('tests/fixtures/mobile-review.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'"});res.end(data);return;}
    if(name==='/en.html'||name==='/en/'){res.writeHead(302,{'Location':'/en'+url.search,'Cache-Control':'no-store'});res.end();return;}
    const origin='http://'+req.headers.host;
    let file=path.resolve(root,'.'+(name==='/en'?'/en.html':name));
    if(!file.startsWith(root+path.sep)) file='';
    let info=file?await stat(file).catch(()=>null):null;
    if(!info?.isFile()) {
      if(path.extname(name)&&!name.endsWith('.html')) {res.writeHead(404);res.end('Not found');return;}
      file=path.resolve('src/reference-shell.html');
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(404);res.end('Not found');return;}
    let data=await readFile(file);
    const extension=path.extname(file);
    if(/\.(html|js|mjs|css|json|svg|txt)$/.test(extension)) data=Buffer.from(data.toString().replaceAll('__RENAISSANCE_ORIGIN__',origin));
    const headers={'Content-Type':types[extension]||'application/octet-stream','Cache-Control':'no-cache'};
    const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if(range){const start=Number(range[1]);const end=Math.min(Number(range[2]||data.length-1),data.length-1);res.writeHead(206,{...headers,'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(req.method==='HEAD'?undefined:data.subarray(start,end+1));}
    else {res.writeHead(200,{...headers,'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);}
  }catch(error){res.writeHead(500);res.end('Preview error');console.error(error.message);}
});
server.listen(port,host,()=>console.log(`Reference preview listening on ${port}`));
