const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.FIELDDOCK_PLAYWRIGHT||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 let file=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/(?:fielddock\/)?/,'');
 if(!file||file.endsWith('/'))file+='index.html';
 if(file==='baseline.html')file='baseline/index.html';
 const full=path.resolve(root,file);
 if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');res.end(fs.readFileSync(full))}catch{res.writeHead(404).end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [390,1440]){
   const snapshots=[];
   for(const route of ['/baseline.html','/','/fielddock/']){
    const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390,serviceWorkers:'block'});
    await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const page=await context.newPage(),errors=[],missing=[],ordersRequests=[];
    page.on('request',r=>{if(/\/collections\/orders(?:\/|\?)/.test(r.url()))ordersRequests.push(r.url())});
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
    await page.goto(origin+route);await page.waitForTimeout(300);
    // Normalize the intentionally removed Orders UI in the frozen baseline only.
    if(route==='/baseline.html')await page.evaluate(()=>document.querySelectorAll("#orders,#dashMaterialsTile,#dashboardSiteOrders,option[value='orders']").forEach(el=>{const next=el.nextSibling;if(next?.nodeType===Node.TEXT_NODE&&next.textContent.startsWith('\n'))next.textContent=next.textContent.slice(1);el.remove()}));
    // Compare unchanged UI against the baseline after applying the reviewed shortcut markup.
    if(route==='/baseline.html')await page.evaluate(markup=>{
     const oldGrid=document.querySelector('.dashboard-tile-grid');
     const outstanding=document.getElementById('dashOutstandingMeta').textContent,diary=document.getElementById('dashDiaryMeta').textContent;
     const oldLink=document.getElementById('dashCompletionTile'),next=oldLink.nextSibling;
     if(next?.nodeType===Node.TEXT_NODE&&next.textContent.startsWith('\n'))next.textContent=next.textContent.slice(1);
     oldLink.remove();oldGrid.outerHTML=markup;
     document.getElementById('dashOutstandingMeta').textContent=outstanding;document.getElementById('dashDiaryMeta').textContent=diary;
    },fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<div class='dashboard-tile-grid'[\s\S]*?(?=<button type='button' class='dashboard-wide-link supervisor-only-ui')/)[0].trimEnd());
    // The Calendar has its own interaction coverage; normalize its reviewed markup here.
    if(route==='/baseline.html')await page.evaluate(({markup,styles})=>{
     const fieldStyles=[...document.querySelectorAll('#calendar [id]')].map(el=>[el.id,el.getAttribute('style')]);
     document.getElementById('calendar').outerHTML=markup;
     fieldStyles.forEach(([id,style])=>{if(style!==null)document.getElementById(id)?.setAttribute('style',style)});
     const sheet=document.createElement('style');sheet.textContent=styles;document.head.append(sheet);applyPermissionsUI();
    },{markup:fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<section id='calendar'[\s\S]*?<\/section>/)[0],styles:fs.readFileSync(path.join(root,'css/03-polish.css'),'utf8').match(/\/\* Interactive project Calendar \*\/[\s\S]*?\/\* End interactive project Calendar \*\//)[0]});
    // Picker option presentation differs by renderer; contents and behaviour have dedicated coverage.
    const state=await page.evaluate(()=>({
     globals:['openTab','applyAuth','pbFetch','completionHardwareHtml','renderSiteItems'].map(k=>[k,typeof window[k]]),
     elements:[...document.body.querySelectorAll('*')].filter(e=>!['SCRIPT','STYLE','LINK'].includes(e.tagName)&&!(e.tagName==='OPTION'&&e.closest('#listMenu,#siteMenu'))).map(e=>{
      const s=getComputedStyle(e);return [e.tagName,e.id,e.className,e.textContent,s.display,s.color,s.backgroundColor,s.fontSize,s.padding,s.margin,s.position,s.width,s.height];
     })
    }));
    assert.deepEqual(errors,[],`${route} runtime errors`);assert.deepEqual(missing,[],`${route} missing resources`);
    snapshots.push(state);
    if(route!=='/baseline.html'){
     await require('./menu-motion-regressions.cjs')(page);
     await require('./dashboard-shortcut-regressions.cjs')(page);
     await require('./orders-ui-regressions.cjs')(page);
     await require('./calendar-regressions.cjs')(page);
     await require('./photo-regressions.cjs')(page);
     await require('./photo-session-regressions.cjs')(page);
     await require('./snag-regressions.cjs')(page);
     await require('./completion-interaction-regressions.cjs')(page);
     await require('./completion-ownership-regressions.cjs')(page);
    }
    assert.deepEqual(errors,[],`${route} workflow runtime errors`);
    assert.deepEqual(ordersRequests,[],`${route} unnecessary Orders requests`);
    await context.close();
   }
   assert.deepEqual(snapshots[1],snapshots[0],`root DOM/styles/globals at ${width}`);
   assert.deepEqual(snapshots[2],snapshots[0],`subpath DOM/styles/globals at ${width}`);
   console.log(`PASS: ${width}px baseline/root/subfolder startup, globals and computed styles; no runtime errors or local 404s.`);
  }
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
