const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
process.chdir(path.resolve(__dirname, '..'));
fs.rmSync('dist', {recursive:true,force:true}); fs.rmSync('.build', {recursive:true,force:true});
fs.mkdirSync('dist/assets', {recursive:true});
const compiler = fs.existsSync('node_modules/typescript/bin/tsc') ? [process.execPath, ['node_modules/typescript/bin/tsc']] : ['tsc', []];
function tsc(args) { cp.execFileSync(compiler[0], [...compiler[1], ...args], {stdio:'inherit'}); }
tsc(['-p','tsconfig.json']);
fs.cpSync('public', 'dist', {recursive:true});
function walk(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(x => x.isDirectory() ? walk(path.join(dir,x.name)) : [path.join(dir,x.name)]); }
const files = walk('dist').map(f=> './'+path.relative('dist',f).replaceAll('\\','/'));
const hash = crypto.createHash('sha256'); for(const f of walk('dist').sort()) hash.update(fs.readFileSync(f));
const version = hash.digest('hex').slice(0,14);
fs.writeFileSync('dist/sw.js', `const CACHE='spektra-servis-${version}';\nconst FILES=${JSON.stringify(files)};\nconst URLS=FILES.map(f=>new URL(f,self.registration.scope).href);\nself.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS))));\nself.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('spektra-servis-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));\nself.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});\nself.addEventListener('fetch',event=>{const req=event.request;const url=new URL(req.url);if(req.method!=='GET'||!url.href.startsWith(self.registration.scope))return;if(req.mode==='navigate'){event.respondWith(caches.open(CACHE).then(cache=>cache.match(new URL('./index.html',self.registration.scope).href)).then(cached=>cached||fetch(req)));return;}if(!URLS.includes(url.href))return;event.respondWith(caches.open(CACHE).then(cache=>cache.match(req)).then(cached=>cached||fetch(req)));});\n`);
// A self-contained file for trying the application without an install or CDN.
tsc(['-p','tsconfig.json','--module','commonjs','--moduleResolution','node','--outDir','.build']);
const modules = walk('.build').filter(f=>f.endsWith('.js')).map(f=>JSON.stringify(path.relative('.build',f).replaceAll('\\','/'))+':function(require,module,exports){\n'+fs.readFileSync(f,'utf8')+'\n}');
const bundle = `(function(){'use strict';const modules={${modules.join(',\n')}};const cache={};function load(id){if(cache[id])return cache[id].exports;if(!modules[id])throw new Error('Module '+id);const module={exports:{}};cache[id]=module;function require(request){const parts=id.split('/');parts.pop();for(const p of request.split('/')){if(p==='.'||p==='')continue;if(p==='..')parts.pop();else parts.push(p);}return load(parts.join('/'));}modules[id](require,module,module.exports);return module.exports;}load('app.js');})();`;
let html=fs.readFileSync('public/index.html','utf8');
html=html.replace('<link rel="manifest" href="./manifest.webmanifest">','').replace('<link rel="icon" href="./icon.svg" type="image/svg+xml">','').replace('<link rel="stylesheet" href="./styles.css">',()=>'<style>'+ fs.readFileSync('public/styles.css','utf8')+'</style>');
html=html.replace('<script type="module" src="./assets/app.js"></script>',()=>'<script>'+ bundle.replace(/<\/script/gi,'<\\/script')+'</script>');
fs.writeFileSync('Spektra-Servis.html',html);
console.log('Built dist/ + Spektra-Servis.html; cache '+version);
