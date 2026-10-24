
(()=>{
  const KEY='fielddock-supervisor-work-view';
  const btn=()=>document.getElementById('workViewToggleBtn');
  const isManagerAccount=()=>{try{return !!isGlobalSupervisor()}catch(e){return false}};
  const stored=()=>localStorage.getItem(KEY)==='site'?'site':'management';
  function refresh(){
    const allowed=isManagerAccount(), mode=allowed?stored():'management';
    document.documentElement.dataset.workView=mode;
    const b=btn();
    if(b){
      b.style.display=allowed?'':'none';
      b.textContent=mode==='site'?'⚙ Switch to Manager View':'🦺 Switch to Joiner View';
      b.setAttribute('aria-pressed',mode==='site'?'true':'false');
    }
    const reports=document.getElementById('dashReportsTile');
    if(reports&&allowed)reports.style.display=mode==='site'?'none':'flex';
    const grid=document.getElementById('projectToolGrid');
    if(grid&&allowed)grid.style.display=mode==='site'?'none':'grid';
  }
  btn()?.addEventListener('click',()=>{
    if(!isManagerAccount())return;
    localStorage.setItem(KEY,stored()==='site'?'management':'site');
    refresh();
    try{applyPermissionsUI()}catch(e){}
    try{renderDashboard()}catch(e){}
    try{if(typeof renderSiteItems==='function')renderSiteItems()}catch(e){}
    refresh();
    if(typeof closeHeaderMenu==='function')closeHeaderMenu();
  });
  const oldApplyAuth=window.applyAuth;
  if(typeof oldApplyAuth==='function')window.applyAuth=function(){const r=oldApplyAuth.apply(this,arguments);refresh();return r};
  const oldApplyPermissions=window.applyPermissionsUI;
  if(typeof oldApplyPermissions==='function')window.applyPermissionsUI=function(){const r=oldApplyPermissions.apply(this,arguments);refresh();return r};
  const oldRenderDashboard=window.renderDashboard;
  if(typeof oldRenderDashboard==='function')window.renderDashboard=function(){const r=oldRenderDashboard.apply(this,arguments);refresh();return r};
  refresh();
  setTimeout(refresh,250);
  setTimeout(refresh,900);
})();
