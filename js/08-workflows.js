// Opt into server-owned Snag metadata. Older clients retain the legacy JSON view.
// This is response negotiation only; all write security runs with or without it.
const workflowPbHeaders=pbHeaders;
pbHeaders=function(json=true){return {...workflowPbHeaders(json),'X-FieldDock-Workflow':'1'}};
// Shared identity presentation. PocketBase user IDs remain authoritative.
const attributionPeople=new Map(),attributionRequests=new Map();
function userInitials(user){
 if(!user)return '';
 if(user.display_initials)return String(user.display_initials).toUpperCase();
 const parts=String(user.name||user.username||'').trim().split(/[\s-]+/).filter(Boolean);
 return parts.length?(parts[0][0]+(parts.length>1?parts[parts.length-1][0]:'')).toUpperCase():'';
}
function attributedUser(id){const own=pbAuth()?.record;if(own?.id===id&&!attributionPeople.has(id))return own;return attributionPeople.get(id)||null}
function userLabel(id){if(!id)return '';const u=attributedUser(id);return u?.name||u?.username||'Unknown user'}
function attributionStamp(id,date){
 const initials=userInitials(attributedUser(id));const time=date?new Date(date):null;
 const text=time&&!Number.isNaN(time.getTime())?time.toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'2-digit'}):'—';
 return (id?(initials||'Unknown user')+' · ':'')+text;
}
function userStampHtml(id,date){return `<span data-user-stamp data-user-id='${esc(id||'')}' data-user-date='${esc(date||'')}'>${esc(attributionStamp(id,date))}</span>`}
function refreshAttributionLabels(){document.querySelectorAll('[data-user-name]').forEach(el=>el.textContent=userLabel(el.dataset.userName));document.querySelectorAll('[data-user-stamp]').forEach(el=>{el.textContent=attributionStamp(el.dataset.userId,el.dataset.userDate);el.title=el.dataset.userId?userLabel(el.dataset.userId):'Historical completion — user not recorded'})}
async function projectPeople(projectId){
 const uid=completionAccountId(),key=uid+'/'+projectId;if(!uid||!projectsData().items[projectId]?._pocketbase)return [];
 if(attributionRequests.has(key))return attributionRequests.get(key);
 const request=pbRequest('/api/fielddock/projects/'+encodeURIComponent(projectId)+'/people').then(data=>{
  if(completionAccountId()!==uid)return [];
  for(const user of data.items||[])attributionPeople.set(user.id,user);
  refreshAttributionLabels();return data.items||[];
 }).catch(()=>[]).finally(()=>attributionRequests.delete(key));
 attributionRequests.set(key,request);return request;
}
function normaliseLoginIdentity(value){const v=String(value||'').trim();return v.includes('@')?v:v.toLowerCase().replace(/\s+/g,'-')}
let todoRows=[],todoScope='',todoRead=0,todoBusy=new Set(),todoEditing='',todoLoaded=false,todoLoadError='';
function workflowScope(){return completionAccountId()+'/'+(activeProject()?.id||'')}
function todoCanComplete(row){const uid=completionAccountId();if(!uid)return false;if(['admin','supervisor'].includes(authRole()))return true;if(row.assigned_to&&row.assigned_to!==uid)return false;return !row.complete||row.completed_by===uid}
function todoCanEdit(row){return ['admin','supervisor'].includes(authRole())||row.created_by===completionAccountId()}
function todoStatus(message){if($('todoStatus'))$('todoStatus').textContent=message}
function renderTodoCounts(){
 const current=todoScope===workflowScope()?todoRows:[],open=current.filter(x=>!x.complete);if(activeProject()?._pocketbase&&(!todoLoaded||todoScope!==workflowScope())){if($('dashTodosMeta'))$('dashTodosMeta').textContent=todoLoadError?'To-dos unavailable':'Loading To-dos…';if($('dashTodosAssigned'))$('dashTodosAssigned').textContent='';return}
 if($('dashTodosMeta'))$('dashTodosMeta').textContent=activeProject()?open.length+' outstanding':'Select a project';
 if($('dashTodosAssigned'))$('dashTodosAssigned').textContent=open.filter(x=>x.assigned_to===completionAccountId()).length+' assigned to you';
}
async function refreshTodos(){
 const p=activeProject(),scope=workflowScope(),read=++todoRead;
 if(!p?._pocketbase){todoRows=[];todoScope=scope;todoLoaded=true;todoLoadError='';renderTodos();return}
 if(todoScope!==scope){todoRows=[];todoScope=scope;todoLoaded=false;todoLoadError='';todoEditing='';$('todoEditor').hidden=true;renderTodos()}
 let rows=[],pages=1;try{for(let page=1;page<=pages;page++){const data=await pbRequest('/api/collections/todos/records?'+new URLSearchParams({page:String(page),perPage:'500',sort:'-created',filter:'project="'+p.id+'"'}));if(workflowScope()!==scope||read!==todoRead)return;rows.push(...(data.items||[]));pages=data.totalPages||1}}catch(error){if(workflowScope()===scope){todoLoadError=error.message;renderTodoCounts()}throw error}
 todoRows=rows;todoScope=scope;todoLoaded=true;todoLoadError='';renderTodos();
}
function todoCard(row){
 const busy=todoBusy.has(row.id),origin=row.origin||{};
 return `<div class='result todo-card' data-todo='${esc(row.id)}'><label class='todo-check'><input type='checkbox' data-todo-check='${esc(row.id)}' ${row.complete?'checked':''} ${busy||!todoCanComplete(row)?'disabled':''}><span><b>${esc(row.reference||'Legacy To-do')}</b> ${esc(row.description)}<small>${esc(row.location||'')} · ${esc(row.priority)}${row.assigned_to?' · Assigned to '+esc(userLabel(row.assigned_to)):' · Unassigned'}</small></span></label><div class='small'>Created ${userStampHtml(row.created_by,row.created)}${row.complete?` · Completed ${userStampHtml(row.completed_by,row.completed_at)}`:''}${busy?' · Saving…':''}</div>${origin.note_id?`<details class='todo-origin'><summary>From ${esc(origin.reference||'Note')} · <span data-user-name='${esc(origin.created_by||'')}'>${esc(userLabel(origin.created_by))}</span></summary><p>${esc(origin.text||'')}</p><small>Original ${esc(origin.created_at||'')} · ${esc(origin.location||'')} · Note ${esc(origin.note_id)}</small></details>`:''}${todoCanEdit(row)?`<button type='button' class='btn todo-edit' data-id='${esc(row.id)}' ${busy?'disabled':''}>Edit</button>`:''}</div>`;
}
function renderTodos(){
 if(!$('todoList'))return;
 const rows=todoScope===workflowScope()?todoRows:[],rank={Urgent:0,Important:1,Normal:2};
 $('todoList').innerHTML=rows.filter(x=>!x.complete).sort((a,b)=>rank[a.priority]-rank[b.priority]).map(todoCard).join('')||(todoLoaded?"<p class='small'>No outstanding To-dos.</p>":"<p class='small'>Waiting for the stored To-do list. A connection is required.</p>");
 $('todoHistory').innerHTML=rows.filter(x=>x.complete).map(todoCard).join('')||"<p class='small'>No completed To-dos.</p>";
 $('todoCompletedCount').textContent=String(rows.filter(x=>x.complete).length);
 document.querySelectorAll('[data-todo-check]').forEach(input=>input.onchange=()=>{
  const row=todoRows.find(x=>x.id===input.dataset.todoCheck),wanted=input.checked;input.checked=!!row.complete;
  void saveTodoChange(row,{complete:wanted});
 });
 document.querySelectorAll('.todo-edit').forEach(button=>button.onclick=()=>openTodoEditor(todoRows.find(x=>x.id===button.dataset.id)));
 renderTodoCounts();
}
async function saveTodoChange(row,payload){
 if(!row){todoStatus('This To-do is no longer available. Refresh the project.');return}if(todoBusy.has(row.id))return;
 const scope=workflowScope();todoBusy.add(row.id);renderTodos();todoStatus('Saving…');
 try{
  const saved=await pbRequest('/api/collections/todos/records/'+encodeURIComponent(row.id),{method:'PATCH',body:JSON.stringify(payload)});
  if(workflowScope()!==scope)return;
  if(!saved?.id||('complete' in payload&&(saved.complete!==payload.complete||(saved.complete&&(!saved.completed_by||!saved.completed_at)))))throw Error('The server did not confirm this change.');
  todoRead++;todoRows=todoRows.map(x=>x.id===saved.id?saved:x);todoStatus('Saved.');
 }catch(error){if(workflowScope()===scope)todoStatus('Save failed; previous confirmed state retained. '+error.message)}
 finally{todoBusy.delete(row.id);if(workflowScope()===scope)renderTodos()}
}
async function openTodoEditor(row=null){
 const scope=workflowScope();todoEditing=row?.id||'';
 $('todoDescription').value=row?.description||'';$('todoLocation').value=row?.location||'';$('todoPriority').value=row?.priority||'Normal';
 $('todoEditor').hidden=false;$('todoEditorTitle').textContent=row?'Edit To-do':'New To-do';
 const users=await projectPeople(activeProject()?.id);if(workflowScope()!==scope)return;
 $('todoAssigned').innerHTML="<option value=''>Unassigned</option>"+users.filter(x=>x.active&&x.assignable!==false).map(u=>`<option value='${esc(u.id)}'>${esc(u.name||u.username)}</option>`).join('');if(row?.assigned_to&&![...$('todoAssigned').options].some(option=>option.value===row.assigned_to))$('todoAssigned').insertAdjacentHTML('beforeend',`<option value='${esc(row.assigned_to)}'>${esc(userLabel(row.assigned_to))} (current assignee)</option>`);$('todoAssigned').value=row?.assigned_to||'';
}
$('todoNew')?.addEventListener('click',()=>openTodoEditor());$('todoCancel')?.addEventListener('click',()=>{$('todoEditor').hidden=true;todoEditing=''});
$('todoSave')?.addEventListener('click',async()=>{
 const p=activeProject(),scope=workflowScope(),button=$('todoSave');if(button.disabled)return;
 const payload={description:$('todoDescription').value.trim(),location:$('todoLocation').value.trim(),priority:$('todoPriority').value,assigned_to:$('todoAssigned').value};
 if(!payload.description){todoStatus('Enter a task description.');return}
 button.disabled=true;todoStatus('Saving…');
 try{
  if(todoEditing)await saveTodoChange(todoRows.find(x=>x.id===todoEditing),payload);
  else{const saved=await pbRequest('/api/collections/todos/records',{method:'POST',body:JSON.stringify({...payload,project:p.id})});if(workflowScope()!==scope)return;if(!saved?.id)throw Error('Creation was not confirmed.');todoRead++;todoRows.unshift(saved);renderTodos();todoStatus('Saved.')}
  if(workflowScope()===scope&&$('todoStatus').textContent==='Saved.'){$('todoEditor').hidden=true;todoEditing=''}
 }catch(error){if(workflowScope()===scope)todoStatus('Save failed. '+error.message)}finally{button.disabled=false}
});
let noteProcessing=false;
async function processNoteWorkflow(){
 if(noteProcessing)return;noteProcessing=true;const p=activeProject(),uid=completionAccountId(),button=$('siteNoteProcess');button.disabled=true;
 try{
  if(!p?._pocketbase)throw Error('Note processing requires a connected PocketBase project.');
  const kind=$('siteNoteProcessKind').value,note=await saveCurrentSiteNote();if(!note)return;
  if(activeProject()?.id!==p.id||completionAccountId()!==uid)throw Error('Project or account changed.');
  const result=await pbRequest('/api/fielddock/notes/'+encodeURIComponent(note.id)+'/process',{method:'POST',body:JSON.stringify({kind})});
  if(activeProject()?.id!==p.id||completionAccountId()!==uid)return;
  await renderSiteNotes();
  if(kind==='todo'){openTab('todos');await refreshTodos()}
  else{const cloud=await pbRequest('/api/collections/projects/records/'+p.id);if(activeProject()?.id!==p.id||completionAccountId()!==uid)return;const d=projectsData();d.items[p.id].siteItems=JSON.parse(cloud.site_lists_json||'[]');saveProjectsData(d);openTab('snags');$('currentSiteListPanel').open=true;await renderSiteItems();const card=document.querySelector('[data-site-item="'+CSS.escape(result.id)+'"]');if(card)card.open=true}
  $('siteNoteStatus').textContent=(result.existing?'Already processed: ':'Processed: ')+(result.reference||result.id);
 }catch(error){openSiteNoteEditor();$('siteNoteStatus').textContent='Processing failed; note retained. '+error.message}
 finally{noteProcessing=false;button.disabled=false}
}
const attributionRenderCompletion=renderCompletion;
renderCompletion=async function(){await attributionRenderCompletion();const p=activeProject();if(p?._pocketbase)void projectPeople(p.id)};
const workflowOpenTab=openTab;
openTab=function(id){workflowOpenTab(id);if(id==='todos'){void refreshTodos().catch(e=>todoStatus('Could not load To-dos: '+e.message));void refreshInitialsEditor()}};
const workflowDashboard=renderDashboard;
renderDashboard=function(){workflowDashboard();renderTodoCounts();if(activeProject()?._pocketbase)void refreshTodos().catch(()=>{})};
$('dashTodosTile')?.addEventListener('click',()=>openTab('todos'));
const workflowLoadNote=loadSiteNote;
loadSiteNote=function(id){workflowLoadNote(id);const note=personalNotesCache.find(x=>x.id===id);if($('siteNoteMeta'))$('siteNoteMeta').textContent=note?(note.reference||'Legacy Note')+' · '+attributionStamp(note.createdById,note.createdAt)+(note.processedKind?' · Processed as '+note.processedKind:''):''};
async function refreshInitialsEditor(){
 const manage=['admin','supervisor'].includes(authRole());$('initialsEditor').hidden=!manage;if(!manage)return;
 const scope=workflowScope(),users=await projectPeople(activeProject()?.id);if(scope!==workflowScope())return;
 $('initialsUser').innerHTML=users.map(u=>`<option value='${esc(u.id)}'>${esc(u.name||u.username)} (${esc(userInitials(u))})</option>`).join('');
}
$('initialsSave')?.addEventListener('click',async()=>{
 const button=$('initialsSave');if(button.disabled)return;button.disabled=true;
 try{await pbRequest('/api/fielddock/users/'+encodeURIComponent($('initialsUser').value)+'/initials',{method:'PATCH',body:JSON.stringify({initials:$('initialsOverride').value})});await refreshInitialsEditor();renderTodos();todoStatus('Display initials updated; account identity unchanged.')}catch(e){todoStatus('Could not update initials: '+e.message)}finally{button.disabled=false}
});
// Extend existing search, preserving all current search categories and handlers.
function appendWorkflowSearch(markup){const box=$('pjSearchResults');box.querySelector(':scope > p.small')?.remove();box.insertAdjacentHTML('beforeend',markup)}
const workflowSearch=searchProject;
searchProject=async function(){const scope=workflowScope();await workflowSearch();const q=normaliseSearch($('pjSearch')?.value||'');if(!q||scope!==workflowScope())return;try{await refreshTodos()}catch{}if(scope!==workflowScope()||q!==normaliseSearch($('pjSearch')?.value||''))return;if(activeProject()?._pocketbase)try{const notes=await loadPersonalNotes();if(scope!==workflowScope())return;const hits=notes.filter(n=>normaliseSearch([n.reference,n.title,n.text,n.category].join(' ')).includes(q));if(hits.length){appendWorkflowSearch(`<div class='global-search-group'><h3>Personal notes</h3>${hits.map(n=>searchRow((n.reference||'Note')+' · '+n.title,n.category,`data-workflow-note='${esc(n.id)}'`)).join('')}</div>`);$('pjSearchResults').hidden=false;$('pjSearchResults').querySelectorAll('[data-workflow-note]').forEach(b=>b.onclick=()=>{closeGlobalSearchAfterSelection();openTab('notes');loadSiteNote(b.dataset.workflowNote)})}}catch{}const rows=todoRows.filter(x=>normaliseSearch([x.reference,x.description,x.location,userLabel(x.assigned_to)].join(' ')).includes(q));if(rows.length){appendWorkflowSearch(`<div class='global-search-group'><h3>To-dos</h3>${rows.map(x=>searchRow(x.reference+' · '+x.description,x.location,`data-todo-result='${esc(x.id)}'`)).join('')}</div>`);$('pjSearchResults').hidden=false;$('pjSearchResults').querySelectorAll('[data-todo-result]').forEach(b=>b.onclick=()=>{closeGlobalSearchAfterSelection();openTab('todos')})}};

