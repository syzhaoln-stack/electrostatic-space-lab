import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const args=process.argv.slice(2), option=(key,fallback)=>{const i=args.indexOf(key);return i>=0?args[i+1]:fallback};
const root=path.resolve(option('--directory',process.cwd())),port=Number(option('--port',process.env.PORT||4173));
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.vtt':'text/vtt; charset=utf-8','.mp3':'audio/mpeg','.wasm':'application/wasm','.pck':'application/octet-stream','.woff2':'font/woff2'};
http.createServer((req,res)=>{
 let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 if(p==='/')p='/index.html';if(!path.extname(p)&&fs.existsSync(path.join(root,p+'.html')))p+='.html';const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.stat(file,(e,stat)=>{
  if(e||!stat.isFile()){res.writeHead(404).end('Not found');return}
  const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
  let start=0,end=stat.size-1,status=200;
  if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return}start=match[1]?Number(match[1]):Math.max(0,stat.size-Number(match[2]));end=match[1]&&match[2]?Math.min(Number(match[2]),end):end;if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return}status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;}
  headers['Content-Length']=end-start+1;res.writeHead(status,headers);if(req.method==='HEAD'){res.end();return}fs.createReadStream(file,{start,end}).pipe(res);
 });
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
