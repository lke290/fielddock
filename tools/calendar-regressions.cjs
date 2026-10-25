const assert=require('node:assert/strict');
module.exports=async function calendarRegressions(page){
 const result=await page.evaluate(async()=>{
  const prior={auth:pbAuth,request:pbRequest,shared:pbSharedGuidance,photos:photosFor,members:pbMemberships,projects:localStorage.getItem(PROJECTS_KEY),confirm:window.confirm,cursor:calendarCursor};
  const checks=[],writes=[];let session,fail=false,hold=null;
  const baseEvent={id:'meeting',title:'Project one meeting',date:'2099-01-16',time:'09:30',type:'meeting',area:'Site office',notes:'Original notes',createdAt:'2026-01-01',createdBy:'Original author',retainedField:'keep me'};
  let records={};
  const wait=async()=>{for(let i=0;i<200&&calendarSaving;i++)await new Promise(r=>setTimeout(r,5));if(calendarSaving)throw new Error('Calendar mutation timed out')};
  const setProject=id=>{const d=projectsData();d.active=id;saveProjectsData(d);renderSiteDiary()};
  try{
   window.confirm=()=>true;pbSharedGuidance=async()=>[];photosFor=async()=>[];
   pbAuth=()=>session;
   pbRequest=async(path,options={})=>{
    const match=path.match(/^\/api\/collections\/projects\/records\/([^?]+)/);
    if(match){
     const id=decodeURIComponent(match[1]);
     if(options.method==='PATCH'){
      const body=JSON.parse(options.body);if(Object.keys(body).join()!=='site_diary_json')throw new Error('Calendar must patch only its own JSON field');
      if(fail)throw new Error('Fixture permission rejected');
      records[id]=JSON.parse(body.site_diary_json);writes.push({id,events:structuredClone(records[id])});return {id,site_diary_json:body.site_diary_json};
     }
     if(hold&&hold.project===id){const pending=hold;hold=null;pending.started=true;return new Promise(resolve=>pending.resolve=resolve)}
     return {id,site_diary_json:JSON.stringify(records[id])};
    }
    if(path.includes('project_members'))return {items:['one','two'].map(project=>({project,user:session.record.id,role:'joiner'}))};
    return {items:[]};
   };
   for(const role of ['admin','supervisor','joiner','user']){
    records={one:[{...baseEvent},{id:'past',title:'Past inspection',date:'2001-01-15',type:'inspection',notes:'Past detail'}],two:[{id:'two-event',title:'Project two only',date:'2099-01-17',type:'general'}]};
    session={token:'fixture-token',record:{id:'fixture-'+role,role,name:'Fixture '+role}};
    pbMemberships=['one','two'].map(project=>({project,user:session.record.id,role:'joiner'}));
    const makeProject=id=>({id,name:'Fixture '+id,_pocketbase:true,records:[],docs:[],siteItems:id==='one'?[{id:'order',title:'Historical delivery',orderType:'fixing',deliveryEta:'2099-01-15',quantity:'2 boxes'}]:[],diaryEvents:[]});
    saveProjectsData({active:'one',items:{one:makeProject('one'),two:makeProject('two')}});
    calendarCursor=new Date('2099-01-15T12:00:00');applyPermissionsUI();openTab('calendar');await refreshSiteDiary();
    checks.push([role+' displays current project events and historical deliveries',document.getElementById('diaryUpcoming').textContent.includes('Project one meeting')&&document.getElementById('diaryUpcoming').textContent.includes('Historical delivery')&&!document.getElementById('diaryUpcoming').textContent.includes('Project two only')]);
    checks.push([role+' form starts collapsed',!document.querySelector('.calendar-add-event').open]);
    document.querySelector("#siteCalendar [data-date='2099-01-15']").click();
    checks.push([role+' historical entry stays read-only',document.getElementById('calendarSelectedDay').textContent.includes('Historical delivery')&&!document.querySelector('#calendarSelectedDay .diary-edit,#calendarSelectedDay .diary-delete')]);
    calendarCursor=new Date('2001-01-15T12:00:00');renderSiteDiary();document.querySelector("#siteCalendar [data-date='2001-01-15']").click();
    checks.push([role+' can inspect past events',document.getElementById('calendarSelectedDay').textContent.includes('Past inspection')]);
    if(['admin','supervisor'].includes(role)){
     document.querySelector("#diaryUpcoming .diary-edit[data-id='meeting']").click();
     checks.push([role+' edit loads all existing fields',document.querySelector('.calendar-add-event').open&&document.getElementById('diaryTitle').value===baseEvent.title&&document.getElementById('diaryTime').value===baseEvent.time&&document.getElementById('diaryNotes').value===baseEvent.notes]);
     records.one.push({id:'concurrent',title:'Another manager event',date:'2099-01-18',type:'general'});
     document.getElementById('diaryTitle').value='Edited '+role;document.getElementById('diaryNotes').value='Updated notes\nSecond line';document.getElementById('diaryAdd').click();await wait();
     const edited=records.one.find(e=>e.id==='meeting');
     checks.push([role+' edits preserve metadata and other manager events',edited.title==='Edited '+role&&edited.retainedField==='keep me'&&edited.createdBy===baseEvent.createdBy&&records.one.some(e=>e.id==='concurrent')]);
     const staleSnapshot=JSON.stringify(records.one),lateRead={project:'one'};hold=lateRead;const staleRead=refreshSiteDiary();
     startDiaryEdit('meeting');document.getElementById('diaryTitle').value='Latest confirmed '+role;document.getElementById('diaryAdd').click();await wait();
     lateRead.resolve({id:'one',site_diary_json:staleSnapshot});await staleRead;
     checks.push([role+' saved data wins over a delayed earlier read',diaryEventsForProject().find(e=>e.id==='meeting').title==='Latest confirmed '+role]);
     const form=document.querySelector('.calendar-add-event');form.open=true;await new Promise(r=>setTimeout(r,0));
     for(const [id,value] of Object.entries({diaryTitle:'New '+role,diaryDate:'2099-01-19',diaryTime:'14:15',diaryArea:'First floor',diaryNotes:'New notes',diaryType:'inspection'}))document.getElementById(id).value=value;
     document.getElementById('diaryAdd').click();document.getElementById('diaryAdd').click();await wait();
     const added=records.one.filter(e=>e.title==='New '+role);
     checks.push([role+' adds once with existing fields',added.length===1&&added[0].time==='14:15'&&added[0].area==='First floor'&&added[0].type==='inspection'&&!!added[0].createdAt]);
     document.querySelector("#diaryUpcoming .diary-edit[data-id='meeting']").click();document.getElementById('diaryTitle').value='Rejected edit';
     const before=JSON.stringify(diaryEventsForProject());fail=true;document.getElementById('diaryAdd').click();await wait();fail=false;
     checks.push([role+' rejected save keeps confirmed data and edit draft',JSON.stringify(diaryEventsForProject())===before&&document.getElementById('diaryStatus').textContent.includes('Fixture permission rejected')&&document.getElementById('diaryTitle').value==='Rejected edit']);
     document.getElementById('diaryCancel').click();
     const del=[...document.querySelectorAll('#diaryUpcoming .diary-delete')].find(b=>b.dataset.id===added[0].id);del.click();await wait();
     checks.push([role+' deletes only normal event',!records.one.some(e=>e.id===added[0].id)&&allCalendarEvents().some(e=>e.source==='order')]);
     document.querySelector("#diaryUpcoming .diary-edit[data-id='meeting']").click();
     session.record.role='joiner';applyPermissionsUI();
     checks.push([role+' losing permissions closes editor and removes controls',document.querySelector('.calendar-add-event').hidden&&!document.querySelector('.diary-edit,.diary-delete')]);
     session.record.role=role;applyPermissionsUI();renderSiteDiary();startDiaryEdit('meeting');
    }else{
     checks.push([role+' has no add edit delete UI',document.querySelector('.calendar-add-event').hidden&&!document.querySelector('.diary-edit,.diary-delete')]);
     const count=writes.length;startDiaryEdit('meeting');document.getElementById('diaryAdd').click();await wait();let denied=false;try{await saveDiaryEvents([])}catch(e){denied=true}
     checks.push([role+' cannot reach editor or mutate through controls',denied&&!document.querySelector('.calendar-add-event').open&&count===writes.length]);
    }
    await switchActiveProject('two');await refreshSiteDiary();
    checks.push([role+' project switch clears editor and excludes other project',!document.querySelector('.calendar-add-event').open&&document.getElementById('diaryTitle').value===''&&allCalendarEvents().every(e=>e.id==='two-event')&&document.getElementById('diaryUpcoming').textContent.includes('Project two only')&&!document.getElementById('calendarSelectedDay').textContent.includes('Historical delivery')]);
    setProject('one');await refreshSiteDiary();const deferred={project:'one'};hold=deferred;const pending=refreshSiteDiary();
    await switchActiveProject('two');await refreshSiteDiary();deferred.resolve({id:'one',site_diary_json:JSON.stringify(records.one)});await pending;
    checks.push([role+' ignores late reads from previous project',projectsData().active==='two'&&allCalendarEvents().every(e=>e.id==='two-event')]);
    if(role==='admin'){
     setProject('one');await refreshSiteDiary();startDiaryEdit('meeting');document.getElementById('diaryTitle').value='Must not save after account switch';
     const deferred={project:'one'},count=writes.length;hold=deferred;document.getElementById('diaryAdd').click();
     session={...session,record:{id:'different-user',role:'admin'}};applyPermissionsUI();renderSiteDiary();deferred.resolve({id:'one',site_diary_json:JSON.stringify(records.one)});await wait();
     checks.push(['Account switch during read blocks pending save',writes.length===count]);
    }
   }
   return {checks,writes:writes.length};
  }finally{
   pbAuth=prior.auth;pbRequest=prior.request;pbSharedGuidance=prior.shared;photosFor=prior.photos;pbMemberships=prior.members;window.confirm=prior.confirm;calendarCursor=prior.cursor;
   if(prior.projects===null)localStorage.removeItem(PROJECTS_KEY);else localStorage.setItem(PROJECTS_KEY,prior.projects);
   ++calendarReadVersion;calendarSelectedDate='';resetDiaryEditor();openTab('dashboard');
  }
 });
 for(const [label,ok] of result.checks)assert(ok,label);
 assert(result.writes>=6,'Manager create/edit/delete requests exercised');
 console.log('PASS: Calendar manager CRUD through project JSON API, joiner/user read-only, past/day selection, historical deliveries, rejection/duplicate guards, project switching and late project/account responses.');
};
