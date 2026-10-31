// Explicit loopback-only integration tests. Requires the isolated workflow-local copy.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base='http://127.0.0.1:8092/api/';let checks=0;
async function req(p,t,method='GET',body){const r=await fetch(base+p,{method,headers:{'Content-Type':'application/json','X-FieldDock-Workflow':'1',...(t?{Authorization:t}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()}}
async function ok(p,t,m,b){const r=await req(p,t,m,b);assert(r.status<300,JSON.stringify(r));checks++;return r.data}
async function deny(p,t,m,b){const r=await req(p,t,m,b);assert(r.status>=400,JSON.stringify(r));checks++;return r.data}
(async()=>{
 const su=(await ok('collections/_superusers/auth-with-password',null,'POST',{identity:'workflow-test@example.invalid',password:'LocalWorkflow-Test-84!'})).token;
 const users={},tag=Date.now();
 for(const [name,role] of [['a','joiner'],['b','joiner'],['s','supervisor'],['admin','admin'],['outsider','joiner']]){
  const password='Workflow-Test-Password-84!',email=name+tag+'@example.invalid',username=name==='a'?'landon-john-'+tag:name+tag;
  const u=await ok('collections/users/records',su,'POST',{email,username,password,passwordConfirm:password,name:name==='a'?'Luke Clayton':name==='b'?'Craig Brown':'Supervisor Test',role,active:true});
  users[name]=await ok('collections/users/auth-with-password',null,'POST',{identity:email,password});users[name].password=password;users[name].username=username;
 }
 const project=await ok('collections/projects/records',su,'POST',{name:'Workflow isolated '+tag});
 for(const name of ['a','b','s','admin'])await ok('collections/project_members/records',su,'POST',{project:project.id,user:users[name].record.id,role:['s','admin'].includes(name)?'supervisor':'joiner'});
 const createNote=()=>ok('collections/personal_notes/records',users.a.token,'POST',{project:project.id,user:users.a.record.id,title:'Inspect frame',note:'Keep this original text\nCheck Bedroom 1',category:'First floor / Bed 1'});
 const note=await createNote();assert.match(note.reference,/^N-\d{4,}$/);
 const todo=await ok('fielddock/notes/'+note.id+'/process',users.a.token,'POST',{kind:'todo',assigned_to:users.b.record.id});assert.match(todo.reference,/^TD-\d{4,}$/);
 const t=await ok('collections/todos/records/'+todo.id,users.b.token);assert.equal(t.created_by,users.a.record.id);assert.equal(t.source_note,note.id);assert.equal(t.origin.created_by,users.a.record.id);assert.equal(t.origin.created_at,note.created);assert.equal(t.origin.text,note.note);
 assert.equal((await ok('fielddock/notes/'+note.id+'/process',users.a.token,'POST',{kind:'todo'})).id,t.id);
 await deny('fielddock/notes/'+note.id+'/process',users.b.token,'POST',{kind:'todo'});
 await deny('fielddock/notes/'+note.id+'/process',users.a.token,'POST',{kind:'snag'});
 await deny('collections/todos/records/'+t.id,users.a.token,'PATCH',{complete:true});
 const done=await ok('collections/todos/records/'+t.id,users.b.token,'PATCH',{complete:true});assert.equal(done.completed_by,users.b.record.id);assert(done.completed_at);
 assert.equal((await ok('collections/todos/records/'+t.id,users.a.token)).completed_by,users.b.record.id);
 await deny('collections/todos/records/'+t.id,users.a.token,'PATCH',{complete:false});
 await deny('collections/todos/records/'+t.id,users.b.token,'PATCH',{completed_by:users.a.record.id});
 const reopened=await ok('collections/todos/records/'+t.id,users.s.token,'PATCH',{complete:false});assert(!reopened.completed_by&&!reopened.completed_at);
 const direct=await ok('collections/todos/records',users.a.token,'POST',{project:project.id,description:'Unassigned normal task',priority:'Normal',created_by:users.b.record.id,reference:'TD-0000'});assert.equal(direct.created_by,users.a.record.id);assert.notEqual(direct.reference,'TD-0000');
 const completed=await ok('collections/todos/records/'+direct.id,users.b.token,'PATCH',{complete:true});assert.equal(completed.completed_by,users.b.record.id);
 await deny('collections/todos/records/'+direct.id,users.b.token,'PATCH',{description:'not your task'});
 await ok('collections/todos/records/'+direct.id,users.s.token,'PATCH',{description:'Supervisor correction'});
 await deny('collections/todos/records/'+direct.id,users.s.token,'PATCH',{reference:'TD-0000'});
 await deny('collections/todos/records/'+direct.id,users.a.token,'DELETE');
 assert.equal((await ok('collections/todos/records?filter='+encodeURIComponent('project="'+project.id+'"'),users.outsider.token)).items.length,0);
 const snagNote=await createNote();const snag=await ok('fielddock/notes/'+snagNote.id+'/process',users.a.token,'POST',{kind:'snag'});assert.match(snag.reference,/^SN-\d{4,}$/);
 const savedProject=await ok('collections/projects/records/'+project.id,users.a.token);const items=JSON.parse(savedProject.site_lists_json);const item=items.find(x=>x.id===snag.id);assert.equal(item.origin.text,snagNote.note);assert.equal(item.source_note,snagNote.id);assert.equal(item.createdById,users.a.record.id);
 await ok('fielddock/notes/'+snagNote.id+'/process',users.a.token,'POST',{kind:'snag'});assert.equal(JSON.parse((await ok('collections/projects/records/'+project.id,users.a.token)).site_lists_json).length,1);
 const door=await ok('collections/schedule_records/records',su,'POST',{project:project.id,door_no:'Local workflow door',snags_json:JSON.stringify([{id:'native-1',description:'Native snag',status:'Outstanding'}])});assert.match(JSON.parse(door.snags_json)[0].reference,/^SN-/);
 await deny('collections/schedule_records/records/'+door.id,users.a.token,'PATCH',{snags_json:'[]'}); // Existing restriction unchanged.
 const directory=await ok('fielddock/projects/'+project.id+'/people',users.a.token);assert(directory.items.some(x=>x.id===users.b.record.id));assert(!('email' in directory.items[0]));
 await deny('fielddock/projects/'+project.id+'/people',users.outsider.token);
 await deny('fielddock/users/'+users.a.record.id+'/initials',users.a.token,'PATCH',{initials:'LCC'});
 await deny('collections/users/records/'+users.a.record.id,users.a.token,'PATCH',{display_initials:'FAKE'});await deny('collections/users/records/'+users.a.record.id,users.a.token,'PATCH',{role:'admin'});await deny('collections/users/records/'+users.a.record.id,users.a.token,'PATCH',{active:false});
 await ok('fielddock/users/'+users.a.record.id+'/initials',users.s.token,'PATCH',{initials:'LCC'});
 assert.equal((await ok('fielddock/projects/'+project.id+'/people',users.b.token)).items.find(x=>x.id===users.a.record.id).display_initials,'LCC');
 // Concurrent creation may require explicit retry on SQLite contention; never duplicates.
 const concurrent=await Promise.all(Array.from({length:12},async()=>{for(let n=0;n<5;n++){const x=await req('collections/personal_notes/records',users.a.token,'POST',{project:project.id,user:users.a.record.id,title:'Concurrent',note:'Concurrent note'});if(x.status<300)return x.data;await new Promise(r=>setTimeout(r,50))}throw Error('Concurrent creation failed after retry')}));
 const refs=concurrent.map(x=>x.reference);assert.equal(new Set(refs).size,12);
 const shared=await ok('collections/project_notes/records',users.s.token,'POST',{project:project.id,author:users.s.record.id,title:'Shared note',content:'Shared project note',status:'open'});assert(!refs.includes(shared.reference)&&shared.reference!==note.reference);await deny('fielddock/notes/'+shared.id+'/process',users.b.token,'POST',{kind:'todo',note_collection:'project_notes'});const sharedTodo=await ok('fielddock/notes/'+shared.id+'/process',users.s.token,'POST',{kind:'todo',note_collection:'project_notes'});const sharedSaved=await ok('collections/todos/records/'+sharedTodo.id,users.a.token);assert.equal(sharedSaved.source_project_note,shared.id);assert.equal(sharedSaved.origin.created_by,users.s.record.id);assert.equal(sharedSaved.origin.note_collection,'project_notes');assert.equal((await ok('fielddock/notes/'+shared.id+'/process',users.s.token,'POST',{kind:'todo',note_collection:'project_notes'})).id,sharedTodo.id);
 await deny('collections/personal_notes/records/'+note.id,users.a.token,'PATCH',{processed_kind:''});
 // Same-note parallel processing cannot create two targets.
 const retryNote=await createNote();const results=await Promise.all([1,2].map(()=>req('fielddock/notes/'+retryNote.id+'/process',users.a.token,'POST',{kind:'todo'})));const retry=await ok('fielddock/notes/'+retryNote.id+'/process',users.a.token,'POST',{kind:'todo'});for(const x of results)if(x.status<300)assert.equal(x.data.id,retry.id);
 await ok('collections/projects/records/'+project.id,users.s.token,'PATCH',{name:project.name,project_type:'legacy editor value',current_revision:'legacy editor value'});
 // A concurrent edit cannot erase processing metadata, and a Calendar update
 // cannot erase a concurrently processed Snag in the same project record.
 const raceNote=await createNote();const raceRequests=[()=>req('collections/personal_notes/records/'+raceNote.id,users.a.token,'PATCH',{title:'Concurrent edit'}),()=>req('fielddock/notes/'+raceNote.id+'/process',users.a.token,'POST',{kind:'snag'}),()=>req('collections/projects/records/'+project.id,users.s.token,'PATCH',{site_diary_json:JSON.stringify([{id:'workflow-race-event',title:'Preserved meeting',date:'2026-11-02'}])})];
 await Promise.all(raceRequests.map(async send=>{for(let n=0;n<5;n++){const response=await send();if(response.status<300)return;await new Promise(r=>setTimeout(r,50))}throw Error('Concurrent workflow write did not settle')}));
 const raceSaved=await ok('collections/personal_notes/records/'+raceNote.id,users.a.token);assert.equal(raceSaved.processed_kind,'snag');const raceProject=await ok('collections/projects/records/'+project.id,users.s.token);assert.equal(JSON.parse(raceProject.site_lists_json).filter(x=>x.source_note===raceNote.id).length,1);assert(JSON.parse(raceProject.site_diary_json).some(x=>x.id==='workflow-race-event'));
 fs.writeFileSync(path.join(process.env.USERPROFILE,'Documents/ChatGPT/Fielddock/workflow-local/fixtures.json'),JSON.stringify({users,project,door,note,snagNote,todo,direct,snag}));
 console.log('PASS: '+checks+' isolated workflow API checks; provenance, idempotence/concurrency, references, privacy, assignments, completers, supervisor management, initials and unchanged Snag permissions.');
})().catch(e=>{console.error(e);process.exitCode=1});
