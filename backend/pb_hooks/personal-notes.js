const locked=(record,old,fields)=>{for(const name of fields)if(JSON.stringify(record.get(name))!==JSON.stringify(old.get(name)))throw new ForbiddenError('Cannot change '+name+'.')};
module.exports.guard=(e,creating,app,old)=>{
 const record=e.record,body=e.requestInfo().body||{},superuser=e.hasSuperuserAuth();
 if(!superuser&&(!e.auth||(!creating&&old.getString('user')!==e.auth.id)))throw new ForbiddenError('Only the owner may change a personal note.');
 const now=new Date().toISOString();
 if(creating){
  if(!e.auth||e.auth.collection().name!=='users')throw new ForbiddenError('Use an authenticated user account to create personal notes.');
  for(const name of ['deleted_at','deleted_by','deletion_history'])if(Object.prototype.hasOwnProperty.call(body,name))throw new BadRequestError('Cannot supply deletion audit fields.');
  const project=record.getString('project'),reference=project?app.findRecordById('projects',project).getString('name'):'';
  if(Object.prototype.hasOwnProperty.call(body,'project_reference')&&body.project_reference!==reference)throw new BadRequestError('The project reference changed. Reopen the note draft before saving.');
  record.set('project_reference',reference);record.set('created',now);record.set('deleted_at','');record.set('deleted_by','');record.set('deletion_history',[]);
 }else{
  if(Object.prototype.hasOwnProperty.call(body,'created')&&body.created!==old.getString('created'))throw new ForbiddenError('Cannot change created.');
  locked(record,old,['project_reference','created','deleted_by','deletion_history']);
  if(old.getString('deleted_at')&&!superuser)throw new ForbiddenError('Deleted notes require authorised recovery.');
  if(record.getString('deleted_at')!==old.getString('deleted_at')){
   const deleting=!!record.getString('deleted_at');
   if(deleting){
    if(old.getString('processed_kind')||old.getString('processed_target'))throw new ForbiddenError('Processed notes retain their provenance and cannot be deleted.');
    if(!old.getString('reference'))throw new ForbiddenError('Historical note provenance requires authorised review before deletion.');
    if(app.findRecordsByFilter('todos','source_note={:id} || origin.note_id={:id}','',1,0,{id:old.id}).length)throw new ForbiddenError('A To-do retains this note as provenance.');
    if(old.getString('project')){const project=app.findRecordById('projects',old.getString('project'));for(const field of ['site_lists_json','general_snags_json']){let items;try{items=JSON.parse(project.getString(field)||'[]')}catch{throw new BadRequestError('Existing project provenance needs review.')}if(!Array.isArray(items))throw new BadRequestError('Existing project provenance needs review.');if(items.some(x=>x.source_note===old.id||x.origin?.note_id===old.id))throw new ForbiddenError('A Snag retains this note as provenance.')}}
    record.set('deleted_at',now);record.set('deleted_by',e.auth.id);
   }else{if(!superuser)throw new ForbiddenError('Only a PocketBase superuser may restore notes.');record.set('deleted_by','')}
   let history;try{history=JSON.parse(old.getString('deletion_history')||'[]')}catch{throw new BadRequestError('Invalid deletion history.');}if(!Array.isArray(history))throw new BadRequestError('Invalid deletion history.');
   record.set('deletion_history',[...history,{action:deleting?'deleted':'restored',at:now,by:e.auth.id,auth_collection:e.auth.collection().name}]);
  }
 }
 if((creating||Object.prototype.hasOwnProperty.call(body,'title'))&&!record.getString('title').trim())throw new BadRequestError('A title is required.');
 if((creating||Object.prototype.hasOwnProperty.call(body,'note'))&&!record.getString('note').trim())throw new BadRequestError('Content is required.');
};
module.exports.preventHardDelete=()=>{throw new ForbiddenError('Use personal-note soft deletion. Permanent deletion is not supported.');};


// Retain parent associations even though new personal notes may have no project.
module.exports.protectProject=e=>{
 const original=e.app;try{original.runInTransaction(app=>{e.app=app;if(app.findRecordsByFilter('personal_notes','project={:p}','',1,0,{p:e.record.id}).length)throw new ForbiddenError('This project has retained records. Archive it instead.');e.next()})}finally{e.app=original}
};
