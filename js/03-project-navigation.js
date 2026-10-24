

(()=>{
 const byId=id=>document.getElementById(id), grid=byId('projectToolGrid'), page=byId('projects');
 if(!grid||!page)return;
 let back=byId('v415ProjectBack');
 if(!back){back=document.createElement('button');back.id='v415ProjectBack';back.type='button';back.className='btn v415-project-back';back.textContent='‹ Projects';back.hidden=true;grid.parentNode.insertBefore(back,grid)}
 const ids=['projectDetailsPanel','projectFilesGroup','projectTeamPanel','projectManagementGroup'];
 function showGrid(){ids.map(byId).filter(Boolean).forEach(n=>{n.classList.add('v4142-project-target');n.classList.remove('v4142-open');n.open=false});grid.classList.remove('v415-hidden');back.hidden=true;page.scrollIntoView({behavior:'smooth',block:'start'})}
 function showTool(id){grid.classList.add('v415-hidden');back.hidden=false;ids.map(byId).filter(Boolean).forEach(n=>{n.classList.add('v4142-project-target');const on=n.id===id;n.classList.toggle('v4142-open',on);if(on)n.open=true});const t=byId(id);if(t)setTimeout(()=>t.scrollIntoView({behavior:'smooth',block:'start'}),30)}
 grid.querySelectorAll('[data-project-tool]').forEach(b=>{b.onclick=()=>showTool(b.dataset.projectTool)});
 back.onclick=showGrid;
 // Each visit to Projects starts from the clean four-tile launcher.
 const observer=new MutationObserver(()=>{if(page.classList.contains('active')&&!page.dataset.v415WasActive){page.dataset.v415WasActive='1';showGrid()}else if(!page.classList.contains('active')){delete page.dataset.v415WasActive}});
 observer.observe(page,{attributes:true,attributeFilter:['class']});
 if(page.classList.contains('active')){page.dataset.v415WasActive='1';showGrid()}
})();

