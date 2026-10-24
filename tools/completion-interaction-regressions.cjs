const assert=require('node:assert/strict');
module.exports=async function completionInteractionRegressions(page){
 await page.evaluate(async()=>{
  const list=document.getElementById('completionList'),panel=document.getElementById('completion');
  window.completionProbe={old:{projectsData,saveProjectsData,projectRequirementGuides,searchProject,fetch:window.fetch,alert:window.alert},auth:localStorage.getItem(PB_AUTH_KEY),verified:pbVerifiedToken,list:list.innerHTML,panelClass:panel.className,panelOpen:document.getElementById('completionListPanel').open,openDoors:[...completionDoorOpen],photoRecords:[],requests:[],row:{id:'interaction-door',project:'interaction-project',snags_json:'[]'},holdPhotoRead:false};
  const probe=window.completionProbe;
  const r={id:'interaction-door',door:'D-1',snagItems:[],hardware:Array.from({length:12},(_,i)=>({description:'Interaction hardware '+i,qty:1}))};
  let data={active:'interaction-project',items:{'interaction-project':{id:'interaction-project',name:'Interaction test',_pocketbase:true,records:[r]}}};
  projectsData=()=>data;saveProjectsData=d=>{data=d};projectRequirementGuides=async()=>[];searchProject=async()=>{};
  const auth={token:'interaction-token',record:{id:'interaction-user',role:'admin',name:'Tester'}};
  localStorage.setItem(PB_AUTH_KEY,JSON.stringify(auth));pbVerifiedToken=auth.token;applyAuth();
  window.alert=message=>{throw Error(message)};
  window.fetch=async(url,options={})=>{
   const path=new URL(url).pathname;probe.requests.push([path,options.method||'GET']);let body;
   if(path.endsWith('auth-refresh'))body=auth;
   else if(path==='/api/collections/schedule_records/records/interaction-door'){
    if(options.method==='PATCH')probe.row={...probe.row,...JSON.parse(options.body)};
    body=structuredClone(probe.row);
   }else if(path==='/api/collections/door_photos/records'){
    if(options.method==='POST'){
     const fd=options.body;
     body={id:'interaction-photo',project:fd.get('project'),schedule_record:fd.get('schedule_record'),photo_kind:fd.get('photo_kind'),caption:fd.get('caption'),evidence_group:fd.get('evidence_group'),file:fd.get('file').name};
     probe.photoRecords.push(body);
    }else{
     body={items:structuredClone(probe.photoRecords)};
     if(probe.holdPhotoRead){probe.holdPhotoRead=false;await new Promise(resolve=>probe.releaseOldRead=resolve)}
    }
   }else throw Error('Unexpected interaction request: '+path);
   return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
  };
  panel.classList.add('active');document.getElementById('completionListPanel').open=true;
  completionDoorOpen.add('interaction-project::interaction-door');
  await renderCompletion();await refreshPhotoUI('interaction-door');
 });
 try{
  const hardware=page.locator('[data-completion-card=interaction-door] .compact-hardware');
  const rows=hardware.locator('.completion-hardware > div').first();
  const toggleHardware=()=>page.viewportSize().width===390?hardware.locator(':scope > summary').tap():hardware.locator(':scope > summary').click();
  await toggleHardware();
  await rows.waitFor({state:'visible'});
  assert.match(await rows.innerText(),/Interaction hardware 11/);
  await toggleHardware();
  assert.equal(await rows.isVisible(),false,'Hardware collapse hides rows');
  await toggleHardware();
  await rows.waitFor({state:'visible'});
  console.log('PASS: actual Hardware pointer clicks expand, collapse and reopen all 12 items.');
  await page.locator('[data-snag-record=interaction-door]').click();
  await page.locator('#nativeDoorSnagDialog textarea').fill('Interaction snag photo');
  await page.locator('#nativeDoorSnagDialog input[type=file]').setInputFiles({name:'snag-camera.jpg',mimeType:'image/jpeg',buffer:Buffer.from('camera-image')});
  // The pre-upload render starts a photo GET whose empty snapshot returns late.
  await page.evaluate(()=>{completionProbe.holdPhotoRead=true});
  await page.locator('#nativeDoorSnagDialog [type=submit]').click();
  await page.locator('#nativeDoorSnagDialog').waitFor({state:'detached'});
  await page.waitForFunction(()=>document.querySelector('[data-photo-filter=snag] img'));
  const uploaded=await page.evaluate(()=>completionProbe.photoRecords);
  assert.equal(uploaded.length,1);
  assert.deepEqual([uploaded[0].project,uploaded[0].schedule_record,uploaded[0].photo_kind,uploaded[0].evidence_group],['interaction-project','interaction-door','defect_snag','ironmongery_snag']);
  const after=await page.evaluate(async()=>{
   completionProbe.releaseOldRead();await new Promise(resolve=>setTimeout(resolve,20));
   const g=document.querySelector('[data-photo-filter=snag]');
   return {images:g.querySelectorAll('img').length,hidden:g.closest('[data-snag-photos]').hidden,count:document.querySelector('[data-photo-count]').textContent};
  });
  assert.deepEqual(after,{images:1,hidden:false,count:'Photos: 1'},'A late pre-upload photo response must not erase the saved photo');
  // The current card was recreated during save: its Hardware interaction must still work.
  await toggleHardware();await rows.waitFor({state:'visible'});
  console.log('PASS: native form uses real multipart/auth/record flow; late photo reads preserve confirmed snag photo and Hardware remains interactive after rerender.');
 }finally{
  await page.evaluate(()=>{
   const p=completionProbe;p.releaseOldRead?.();document.getElementById('nativeDoorSnagDialog')?.remove();
   Object.assign(window,p.old);document.getElementById('completionList').innerHTML=p.list;
   document.getElementById('completion').className=p.panelClass;document.getElementById('completionListPanel').open=p.panelOpen;
   completionDoorOpen.clear();p.openDoors.forEach(k=>completionDoorOpen.add(k));saveCompletionDoorOpen();
   if(p.auth===null)localStorage.removeItem(PB_AUTH_KEY);else localStorage.setItem(PB_AUTH_KEY,p.auth);
   pbVerifiedToken=p.verified;applyAuth();delete window.completionProbe;
  });
 }
};
