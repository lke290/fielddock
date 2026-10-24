const assert=require('node:assert/strict');
module.exports=async function photoRegressions(page){
 await page.route('**/api/files/**',r=>r.fulfill({contentType:'image/gif',body:Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64')}));
 const result=await page.evaluate(async()=>{
  const fixtures=[
   {id:'frame',photo_kind:'frame_fitted',evidence_group:'installation',photo:'frame.jpg'},
   {id:'door',photo_kind:'door_fitted',file:'door.jpg'},
   {id:'iron',photo_kind:'ironmongery_fitted',file:'iron.jpg'},
   {id:'snag',photo_kind:'defect_snag',file:'snag.jpg'},
   {id:'legacy',kind:'Door hung',photo:'legacy.jpg'},
   {id:'caption',photo_kind:'other',evidence_group:'other',caption:'Frame fitted',file:'caption.jpg'},
   {id:'legacy-kind',photo_kind:'other',evidence_group:'other',kind:'Ironmongery fitted',file:'old.jpg'},
   {id:'other',photo_kind:'other',evidence_group:'other',kind:'N/A',file:'other.jpg'},
   {id:'empty',file:'empty.jpg'},
   {id:'group',evidence_group:'ironmongery_snag',file:'group.jpg'},
   {id:'installation',evidence_group:'installation',file:'installation.jpg'},
   {id:'snake',kind:'door_fitted',file:'snake.jpg'}
  ];
  const mapped=fixtures.map(r=>mapPbPhoto({...r,project:'project',schedule_record:'door-id'}));
  const oldProjects=projectsData,oldPhotos=photosFor;
  const host=document.createElement('div');document.body.append(host);
  try{
   projectsData=()=>({active:'project',items:{project:{id:'project'}}});
   photosFor=async()=>mapped;
   host.innerHTML=completionCard({id:'door-id',door:'D-1',snagItems:[{description:'Test snag'}]},{id:'project'},[]);
   await refreshPhotoUI('door-id');
   host.querySelectorAll('details').forEach(d=>d.open=true);
   const images=[...host.querySelectorAll('img')];
   images.forEach(img=>img.loading='eager');
   await Promise.all(images.map(img=>img.decode()));
   const visible=images.every(img=>img.naturalWidth>0&&img.getClientRects().length>0);
   const sections={};
   host.querySelectorAll('[data-photo-gallery]').forEach(g=>sections[g.dataset.photoFilter]=[...g.querySelectorAll('img')].map(i=>new URL(i.src).pathname.split('/').at(-2)));
   const count=host.querySelector('[data-photo-count]').textContent;
   // Existing controls still exist on every rendered image.
   const controls=[host.querySelectorAll('.photo-item').length,host.querySelectorAll('.photo-item button').length];
   return {sections,count,controls,visible,urls:mapped.map(p=>p.url),kinds:mapped.map(p=>p.kind)};
  }finally{projectsData=oldProjects;photosFor=oldPhotos;host.remove()}
 });
 assert.deepEqual(result.sections,{frame:['frame','caption'],door:['door','legacy','snake'],iron:['iron','snag','legacy-kind','group'],other:['other','empty','installation']});
 assert.equal(result.count,'Photos: 12');assert.deepEqual(result.controls,[12,12]);
 assert.equal(result.visible,true,'All fixture images decode and are visible when photo sections are open');
 assert(result.urls.every(u=>/\/api\/files\/door_photos\//.test(u)));
 console.log('PASS: actual door card renders all 12 current/legacy photo fixtures exactly once in the expected sections, with count and delete controls.');
 const uploads=await page.evaluate(async()=>{
  const old={projectsData,pbFetch,pbAuth,pbHeaders,photosFor};
  const host=document.createElement('div');document.body.append(host);
  const records=[],requests=[],alerts=[];
  const oldAlert=window.alert;
  try{
   projectsData=()=>({active:'project',items:{project:{id:'project',_pocketbase:true}}});
   pbAuth=()=>({record:{id:'uploader'}});pbHeaders=()=>({});
   window.alert=message=>alerts.push(message);
   photosFor=async()=>records.map(mapPbPhoto);
   pbFetch=async(url,options)=>{
    const fd=options.body;
    requests.push({url,method:options.method,project:fd.get('project'),door:fd.get('schedule_record'),
     user:fd.get('uploaded_by'),caption:fd.get('caption'),kind:fd.get('photo_kind'),group:fd.get('evidence_group'),
     files:['file','photo'].map(k=>[fd.get(k).name,fd.get(k).size])});
    const record={id:'upload-'+records.length,project:fd.get('project'),schedule_record:fd.get('schedule_record'),
     caption:fd.get('caption'),photo_kind:fd.get('photo_kind'),evidence_group:fd.get('evidence_group'),file:fd.get('file').name};
    records.push(record);
    return {ok:true,json:async()=>record};
   };
   host.innerHTML=completionCard({id:'door-id',door:'D-1',snagItems:[{description:'Test snag'}]},{id:'project'},[]);
   bindPhotoControls(host);bindPhotoControls(host);
   const inputs=[...host.querySelectorAll('.door-photo-input')];
   const send=async input=>{
    const dt=new DataTransfer();dt.items.add(new File(['image'],'test.jpg',{type:'image/jpeg'}));
    input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    for(let i=0;input.files.length&&i<100;i++)await new Promise(r=>setTimeout(r,0));
    if(input.files.length)throw new Error('Upload handler did not finish');
   };
   for(const input of inputs)await send(input);
   // Explicit Other must remain Other even on a stage-specific control.
   inputs[0].closest('.compact-photo-tools').querySelector('select').value='Other';
   await send(inputs[0]);
   // The earlier photo-tools layout remains supported by the shared binding.
   const legacy=document.createElement('div');legacy.className='photo-tools';
   legacy.innerHTML="<select class='photo-kind'><option>Door fitted</option></select><input type='file' class='door-photo-input' data-rec='door-id'>";
   host.append(legacy);bindPhotoControls(legacy);await send(legacy.querySelector('input'));
   // Rebuild the card and retrieve persisted records, as after navigation/reload.
   host.innerHTML=completionCard({id:'door-id',door:'D-1'},{id:'project'},[]);
   await refreshPhotoUI('door-id');
   const sections={};
   host.querySelectorAll('[data-photo-gallery]').forEach(g=>sections[g.dataset.photoFilter]=[...g.querySelectorAll('img')].map(i=>new URL(i.src).pathname.split('/').at(-2)));
   return {requests,alerts,sections};
  }finally{Object.assign(window,old);window.alert=oldAlert;host.remove()}
 });
 assert.deepEqual(uploads.alerts,[]);
 assert.equal(uploads.requests.length,6,'Binding twice must not duplicate uploads');
 assert.deepEqual(uploads.requests.map(r=>[r.caption,r.kind,r.group]),[
  ['Frame fitted','frame_fitted','installation'],['Door fitted','door_fitted','installation'],
  ['Ironmongery fitted','ironmongery_fitted','ironmongery_snag'],['Defect / snag','defect_snag','ironmongery_snag'],
  ['Other','other','other'],['Door fitted','door_fitted','installation']
 ]);
 for(const r of uploads.requests){
  assert(r.url.endsWith('/api/collections/door_photos/records'));assert.equal(r.method,'POST');
  assert.deepEqual([r.project,r.door,r.user],['project','door-id','uploader']);
  assert.deepEqual(r.files,[['test.jpg',5],['test.jpg',5]]);
 }
 assert.deepEqual(uploads.sections,{frame:['upload-0'],door:['upload-1','upload-5'],iron:['upload-2','upload-3'],other:['upload-4']});
 console.log('PASS: real file-input handlers create correct multipart metadata for all three stages, snags, explicit Other and legacy controls; saved records render in their sections after card recreation.');
};
