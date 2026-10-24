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
};
