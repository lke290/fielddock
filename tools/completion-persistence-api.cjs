// Integration test against the explicit isolated database copy ONLY.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http'),{spawn}=require('node:child_process');
const {chromium}=require(process.env.FIELDDOCK_PLAYWRIGHT||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'..'),data=path.join(process.env.USERPROFILE,'Documents/ChatGPT/Fielddock/completion-security/isolated');
assert(fs.existsSync(path.join(data,'data.db')),'Prepare an isolated database copy before running');
const pb='http://127.0.0.1:8091';let child,browser;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function start(){child=spawn('C:/Projects/fielddock-server/pocketbase.exe',['serve','--http','127.0.0.1:8091','--dir',data,'--hooksDir',path.join(root,'backend/pb_hooks'),'--migrationsDir',path.join(root,'backend/pb_migrations'),'--publicDir',path.join(data,'empty-public')],{windowsHide:true,stdio:'ignore'});for(let n=0;n<50;n++){try{const r=await fetch(pb+'/api/health');if(r.ok)return}catch{}await pause(100)}throw Error('Isolated backend did not start')}
async function stop(){if(!child)return;const current=child;child=null;if(current.exitCode!==null)return;await new Promise(resolve=>{current.once('exit',resolve);current.kill()})}
async function api(p,t,method='GET',body){const r=await fetch(pb+'/api/'+p,{method,headers:{'Content-Type':'application/json',...(t?{Authorization:t}:{})},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();assert(r.ok,JSON.stringify(d));return d}
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file))}catch{res.writeHead(404).end()}});
(async()=>{
 try{const r=await fetch(pb+'/api/health');if(r.ok)throw Error('Port 8091 already in use; stop the isolated test instance first')}catch(e){if(e.message.includes('already in use'))throw e}
 await start();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const su=(await api('collections/_superusers/auth-with-password',null,'POST',{identity:'completion-test@example.invalid',password:'LocalOnly-Test-84!'})).token;
 const users={},tag=Date.now();for(const [key,role] of [['a','joiner'],['b','joiner'],['s','supervisor']]){const email=key+tag+'@example.invalid',password='Local-Integration-Test-84!';const u=await api('collections/users/records',su,'POST',{email,password,passwordConfirm:password,username:'persist'+key+tag,name:key,role,active:true});users[key]=await api('collections/users/auth-with-password',null,'POST',{identity:email,password})}
 const project=(await api('collections/projects/records',su,'POST',{name:'Completion persistence isolated '+tag})).id;
 for(const key of ['a','b'])await api('collections/project_members/records',su,'POST',{project,user:users[key].record.id,role:'joiner'});
 const doors=[];for(let i=0;i<3;i++)doors.push(await api('collections/schedule_records/records',su,'POST',{project,door_no:'Persistence '+i}));
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.pathname.endsWith('/config.js'))return route.fulfill({contentType:'application/javascript',body:'window.FIELDDOCK_CONFIG={pocketBaseUrl:'+JSON.stringify(pb)+'}'});return [origin,pb].includes(u.origin)?route.continue():route.abort()});
  await context.addInitScript(()=>{try{localStorage.clear()}catch{}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function load(user){await page.goto(origin+'/');await page.evaluate(async({user,project,doors})=>{
   localStorage.setItem(PB_AUTH_KEY,JSON.stringify(user));pbVerifiedToken=user.token;applyAuth();
   projectRequirementGuides=async()=>[];photosFor=async()=>[];renderTeam=()=>{};renderDashboard=()=>{};renderProjectCards=()=>{};
   saveProjectsData({active:project,items:{[project]:{id:project,name:'Live API isolated fixture',_pocketbase:true,records:doors.map(d=>({id:d.id,door:d.door_no})),completion:{}}}});
   document.getElementById('completion').classList.add('active');document.getElementById('completionListPanel').open=true;for(const d of doors)completionDoorOpen.add(project+'::'+d.id);
   await syncPocketBaseCompletion(project);await renderCompletion();
  },{user,project,doors})}
  const input=(door,field)=>page.locator('#completionList .completion-check[data-rec="'+door+'"][data-field="'+field+'"]');
  const idle=()=>page.waitForFunction(()=>![...completionSaveStates.values()].some(s=>s.saving));
  await load(users.a);
  for(const [i,field,flag,date,owner] of [[0,'frame','frame_fitted','frame_fitted_at','frame_completed_by'],[1,'door','door_hung','door_hung_at','door_completed_by'],[2,'ironmongery','ironmongery_fitted','ironmongery_fitted_at','ironmongery_completed_by']]){
   await input(doors[i].id,field).click();await idle();assert(await input(doors[i].id,field).isChecked());
   let rows=(await api('collections/completion_records/records?filter='+encodeURIComponent('project="'+project+'" && schedule_record="'+doors[i].id+'"'),users.a.token)).items;
   assert.equal(rows.length,1);assert(rows[0][flag]);assert.equal(rows[0][owner],users.a.record.id);assert(Number.isFinite(Date.parse(rows[0][date])));
   await page.reload();await load(users.a);assert(await input(doors[i].id,field).isChecked());
  }
  await stop();await start();await load(users.a);
  for(const [i,field] of [[0,'frame'],[1,'door'],[2,'ironmongery']])assert(await input(doors[i].id,field).isChecked(),'Survives actual PocketBase restart');
  await load(users.b);for(const [i,field] of [[0,'frame'],[1,'door'],[2,'ironmongery']])assert(await input(doors[i].id,field).isDisabled());
  await load(users.s);for(const [i,field] of [[0,'frame'],[1,'door'],[2,'ironmongery']]){assert(!(await input(doors[i].id,field).isDisabled()));await input(doors[i].id,field).click();await idle();assert(!(await input(doors[i].id,field).isChecked()))}
  await load(users.a);for(const [i,field] of [[0,'frame'],[1,'door'],[2,'ironmongery']]){await input(doors[i].id,field).click();await idle();assert(await input(doors[i].id,field).isChecked())}
  await load(users.a);for(const [i,field] of [[0,'frame'],[1,'door'],[2,'ironmongery']]){await input(doors[i].id,field).click();await idle();assert(!(await input(doors[i].id,field).isChecked()))}
  await load(users.a);for(const [i,field] of [[0,'frame'],[1,'door'],[2,'ironmongery']])assert(!(await input(doors[i].id,field).isChecked()));
  const finalRows=(await api('collections/completion_records/records?filter='+encodeURIComponent('project="'+project+'"'),users.a.token)).items;for(const row of finalRows)for(const [flag,date,owner] of [['frame_fitted','frame_fitted_at','frame_completed_by'],['door_hung','door_hung_at','door_completed_by'],['ironmongery_fitted','ironmongery_fitted_at','ironmongery_completed_by']]){assert(!row[flag]);assert(!row[date]);assert(!row[owner])}
  assert.deepEqual(errors,[]);await context.close();console.log('PASS: '+width+'px real PocketBase + real auth wrapper + actual checkbox: all stages, owners/dates, browser reload, server restart, own undo, Joiner B read-only and Supervisor override.');
 }
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.close();await stop()});
