
(()=>{
 const $id=id=>document.getElementById(id);
 function simplifyFilters(){
   const search=$id('siteItemSearch'), floor=$id('siteItemFloorFilter'), list=$id('siteItemListFilter'), status=$id('siteItemFilter');
   if(search){search.placeholder='Search location or item…';const l=search.closest('label');if(l)l.firstChild.textContent='Search'}
   if(floor){const l=floor.closest('label');if(l)l.firstChild.textContent='Floor'}
   [list,status].forEach(el=>{const l=el?.closest('label');if(l)l.style.display='none'});
 }
 function managerMode(){try{return !!canManageProject()&&document.documentElement.dataset.workView!=='site'}catch(e){return false}}
 function ensureItemDeleteDialog(){
   let el=$id('siteItemDeleteDialog');if(el)return el;
   el=document.createElement('div');el.id='siteItemDeleteDialog';el.className='fd-delete-modal';el.hidden=true;
   el.innerHTML=`<div class='fd-delete-dialog' role='dialog' aria-modal='true' aria-labelledby='siteItemDeleteTitle'><h2 id='siteItemDeleteTitle'>Delete site item?</h2><p class='small'>This item will be permanently removed from this project's site list.</p><div class='customise'><button type='button' class='btn' id='siteItemDeleteCancel'>Cancel</button><button type='button' class='btn danger-action' id='siteItemDeleteConfirm'>Delete</button></div></div>`;
   document.body.appendChild(el);return el;
 }
 function askDelete(){return new Promise(resolve=>{const d=ensureItemDeleteDialog(),cancel=$id('siteItemDeleteCancel'),ok=$id('siteItemDeleteConfirm');let done=v=>{d.hidden=true;cancel.onclick=null;ok.onclick=null;d.onclick=null;resolve(v)};cancel.onclick=()=>done(false);ok.onclick=()=>done(true);d.onclick=e=>{if(e.target===d)done(false)};d.hidden=false})}
 let siteItemPhotoBusy=false;
 function siteItemPhotoPendingId(input){return input?.dataset?.siteItemId||sessionStorage.getItem('fielddockPendingSiteItemPhoto')||''}
 function rememberOpenSiteItem(id){try{sessionStorage.setItem('fielddockOpenSiteItem',id||'')}catch(e){}}
 function restoreOpenSiteItem(options={}){try{const id=sessionStorage.getItem('fielddockOpenSiteItem');if(!id)return;const snags=$id('snags');if(options.navigate&&snags){try{openTab('snags')}catch(e){};const panel=$id('currentSiteListPanel');if(panel)panel.open=true}const card=document.querySelector(`details.site-item-card[data-site-item='${CSS.escape(id)}']`);if(card){card.open=true;if(options.scroll)setTimeout(()=>card.scrollIntoView({behavior:'smooth',block:'center'}),80)}}catch(e){}}
 async function processSiteItemPhotoInput(input){
   if(siteItemPhotoBusy)return false;
   const file=input?.files?.[0],id=siteItemPhotoPendingId(input);if(!file||!id)return false;
   siteItemPhotoBusy=true;
   try{await uploadSiteItemPhoto(id,file);rememberOpenSiteItem(id);restoreOpenSiteItem({navigate:true});await renderSiteItems();restoreOpenSiteItem({navigate:true,scroll:true});setTimeout(()=>restoreOpenSiteItem({navigate:true}),350);return true}
   catch(e){alert('Could not upload photo: '+e.message);return false}
   finally{siteItemPhotoBusy=false;try{input.value=''}catch(e){};delete input.dataset.siteItemId;try{sessionStorage.removeItem('fielddockPendingSiteItemPhoto')}catch(e){}}
 }
 function ensureSiteItemPhotoInputs(){
   let camera=$id('siteItemPhotoCameraInput'),existing=$id('siteItemPhotoExistingInput');
   if(!camera){camera=document.createElement('input');camera.id='siteItemPhotoCameraInput';camera.type='file';camera.accept='image/*';camera.setAttribute('capture','environment');camera.style.position='fixed';camera.style.left='-10000px';camera.style.width='1px';camera.style.height='1px';camera.style.opacity='0';document.body.appendChild(camera)}
   if(!existing){existing=document.createElement('input');existing.id='siteItemPhotoExistingInput';existing.type='file';existing.accept='image/*';existing.style.position='fixed';existing.style.left='-10000px';existing.style.width='1px';existing.style.height='1px';existing.style.opacity='0';document.body.appendChild(existing)}
   const bind=input=>{if(input.dataset.bound)return;input.dataset.bound='1';input.addEventListener('change',()=>processSiteItemPhotoInput(input));input.addEventListener('input',()=>processSiteItemPhotoInput(input))};
   bind(camera);bind(existing);return {camera,existing};
 }
 function retryPendingSiteItemPhoto(){const {camera,existing}=ensureSiteItemPhotoInputs();setTimeout(()=>{processSiteItemPhotoInput(camera);processSiteItemPhotoInput(existing)},250);setTimeout(()=>{processSiteItemPhotoInput(camera);processSiteItemPhotoInput(existing)},900)}
 window.addEventListener('focus',retryPendingSiteItemPhoto);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)retryPendingSiteItemPhoto()});
 function ensureSiteItemPhotoDialog(){
   let el=$id('siteItemPhotoDialog');if(el)return el;
   el=document.createElement('div');el.id='siteItemPhotoDialog';el.className='fd-delete-modal';el.hidden=true;
   el.innerHTML=`<div class='fd-delete-dialog' role='dialog' aria-modal='true' aria-labelledby='siteItemPhotoTitle'><h2 id='siteItemPhotoTitle'>Add photo</h2><p class='small'>Take a new site photo or choose one already on this device.</p><div class='customise'><button type='button' class='btn primary' id='siteItemTakePhoto'>Take photo</button><button type='button' class='btn' id='siteItemChoosePhoto'>Choose existing</button><button type='button' class='btn' id='siteItemPhotoCancel'>Cancel</button></div></div>`;
   document.body.appendChild(el);return el;
 }
 function showSiteItemPhotoChoice(root,id){
   const d=ensureSiteItemPhotoDialog(),inputs=ensureSiteItemPhotoInputs(),take=$id('siteItemTakePhoto'),choose=$id('siteItemChoosePhoto'),cancel=$id('siteItemPhotoCancel');
   const close=()=>{d.hidden=true;take.onclick=null;choose.onclick=null;cancel.onclick=null;d.onclick=null};
   take.onclick=()=>{inputs.camera.dataset.siteItemId=id;rememberOpenSiteItem(id);try{sessionStorage.setItem('fielddockPendingSiteItemPhoto',id)}catch(e){};close();inputs.camera.click()};
   choose.onclick=()=>{inputs.existing.dataset.siteItemId=id;rememberOpenSiteItem(id);try{sessionStorage.setItem('fielddockPendingSiteItemPhoto',id)}catch(e){};close();inputs.existing.click()};
   cancel.onclick=close;d.onclick=e=>{if(e.target===d)close()};d.hidden=false;
 }
 function cardHtml(x,photos,completed){
   const floor=inferSiteItemFloor(x),loc=String(x.location||'').replace(new RegExp('^'+floor+'\\s*','i'),'').trim();
   const photoHtml=photos.length?`<div class='site-item-photo-grid'>${photos.map(ph=>`<img class='site-item-photo' src='${esc(ph.url)}' data-photo-url='${esc(ph.url)}' alt='Site item photo' loading='lazy'>`).join('')}</div>`:'';
   const added=`Added ${esc(fmtDate(x.createdAt||''))}${x.createdBy?' by '+esc(x.createdBy):''}${x.due?` • Due ${esc(x.due)}`:''}`;
   const done=completed?`<div class='small' style='margin-top:8px'><b>Completed ${esc(fmtDate(x.completedAt||x.updatedAt||''))}${x.completedBy?' by '+esc(x.completedBy):''}</b></div>`:'';
   const manage=managerMode();
   let actions=completed
     ? (manage?`<div class='site-item-actions'><button class='btn site-item-reopen' data-id='${esc(x.id)}'>Reopen</button><button class='btn site-item-more' data-id='${esc(x.id)}' aria-label='More actions'>⋮</button></div><div class='site-item-manage-menu' data-menu='${esc(x.id)}' hidden><button class='btn site-item-delete' data-id='${esc(x.id)}'>Delete</button></div>`:'')
     : `<div class='site-item-actions'><button class='btn primary site-item-complete' data-id='${esc(x.id)}'>Complete</button><button type='button' class='btn site-item-photo-btn' data-id='${esc(x.id)}'>Take photo</button>${manage?`<button class='btn site-item-more' data-id='${esc(x.id)}' aria-label='More actions'>⋮</button>`:''}</div>${manage?`<div class='site-item-manage-menu' data-menu='${esc(x.id)}' hidden><button class='btn site-item-delete' data-id='${esc(x.id)}'>Delete</button></div>`:''}`;
   return `<details class='result site-item-card' data-site-item='${esc(x.id)}'><summary><span class='site-item-location'>${esc([floor,loc].filter(Boolean).join(' → ')||'Location not set')}</span><span class='site-item-title'>${esc(x.title||'Untitled item')}</span><span class='site-item-cue' aria-hidden='true'>›</span></summary><div class='site-item-expanded'><div class='record-badges'><span class='status-chip'>${esc(x.list||'General')}</span><span class='status-chip'>${esc(x.priority||'Normal')}</span>${x.assigned?`<span class='status-chip'>${esc(x.assigned)}</span>`:''}</div>${x.notes?`<div class='record-detail'>${esc(x.notes)}</div>`:''}<div class='small' style='margin-top:8px'>${added}</div>${done}${photoHtml}${actions}</div></details>`;
 }
 async function cards(rows,done){let out=[];for(const x of rows)out.push(cardHtml(x,await pbSiteItemPhotos(x.id),done));return out.join('')}
 async function hydrateSiteItemPhotos(root){
   if(!root)return;
   root.querySelectorAll('.site-item-photo[data-photo-url]').forEach(img=>{
     const url=img.dataset.photoUrl||img.getAttribute('src')||'';
     if(url&&!img.getAttribute('src'))img.src=url;
     img.addEventListener('error',()=>{
       img.classList.add('photo-load-error');
       img.alt='Photo could not be displayed';
     },{once:true});
     img.addEventListener('click',()=>{const openUrl=img.dataset.photoUrl||img.src;if(openUrl)window.open(openUrl,'_blank')});
   });
 }

 function wireActions(root){
   if(!root)return;
   root.querySelectorAll('.site-item-complete').forEach(b=>b.onclick=async()=>{const now=new Date().toISOString(),who=currentUserName(),items=siteItemsForProject().map(x=>x.id===b.dataset.id?{...x,status:'complete',updatedAt:now,completedAt:now,completedBy:who}:x);try{await saveSiteItems(items);await renderSiteItems();try{renderDashboard()}catch(e){}}catch(e){alert('Could not update site item: '+e.message)}});
   root.querySelectorAll('.site-item-reopen').forEach(b=>b.onclick=async()=>{const now=new Date().toISOString(),items=siteItemsForProject().map(x=>x.id===b.dataset.id?{...x,status:'open',updatedAt:now,completedAt:'',completedBy:''}:x);try{await saveSiteItems(items);await renderSiteItems();try{renderDashboard()}catch(e){}}catch(e){alert('Could not reopen site item: '+e.message)}});
   root.querySelectorAll('.site-item-more').forEach(b=>b.onclick=()=>{const m=root.querySelector(`[data-menu='${CSS.escape(b.dataset.id)}']`);if(m)m.hidden=!m.hidden});
   root.querySelectorAll('.site-item-photo-btn').forEach(b=>b.onclick=()=>{const {camera}=ensureSiteItemPhotoInputs(),id=b.dataset.id;camera.dataset.siteItemId=id;rememberOpenSiteItem(id);try{sessionStorage.setItem('fielddockPendingSiteItemPhoto',id)}catch(e){};camera.click()});
   root.querySelectorAll('.site-item-photo').forEach(img=>img.onclick=()=>{const url=img.dataset.photoUrl||img.src;if(url)window.open(url,'_blank')});
   root.querySelectorAll('.site-item-delete').forEach(b=>b.onclick=async()=>{if(!(await askDelete()))return;try{await saveSiteItems(siteItemsForProject().filter(x=>x.id!==b.dataset.id));await renderSiteItems();try{renderDashboard()}catch(e){}}catch(e){alert('Could not delete site item: '+e.message)}});
 }
 window.renderSiteItems=async function(){
   const activeBox=$id('siteItemListView'),doneBox=$id('completedSiteItemListView');if(!activeBox||!doneBox)return;simplifyFilters();const p=activeProject();
   if(!p){activeBox.innerHTML="<p class='small'>Select a project first.</p>";doneBox.innerHTML='';if($id('siteItemSummary'))$id('siteItemSummary').textContent='';return}
   siteItemFilterOptions();simplifyFilters();const all=siteItemsForProject().filter(x=>!x.orderType&&!x.noteType),q=normaliseSearch($id('siteItemSearch')?.value||''),floor=$id('siteItemFloorFilter')?.value||'all';
   const visible=all.filter(x=>(floor==='all'||inferSiteItemFloor(x)===floor)&&(!q||normaliseSearch([x.list,x.floor,x.location,x.title,x.notes,x.assigned].join(' ')).includes(q)));
   const active=visible.filter(x=>x.status!=='complete'),completed=visible.filter(x=>x.status==='complete');
   const totalOpen=all.filter(x=>x.status!=='complete').length,totalDone=all.filter(x=>x.status==='complete').length;
   if($id('siteItemSummary'))$id('siteItemSummary').innerHTML=`<b>${active.length}</b> shown • <b>${totalOpen}</b> outstanding${floor!=='all'?` • Floor: <b>${esc(floor)}</b>`:''}`;
   if($id('completedSiteItemCount'))$id('completedSiteItemCount').textContent=`(${totalDone})`;
   activeBox.innerHTML=await cards(active,false)||"<p class='small'>No outstanding site items match this view.</p>";
   doneBox.innerHTML=await cards(completed,true)||"<p class='small'>No completed items match the current search and floor filter.</p>";
   wireActions(activeBox);wireActions(doneBox);
   await Promise.all([hydrateSiteItemPhotos(activeBox),hydrateSiteItemPhotos(doneBox)]);
   restoreOpenSiteItem();
 };
 ['siteItemSearch','siteItemFloorFilter'].forEach(id=>{const el=$id(id);if(el){const ev=el.tagName==='INPUT'?'input':'change';el.addEventListener(ev,()=>renderSiteItems())}});
 $id('completedSiteListPanel')?.addEventListener('toggle',()=>{if($id('completedSiteListPanel').open)renderSiteItems()});
 simplifyFilters();
 try{if($id('currentSiteListPanel')?.open||$id('completedSiteListPanel')?.open)renderSiteItems()}catch(e){}
})();
