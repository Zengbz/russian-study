const PREFIX='ru90-week1-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+'v4-20261029';
const FILES=['./','./index.html','./styles.css?v=week1-4','./course-data.js?v=week1-4','./core.js?v=week1-4','./app.js?v=week1-4','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(FILES.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await Promise.all((await caches.keys()).filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(req.mode==='navigate'){
      try{const res=await fetch(req);if(res.ok)await cache.put(req,res.clone());return res;}
      catch(_){return await cache.match(req)||await cache.match(new URL('./index.html',self.registration.scope));}
    }
    const hit=await cache.match(req);if(hit)return hit;
    return fetch(req);
  })());
});
