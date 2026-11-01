const assert=require('node:assert/strict');
module.exports=async function(page){
 const results=await page.evaluate(async()=>{
  const saved={pbAuth,authRole,pbRequest,pbFetch,projectsData,photosFor,projectPeople},savedOpen=window.open;
  const out=[],check=(v,m)=>{if(!v)throw Error(m);out.push(m)};
  const P='3wd9g88vd2l3i84',A='wdkcb82wqzx8peq',B='another-door-id',Q='another-project',U='6awphq2mbb6cyyf';
  let active=P,actor='report-generator',role='supervisor',html='',photoFailure=false,fileFailure=false,switchOnFile=false;
  const requests=[],files=[];
  const users=[{id:U,name:'luke',display_initials:'WRONG'},{id:'door-user',name:'Door Person'},{id:'iron-user',name:'Iron Person'},{id:'other-user',name:'Other Door Person'}];
  const completion=(id,door,owner=U)=>({id,project:P,schedule_record:door,frame_fitted:true,frame_fitted_at:'2026-10-30 19:34:48.698Z',frame_completed_by:owner,door_hung:true,door_hung_at:'2026-10-30 19:35:05.839Z',door_completed_by:owner,ironmongery_fitted:true,ironmongery_fitted_at:'2026-10-30 19:35:15.279Z',ironmongery_completed_by:owner,completed_by:'legacy-user-must-not-be-guessed'});
  let completions=[completion('v7kn07uhbmao0pm',A),completion('other-completion',B,'other-user'),completion('historical-completion','historical',''),completion('no-photo-completion','no-photo'),{...completion('cross-project-completion',A,'wrong-project-user'),project:Q}];
  const photo=(id,door,kind,project=P)=>({id,project,schedule_record:door,photo_kind:kind,caption:'Unrelated visible name',evidence_group:kind==='ironmongery_fitted'?'ironmongery_snag':'installation',file:id+'.svg',uploaded_by:'uploader-not-completer',collectionId:'photos-collection'});
  let photos=[{...photo('hk66yq1866xmgc6',A,'frame_fitted'),caption:'Frame fitted',photo:'missing-primary.svg',file:'real-frame.svg'},photo('door-file',A,'door_fitted'),photo('iron-file',A,'ironmongery_fitted'),{...photo('legacy-frame',A,'other'),caption:'Frame fitted',evidence_group:'other'},photo('other-door-frame',B,'frame_fitted'),photo('other-door-door',B,'door_fitted'),photo('other-door-iron',B,'ironmongery_fitted'),photo('cross-project-frame',A,'frame_fitted',Q),photo('snag',A,'defect_snag'),photo('other',A,'other')];
  let project={id:P,_pocketbase:true,name:'Report evidence regression',records:[{id:A,door:'B04 D-2',room:'Bedroom 04'},{id:B,door:'B04 D-2',room:'Different persisted door'},{id:'historical',door:'Historical'},{id:'no-photo',door:'No photograph'}],completion:{[A]:{frame:true,owners:{frame:'stale-cached-owner'},dates:{frame:'1999-01-01'}}}};
  try{
   pbAuth=()=>({token:'unchanged-auth-token',record:{id:actor,name:'Do not attribute to generator',role}});authRole=()=>role;projectsData=()=>({active,items:{[P]:structuredClone(project)}});
   projectPeople=async id=>{check(id===P,'People lookup scoped to persistent project');return users};
   pbRequest=async(path,options={})=>{check(!options.method||options.method==='GET','Report does not write records');requests.push(path);if(path.includes('/completion_records/')){check(decodeURIComponent(path).includes('project="'+P+'"'),'Completion query uses project relation');return {items:structuredClone(completions)}}if(path.includes('/door_photos/')){if(photoFailure)throw Error('Offline photo read');const decoded=decodeURIComponent(path);check(decoded.includes('project="'+P+'"')&&project.records.some(r=>decoded.includes('schedule_record="'+r.id+'"')),'Photo query uses project + schedule relations');return {items:structuredClone(photos)}}throw Error('Unexpected request '+path)};
   pbFetch=async(url,options={})=>{check(!options.method||options.method==='GET','File retrieval uses existing authenticated read wrapper');files.push(url);if(switchOnFile){actor='different-account';return new Response('switched',{status:200})}if(url.endsWith('/missing-primary.svg')||fileFailure)return new Response('missing',{status:404});const name=new URL(url).pathname.split('/').at(-1);return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><title>'+name+'</title><rect width="2" height="2" fill="orange"/></svg>',{headers:{'Content-Type':'image/svg+xml'}})};
   window.open=()=>({document:{open(){html=''},write(s){html+=s},close(){}}});
   const run=async kind=>{await buildCompletionReport(kind);return new DOMParser().parseFromString(html,'text/html')};
   const imageText=img=>atob(img.getAttribute('src').split(',')[1]);
   let doc=await run('frame'),sections=[...doc.querySelectorAll('section')];
   check(sections[0].querySelector('h2').textContent.includes('B04 D-2'),'Known B04 D-2 persistent regression door appears');
   check(sections[0].querySelectorAll('img').length===2&&imageText(sections[0].querySelector('img')).includes('real-frame.svg'),'Known production-compatible cloud photo embeds via persistent file URL fallback');
   check(sections[0].querySelector('td:nth-child(3)').textContent==='luke','Known stored authenticated user resolves to luke, never initials or generator');
   check(sections[0].querySelector('td:nth-child(4)').textContent===fmtDate('2026-10-30 19:34:48.698Z'),'Known completion date retained');
   completions[0].door_completed_by='door-user';completions[0].ironmongery_completed_by='iron-user';
   for(const [kind,label,expectedUser,expectedFile,count] of [['frame','Frame fitted','luke','real-frame.svg',2],['door','Door fitted','Door Person','door-file.svg',1],['iron','Ironmongery fitted','Iron Person','iron-file.svg',1]]){
    doc=await run(kind);sections=[...doc.querySelectorAll('section')];const a=sections[0],b=sections[1],historical=sections[2],missing=sections[3];
    check(a.querySelector('td').textContent===label&&a.querySelector('td:nth-child(2)').textContent.includes('Complete'),'Correct stage/status '+kind);
    check(a.querySelector('td:nth-child(3)').textContent===expectedUser,'Independent authenticated stage owner '+kind);
    check(a.querySelectorAll('img').length===count&&imageText(a.querySelector('img')).includes(expectedFile),'Only appropriate stage cloud/legacy photos '+kind);
    check(!a.textContent.includes('Other Door Person')&&b.querySelector('td:nth-child(3)').textContent==='Other Door Person','Attribution cannot leak between completion records '+kind);
    check(![...a.querySelectorAll('img')].some(x=>/other-door|cross-project|snag\.svg|other\.svg/.test(imageText(x))),'No photo leakage between persistent doors/projects/stages '+kind);
    check(historical.querySelector('td:nth-child(3)').textContent==='Not recorded'&&!historical.textContent.includes('legacy-user'),'Historical absent owner is explicit; no legacy aggregate/user guessing '+kind);
    check(missing.textContent.includes('No linked photographs for this report stage')&&missing.querySelectorAll('img').length===0,'Honest missing-photo state '+kind);
    const signature=a.outerHTML;doc=await run(kind);check(doc.querySelector('section').outerHTML===signature,'Fresh reread produces identical evidence '+kind);
   }
   const image=new Image();image.src=sections[0].querySelector('img').src;await image.decode();check(image.naturalWidth===2,'Embedded image actually decodes');
   photoFailure=true;doc=await run('frame');check(doc.querySelector('section').textContent.includes('Could not load linked photographs')&&!doc.querySelector('section').textContent.includes('No linked photographs'),'Photo lookup error is distinct from no evidence');photoFailure=false;
   fileFailure=true;doc=await run('frame');check(doc.querySelector('section').textContent.includes('Linked photograph could not be loaded')&&!doc.querySelector('section').textContent.includes('No linked photographs'),'Linked missing/unreadable files are not reported as absent associations');fileFailure=false;
   const knownName=users[0].name;users[0].name='';const username='retired-user';users[0].username=username;doc=await run('frame');check(doc.querySelector('td:nth-child(3)').textContent===username,'Username fallback resolves the exact stored ID');users[0].name=knownName;
   completions[0].frame_completed_by='missing-user-id';doc=await run('frame');check(doc.querySelector('td:nth-child(3)').textContent==='Unknown user (missing-user-id)','Unresolvable nonblank ID remains explicitly unknown');completions[0].frame_completed_by=U;
   completions.push(completion('duplicate-completion',A));doc=await run('frame');check(doc.body.textContent.includes('Duplicate completion records')&&!doc.querySelector('section'),'Ambiguous duplicate completion records fail honestly');completions.pop();
   switchOnFile=true;doc=await run('frame');check(doc.body.textContent.includes('Project or account changed')&&!doc.querySelector('section'),'Account switch aborts/clears partial report evidence');switchOnFile=false;actor='report-generator';
   const cloud=project;project={...cloud,_pocketbase:false,records:[{id:A,door:'Local legacy door'}],completion:{[A]:{frame:true,dates:{frame:'2026-10-30'}}}};photosFor=async()=>[{id:'local-photo',projectId:P,recordId:A,kind:'Frame fitted',blob:new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>'],{type:'image/svg+xml'})}];doc=await run('frame');check(doc.querySelectorAll('img').length===1&&doc.querySelector('td:nth-child(3)').textContent==='Not recorded','Local legacy Blob evidence preserved; historical owner never guessed');project=cloud;photosFor=saved.photosFor;
   check(files.every(url=>url.startsWith(PB_BASE+'/api/files/')),'Uses persistent PocketBase file URLs only, no filename/caption door matching');
   return out;
  }finally{Object.assign(window,saved);window.open=savedOpen}
 });
 assert(results.length>45);console.log('PASS: completion-report cloud/local evidence, all stages, exact project/door/owner isolation, historical unknowns, failed reads, duplicate records and account changes.');return results;
};
