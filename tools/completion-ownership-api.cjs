// Run ONLY against an isolated PocketBase database copy; never production.
const assert=require('node:assert/strict');
const base=process.env.FIELDDOCK_TEST_API||'http://127.0.0.1:8091';
assert.equal(new URL(base).hostname,'127.0.0.1');assert.equal(new URL(base).port,'8091');
let checks=0;
async function req(path,token,method='GET',body){const r=await fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:token}:{})},...(body?{body:JSON.stringify(body)}:{})});let data=await r.json();return {status:r.status,data}}
async function ok(path,t,m,b){const r=await req(path,t,m,b);assert(r.status<300,JSON.stringify(r));return r.data}
async function denied(path,t,b){const r=await req(path,t,'PATCH',b);assert([400,403,404].includes(r.status),JSON.stringify(r));checks++}
(async()=>{
 const su=(await ok('collections/_superusers/auth-with-password',null,'POST',{identity:'completion-test@example.invalid',password:'LocalOnly-Test-84!'})).token;
 const tag=Date.now();const users={};
 for(const [key,role] of [['a','joiner'],['b','joiner'],['supervisor','supervisor'],['admin','admin'],['outsider','joiner']]){
  const email=key+tag+'@example.invalid',password='Local-Test-Passwords-84!';
  const u=await ok('collections/users/records',su,'POST',{email,password,passwordConfirm:password,role,active:true,name:key,username:key+tag});
  users[key]={id:u.id,token:(await ok('collections/users/auth-with-password',null,'POST',{identity:email,password})).token};
 }
 const project=(await ok('collections/projects/records',users.admin.token,'POST',{name:'Isolated completion ownership '+tag})).id;
 for(const key of ['a','b'])await ok('collections/project_members/records',su,'POST',{project,user:users[key].id,role:'joiner'});
 let n=0;
 async function door(){return (await ok('collections/schedule_records/records',su,'POST',{project,door_no:'TEST-'+(++n)})).id}
 const stages=[['frame_fitted','frame_fitted_at','frame_completed_by'],['door_hung','door_hung_at','door_completed_by'],['ironmongery_fitted','ironmongery_fitted_at','ironmongery_completed_by']];
 const date=new Date().toISOString();
 for(const [flag,time,owner] of stages){
  const idDoor=await door();let r=await ok('collections/completion_records/records',users.a.token,'POST',{project,schedule_record:idDoor,[flag]:true,[time]:date});
  const path='collections/completion_records/records/'+r.id;
  r=await ok(path,users.a.token);assert.equal(r[owner],users.a.id);assert(r[flag]);assert(r[time]);checks++;
  for(const body of [{[flag]:false},{[owner]:users.b.id},{[owner]:''},{[time]:'2020-01-01T00:00:00Z'},{[flag]:false,[owner]:users.b.id},{[owner+':unset']:true}])await denied(path,users.b.token,body);
  await denied(path,users.outsider.token,{[flag]:false});
  await denied(path,users.a.token,{[owner]:users.b.id});
  r=await ok(path,users.a.token,'PATCH',{[flag]:false});assert(!r[flag]);assert.equal(r[owner],'');assert.equal(r[time],'');checks++;
  r=await ok(path,users.b.token,'PATCH',{[flag]:true});assert.equal(r[owner],users.b.id);checks++;
  await denied(path,users.a.token,{[flag]:false});
  for(const role of ['supervisor','admin']){
   r=await ok(path,users[role].token,'PATCH',{[flag]:false});assert(!r[flag]);
   r=await ok(path,users.b.token,'PATCH',{[flag]:true});assert.equal(r[owner],users.b.id);checks++;
  }
  const duplicate=await req('collections/completion_records/records',users.a.token,'POST',{project,schedule_record:idDoor,[flag]:true});assert(duplicate.status>=400);checks++;
 }
 // Cross-stage attacks must reject the ENTIRE update, not just ignore the stolen field.
 const row=await ok('collections/completion_records/records',users.a.token,'POST',{project,schedule_record:await door(),frame_fitted:true});
 const path='collections/completion_records/records/'+row.id;
 await ok(path,users.b.token,'PATCH',{door_hung:true,ironmongery_fitted:true});
 for(const body of [{frame_fitted:false,door_hung:false},{frame_fitted:false,door_completed_by:users.a.id},{frame_fitted:false,door_hung_at:date},{frame_fitted:false,ironmongery_fitted:false}]){
  await denied(path,users.a.token,body);const r=await ok(path,users.a.token);assert(r.frame_fitted&&r.door_hung&&r.ironmongery_fitted);assert.equal(r.door_completed_by,users.b.id);checks++;
 }
 await denied(path,users.a.token,{project:'badproject00000'});
 const del=await req(path,users.a.token,'DELETE');assert(del.status>=400);checks++;
 const r=await ok(path,users.a.token,'PATCH',{fully_complete:false,installation_complete:false});assert(r.fully_complete&&r.installation_complete);checks++;
 // Historical rows from the production SNAPSHOT, never production itself.
 const all=(await ok('collections/completion_records/records?perPage=500',su)).items;const assigned=new Set([project]);
 for(const [flag,time,owner] of stages){
  const legacy=all.find(x=>x[flag]&&!x[owner]);assert(legacy,'Missing copied legacy fixture');
  if(!assigned.has(legacy.project)){await ok('collections/project_members/records',su,'POST',{project:legacy.project,user:users.a.id,role:'joiner'});assigned.add(legacy.project)}
  const lp='collections/completion_records/records/'+legacy.id;
  for(const b of [{[flag]:false},{[owner]:users.a.id},{[time]:date}])await denied(lp,users.a.token,b);
  for(const role of ['supervisor','admin']){const changed=await ok(lp,users[role].token,'PATCH',{[time]:date});assert(changed[flag]);checks++}
 }
 // Competing first completion requests cannot both claim the same stage.
 const race=await ok('collections/completion_records/records',users.a.token,'POST',{project,schedule_record:await door()});
 const rp='collections/completion_records/records/'+race.id;
 const results=await Promise.all(['a','b'].map(k=>req(rp,users[k].token,'PATCH',{frame_fitted:true,frame_completed_by:users[k].id})));
 const after=await ok(rp,users.a.token);assert(after.frame_fitted);assert([users.a.id,users.b.id].includes(after.frame_completed_by));
 assert(results.some(x=>x.status<300));assert(results.some(x=>x.status>=400));checks++;
 console.log('PASS: '+checks+' isolated direct-API assertions: all stages, reload/own undo, owner/timestamp spoofing, cross-stage atomic rejection, legacy, manager overrides, membership, duplicates, derived fields and competing claims.');
})().catch(e=>{console.error(e);process.exitCode=1});
