const assert=require('node:assert/strict');
// Keep the real photo mapper, retrieval, uploader, pbFetch, ensurePbAuth and auth UI.
// Mock only the HTTP boundary; the older photo tests replaced pbFetch/ photosFor.
module.exports=async function photoSessionRegressions(page){
 const result=await page.evaluate(async()=>{
  const old={projectsData,fetch:window.fetch,alert:window.alert},oldAuth=localStorage.getItem(PB_AUTH_KEY),oldVerified=pbVerifiedToken;
  const host=document.createElement('div');document.body.append(host);
  const session={token:'session-valid',record:{id:'photo-user',role:'admin',name:'Photo tester'}};
  const records=[
   {id:'existing-frame',photo_kind:'frame_fitted',evidence_group:'installation',caption:'Frame fitted'},
   {id:'existing-door',photo_kind:'door_fitted',evidence_group:'installation',caption:'Door fitted'},
   {id:'existing-iron',photo_kind:'ironmongery_fitted',evidence_group:'ironmongery_snag',caption:'Ironmongery fitted'},
   ...Array.from({length:4},(_,i)=>({id:'legacy-other-'+i,photo_kind:'other',evidence_group:'other'}))
  ].map(r=>({...r,project:'photo-project',schedule_record:'photo-door',file:r.id+'.jpg'}));
  const record={id:'photo-door',door:'D-1',hardware:Array.from({length:12},(_,i)=>({description:'Hardware item '+i,qty:'1'}))};
  let mode='ok',posts=0,refreshes=0,alerts=[],requests=[];
  const check=(v,m)=>{if(!v)throw new Error(m)};
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
  const count=()=>host.querySelector('[data-photo-count]').textContent;
  const sections=()=>Object.fromEntries([...host.querySelectorAll('[data-photo-gallery]')].map(g=>[g.dataset.photoFilter,[...g.querySelectorAll('img')].map(i=>new URL(i.src).pathname.split('/').at(-2))]));
  const signedIn=()=>pbAuth()?.token===session.token&&pbVerifiedToken===session.token&&document.getElementById('loginScreen').classList.contains('hidden');
  const send=async input=>{
   const dt=new DataTransfer();dt.items.add(new File(['camera-image'],'camera.jpg',{type:'image/jpeg'}));
   input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
   for(let i=0;input.files.length&&i<200;i++)await new Promise(r=>setTimeout(r,0));
   check(!input.files.length,'Photo handler completes');
  };
  try{
   projectsData=()=>({active:'photo-project',items:{'photo-project':{id:'photo-project',_pocketbase:true,records:[record]}}});
   window.alert=m=>alerts.push(m);
   localStorage.setItem(PB_AUTH_KEY,JSON.stringify(session));pbVerifiedToken=session.token;applyAuth();
   window.fetch=async(url,options={})=>{
    const u=new URL(url,location.href);
    if(u.pathname.endsWith('/users/auth-refresh')){
     refreshes++;
     if(mode==='refresh-network')throw new TypeError('Temporary connection interruption');
     if(mode==='refresh-503')return json({message:'Service temporarily unavailable'},503);
     if(mode==='invalid-session')return json({message:'Token rejected'},401);
     return json(session);
    }
    check(u.pathname==='/api/collections/door_photos/records','Photo actions must not refresh schedules or create snags');
    check(new Headers(options.headers).get('Authorization')===session.token,'Upload/list uses current authenticated token');
    if(options.method==='POST'){
     posts++;
     check(!new Headers(options.headers).has('Content-Type'),'Browser supplies multipart boundary');
     if(mode==='upload-network')throw new TypeError('Photo connection interrupted');
     if(mode==='upload-400')return json({message:'Image validation failed',data:{file:{message:'Image rejected'}}},400);
     if(mode==='upload-401')return json({message:'Photo request rejected'},401);
     const fd=options.body;
     requests.push([fd.get('project'),fd.get('schedule_record'),fd.get('photo_kind'),fd.get('evidence_group'),fd.get('caption')]);
     const saved={id:'created-'+records.length,project:fd.get('project'),schedule_record:fd.get('schedule_record'),photo_kind:fd.get('photo_kind'),evidence_group:fd.get('evidence_group'),caption:fd.get('caption'),file:fd.get('file').name};
     records.push(saved);return json(saved);
    }
    check(u.searchParams.get('filter')==='project="photo-project" && schedule_record="photo-door"','Exact project/door query');
    return json({items:records,totalPages:1});
   };
   host.innerHTML=completionCard(record,{id:'photo-project'},[]);bindPhotoControls(host);await refreshPhotoUI(record.id);
   // Open actual disclosures rather than replacing their content or mapper.
   host.querySelectorAll('details:not([open]) > summary').forEach(s=>s.click());
   const images=[...host.querySelectorAll('img')];images.forEach(i=>i.loading='eager');await Promise.all(images.map(i=>i.decode()));
   check(images.every(i=>i.naturalWidth>0&&i.getClientRects().length>0),'Current classified and Other images decode and are visible');
   check(host.querySelector('[data-snag-photos]').hidden,'Empty snag photo gallery stays hidden');
   const initial=sections();check(count()==='Photos: 7','Initial persisted count');
   const hardware=host.querySelector('.completion-hardware').outerHTML;
   for(let i=0;i<12;i++)check(hardware.includes('Hardware item '+i),'All existing hardware renders');
   const inputs=[...host.querySelectorAll('.door-photo-input')];
   for(const input of inputs)await send(input);
   check(count()==='Photos: 10'&&records.length===10,'Count grows only for persisted uploads');
   check(signedIn(),'Successful uploads retain authenticated UI and token');
   const successful=sections();
   for(const failure of ['upload-400','upload-network','refresh-network','refresh-503','upload-401']){
    mode=failure;const before=records.length,beforePosts=posts;await send(inputs[0]);
    check(records.length===before&&count()==='Photos: 10',failure+' cannot increase count');
    check(signedIn(),failure+' must retain the verified session and keep login hidden');
    if(failure.startsWith('refresh-'))check(posts===beforePosts,'Failed refresh must not send an unverified write');
    check(alerts.at(-1)?.startsWith('Could not save the photo:'),'Failure reports useful error');
   }
   mode='ok';await send(inputs[0]);check(count()==='Photos: 11','Upload succeeds after transient failure without signing in again');
   check(host.querySelector('.completion-hardware').outerHTML===hardware,'Photo actions leave hardware unchanged');
   check(!host.querySelector('#nativeDoorSnagDialog'),'Normal photos do not open or submit snag workflow');
   mode='invalid-session';const beforePosts=posts;await send(inputs[0]);
   check(!pbAuth()&&posts===beforePosts,'Confirmed invalid session still blocks uploads and signs out');
   return {initial,successful,requests,refreshes};
  }finally{
   host.remove();projectsData=old.projectsData;window.fetch=old.fetch;window.alert=old.alert;
   if(oldAuth===null)localStorage.removeItem(PB_AUTH_KEY);else localStorage.setItem(PB_AUTH_KEY,oldAuth);
   pbVerifiedToken=oldVerified;applyAuth();
  }
 });
 assert.deepEqual(result.initial,{frame:['existing-frame'],door:['existing-door'],iron:['existing-iron'],snag:[],other:['legacy-other-0','legacy-other-1','legacy-other-2','legacy-other-3']});
 assert.deepEqual(result.successful,{frame:['existing-frame','created-7'],door:['existing-door','created-8'],iron:['existing-iron','created-9'],snag:[],other:['legacy-other-0','legacy-other-1','legacy-other-2','legacy-other-3']});
 assert.deepEqual(result.requests.slice(0,3),[
  ['photo-project','photo-door','frame_fitted','installation','Frame fitted'],
  ['photo-project','photo-door','door_fitted','installation','Door fitted'],
  ['photo-project','photo-door','ironmongery_fitted','ironmongery_snag','Ironmongery fitted']
 ]);
 console.log('PASS: integrated photo retrieval/rendering, actual multipart uploads/auth wrapper, success/failure counts, session continuity, genuine invalidation and unchanged hardware.');
};
