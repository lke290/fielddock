const assert=require('node:assert/strict');
module.exports=async function snagRegressions(page){
 const passed=await page.evaluate(async()=>{
  const old={projectsData,saveProjectsData,pbRequest,pbAuth,uploadPbDoorPhoto,renderCompletion,searchProject,projectRequirementGuides,photosFor};
  const oldAlert=window.alert,host=document.createElement('div');document.body.append(host);
  const imported={item:'42',description:'Imported defect',location:'Room 1',source:'Inspection',status:'Outstanding',resolvedAt:'',extra:'keep'};
  let data={active:'p1',items:{p1:{id:'p1',name:'Project one',_pocketbase:true,records:[{id:'d1',door:'D-1',floor:'Ground',room:'Room 1',snagItems:[structuredClone(imported)]},{id:'d2',door:'D-2',snagItems:[]}]},p2:{id:'p2',_pocketbase:true,records:[{id:'d3',door:'D-3',snagItems:[]}]}}};
  const db={d1:{id:'d1',project:'p1',snags_json:JSON.stringify([imported])},d2:{id:'d2',project:'p1',snags_json:'[]'},d3:{id:'d3',project:'p2',snags_json:'[]'}};
  let writes=0,photos=[],failSave=false,failPhoto=false,loseResponse=false,user='u1',gate=null,afterRead=null,afterPatch=null;
  const check=(value,message)=>{if(!value)throw new Error(message)};
  const same=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message);
  const items=id=>JSON.parse(db[id].snags_json);
  const record=id=>data.items.p1.records.find(r=>r.id===id);
  const draw=()=>{const p=data.items[data.active];host.innerHTML=p.records.map(r=>completionCard(r,p,[])).join('')};
  const form=()=>document.querySelector('#nativeDoorSnagDialog form');
  const close=()=>document.querySelector('[data-snag-close]')?.click();
  const send=()=>form().onsubmit({preventDefault(){}});
  const addFile=()=>{const dt=new DataTransfer();dt.items.add(new File(['photo'],'snag.jpg',{type:'image/jpeg'}));form().elements.photo.files=dt.files};
  try{
   projectsData=()=>data;saveProjectsData=d=>{data=d};pbAuth=()=>({record:{id:user}});
   window.alert=message=>{throw new Error('Unexpected alert: '+message)};
   renderCompletion=async()=>draw();searchProject=async()=>{};
   pbRequest=async(path,options={})=>{
    check(path.startsWith('/api/collections/schedule_records/records/'),'Only schedule_records requests allowed');
    const id=decodeURIComponent(path.split('/').pop());check(db[id],'Known door');
    if(options.method==='PATCH'){
     writes++;if(failSave)throw new Error('Permission denied');
     db[id]={...db[id],...JSON.parse(options.body)};
     if(afterPatch){const action=afterPatch;afterPatch=null;action()}
     if(loseResponse){loseResponse=false;throw new Error('Connection lost after write')}
     return structuredClone(db[id]);
    }
    if(gate)await gate;
    const row=structuredClone(db[id]);if(afterRead){const action=afterRead;afterRead=null;action()}
    return row;
   };
   uploadPbDoorPhoto=async(...args)=>{photos.push(args.slice(0,3));if(failPhoto)throw new Error('Photo unavailable')};
   draw();host.querySelector('[data-snag-record=d2]').click();
   check(form(),'Report snag opens form');
   check(form().querySelector('[data-snag-context]').textContent.includes('D-2'),'Form identifies clicked door');
   check(!form().querySelector('select'),'No project/door selection required');
   const snagPhoto=form().elements.photo;
   const completionPhoto=host.querySelector('.compact-stage .door-photo-input');
   check(snagPhoto.type==='file','Snag photo keeps the desktop file-input fallback');
   check(snagPhoto.accept===completionPhoto.accept,'Snag and completion photos accept the same image types');
   check(snagPhoto.getAttribute('capture')===completionPhoto.getAttribute('capture')&&snagPhoto.getAttribute('capture')==='environment','Snag photo requests the same rear camera as completion photos');
   const rect=form().closest('dialog').getBoundingClientRect();
   check(rect.left>=0&&rect.right<=innerWidth&&rect.height<=innerHeight,'Dialog fits mobile/desktop viewport');
   form().elements.description.value='   ';await send();check(writes===0,'Whitespace-only description cannot save');
   form().elements.description.value='New defect';
   // Latest server-only snag must survive; client d2 was empty when the form opened.
   db.d2.snags_json=JSON.stringify([{...imported,item:'server-only'}]);
   let release;gate=new Promise(r=>release=r);
   const first=send();await send();check(form().querySelector('[type=submit]').disabled,'Submit disabled while saving');
   check(record('d2').snagItems.length===0,'No optimistic local append');
   gate=null;release();await first;
   check(writes===1,'Double submit writes once');check(!form(),'Successful save closes form');
   check(items('d2').length===2,'Fresh imported entry preserved alongside new snag');
   same(items('d2')[0],{...imported,item:'server-only'},'All imported fields preserved');
   check(items('d1').length===1&&items('d3').length===0,'Other doors/projects untouched');
   check(host.querySelector('[data-snag-record=d2]').textContent==='Report another snag','Another report remains available');
   host.querySelector('[data-snag-record=d2]').click();form().elements.description.value='Second defect';await send();
   check(items('d2').length===3,'Multiple native snags on one door');
   host.querySelector('[data-snag-record=d2]').click();form().elements.description.value='Keep draft';failSave=true;
   const previous=JSON.stringify(record('d2').snagItems);await send();
   check(form().elements.description.value==='Keep draft','Failed save retains text');
   check(form().querySelector('[role=status]').textContent.includes('Permission denied'),'Useful save error');
   check(JSON.stringify(record('d2').snagItems)===previous,'Failed save leaves local snags unchanged');
   failSave=false;await send();check(items('d2').length===4,'Failed save can retry');
   // Ambiguous network failure: retry checks the stable entry ID rather than appending again.
   host.querySelector('[data-snag-record=d2]').click();form().elements.description.value='Lost response';loseResponse=true;await send();
   check(form(),'Lost response keeps draft');const count=items('d2').length;await send();
   check(items('d2').length===count,'Lost response retry does not duplicate snag');
   host.querySelector('[data-snag-record=d2]').click();form().elements.description.value='Photo defect';addFile();failPhoto=true;
   await send();const photoCount=items('d2').length;
   check(form().querySelector('[role=status]').textContent.includes('Snag saved'),'Photo failure distinguishes saved snag');
   check(host.textContent.includes('Photo defect'),'Snag displayed despite photo failure');
   check(form().querySelector('[type=submit]').textContent==='Retry photo','Photo retry offered');
   same(photos.at(-1),['p1','d2','Defect / snag'],'Photo uses captured project/door/classification');
   failPhoto=false;await send();check(items('d2').length===photoCount,'Photo retry never creates another snag');
   // Persistence helper preserves imported fields and does not mutate before confirmation.
   const beforeResolve=JSON.stringify(record('d2').snagItems);failSave=true;
   try{await setSnagResolved('d2',0,true);throw new Error('Expected resolve failure')}catch(e){check(e.message==='Permission denied','Resolve propagates save failure')}
   same(JSON.stringify(record('d2').snagItems),beforeResolve,'Failed resolve does not mutate local state');
   failSave=false;await setSnagResolved('d2',0,true);
   check(items('d2')[0].status==='Resolved'&&items('d2')[0].resolvedAt,'Resolve persisted');
   check(items('d2')[0].extra==='keep','Resolve preserves imported fields');
   await setSnagResolved('d2',0,false);check(items('d2')[0].status==='Outstanding'&&items('d2')[0].resolvedAt==='','Reopen persisted');
   // Simulate reload through the real schedule mapper, not retained client objects.
   data.items.p1.records=data.items.p1.records.map(r=>mapPbSchedule({...db[r.id],door_no:r.door}));draw();
   check(host.textContent.includes('Photo defect')&&host.textContent.includes('Second defect'),'Saved snags survive mapping/reload');
   // Navigation before saving must not retarget the form.
   host.querySelector('[data-snag-record=d2]').click();form().elements.description.value='Stay on D2';
   data.active='p2';const beforeSwitch=writes;await send();check(writes===beforeSwitch,'Project switch prevents write');
   check(form().querySelector('[role=status]').textContent.includes('original project'),'Project switch retains actionable draft');
   data.active='p1';user='u2';await send();check(writes===beforeSwitch,'Account switch prevents write');user='u1';
   // Switching during the fresh read also blocks the subsequent PATCH.
   afterRead=()=>{data.active='p2'};await send();check(writes===beforeSwitch,'Project switch during read prevents PATCH');data.active='p1';
   draw();await send();check(items('d2').at(-1).description==='Stay on D2','Returning to project saves original door');
   check(items('d3').length===0,'Never redirected to newly active project');
   // Relation mismatch and invalid data must fail without destructive replacement.
   const draft={ctx:doorSnagContext('p1','d2')};db.d2.project='p2';
   try{await submitNativeDoorSnag(draft,'Wrong relation');throw new Error('Expected mismatch')}catch(e){check(e.message.includes('no longer belongs'),'Relation checked')}
   db.d2.project='p1';const goodJson=db.d2.snags_json;db.d2.snags_json='{}';
   try{await submitNativeDoorSnag({ctx:doorSnagContext('p1','d2')},'Invalid');throw new Error('Expected malformed data')}catch(e){check(e.message.includes('invalid'),'Malformed array rejected')}
   db.d2.snags_json=goodJson;
   // Navigation while PATCH is running updates only the captured project; it must not attach a photo elsewhere.
   const navDraft={ctx:doorSnagContext('p1','d2')};afterPatch=()=>{data.active='p2'};
   const navPhotoCount=photos.length;
   const navigation=await submitNativeDoorSnag(navDraft,'Switch during save',new File(['photo'],'nav.jpg'));
   check(navigation.photoError&&navDraft.saved,'Successful save survives navigation during PATCH');
   check(photos.length===navPhotoCount,'No upload under newly active project');
   check(record('d2').snagItems.at(-1).description==='Switch during save','Confirmed result applied to original project');
   data.active='p1';await submitNativeDoorSnag(navDraft,'Switch during save',new File(['photo'],'nav.jpg'));
   // A different door can be displayed while the captured draft still targets its original door.
   const doorDraft={ctx:doorSnagContext('p1','d1')};
   host.innerHTML=completionCard(record('d2'),data.items.p1,[]);
   await submitNativeDoorSnag(doorDraft,'Captured D1');check(items('d1').at(-1).description==='Captured D1','Door navigation cannot retarget draft');
   // Use the real renderer/binding to verify checkbox rollback on a denied PATCH.
   projectRequirementGuides=async()=>[];photosFor=async()=>[];
   const list=document.getElementById('completionList');host.innerHTML='';
   await old.renderCompletion();
   let checkbox=list.querySelector('[data-rec=d1].snag-resolved');
   const priorAlert=window.alert,alerts=[];window.alert=message=>alerts.push(message);
   failSave=true;checkbox.checked=true;checkbox.dispatchEvent(new Event('change'));
   for(let i=0;checkbox.disabled&&i<100;i++)await new Promise(r=>setTimeout(r,0));
   check(!checkbox.checked&&!checkbox.disabled&&alerts[0].includes('Permission denied'),'Real checkbox rolls back and re-enables after failure');
   failSave=false;window.alert=priorAlert;
   checkbox.checked=true;checkbox.dispatchEvent(new Event('change'));
   for(let i=0;checkbox.disabled&&i<100;i++)await new Promise(r=>setTimeout(r,0));
   check(items('d1')[0].status==='Resolved','Real checkbox resolve persists');
   await old.renderCompletion();checkbox=list.querySelector('[data-rec=d1].snag-resolved');
   checkbox.checked=false;checkbox.dispatchEvent(new Event('change'));
   for(let i=0;checkbox.disabled&&i<100;i++)await new Promise(r=>setTimeout(r,0));
   check(items('d1')[0].status==='Outstanding','Real checkbox reopen persists');
   list.innerHTML='';
   // Existing local-only projects continue to work without backend requests.
   data.items.local={id:'local',records:[{id:'local-door',door:'Local',snagItems:[]}]};data.active='local';
   const localDraft={ctx:doorSnagContext('local','local-door')},beforeLocal=writes;
   await submitNativeDoorSnag(localDraft,'Local defect');
   await setSnagResolved('local-door',0,true);
   check(data.items.local.records[0].snagItems[0].status==='Resolved'&&writes===beforeLocal,'Local project save/resolve stays local');
   return true;
  }finally{close();host.remove();Object.assign(window,old);window.alert=oldAlert}
 });
 assert.equal(passed,true);
 console.log('PASS: native snag form, exact association, fresh-array preservation, multiple entries, duplicate submit, failed/lost saves, photo retry, resolve/reopen, reload and project/account guards.');
};
