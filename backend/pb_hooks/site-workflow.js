const manager=e=>e.hasSuperuserAuth()||!!e.auth&&['admin','supervisor'].includes(e.auth.getString('role'));
function member(app,e,project){if(!e.auth)throw new ForbiddenError('Sign in required.');if(!manager(e)&&!app.findRecordsByFilter('project_members','project={:p} && user={:u}','',1,0,{p:project,u:e.auth.id}).length)throw new ForbiddenError('Project membership required.');}
function nextRef(app,prefix){const counter=app.findFirstRecordByFilter('workflow_sequences','prefix={:p}',{p:prefix});const n=counter.getInt('value')+1;counter.set('value',n);app.save(counter);return prefix+'-'+String(n).padStart(4,'0')}
function tx(e,work){const original=e.app;try{original.runInTransaction(app=>{e.app=app;work(app)})}finally{e.app=original}}
function immutable(record,old,fields){for(const field of fields)if(JSON.stringify(record.get(field))!==JSON.stringify(old.get(field)))throw new ForbiddenError('Cannot change '+field+'.');}
function assigned(app,project,id){if(id&&!app.findRecordsByFilter('project_members','project={:p} && user={:u}','',1,0,{p:project,u:id}).length)throw new BadRequestError('Assignee must be a project member.');}
module.exports.note=(e,creating)=>tx(e,app=>{
 const before=creating?null:app.findRecordById(e.record.collection().name,e.record.id);
 if(creating){member(app,e,e.record.getString('project'));e.record.set(e.record.collection().name==='project_notes'?'author':'user',e.auth.id);e.record.set('reference',nextRef(app,'N'));e.record.set('processed_kind','');e.record.set('processed_target','')}
 else{const incoming=e.record,old=before,record=old.fresh();for(const key of Object.keys(e.requestInfo().body||{})){if(!record.collection().fields.getByName(key))throw new BadRequestError('Unsupported Note field.');record.set(key,incoming.get(key))}immutable(record,old,['project','user','author','reference','processed_kind','processed_target']);e.record=record;}
 if(e.record.collection().name==='project_notes'){
  const done=e.record.getString('status')==='complete',wasDone=before?.getString('status')==='complete';
  e.record.set('completed_by',done?(wasDone?before.getString('completed_by'):e.auth.id):'');
  e.record.set('completed_at',done?(wasDone?before.getString('completed_at'):new Date().toISOString()):'');
 }
 e.next();
});
module.exports.todo=(e,creating)=>tx(e,app=>{
 const incoming=e.record,old=creating?new Record(incoming.collection()):app.findRecordById('todos',incoming.id);let record=incoming;
 if(!creating){record=old.fresh();for(const key of Object.keys(e.requestInfo().body||{})){if(!['description','location','priority','assigned_to','complete','completed_by','completed_at','project','reference','created_by','created','source_note','source_project_note','origin'].includes(key))throw new BadRequestError('Unsupported To-do field.');record.set(key,incoming.get(key))}e.record=record}
 member(app,e,record.getString('project'));
 if(creating){if(record.getBool('complete')||record.getString('source_note')||record.getString('source_project_note')||Object.prototype.hasOwnProperty.call(e.requestInfo().body,'origin'))throw new BadRequestError('Create an incomplete To-do; use Note processing for provenance.');record.set('reference',nextRef(app,'TD'));record.set('created_by',e.auth.id);record.set('completed_by','');record.set('completed_at','')}
 else{
  immutable(record,old,['project','reference','created_by','created','source_note','source_project_note','origin']);
  const detailChanged=['description','location','priority','assigned_to'].some(k=>JSON.stringify(record.get(k))!==JSON.stringify(old.get(k)));
  if(detailChanged&&!manager(e)&&old.getString('created_by')!==e.auth.id)throw new ForbiddenError('Only the creator or management can edit task details.');
  const stageChanged=['complete','completed_by','completed_at'].some(k=>JSON.stringify(record.get(k))!==JSON.stringify(old.get(k)));
  if(stageChanged){
   if(!manager(e)&&((old.getString('assigned_to')&&old.getString('assigned_to')!==e.auth.id)||(record.getString('assigned_to')&&record.getString('assigned_to')!==e.auth.id)))throw new ForbiddenError('This To-do is assigned to another user.');
   if(!manager(e)&&old.getBool('complete')&&old.getString('completed_by')!==e.auth.id)throw new ForbiddenError('Only the completer or management can reopen it.');
   if(!manager(e)&&record.getString('completed_by')&&record.getString('completed_by')!==e.auth.id)throw new ForbiddenError('Cannot forge the completing user.');
   record.set('completed_by',record.getBool('complete')?(old.getBool('complete')?old.getString('completed_by'):e.auth.id):'');
   record.set('completed_at',record.getBool('complete')?(old.getBool('complete')?old.getString('completed_at'):new Date().toISOString()):'');
  }
 }
 assigned(app,record.getString('project'),record.getString('assigned_to'));e.next();
});
module.exports.initialsGuard=e=>{
 // A Supervisor is management for work/initials, never for account security.
 const admin=e.hasSuperuserAuth()||e.auth?.getString('role')==='admin';
 if(!admin)immutable(e.record,e.record.original(),['role','active']);
 if(!manager(e))immutable(e.record,e.record.original(),['display_initials']);
 e.next();
};
module.exports.initials=e=>{if(!manager(e))throw new ForbiddenError('Management required.');const value=String(e.requestInfo().body.initials||'').trim().toUpperCase();if(value&&!/^[A-Z0-9]{1,6}$/.test(value))throw new BadRequestError('Use 1–6 letters/digits, or clear to generate from name.');const user=e.app.findRecordById('users',e.request.pathValue('user'));user.set('display_initials',value);e.app.save(user);return e.json(200,{id:user.id,display_initials:value})};
module.exports.people=e=>{
 const app=e.app,p=e.request.pathValue('project');member(app,e,p);const ids={},members={};
 for(const row of app.findRecordsByFilter('project_members','project={:p}','',0,0,{p})){ids[row.getString('user')]=true;members[row.getString('user')]=true}
 for(const row of app.findRecordsByFilter('completion_records','project={:p}','',0,0,{p}))for(const key of ['frame_completed_by','door_completed_by','ironmongery_completed_by'])ids[row.getString(key)]=true;
 for(const row of app.findRecordsByFilter('todos','project={:p}','',0,0,{p})){for(const key of ['created_by','completed_by','assigned_to'])ids[row.getString(key)]=true;const origin=row.get('origin');if(origin?.created_by)ids[origin.created_by]=true}
 const collect=value=>{try{for(const row of JSON.parse(value||'[]'))for(const key of ['createdById','completedById'])if(row[key])ids[row[key]]=true}catch{}};const project=app.findRecordById('projects',p);collect(project.getString('site_lists_json'));collect(project.getString('general_snags_json'));for(const row of app.findRecordsByFilter('schedule_records','project={:p}','',0,0,{p}))collect(row.getString('snags_json'));ids[e.auth.id]=true;const result=[];for(const id of Object.keys(ids)){if(!id)continue;try{const u=app.findRecordById('users',id);result.push({id:u.id,name:u.getString('name'),username:u.getString('username'),display_initials:u.getString('display_initials'),active:u.getBool('active'),assignable:!!members[id]&&u.getBool('active')})}catch{}}
 return e.json(200,{items:result});
};
function array(value){const data=JSON.parse(value||'[]');if(!Array.isArray(data))throw new BadRequestError('Invalid existing list; nothing changed.');return data}
module.exports.snagRefs=(e,creating)=>{
 const fields=e.record.collection().name==='projects'?['site_lists_json','general_snags_json']:['snags_json'];
 const incoming=e.record,changed=fields.filter(k=>creating?!!incoming.getString(k):incoming.getString(k)!==incoming.original().getString(k));
 tx(e,app=>{let old=null;if(!creating){old=app.findRecordById(incoming.collection().name,incoming.id);for(const key of changed)if(old.getString(key)!==incoming.original().getString(key))throw new BadRequestError('This Snag list changed. Refresh and retry.');const fresh=old.fresh();for(const key of Object.keys(e.requestInfo().body||{})){if(!fresh.collection().fields.getByName(key)){if(fields.includes(key.replace(/[:+-].*$/,'')))throw new BadRequestError('Replace the Snag list explicitly.');continue}fresh.set(key,incoming.get(key))}e.record=fresh;}for(const key of changed){const previous=array(creating?'[]':old.getString(key)),rows=array(e.record.getString(key));
  for(const [index,row] of rows.entries()){
   if(key==='site_lists_json'&&(row.orderType||row.noteType))continue;
   const fingerprint=x=>[x.source,x.item,x.description||x.title,x.location].join('|');
   const old=previous.find(x=>row.id?x.id===row.id:fingerprint(x)===fingerprint(row));
   const done=x=>['complete','Resolved'].includes(x.status),dateKey=key==='site_lists_json'?'completedAt':'resolvedAt';
   if(old){
    // Provenance is a server snapshot, not an editable part of Snag content.
    for(const field of ['origin','source_note','source_collection','createdAt']){
     if(Object.prototype.hasOwnProperty.call(row,field)&&JSON.stringify(row[field])!==JSON.stringify(old[field]))throw new ForbiddenError('Cannot change Snag '+field+'.');
     if(Object.prototype.hasOwnProperty.call(old,field))row[field]=old[field];else delete row[field];
    }
    for(const field of ['reference','createdById']){if(old[field])row[field]=old[field];else delete row[field]}
    if(done(row)!==done(old)){
     row.completedById=done(row)?e.auth?.id||'':'';
     // v4.19.18 confirms an exact JSON echo. Accept its timestamp only when
     // within two minutes of server time; identity is ALWAYS server-derived.
     const supplied=row[dateKey],legacy=key==='snags_json'&&!workflowClient(e.requestInfo());
     if(done(row)&&legacy){const time=Date.parse(supplied);if(!Number.isFinite(time)||Math.abs(Date.now()-time)>120000)throw new BadRequestError('Invalid Snag completion time. Refresh and retry.');row[dateKey]=supplied}
     else row[dateKey]=done(row)?new Date().toISOString():'';
    }else{
     for(const field of ['completedById','completedAt','resolvedAt']){
      if(field!== 'completedById'&&Object.prototype.hasOwnProperty.call(row,field)&&row[field]!==old[field])throw new ForbiddenError('Cannot rewrite Snag completion time.');
      if(Object.prototype.hasOwnProperty.call(old,field))row[field]=old[field];else delete row[field];
     }
    }
    // An alternate timestamp key must not smuggle in a forged completion date.
    const other=dateKey==='completedAt'?'resolvedAt':'completedAt';
    if(Object.prototype.hasOwnProperty.call(old,other))row[other]=old[other];else delete row[other];
    continue;
   }
   if(row.origin||row.source_note||row.source_collection)throw new ForbiddenError('Use Note processing to create Snag provenance.');
   row.id=row.id||$security.randomString(15);row.reference=nextRef(app,'SN');row.createdById=e.auth?.id||'';row.createdAt=new Date().toISOString();
   delete row.completedAt;delete row.resolvedAt;
   if(done(row)){row.completedById=e.auth?.id||'';row[dateKey]=new Date().toISOString()}else{delete row.completedById;row[dateKey]=''}

  }
  e.record.set(key,JSON.stringify(rows));
 }e.next()});
};
module.exports.process=e=>{
 let result;tx(e,app=>{
  const body=e.requestInfo().body,collection=body.note_collection||'personal_notes';if(!['personal_notes','project_notes'].includes(collection))throw new BadRequestError('Invalid note collection.');const shared=collection==='project_notes',note=app.findRecordById(collection,e.request.pathValue('note')),project=note.getString('project'),kind=body.kind;
  member(app,e,project);if(shared){if(!e.hasSuperuserAuth()&&!app.canAccessRecord(note,e.requestInfo(),note.collection().viewRule))throw new ForbiddenError('Cannot read this project note.');if(!manager(e)&&note.getString('author')!==e.auth.id)throw new ForbiddenError('Only the author or management can process this shared note.')}else if(note.getString('user')!==e.auth.id)throw new ForbiddenError('Only the note creator can process this private note.');if(!['todo','snag'].includes(kind))throw new BadRequestError('Choose To-do or Snag.');
  if(note.getString('processed_kind')){if(note.getString('processed_kind')!==kind)throw new BadRequestError('This note was already processed differently.');result={kind,id:note.getString('processed_target'),existing:true};return}
  if(!note.getString('reference'))note.set('reference',nextRef(app,'N'));
  const origin={note_id:note.id,note_collection:collection,reference:note.getString('reference'),text:note.getString(shared?'content':'note'),title:note.getString('title'),created_by:note.getString(shared?'author':'user'),created_at:note.getString('created'),location:note.getString('category')};
  if(kind==='todo'){
   const rec=new Record(app.findCollectionByNameOrId('todos'));rec.set('project',project);rec.set('description',origin.text);rec.set('location',String(body.location||origin.location));rec.set('priority',['Normal','Important','Urgent'].includes(body.priority)?body.priority:'Normal');rec.set('assigned_to',body.assigned_to||'');assigned(app,project,rec.getString('assigned_to'));rec.set('created_by',e.auth.id);rec.set('reference',nextRef(app,'TD'));rec.set(shared?'source_project_note':'source_note',note.id);rec.set('origin',origin);app.save(rec);result={kind,id:rec.id,reference:rec.getString('reference')};
  }else{
   const p=app.findRecordById('projects',project),items=array(p.getString('site_lists_json'));
   const snag={id:$security.randomString(15),reference:nextRef(app,'SN'),title:origin.title||'Site snag',notes:origin.text,location:String(body.location||origin.location),priority:'Normal',list:'From Notes',status:'open',createdById:e.auth.id,createdAt:new Date().toISOString(),source_note:note.id,source_collection:collection,origin};
   items.unshift(snag);p.set('site_lists_json',JSON.stringify(items));app.save(p);result={kind,id:snag.id,reference:snag.reference};
  }
  note.set('processed_kind',kind);note.set('processed_target',result.id);app.save(note);
 });return e.json(200,result);
};

function workflowClient(info){return String(info?.headers?.x_fielddock_workflow||'')==='1'}
module.exports.legacySnagView=e=>{
 e.next();
 if(workflowClient(e.requestInfo))return;
 // Response-only projection. Stored audit metadata is never removed or saved here.
 const rows=array(e.record.getString('snags_json'));
 for(const row of rows)for(const field of ['reference','createdById','createdAt','completedById','completedAt'])delete row[field];
 e.record.set('snags_json',JSON.stringify(rows));
};
