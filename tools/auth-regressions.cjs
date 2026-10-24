const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
let parsed=0;
for(const [i,m] of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].entries()){
 if(!/\bsrc\s*=/.test(m[1])&&!/application\/ld\+json|application\/json/.test(m[1])){new vm.Script(m[2],{filename:'inline-'+i});parsed++}
}
const source=html.slice(html.indexOf("const PB_AUTH_KEY="),html.indexOf('function pbRelationIds'));
function setup(auth={token:'old',record:{id:'admin',role:'admin'}}){
 const values=new Map(auth?[['jr_pb_auth',JSON.stringify(auth)]]:[]),calls=[],events={};
 const ctx=vm.createContext({Headers,FormData,console,navigator:{onLine:true},PB_BASE:'https://pb.test',
 localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},
 window:{addEventListener:(k,v)=>events[k]=v},applyAuth:()=>{},setConnectionState:()=>{},
 fetch:async(url,options)=>{calls.push({url,options});return ctx.respond(url,options)}});
 ctx.respond=async url=>({ok:true,status:200,json:async()=>url.endsWith('auth-refresh')?{token:'new',record:{id:'admin',role:'admin'}}:{items:[{id:'project'}]}});
 vm.runInContext(source,ctx);return {ctx,values,calls,events,run:s=>vm.runInContext(s,ctx)};
}
async function test(){
 let t=setup();let data=await t.run("pbRequest('/api/collections/projects/records',{headers:{Authorization:'wrong'}})");
 assert.equal(data.items.length,1);assert.equal(t.calls.length,2);
 assert.equal(t.calls[0].options.headers.Authorization,'old');
 assert.equal(t.calls[1].options.headers.get('Authorization'),'new');
 assert.equal(JSON.parse(t.values.get('jr_pb_auth')).token,'new');
 assert.equal(t.calls[1].options.cache,'no-store');
 assert.equal(t.run('pbVerifiedToken'),'new');
 for(const role of ['admin','joiner']){
  t=setup({token:'old',record:{id:'admin',role}});
  t.ctx.respond=async url=>({ok:true,status:200,json:async()=>url.endsWith('auth-refresh')?{token:'fresh',record:{id:'admin',role}}:{items:[{id:'project'}]}});
  await t.run("pbRequest('/api/collections/projects/records')");
  assert.equal(JSON.parse(t.values.get('jr_pb_auth')).record.role,role);
 }
 for(const status of [401,403]){
  t=setup();t.ctx.respond=async()=>({ok:false,status,json:async()=>({})});
  await assert.rejects(t.run("pbRequest('/api/collections/projects/records')"),/sign in again/);
  assert.equal(t.calls.length,1);assert.equal(t.values.has('jr_pb_auth'),false);assert.equal(t.run('pbVerifiedToken'),'');
 }
 t=setup(null);await assert.rejects(t.run("pbRequest('/api/collections/projects/records')"),/sign in again/);assert.equal(t.calls.length,0);
 t=setup();t.ctx.respond=async()=>{throw Error('network')};
 await assert.rejects(t.run("pbRequest('/api/collections/projects/records')"),/Check your connection/);
 assert.equal(t.values.has('jr_pb_auth'),true);assert.equal(t.calls.length,1);
 t=setup();t.ctx.respond=async()=>({ok:false,status:503,json:async()=>({})});
 await assert.rejects(t.run("pbRequest('/api/collections/projects/records')"),/503/);assert.equal(t.values.has('jr_pb_auth'),true);
 // An existing verified session survives transient refresh failures; an unverified
 // startup session must not become verified merely because its token was retained.
 for(const failure of ['network',503]){
  t=setup();t.run("pbVerifiedToken='old'");
  t.ctx.respond=async()=>{if(failure==='network')throw Error('network');return {ok:false,status:503,json:async()=>({})}};
  await assert.rejects(t.run("pbRequest('/api/collections/projects/records')"));
  assert.equal(t.run('pbVerifiedToken'),'old');assert.equal(t.values.has('jr_pb_auth'),true);assert.equal(t.calls.length,1);
 }
 t=setup();await Promise.all([t.run("pbRequest('/api/collections/projects/records')"),t.run("pbRequest('/api/collections/users/records')")]);
 assert.equal(t.calls.filter(c=>c.url.endsWith('auth-refresh')).length,1);
 t=setup();t.ctx.respond=async url=>{t.values.delete('jr_pb_auth');return {ok:true,status:200,json:async()=>({token:'new',record:{id:'admin'}})}};
 await assert.rejects(t.run("pbRequest('/api/collections/projects/records')"),/account changed/);assert.equal(t.values.has('jr_pb_auth'),false);assert.equal(t.calls.length,1);
 t=setup();await t.run("pbRequest('/api/collections/users/auth-with-password',{method:'POST'})");
 assert.equal(t.calls.length,1);assert.equal(t.calls[0].options.headers.has('Authorization'),false);
 t=setup();await t.run("pbFetch(PB_BASE+'/api/collections/documents/records',{method:'POST',body:new FormData()})");
 assert.equal(t.calls[1].options.headers.get('Authorization'),'new');assert.equal(t.calls[1].options.headers.has('Content-Type'),false);
 t=setup();t.ctx.respond=async url=>({ok:url.endsWith('auth-refresh'),status:url.endsWith('auth-refresh')?200:401,json:async()=>({token:'new',record:{id:'admin'}})});
 await assert.rejects(t.run("pbRequest('/api/collections/projects/records')"),/401/);assert.equal(t.values.has('jr_pb_auth'),true);
 assert.equal(t.calls.filter(c=>c.url.endsWith('auth-refresh')).length,2);
 assert.equal(t.calls.filter(c=>!c.url.endsWith('auth-refresh')).length,2);
 // A genuinely rejected refresh after a collection 401 still clears the session.
 t=setup();let refreshCount=0;
 t.ctx.respond=async url=>url.endsWith('auth-refresh')&&++refreshCount===1
  ?{ok:true,status:200,json:async()=>({token:'new',record:{id:'admin'}})}
  :{ok:false,status:401,json:async()=>({message:'Rejected'})};
 await assert.rejects(t.run("pbRequest('/api/collections/projects/records')"),/sign in again/);
 assert.equal(t.values.has('jr_pb_auth'),false);assert.equal(t.calls.length,3);
 // Revalidate once after a rejected upload, using its existing FormData without
 // adding JSON headers or losing the image on the retry.
 t=setup();let attempts=0;
 t.ctx.respond=async url=>url.endsWith('auth-refresh')
  ?{ok:true,status:200,json:async()=>({token:'new',record:{id:'admin'}})}
  :{ok:++attempts>1,status:attempts>1?200:401,json:async()=>({id:'photo'})};
 await t.run("pbFetch(PB_BASE+'/api/collections/door_photos/records',{method:'POST',body:new FormData()})");
 assert.equal(attempts,2);assert.equal(t.calls[1].options.body,t.calls[3].options.body);
 assert.equal(t.calls[3].options.headers.has('Content-Type'),false);
 assert.equal(t.values.has('jr_pb_auth'),true);
 t=setup();await t.run("pbRequest('/api/collections/projects/records')");t.events.storage({key:'jr_pb_auth'});assert.equal(t.run('pbVerifiedToken'),'');
 // Reload must revalidate the persisted refreshed token.
 const saved=JSON.parse(t.values.get('jr_pb_auth'));t=setup(saved);
 assert.equal(t.run('pbVerifiedToken'),'');await t.run("pbRequest('/api/collections/projects/records')");
 assert.equal(t.calls[0].options.headers.Authorization,'new');
 // All collection fetches use the authenticated wrapper; only refresh and wrapper use raw fetch.
 assert.equal((html.match(/await fetch\(/g)||[]).length,3);
 assert.match(html,/valid=!!\(a\?\.token&&u&&a.token===pbVerifiedToken\)/);
 assert.doesNotMatch(html,/Membership sync unavailable/);
 console.log('PASS: '+parsed+' embedded scripts parse; auth refresh, roles, headers, expiry/rejection, missing auth, outages, concurrency, logout race, public login, multipart, 401, storage and reload regressions.');
}
test().catch(e=>{console.error(e);process.exitCode=1});
