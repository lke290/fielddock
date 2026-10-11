const CACHE='fielddock-v4.19.17-shell';

// config.js is intentionally excluded: backend configuration must always come from the network.
const SHELL=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
  const cache=await caches.open(CACHE);
  const requests=await cache.keys();
  await Promise.all(requests.filter(r=>new URL(r.url).pathname.endsWith('/config.js')).map(r=>cache.delete(r)));
  await self.clients.claim();
})()));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;

  if(u.pathname.endsWith('/config.js')){
    e.respondWith(fetch(e.request,{cache:'no-store'}));
    return;
  }

  // Always prefer the newest app page when online. Cached index is only the offline fallback.
  if(e.request.mode==='navigate' || u.pathname.endsWith('/index.html') || u.pathname.endsWith('/fielddock/')){
    e.respondWith(
      fetch(e.request,{cache:'no-store'}).then(async r=>{
        if(r.ok){
          const cache=await caches.open(CACHE);
          await cache.put('./index.html',r.clone());
        }
        return r;
      }).catch(async()=> (await caches.match('./index.html')) || (await caches.match('./')))
    );
    return;
  }

  e.respondWith(
    fetch(e.request).then(r=>{
      if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));
      return r;
    }).catch(()=>caches.match(e.request))
  );
});
