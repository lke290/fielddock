const assert=require('node:assert/strict');
module.exports=async function dashboardShortcutRegressions(page){
 for(const role of ['joiner','supervisor','admin']){
  const result=await page.evaluate(async role=>{
   const prior={auth:pbAuth,request:pbRequest,shared:pbSharedGuidance,photos:photosFor,members:pbMemberships,projects:localStorage.getItem(PROJECTS_KEY),completion:renderCompletion};
   let calls=0;
   try{
    pbAuth=()=>({record:{id:'fixture-user',role}});pbRequest=async()=>({items:[]});pbSharedGuidance=async()=>[];photosFor=async()=>[];
    pbMemberships=[{project:'fixture-project',user:'fixture-user',role:'joiner'}];
    saveProjectsData({active:'fixture-project',items:{'fixture-project':{id:'fixture-project',name:'Dashboard fixture',records:[{id:'fixture-door',door:'D-TEST',room:'Fixture room'}],docs:[],siteItems:[],diaryEvents:[]}}});
    applyPermissionsUI();renderDashboard();openTab('dashboard');
    renderCompletion=async function(){calls++;return prior.completion.apply(this,arguments)};
    const tiles=[...document.querySelectorAll('.dashboard-tile-grid>.dashboard-nav-tile')];
    const names=tiles.map(t=>t.querySelector('b').textContent);
    const rects=tiles.map(t=>t.getBoundingClientRect());
    const balanced=rects.length===4&&rects.every(r=>r.width>0&&Math.abs(r.width-rects[0].width)<1&&Math.abs(r.height-rects[0].height)<1)&&Math.abs(rects[0].top-rects[1].top)<1&&Math.abs(rects[2].top-rects[3].top)<1&&rects[2].top>rects[0].top;
    document.getElementById('dashSearchTile').click();
    const searchFocused=document.activeElement.id==='pjSearch';
    document.getElementById('pjSearch').value='D-TEST';await searchProject();
    const searchWorks=document.getElementById('pjSearchResults').textContent.includes('D-TEST');
    document.getElementById('pjSearch').value='';
    document.getElementById('dashOutstandingTile').click();const outstanding=document.querySelector('.panel.active')?.id==='snags';
    openTab('dashboard');document.getElementById('dashDiaryTile').click();const diary=document.querySelector('.panel.active')?.id==='calendar';
    openTab('dashboard');document.getElementById('dashDrawingsTile').click();const drawings=document.querySelector('.panel.active')?.id==='drawings';
    openTab('dashboard');document.getElementById('dashCompletionTile').click();
    for(let i=0;i<40&&!document.getElementById('completionList').textContent.includes('D-TEST');i++)await new Promise(r=>setTimeout(r,5));
    return {names,balanced,searchFocused,searchWorks,outstanding,diary,drawings,completion:calls===1&&document.querySelector('.panel.active')?.id==='completion'&&document.getElementById('completionListPanel').open&&document.getElementById('completionList').textContent.includes('D-TEST'),unique:document.querySelectorAll('#dashCompletionTile').length===1,noOrders:!document.querySelector("#orders,#dashMaterialsTile,[value='orders']")};
   }finally{
    pbAuth=prior.auth;pbRequest=prior.request;pbSharedGuidance=prior.shared;photosFor=prior.photos;pbMemberships=prior.members;renderCompletion=prior.completion;
    if(prior.projects===null)localStorage.removeItem(PROJECTS_KEY);else localStorage.setItem(PROJECTS_KEY,prior.projects);
    document.getElementById('pjSearch').value='';
   }
  },role);
  assert.deepEqual(result.names,['Search This Job','Outstanding Works','Door Completion','Site Diary']);
  for(const [name,ok] of Object.entries(result))if(name!=='names')assert(ok,role+': '+name);
  await page.goBack();await page.waitForFunction(()=>document.querySelector('.panel.active')?.id==='dashboard');
 }
 console.log('PASS: four equal dashboard tiles in 2x2 order; existing completion action and Back; search, outstanding, diary and drawings actions for Joiner/Supervisor/Admin.');
};
