// Cross-page source checks, not a substitute for browser/accessibility verification.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const docs=path.resolve(__dirname,'../docs'),origin='https://derech-hakelev.com';
const files=[];function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,item.name);if(item.isDirectory())scan(full);else if(item.name.endsWith('.html'))files.push(full);}}
scan(path.join(docs,'pages'));files.push(path.join(docs,'index.html'));
const titles=new Set(),descriptions=new Set(),canonicals=new Set();let references=0;
for(const file of files){
 const html=fs.readFileSync(file,'utf8');
 assert.equal((html.match(/<h1\b/g)||[]).length,1,file+': single H1');
 assert.match(html,/<html lang="he" dir="rtl">/);
 assert.match(html,/class="skip-link" href="#main"/);
 assert.equal((html.match(/<script\b[^>]*src="[^\"]*accessibility\.js\?/g)||[]).length,1,'Each public page loads local accessibility controls once');
 assert.doesNotMatch(html,/https:\/\/fonts\.(?:googleapis|gstatic)\.com/,'Fonts must stay local');
 const title=html.match(/<title>([^<]+)<\/title>/)?.[1];assert.ok(title&&!titles.has(title));titles.add(title);
 const desc=html.match(/<meta name="description" content="([^"]+)"/)?.[1];assert.ok(desc&&!descriptions.has(desc));descriptions.add(desc);
 const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];assert.ok(canonical&&!canonicals.has(canonical));canonicals.add(canonical);
 const expected=origin+'/'+path.relative(docs,file).replace(/\\/g,'/').replace(/index\.html$/,'');assert.equal(canonical,expected);
 assert.ok(html.includes('<meta property="og:url" content="'+canonical+'">'));
 for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){const data=JSON.parse(match[1]);assert.equal(data['@context'],'https://schema.org');}
 for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const url=match[1].replace(/&amp;/g,'&');if(!url||url.startsWith('#')||/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url))continue;
  let target=path.resolve(path.dirname(file),decodeURIComponent(url.split(/[?#]/)[0]));
  assert.ok(target.startsWith(docs+path.sep));
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  assert.ok(fs.existsSync(target),file+': broken '+url);references++;
 }
 assert.doesNotMatch(html,/<iframe\b[^>]*\ssrc=/i,'External frames must wait for explicit consent/action');
}
const map=fs.readFileSync(path.join(docs,'sitemap.xml'),'utf8');
const mapped=[...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.equal(mapped.length,canonicals.size);for(const url of mapped)assert.ok(canonicals.has(url));
const css=fs.readFileSync(path.join(docs,'styles.css'),'utf8');
for(const match of css.matchAll(/url\("([^"]+)"\)/g))assert.ok(fs.existsSync(path.join(docs,match[1])),match[1]);
assert.match(css,/\.sr-only\{/);
assert.match(fs.readFileSync(path.join(docs,'analytics.js'),'utf8'),/ywqq9e8u1f/);
console.log(`PASS: ${files.length} Hebrew pages, unique metadata/canonicals, ${references} local references, schema JSON, local fonts, gated frames, sitemap.`);
