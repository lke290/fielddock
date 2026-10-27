const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function(page){
 await page.evaluate(async()=>{
  const list=document.getElementById('completionList'),panel=document.getElementById('completion');
  const old={projectsData,saveProjectsData,projectRequirementGuides,photosFor,renderTeam,renderDashboard,renderProjectCards,fetch:window.fetch,alert:window.alert};
  const probe=window.completionSaveProbe={old,auth:localStorage.getItem(PB_AUTH_KEY),verified:pbVerifiedToken,list:list.innerHTML,panelClass:panel.className,open:document.getElementById('completionListPanel').open,doors:[...completionDoorOpen],writes:[],refreshes:0,errors:[],mode:'',rows:{},role:'joiner',hold:false};
  const records=['d1','d2','d3','history','other'].map(id=>({id,door:id,project:'persist-project'}));
  let data={active:'persist-project',items:{'persist-project':{id:'persist-project',name:'Persistence fixture',_pocketbase:true,records,completion:{}}}};
  projectsData=()=>structuredClone(data);saveProjectsData=d=>{data=structuredClone(d)};
  projectRequirementGuides=async()=>[];photosFor=async()=>[];renderTeam=()=>{};renderDashboard=()=>{};renderProjectCards=()=>{};
  window.alert=m=>probe.errors.push(m);
  const auth={token:'initial',record:{id:'save-user',role:'joiner',name:'Tester'}};
  localStorage.setItem(PB_AUTH_KEY,JSON.stringify(auth));pbVerifiedToken=auth.token;applyAuth();
  probe.rows.history={id:'c-history',project:'persist-project',schedule_record:'history',frame_fitted:true,frame_fitted_at:'2026-09-01 10:00:00.000Z',frame_completed_by:''};
  probe.rows.other={id:'c-other',project:'persist-project',schedule_record:'other',door_hung:true,door_hung_at:'2026-09-02 10:00:00.000Z',door_completed_by:'other-user'};
  window.fetch=async(url,options={})=>{
   const u=new URL(url),path=u.pathname;
   if(probe.mode==='offline')throw TypeError('Failed to fetch: simulated offline');
   if(path.endsWith('auth-refresh')){
    const a=pbAuth();probe.refreshes++;
    return Response.json({token:'rotated-'+probe.refreshes,record:{...a.record,role:probe.role}});
   }
   if(!path.includes('/completion_records/records'))throw Error('Unexpected request '+path);
   if(options.method==='POST'||options.method==='PATCH'){
    const payload=JSON.parse(options.body),id=path.split('/').pop();
    let row=Object.values(probe.rows).find(r=>r.id===id);
    const rec=payload.schedule_record||row?.schedule_record;
    probe.writes.push({method:options.method,rec,payload});
    if(probe.hold){probe.hold=false;await new Promise(resolve=>probe.release=resolve)}
    if(probe.mode==='reject')return Response.json({message:'Simulated permission/save rejection'},{status:403});
    row=row||{id:'c-'+rec,project:'persist-project',schedule_record:rec};
    for(const [field,date,owner] of [['frame_fitted','frame_fitted_at','frame_completed_by'],['door_hung','door_hung_at','door_completed_by'],['ironmongery_fitted','ironmongery_fitted_at','ironmongery_completed_by']]){
     if(field in payload){
      if(row[field]&&row[owner]!==pbAuth().record.id&&probe.role==='joiner')return Response.json({message:'Owned by another user'},{status:403});
      row[field]=payload[field];row[date]=payload[field]?payload[date]:'';row[owner]=payload[field]?pbAuth().record.id:'';
     }
    }
    probe.rows[rec]=row;
    if(probe.mode==='lost-response')throw TypeError('Response lost after server commit');
    return Response.json(structuredClone(row));
   }
   const filter=u.searchParams.get('filter')||'',match=filter.match(/schedule_record="([^"]+)"/);
   const rows=structuredClone(Object.values(probe.rows).filter(r=>!match||r.schedule_record===match[1]));
   if(probe.holdRead){probe.holdRead=false;await new Promise(resolve=>probe.releaseRead=()=>resolve());}
   if(probe.switchAccount){probe.switchAccount=false;localStorage.setItem(PB_AUTH_KEY,JSON.stringify({token:'other-session',record:{id:'other-user',role:'joiner'}}))}
   return Response.json({items:structuredClone(rows)});
  };
  probe.reload=async()=>{const d=projectsData();d.items['persist-project'].completion={};saveProjectsData(d);await syncPocketBaseCompletion('persist-project');await renderCompletion()};
  panel.classList.add('active');document.getElementById('completionListPanel').open=true;
  for(const r of records)completionDoorOpen.add('persist-project::'+r.id);
  await probe.reload();
 });
 const input=(id,field)=>page.locator('#completionList .completion-check[data-rec="'+id+'"][data-field="'+field+'"]');
 const status=(id,field)=>page.locator('#completionList [data-completion-status][data-rec="'+id+'"][data-field="'+field+'"]');
 const idle=()=>page.waitForFunction(()=>![...completionSaveStates.values()].some(s=>s.saving));
 try{
  const initial=await page.evaluate(()=>structuredClone(completionSaveProbe.rows.history));
  for(const [id,field,flag,date] of [['d1','frame','frame_fitted','frame_fitted_at'],['d2','door','door_hung','door_hung_at'],['d3','ironmongery','ironmongery_fitted','ironmongery_fitted_at']]){
   await page.evaluate(()=>completionSaveProbe.hold=true);
   await input(id,field).click();await page.waitForFunction(()=>!!completionSaveProbe.release);
   assert.equal(await input(id,field).isChecked(),false,'Pending is not an unconfirmed tick');
   assert.equal(await input(id,field).isDisabled(),true);assert.match(await status(id,field).textContent(),/Saving/);
   if(id==='d1'&&process.env.FIELDDOCK_COMPLETION_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.FIELDDOCK_COMPLETION_SCREENSHOT_DIR,'completion-pending-'+page.viewportSize().width+'.png')});
   // A render during the write must keep the saving state and confirmed value.
   await page.evaluate(()=>renderCompletion());assert.match(await status(id,field).textContent(),/Saving/);
   await page.evaluate(()=>{completionSaveProbe.release();delete completionSaveProbe.release});await idle();
   assert(await input(id,field).isChecked());assert(!(await input(id,field).isDisabled()));
   const row=await page.evaluate(id=>completionSaveProbe.rows[id],id);assert(row[flag]);assert(Number.isFinite(Date.parse(row[date])));
   assert.equal(await input(id,field).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(37, 99, 235)');
   const box=await input(id,field).boundingBox();assert(box.width<=24&&box.height<=24,'Checkbox remains compact');
   await page.evaluate(()=>completionSaveProbe.reload());assert(await input(id,field).isChecked());
   assert((await input(id,field).locator('..').textContent()).includes(await page.evaluate(date=>fmtDate(date),row[date])));
  }
  assert.equal((await page.evaluate(()=>completionSaveProbe.writes)).length,3,'One write per tap despite token rotation on every request');
  // Own undo survives a reload; failure to undo restores the previous checked/date state.
  await page.evaluate(()=>completionSaveProbe.mode='reject');await input('d1','frame').click();await idle();assert(await input('d1','frame').isChecked());assert.match(await status('d1','frame').textContent(),/Save.*Simulated/);
  await page.evaluate(()=>completionSaveProbe.mode='');await input('d1','frame').click();await idle();await page.evaluate(()=>completionSaveProbe.reload());assert(!(await input('d1','frame').isChecked()));
  assert.equal((await page.evaluate(()=>completionSaveProbe.rows.d1)).frame_fitted_at,'');
  // Offline and explicit HTTP rejection on an incomplete stage never leave a tick/date.
  for(const mode of ['offline','reject']){
   await page.evaluate(mode=>completionSaveProbe.mode=mode,mode);await input('d1','frame').click();await idle();
   assert(!(await input('d1','frame').isChecked()));assert.match(await status('d1','frame').textContent(),/Save (failed|could not be confirmed)/);
   assert(!(await input('d1','frame').isDisabled()));
   if(mode==='offline'&&process.env.FIELDDOCK_COMPLETION_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.FIELDDOCK_COMPLETION_SCREENSHOT_DIR,'completion-error-'+page.viewportSize().width+'.png')});
  }
  await page.evaluate(()=>{completionSaveProbe.mode='';completionSaveProbe.hold=true});
  const before=await page.evaluate(()=>completionSaveProbe.writes.length);
  await input('d1','frame').click();await page.waitForFunction(()=>!!completionSaveProbe.release);
  await page.evaluate(()=>{void saveCompletion('d1','frame',true);void saveCompletion('d1','frame',false)});
  await page.evaluate(()=>{completionSaveProbe.release();delete completionSaveProbe.release});await idle();
  assert.equal(await page.evaluate(()=>completionSaveProbe.writes.length),before+1);assert(await input('d1','frame').isChecked());
  // A lost write response is reconciled to actual stored state, with a visible warning.
  await page.evaluate(()=>completionSaveProbe.mode='lost-response');await input('d1','door').click();await idle();
  assert(await input('d1','door').isChecked());assert.match(await status('d1','door').textContent(),/stored state reloaded/);
  await page.evaluate(()=>completionSaveProbe.mode='');await page.evaluate(()=>completionSaveProbe.reload());assert(await input('d1','door').isChecked());
  assert.deepEqual(await page.evaluate(()=>completionSaveProbe.rows.history),initial,'Historical completion unchanged');
  assert(await input('history','frame').isDisabled());assert(await input('other','door').isDisabled());
  await page.evaluate(()=>{completionSaveProbe.role='supervisor';const a=pbAuth();a.record.role='supervisor';localStorage.setItem(PB_AUTH_KEY,JSON.stringify(a));return renderCompletion()});
  assert(!(await input('history','frame').isDisabled()));assert(!(await input('other','door').isDisabled()));
  // Background read begun before a write must not erase its confirmed result.
  await page.evaluate(()=>{completionSaveProbe.holdRead=true;completionSaveProbe.oldRead=syncPocketBaseCompletion('persist-project')});
  await page.waitForFunction(()=>!!completionSaveProbe.releaseRead);
  await input('d2','frame').click();await idle();
  await page.evaluate(async()=>{completionSaveProbe.releaseRead();await completionSaveProbe.oldRead;await renderCompletion()});assert(await input('d2','frame').isChecked());
  // A true account change must not send a write, unlike normal token rotation.
  const writes=await page.evaluate(()=>{completionSaveProbe.switchAccount=true;return completionSaveProbe.writes.length});
  await input('d3','frame').click();await idle();assert.equal(await page.evaluate(()=>completionSaveProbe.writes.length),writes);
  console.log('PASS: real checkbox/auth-wrapper persistence: token rotation, three stages/dates, pending/rerender, reload, own undo, rejection/offline rollback, rapid taps, lost response, history, permissions, stale reads and account change.');
 }finally{
  await page.evaluate(()=>{
   const p=completionSaveProbe;p.release?.();p.releaseRead?.();Object.assign(window,p.old);completionSaveStates.clear();completionSaveQueues.clear();completionRevisions.clear();
   if(p.auth===null)localStorage.removeItem(PB_AUTH_KEY);else localStorage.setItem(PB_AUTH_KEY,p.auth);pbVerifiedToken=p.verified;
   document.getElementById('completionList').innerHTML=p.list;document.getElementById('completion').className=p.panelClass;document.getElementById('completionListPanel').open=p.open;
   completionDoorOpen.clear();p.doors.forEach(k=>completionDoorOpen.add(k));applyAuth();delete window.completionSaveProbe;
  });
 }
};
