const assert=require('node:assert/strict');
module.exports=async function menuMotionRegressions(page){
 await page.evaluate(()=>{
  window.__menuMotionFixture={auth:pbAuth,request:pbRequest,shared:pbSharedGuidance,members:pbMemberships,projects:localStorage.getItem(PROJECTS_KEY),login:document.getElementById('loginScreen').className,theme:document.documentElement.getAttribute('data-theme')};
  pbRequest=async()=>({items:[]});pbSharedGuidance=async()=>[];
  document.getElementById('loginScreen').classList.add('hidden');
  saveProjectsData({active:'menu-fixture',items:{'menu-fixture':{id:'menu-fixture',name:'Menu fixture',records:[],docs:[],siteItems:[],diaryEvents:[]}}});
 });
 const picker=async id=>page.evaluate(id=>{
  const el=document.getElementById(id),s=getComputedStyle(el,'::picker(select)'),m=s.transform==='none'?new DOMMatrixReadOnly():new DOMMatrixReadOnly(s.transform);
  const inset=s.clipPath.match(/^inset\((.*?)(?:\s+round\s+.*?)?\)$/),parts=inset?inset[1].match(/calc\([^)]*\)|[^\s]+/g):[];
  return {open:el.matches(':open'),opacity:Number(s.opacity),display:s.display,duration:s.transitionDuration,scaleX:m.a,scaleY:m.d,translateX:m.e,translateY:m.f,clipTop:parts[0],clipRight:parts[1]||parts[0],clipBottom:parts[2]||parts[0],clipLeft:parts[3]||parts[1]||parts[0],easing:s.transitionTimingFunction};
 },id);
 const fixedEdges=state=>state.clipTop==='-48px'&&state.clipRight==='-48px'&&state.clipLeft==='-48px'&&state.scaleX===1&&state.scaleY===1&&state.translateX===0&&state.translateY===0;

 try{
  const supported=await page.evaluate(()=>CSS.supports('appearance','base-select')&&CSS.supports('transition-behavior','allow-discrete')&&CSS.supports('clip-path','inset(0)'));
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
    const opening=await picker(id);assert(opening.open&&opening.opacity>=.85&&opening.opacity<=1,'Opening uses only a slight fade: '+JSON.stringify(opening));
    assert.deepEqual(opening.duration.split(',').map(x=>x.trim()),['0.12s','0.22s','0.22s','0.22s']);
    assert(fixedEdges(opening)&&opening.clipBottom!=='-48px'&&opening.clipBottom!=='88%','Only the bottom reveal edge moves: '+JSON.stringify(opening));
    assert(opening.easing.includes('cubic-bezier(0.25, 0.15, 0.25, 1)'));
    await page.waitForTimeout(180);const opened=await picker(id);assert.equal(opened.opacity,1);assert.equal(opened.clipBottom,'-48px');
    await page.keyboard.press('Escape');await page.waitForTimeout(65);
    const closing=await picker(id);assert(!closing.open&&closing.opacity>=.85&&closing.opacity<=1&&closing.display!=='none','Closing remains visible during reveal reversal: '+JSON.stringify(closing));
    assert(fixedEdges(closing)&&closing.clipBottom!=='-48px'&&closing.clipBottom!=='88%','Closing clips upward without scaling or sliding: '+JSON.stringify(closing));
    await page.waitForFunction(id=>getComputedStyle(document.getElementById(id),'::picker(select)').display==='none',id,{timeout:1500});
   }
  }
  await page.locator('#listMenu').click();await page.locator('#siteMenu').click();assert(!(await picker('listMenu')).open&&(await picker('siteMenu')).open,'Tools replaces Site');
  await page.locator('#listMenu').click();assert((await picker('listMenu')).open&&!(await picker('siteMenu')).open,'Site replaces Tools');await page.keyboard.press('Escape');
  for(const id of ['listMenu','siteMenu']){
   for(let i=0;i<8;i++)await page.locator('#'+id).click();
   await page.keyboard.press('Escape');
   await page.waitForFunction(id=>{const el=document.getElementById(id);return !el.matches(':open')&&getComputedStyle(el,'::picker(select)').display==='none'},id,{timeout:1500});
   const state=await picker(id);assert(!state.open&&state.display==='none','Rapid taps settle closed');
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const id of ['listMenu','siteMenu']){
   await page.locator('#'+id).click();const state=await picker(id);assert(state.open&&state.opacity===1&&fixedEdges(state)&&state.clipBottom==='-48px'&&state.duration.split(',').every(x=>x.trim()==='0s'),'Reduced motion opens instantly');
   await page.keyboard.press('Escape');assert.equal((await picker(id)).display,'none');
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
  console.log('PASS: Site/Tools picker opening/closing, exclusive state, rapid taps, reduced motion, both themes, every destination and Back for all three roles.');
 }finally{
  await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{const old=window.__menuMotionFixture;pbAuth=old.auth;pbRequest=old.request;pbSharedGuidance=old.shared;pbMemberships=old.members;if(old.projects===null)localStorage.removeItem(PROJECTS_KEY);else localStorage.setItem(PROJECTS_KEY,old.projects);document.getElementById('loginScreen').className=old.login;if(old.theme===null)document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',old.theme);delete window.__menuMotionFixture;openTab('dashboard')});
 }
};
