
(()=>{
 const byId=id=>document.getElementById(id);
 function refreshV4154RoleUI(){
   let manage=false;try{manage=!!canManageProject()}catch(e){}
   const grid=byId('projectToolGrid');
   if(grid){grid.classList.toggle('joiner-hidden',!manage);grid.setAttribute('aria-hidden',manage?'false':'true')}
   const back=byId('v415ProjectBack');if(back&&!manage)back.hidden=true;
 }
 // Keep the navigation labels visible after Android/Samsung select controls reset.
 ['listMenu','siteMenu'].forEach(id=>{
   const el=byId(id);if(!el)return;
   const first=el.querySelector("option[value='']");if(first)first.hidden=false;
   el.addEventListener('change',()=>setTimeout(()=>{el.value=''},0));
 });
 // Permission state can change after login/membership sync, so refresh at the same UI checkpoints as the existing build.
 const oldApply=window.applyPermissionsUI;
 if(typeof oldApply==='function')window.applyPermissionsUI=function(){const r=oldApply.apply(this,arguments);refreshV4154RoleUI();return r};
 const oldDash=window.renderDashboard;
 if(typeof oldDash==='function')window.renderDashboard=function(){const r=oldDash.apply(this,arguments);refreshV4154RoleUI();return r};
 refreshV4154RoleUI();setTimeout(refreshV4154RoleUI,250);setTimeout(refreshV4154RoleUI,900);
})();
