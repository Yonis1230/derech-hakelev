// Local-only preview. This does not deploy, push, or expose the machine externally.
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../docs');
// Draft articles are served only by this loopback-only preview, never from docs.
const articlePreviewRoot=path.resolve(__dirname,'../artifacts/preview/article-pages');
const port=8081;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
http.createServer((req,res)=>{
 let relative;try{relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 let file=path.resolve(root,'.'+relative);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(relative==='/pages/articles'||relative.startsWith('/pages/articles/')||relative==='/articles'||relative.startsWith('/articles/')){
  const candidate=path.resolve(articlePreviewRoot,'.'+relative);
  if(candidate.startsWith(articlePreviewRoot+path.sep)&&fs.existsSync(candidate))file=candidate;
 }
 try{
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  const content=fs.readFileSync(file);
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});res.end(content);
 }catch{res.writeHead(404).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log('Dog-site preview: http://localhost:'+port+'/'));
