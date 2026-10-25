const assert=require('node:assert/strict');
module.exports=async function ordersUIRegressions(page){
 const result=await page.evaluate(async()=>{
  const prior={auth:pbAuth,request:pbRequest,shared:pbSharedGuidance,members:pbMemberships,projects:localStorage.getItem(PROJECTS_KEY)};
  const requests=[],checks=[];
  const order={id:'historical-order',title:'Historical fixing order',orderType:'fixing',deliveryEta:'2099-01-15',orderStatus:'ordered',quantity:'3 boxes'};
  const makeProject=id=>({id,name:'Fixture '+id,records:[],docs:[],siteItems:[{...order},{id:'note-'+id,noteType:'site_note',title:'Existing note '+id,text:'Retained note text'}],diaryEvents:[{id:'meeting-'+id,title:'Existing meeting',date:'2099-01-16',type:'meeting'}]});
  const noOrders=()=>!document.querySelector("#orders,#siteOrdersPanel,#siteOrderList,#dashboardSiteOrders,#dashMaterialsTile,#dashMaterialsMeta,[value='orders'],[data-tab='orders']");
  try{
   pbRequest=async path=>{requests.push(path);return {items:[]}};
   pbSharedGuidance=async()=>[];
   for(const role of ['admin','supervisor','joiner']){
    pbMemberships=['one','two'].map(project=>({project,user:'fixture-user',role:'joiner'}));
    pbAuth=()=>({record:{id:'fixture-user',role,name:'Fixture user'}});
    saveProjectsData({active:'one',items:{one:makeProject('one'),two:makeProject('two')}});
    applyPermissionsUI();refreshProjectSelect();renderDashboard();
    checks.push([role+' has no Orders entry',noOrders()]);
    openTab('orders');checks.push([role+' old route falls back',document.querySelector('.panel.active')?.id==='dashboard']);
    openTab('notes');await renderSiteNotes();checks.push([role+' Notes loads',document.getElementById('siteNoteList').textContent.includes('Existing note one')]);
    clearSiteNoteEditor();document.getElementById('siteNoteTitle').value='Saved note '+role;document.getElementById('siteNoteText').value='Note body '+role;
    await saveCurrentSiteNote();checks.push([role+' Notes saves',siteNotesForProject().some(n=>n.title==='Saved note '+role)]);
    openTab('calendar');renderSiteDiary();
    checks.push([role+' Calendar retains meeting and historical delivery',allCalendarEvents().some(e=>e.id==='order_historical-order')&&document.getElementById('diaryUpcoming').textContent.includes('Existing meeting')&&document.querySelectorAll('.calendar-day').length===42]);
    await saveDiaryEvents([...diaryEventsForProject(),{id:'new-event',title:'New event',date:'2099-01-17',type:'general'}]);renderSiteDiary();
    checks.push([role+' Calendar saves',diaryEventsForProject().some(e=>e.id==='new-event')]);
    document.getElementById('pjSearch').value='Historical fixing order';await searchProject();
    checks.push([role+' search excludes Orders',!document.getElementById('pjSearchResults').querySelector('[data-site-result]')]);
    document.getElementById('pjSearch').value='Saved note '+role;await searchProject();
    checks.push([role+' search retains Notes',!!document.getElementById('pjSearchResults').querySelector('[data-site-result]')]);
    document.getElementById('pjSearch').value='';
    await switchActiveProject('two',true);
    checks.push([role+' project switching works',projectsData().active==='two'&&document.getElementById('dashboardProject').textContent.includes('Fixture two')]);
    checks.push([role+' historical data preserved',JSON.stringify(projectsData().items.one.siteItems.find(x=>x.id===order.id))===JSON.stringify(order)]);
    checks.push([role+' no Orders UI after switching',noOrders()]);
   }
   await new Promise(r=>setTimeout(r,30));
   return {checks,requests};
  }finally{
   pbAuth=prior.auth;pbRequest=prior.request;pbSharedGuidance=prior.shared;pbMemberships=prior.members;
   if(prior.projects===null)localStorage.removeItem(PROJECTS_KEY);else localStorage.setItem(PROJECTS_KEY,prior.projects);
   clearSiteNoteEditor();document.getElementById('pjSearch').value='';openTab('dashboard');
  }
 });
 for(const [label,ok] of result.checks)assert(ok,label);
 assert(!result.requests.some(p=>/\/collections\/orders\//.test(p)),'No Orders API requests');
 console.log('PASS: all three roles have no Orders UI/routes/search results; Notes save/load/search, Calendar save/legacy deliveries, project switching and historical order preservation.');
};
