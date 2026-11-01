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
   completions[0].frame_completed_by='missing-user-id';doc=await run('frame');check(doc.querySelector('td:nth-child(3)').textContent==='Unknown user','Unresolvable nonblank ID remains explicitly unknown');completions[0].frame_completed_by=U;
   // A conflict on another door must never suppress known B04 evidence or imply any completion for the conflicted door.
   const conflict={...completion('conflicting-other-record',B),frame_fitted:false,door_hung:false,ironmongery_fitted:false};completions.push(conflict);
   for(const [kind,expectedUser] of [['frame','luke'],['door','Door Person'],['iron','Iron Person']]){
    const requestStart=requests.length;doc=await run(kind);const cards=[...doc.querySelectorAll('section')],unambiguous=cards[0],unresolved=cards[1];
    check(doc.querySelector('body>.report-conflict').textContent.includes('1 door has conflicting completion records and requires review.'),'Singular project conflict warning '+kind);
    check(unresolved.classList.contains('completion-conflict')&&unresolved.textContent.includes('Completion record conflict — manual review required'),'Door-level unresolved warning '+kind);
    check(!unresolved.querySelector('table,img')&&!unresolved.textContent.includes('Other Door Person')&&!unresolved.textContent.includes('2026-10-30'),'Conflicted door has no selected status/owner/date/photos '+kind);
    check(unambiguous.querySelector('td:nth-child(3)').textContent===expectedUser&&unambiguous.querySelectorAll('img').length>0,'Known B04 evidence survives unrelated door conflict '+kind);
    check(!requests.slice(requestStart).some(path=>path.includes('/door_photos/')&&decodeURIComponent(path).includes('schedule_record="'+B+'"')),'Conflicted door photos are not queried or inferred '+kind);
    check(!doc.body.textContent.includes('conflicting-other-record')&&!doc.body.textContent.includes(B)&&!doc.body.textContent.includes(P),'No internal IDs in normal conflict report '+kind);
    check(doc.querySelector('.meta').textContent.includes('3 unambiguous doors'),'Conflicted doors excluded honestly from totals '+kind);
   }
   completions.push(completion('conflicting-historical-record','historical'));doc=await run('frame');
   check(doc.querySelector('body>.report-conflict').textContent.includes('2 doors have conflicting completion records and require review.'),'Plural warning identifies all conflicted doors');
   check(doc.querySelectorAll('.completion-conflict').length===2&&doc.querySelector('body>.report-conflict ul').children.length===2,'Every conflicted door listed exactly once');
   window.__completionConflictReportHtml=html;
   completions.push(completion('third-conflicting-record',B));doc=await run('frame');check(doc.querySelectorAll('.completion-conflict').length===2,'Three records remain one unresolved door, not three door conflicts');completions.pop();completions.pop();completions.pop();
   doc=await run('frame');check(!doc.querySelector('.report-conflict,.completion-conflict'),'No duplicates produces normal report with no warning');
   completions.push(completion('identical-duplicate',A));doc=await run('frame');check(doc.querySelector('section').classList.contains('completion-conflict'),'Even apparently identical duplicates are not automatically reconciled');completions.pop();
   switchOnFile=true;doc=await run('frame');check(doc.body.textContent.includes('Project or account changed')&&!doc.querySelector('section'),'Account switch aborts/clears partial report evidence');switchOnFile=false;actor='report-generator';
   const cloud=project;project={...cloud,_pocketbase:false,records:[{id:A,door:'Local legacy door'}],completion:{[A]:{frame:true,dates:{frame:'2026-10-30'}}}};photosFor=async()=>[{id:'local-photo',projectId:P,recordId:A,kind:'Frame fitted',blob:new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>'],{type:'image/svg+xml'})}];doc=await run('frame');check(doc.querySelectorAll('img').length===1&&doc.querySelector('td:nth-child(3)').textContent==='Not recorded','Local legacy Blob evidence preserved; historical owner never guessed');project=cloud;photosFor=saved.photosFor;
   check(files.every(url=>url.startsWith(PB_BASE+'/api/files/')),'Uses persistent PocketBase file URLs only, no filename/caption door matching');
   return out;
  }finally{Object.assign(window,saved);window.open=savedOpen}
 });
 const report=await page.context().newPage();try{
  await report.setContent(await page.evaluate(()=>window.__completionConflictReportHtml));
  for(const media of ['screen','print']){await report.emulateMedia({media});const warning=report.locator('body>.report-conflict');assert(await warning.isVisible());assert.equal(await report.locator('.completion-conflict').count(),2);const style=await warning.evaluate(el=>({border:parseFloat(getComputedStyle(el).borderTopWidth),weight:parseInt(getComputedStyle(el).fontWeight),display:getComputedStyle(el).display}));assert(style.border>=2&&style.weight>=700&&style.display!=='none');assert.equal(await report.locator('.completion-conflict table,.completion-conflict img').count(),0);results.push('Obvious bordered/bold conflict warnings and withheld evidence in '+media)}
  const pdf=await report.pdf({format:'A4'});assert(pdf.subarray(0,4).toString()==='%PDF');results.push('Conflict report generates print/PDF output');
 }finally{await report.close();await page.evaluate(()=>delete window.__completionConflictReportHtml)}
 assert(results.length>45);console.log('PASS: completion-report evidence/isolation, unresolved door conflicts, unaffected doors, screen/print/PDF warnings, all stages and account changes.');return results;
};