const workflowProjectNote=openProjectNote;
openProjectNote=function(id){
 workflowProjectNote(id);const note=projectNotesCache.find(x=>x.id===id),viewer=$('projectNoteViewer');if(!note||!viewer)return;
 if(!['admin','supervisor'].includes(authRole())&&note.author!==completionAccountId())return;
 const controls=document.createElement('div');controls.className='customise';
 controls.innerHTML=note.processedKind?`<span class='small'>Processed as ${esc(note.processedKind)} · ${esc(note.processedTarget)}</span>`:`<label>Process as<select><option value='todo'>To-do</option><option value='snag'>Snag</option></select></label><button type='button' class='btn'>Process note</button>`;
 viewer.append(controls);const button=controls.querySelector('button');if(!button)return;
 button.onclick=async()=>{
  if(button.disabled)return;button.disabled=true;const p=activeProject(),scope=workflowScope(),kind=controls.querySelector('select').value;
  try{
   const result=await pbRequest('/api/fielddock/notes/'+encodeURIComponent(id)+'/process',{method:'POST',body:JSON.stringify({kind,note_collection:'project_notes'})});if(scope!==workflowScope())return;
   viewer.remove();await renderSiteNotes();
   if(kind==='todo'){openTab('todos');await refreshTodos()}else{const cloud=await pbRequest('/api/collections/projects/records/'+p.id);if(scope!==workflowScope())return;const data=projectsData();data.items[p.id].siteItems=JSON.parse(cloud.site_lists_json||'[]');saveProjectsData(data);openTab('snags');$('currentSiteListPanel').open=true;await renderSiteItems()}
  }catch(error){if($('projectNoteActionStatus'))$('projectNoteActionStatus').textContent='Processing failed; note retained. '+error.message}finally{button.disabled=false}
 };
};
