const assert=require('node:assert/strict');
module.exports=async function menuMotionRegressions(page){
 await page.evaluate(()=>{
  window.__menuMotionFixture={auth:pbAuth,request:pbRequest,shared:pbSharedGuidance,members:pbMemberships,projects:localStorage.getItem(PROJECTS_KEY),login:document.getElementById('loginScreen').className,theme:document.documentElement.getAttribute('data-theme')};
  pbRequest=async()=>({items:[]});pbSharedGuidance=async()=>[];
  document.getElementById('loginScreen').classList.add('hidden');
  saveProjectsData({active:'menu-fixture',items:{'menu-fixture':{id:'menu-fixture',name:'Menu fixture',records:[],docs:[],siteItems:[],diaryEvents:[]}}});
 });
 const picker=async id=>page.evaluate(id=>{const el=document.getElementById(id),s=getComputedStyle(el,'::picker(select)');return {open:el.matches(':open'),opacity:Number(s.opacity),display:s.display,duration:s.transitionDuration,transform:s.transform}},id);
 try{
  const supported=await page.evaluate(()=>CSS.supports('appearance','base-select')&&CSS.supports('transition-behavior','allow-discrete'));
  assert(supported,'Installed Chromium must exercise the enhanced select picker');
  for(const role of ['admin','supervisor','joiner']){
   await page.evaluate(role=>{pbAuth=()=>({record:{id:'menu-user',role}});pbMemberships=[{project:'menu-fixture',user:'menu-user',role:'joiner'}];applyPermissionsUI();openTab('dashboard')},role);
   for(const [id,values] of [['listMenu',['notes','snags','calendar']],['siteMenu',['convert','formula','regs']]]){
    const options=await page.locator('#'+id).evaluate(el=>[...el.options].filter(o=>!o.disabled&&!o.hidden).map(o=>o.value));assert.deepEqual(options,values,role+' menu contents unchanged');
    for(const value of values){
     await page.locator('#'+id).click();assert((await picker(id)).open);
     const label=await page.locator('#'+id).evaluate((el,value)=>[...el.options].find(o=>o.value===value).textContent,value);
     await page.getByRole('option',{name:label,exact:true}).click();
     await page.waitForFunction(value=>document.querySelector('.panel.active')?.id===value,value);
     await page.goBack();await page.waitForFunction(()=>document.querySelector('.panel.active')?.id==='dashboard');
     assert.equal(await page.locator('#'+id).inputValue(),'','Menu label resets after navigation');
    }
   }
  }
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   for(const id of ['listMenu','siteMenu']){
    await page.locator('#'+id).click();await page.waitForTimeout(75);
    const opening=await picker(id);assert(opening.open&&opening.opacity>0&&opening.opacity<1,'Opening has an intermediate fade: '+JSON.stringify(opening));assert(opening.duration.split(',').every(x=>x.trim()==='0.18s'));
    await page.waitForTimeout(160);assert.equal((await picker(id)).opacity,1);
    await page.keyboard.press('Escape');await page.waitForTimeout(65);
    const closing=await picker(id);assert(!closing.open&&closing.opacity>0&&closing.opacity<1&&closing.display!=='none','Closing remains visible during transition: '+JSON.stringify(closing));
    await page.waitForTimeout(160);assert.equal((await picker(id)).display,'none');
   }
  }
  await page.locator('#listMenu').click();await page.locator('#siteMenu').click();assert(!(await picker('listMenu')).open&&(await picker('siteMenu')).open,'Tools replaces Site');
  await page.locator('#listMenu').click();assert((await picker('listMenu')).open&&!(await picker('siteMenu')).open,'Site replaces Tools');await page.keyboard.press('Escape');
  for(const id of ['listMenu','siteMenu']){
   for(let i=0;i<8;i++)await page.locator('#'+id).click();
   await page.keyboard.press('Escape');await page.waitForTimeout(210);const state=await picker(id);assert(!state.open&&state.display==='none','Rapid taps settle closed');
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const id of ['listMenu','siteMenu']){
   await page.locator('#'+id).click();const state=await picker(id);assert(state.open&&state.opacity===1&&state.duration.split(',').every(x=>x.trim()==='0s'),'Reduced motion opens instantly');
   await page.keyboard.press('Escape');assert.equal((await picker(id)).display,'none');
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
  console.log('PASS: Site/Tools picker opening/closing, exclusive state, rapid taps, reduced motion, both themes, every destination and Back for all three roles.');
 }finally{
  await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{const old=window.__menuMotionFixture;pbAuth=old.auth;pbRequest=old.request;pbSharedGuidance=old.shared;pbMemberships=old.members;if(old.projects===null)localStorage.removeItem(PROJECTS_KEY);else localStorage.setItem(PROJECTS_KEY,old.projects);document.getElementById('loginScreen').className=old.login;if(old.theme===null)document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',old.theme);delete window.__menuMotionFixture;openTab('dashboard')});
 }
};
