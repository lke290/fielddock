const assert=require('node:assert/strict');
module.exports=async function(page){
 const results=await page.evaluate(async()=>{
  const old={pbAuth,authRole,pbRequest,projectsData,saveProjectsData,photosFor};const oldOpen=window.open;
  const out=[],check=(v,m)=>{if(!v)throw Error(m);out.push(m)};
  try{
   let uid='joiner-a',role='joiner';pbAuth=()=>({token:'test',record:{id:uid,role}});authRole=()=>role;
   const p={id:'p',_pocketbase:true,completion:{d:{frame:true,door:true,ironmongery:true,dates:{},owners:{frame:'joiner-a',door:'joiner-b',ironmongery:''}}}};
   const host=document.createElement('div');
   for(const r of ['joiner','user','supervisor','admin']){
    role=r;host.innerHTML=completionCard({id:'d',door:'D-1'},p,[]);
    const inputs=[...host.querySelectorAll('.completion-check')];
    check(inputs.length===3,'Three separate controls for '+r);
    check(inputs.every(x=>x.checked),'Completion shown for '+r);
    check(inputs.map(x=>x.disabled).join(',')===(['admin','supervisor'].includes(r)?'false,false,false':'false,true,true'),'Independent ownership/read-only controls for '+r);
   }
   role='joiner';
   for(const field of ['frame','door','ironmongery']){
    for(const owner of [undefined,null,'',[],{},['joiner-a'],'joiner-b'])check(!canEditCompletionStage(p,{[field]:true,owners:{[field]:owner}},field),'Reject unknown/other owner '+field+' '+JSON.stringify(owner));
    check(canEditCompletionStage(p,{[field]:false},field),'Incomplete allowed '+field);
    check(canEditCompletionStage(p,{[field]:true,owners:{[field]:uid}},field),'Own allowed '+field);
   }
   const calls=[];pbRequest=async(path,options)=>{calls.push({path,options});return {id:'cloud',...JSON.parse(options.body),frame_completed_by:uid}};
   for(const field of ['frame','door','ironmongery']){
    const c={_pbId:'cloud',frame:true,door:true,ironmongery:true,dates:{frame:'date',door:'date',ironmongery:'date'},owners:{frame:'other'}};
    await savePbCompletion('p','d',c,field);
    const body=JSON.parse(calls.at(-1).options.body);
    check(Object.keys(body).length===2&&!Object.keys(body).some(k=>k.endsWith('_by')),'Partial stage payload; server derives owner '+field);
   }
   const mapped=mapPbCompletion({id:'id',frame_completed_by:'a',door_completed_by:'b',ironmongery_completed_by:'c',frame_fitted:true,door_hung:true,ironmongery_fitted:true});
   check(JSON.stringify(mapped.owners)===JSON.stringify({frame:'a',door:'b',ironmongery:'c'}),'All owners survive mapping/reload');
   let data={active:'p',items:{p:{_pocketbase:true}}};projectsData=()=>structuredClone(data);saveProjectsData=d=>{data=d};
   pbRequest=async()=>{data.active='other';data.items.other={name:'Other project'};return {items:[{id:'x',schedule_record:'d',frame_completed_by:'a',frame_fitted:true}]}};
   await syncPocketBaseCompletion('p');
   check(data.active==='other'&&data.items.other.name==='Other project'&&data.items.p.completion.d.owners.frame==='a','Refresh preserves project switching');
   // Exercise the actual three report builders; each must use its own stage.
   data={active:'p',items:{p:{id:'p',name:'Ownership reports',records:[{id:'d',door:'D-1'}],completion:{d:{frame:true,door:false,ironmongery:true,dates:{frame:'2026-10-25',ironmongery:'2026-10-24'}}}}}};
   photosFor=async()=>[];
   for(const [kind,title,count] of [['frame','Frame Fitted Report',1],['door','Door Fitted Report',0],['iron','Ironmongery Report',1]]){
    let html='';window.open=()=>({document:{open(){html=''},write(s){html+=s},close(){}}});
    await buildCompletionReport(kind);
    check(html.includes(title)&&html.includes(count+' of 1 doors complete'),'Independent '+kind+' report');
   }
   return out;
  }finally{Object.assign(window,old);window.open=oldOpen}
 });
 assert(results.length>30);console.log('PASS: completion ownership UI, all roles/stages, legacy/malformed owners, partial payloads, reload and project switching.');
};
