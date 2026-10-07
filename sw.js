const CACHE='fielddock-v4.19.1-shell';
// config.js is intentionally excluded: backend configuration must always come from the network.
const SHELL=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
  // Defensive cleanup in case an older FieldDock worker cached config.js.
  const cache=await caches.open(CACHE);
  const requests=await cache.keys();
  await Promise.all(requests.filter(r=>new URL(r.url).pathname.endsWith('/config.js')).map(r=>cache.delete(r)));
  await self.clients.claim();
})()));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;

  // Never serve or store FieldDock backend configuration from Cache Storage.
  if(u.pathname.endsWith('/config.js')){
    e.respondWith(fetch(e.request,{cache:'no-store'}));
    return;
  }

  e.respondWith(
    fetch(e.request).then(r=>{
      if(r.ok){
        const copy=r.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy));
      }
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))
  );
});
