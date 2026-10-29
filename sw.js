const SCOPE=self.registration.scope;
const PREFIX='ru-pocket-shell-'+encodeURIComponent(new URL(SCOPE).pathname)+'-';
const OLD_PREFIX='ru90-week1-'+encodeURIComponent(new URL(SCOPE).pathname)+'-';
const CACHE=PREFIX+'v2-1-20261029';
const DATA='ru-pocket-data-'+encodeURIComponent(new URL(SCOPE).pathname);
const FILES=['./','./index.html','./styles.css?v=pocket-2-1','./core.js?v=pocket-2-1','./loader.js?v=pocket-2-1','./audio.js?v=pocket-2-1','./app.js?v=pocket-2-1','./alphabet.json','./roadmap.json','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./assets/fonts/pocket-cyrillic.woff','./assets/fonts/pocket-cyrillic-bold.woff','./AUDIO-CREDITS.html'];
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(FILES.map(p=>new Request(new URL(p,SCOPE),{cache:'reload'})));await self.skipWaiting();})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{await Promise.all((await caches.keys()).filter(k=>(k.startsWith(PREFIX)&&k!==CACHE)||k.startsWith(OLD_PREFIX)).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(SCOPE))return;
 // The loader validates catalog/packs before it writes the data cache.
 if(u.pathname.includes('/courses/'))return;
 e.respondWith((async()=>{
  const c=await caches.open(CACHE),data=await caches.open(DATA);
  if(r.mode==='navigate'){try{const res=await fetch(r);if(res.ok)await c.put(r,res.clone());return res;}catch(_){return await c.match(r)||await c.match(new URL('./index.html',SCOPE));}}
  const hit=await c.match(r)||await data.match(r);if(hit)return hit;
  const res=await fetch(r);if(res.ok&&/\.(mp3|woff)$/.test(u.pathname))await data.put(r,res.clone());return res;
 })());
});
