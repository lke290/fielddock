onRecordCreateRequest((e)=>require(__hooks+'/site-workflow.js').note(e,true),'personal_notes','project_notes');
onRecordUpdateRequest((e)=>require(__hooks+'/site-workflow.js').note(e,false),'personal_notes','project_notes');
onRecordCreateRequest((e)=>require(__hooks+'/site-workflow.js').todo(e,true),'todos');
onRecordUpdateRequest((e)=>require(__hooks+'/site-workflow.js').todo(e,false),'todos');
onRecordUpdateRequest((e)=>require(__hooks+'/site-workflow.js').initialsGuard(e),'users');
onRecordCreateRequest((e)=>require(__hooks+'/site-workflow.js').snagRefs(e,true),'projects','schedule_records');
onRecordUpdateRequest((e)=>require(__hooks+'/site-workflow.js').snagRefs(e,false),'projects','schedule_records');
routerAdd('GET','/api/fielddock/projects/{project}/people',(e)=>require(__hooks+'/site-workflow.js').people(e),$apis.requireAuth());
routerAdd('PATCH','/api/fielddock/users/{user}/initials',(e)=>require(__hooks+'/site-workflow.js').initials(e),$apis.requireAuth());
routerAdd('POST','/api/fielddock/notes/{note}/process',(e)=>require(__hooks+'/site-workflow.js').process(e),$apis.requireAuth());

onRecordEnrich((e)=>require(__hooks+'/site-workflow.js').legacySnagView(e),'schedule_records');
