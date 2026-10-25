const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
// Git's Windows checkout can use CRLF while git show returns LF. Compare source,
// not checkout line endings; leave the frozen baseline and application files intact.
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
const meta=JSON.parse(read('baseline/extraction.json')),original=read('baseline/index.html'),html=read('index.html');
assert.equal(original,cp.execFileSync('git',['show',meta.revision+':index.html'],{cwd:root}).toString().replace(/\r\n/g,'\n'));
let rebuilt=html;
for(const asset of meta.assets){
 const body=read(asset.file);
 if(asset.kind==='script'){
  new vm.Script(body,{filename:asset.file});
  rebuilt=rebuilt.replace(`<script${asset.attributes} src="${asset.file}"></script>`,()=>`<script${asset.attributes}>${body}</script>`);
 }else{
  assert(!/url\s*\(/i.test(body),'Relative CSS URLs require rebasing');
  rebuilt=rebuilt.replace(`<link${asset.attributes} rel="stylesheet" href="${asset.file}">`,()=>`<style${asset.attributes}>${body}</style>`);
 }
}
// Restore only the reviewed Orders UI regions for the frozen extraction comparison.
// Behaviour is checked separately by orders-ui-regressions.cjs.
function restoreOrdersUI(source){
 const referenceLines=original.split('\n');
 const prefixes=["$('listMenu').addEventListener",'function renderDashboard(){','function openTab(id){','function refreshProjectSelect(){','async function saveSiteItems(items){','function projectCounts(){',"byId('dashOutstandingTile')",'let items=siteItemsForProject().filter(x=>', 'const itemHtml=items.length<=8?', "groups.push({title:'Notes", "box.querySelectorAll('[data-site-result]')", "box.querySelector('[data-site-group]')"];
 let lines=source.split('\n');
 for(const prefix of prefixes){
  const old=referenceLines.find(line=>line.trimStart().startsWith(prefix));
  const index=lines.findIndex(line=>line.trimStart().startsWith(prefix));
  assert(old!==undefined&&index>=0,`Orders comparison region: ${prefix}`);
  lines[index]=old;
 }
 source=lines.join('\n');
 const start=original.indexOf('function siteOrderStatusLabel('),end=original.indexOf('let calendarCursor=',start);
 source=source.replace('let calendarCursor=',original.slice(start,end)+'let calendarCursor=');
 source=source.replace("<option value='calendar'>Calendar</option>","<option value='orders'>Orders</option><option value='calendar'>Calendar</option>");
 const panel=original.match(/<section id='orders' class='panel'>[\s\S]*?<\/section>\n/)[0];
 source=source.replace("<section id='calendar'",panel+"<section id='calendar'");
 const tile=referenceLines.find(line=>line.includes("id='dashMaterialsTile'"));
 source=source.replace("<button type='button' class='dashboard-nav-tile' id='dashDiaryTile'",tile+"\n<button type='button' class='dashboard-nav-tile' id='dashDiaryTile'");
 source=source.replace("<div id='dashboardSiteItems' hidden></div>","<div id='dashboardSiteItems' hidden></div><div id='dashboardSiteOrders' hidden></div>");
 const cssStart=original.indexOf('/* v4.15.7 — Orders mobile form polish. */'),cssEnd=original.indexOf('</style>',cssStart);
 source=source.replace(/(<style id='v4963-polish'>[\s\S]*?)(<\/style>)/,(_,body,end)=>body+'\n'+original.slice(cssStart,cssEnd)+end);
 return source;
}
assert(!html.includes("value='orders'")&&!html.includes("id='orders'")&&!html.includes("id='dashMaterialsTile'"),'Orders entry points must be removed');

// Normalize the reviewed dashboard shortcut markup and search listener only.
function restoreDashboardShortcuts(source){
 const section=/<div class='dashboard-tile-grid'[\s\S]*?(?=<button type='button' class='dashboard-wide-link supervisor-only-ui')/;
 source=source.replace(section,()=>original.match(section)[0]);
 return source.replace(/^ byId\('dashSearchTile'\)[^\n]*\n/m,'');
}

// Restore only the reviewed Calendar UI, persistence and refresh integration.
function restoreCalendarUI(source){
 const region=(text,start,end)=>text.slice(text.indexOf(start),text.indexOf(end,text.indexOf(start)));
 source=source.replace(/let calendarCursor=[\s\S]*?(?=function renderDashboardDiary\(\))/,()=>region(original,'let calendarCursor=','function renderDashboardDiary()'));
 source=source.replace(/\$\('diaryCancel'\)[\s\S]*?(?=\$\('calendarPrev'\))/,()=>region(original,"$('diaryAdd')","$('calendarPrev')"));
 source=source.replace("  renderSiteDiary();\n  if(document.querySelector('#calendar.panel.active'))refreshSiteDiary();\n",'');
 const permission=original.split('\n').find(line=>line.includes("const manage=canManageProject();document.querySelectorAll('.calendar-add-event')"));
 source=source.replace(/^  const manage=canManageProject\(\);document.querySelectorAll\('\.calendar-add-event'\)[^\n]*/m,()=>permission);
 source=source.replace(/<section id='calendar'[\s\S]*?<\/section>/,()=>original.match(/<section id='calendar'[\s\S]*?<\/section>/)[0]);
 return source.replace(/\n\/\* Interactive project Calendar \*\/[\s\S]*?\/\* End interactive project Calendar \*\/\n/,'');
}

// Only reviewed photo, native door snag and session error-handling changes may differ.
let compared=restoreDashboardShortcuts(restoreOrdersUI(restoreCalendarUI(rebuilt))).replace(/\n\/\* Site and Tools picker motion only \*\/[\s\S]*?\/\* End Site and Tools picker motion \*\/\n/,'').replace(/\/\* Native door snag dialog \*\/[\s\S]*?\/\* End native door snag dialog \*\/\n?/,'');
// Permit only the exact upload-container selector correction.
assert.equal(compared.split("inp.closest('.photo-tools, .compact-photo-tools')").length,2);
compared=compared.replace("inp.closest('.photo-tools, .compact-photo-tools')","inp.closest('.photo-tools')");
for(const [start,end] of [['function mapPbCompletion(', 'const IRON_ITEMS='],['function canEditCompletionStage(', 'function fmtDate('],['function mapPbPhoto(', 'function pbPhotoKind('],['const photoRefreshRequests=', 'function bindPhotoControls('],['// Native door snags:', 'function completionState('],['function completionCard(', 'async function renderCompletion('],["async function ensurePbAuth(","window.addEventListener('storage'"]]){
 const baselineStart=start==='function canEditCompletionStage('?'async function saveCompletion(':start==='// Native door snags:'?'async function setSnagResolved(':start==='const photoRefreshRequests='?'async function refreshPhotoUI(':start;
 const a=compared.indexOf(start),b=compared.indexOf(end,a);
 assert(a>=0&&b>a);
 compared=compared.slice(0,a)+original.slice(original.indexOf(baselineStart),original.indexOf(end,original.indexOf(baselineStart)))+compared.slice(b);
}
compared=compared.replace("async()=>{const wanted=x.checked;x.disabled=true;await saveCompletion(x.dataset.rec,x.dataset.field,wanted)}","()=>saveCompletion(x.dataset.rec,x.dataset.field,x.checked)");
compared=compared.replace("Photos: …</div><div class='photo-gallery' data-photo-gallery='${esc(r.id)}' data-photo-filter='other'></div>","Photos: …</div>");
assert.equal(compared,original,'Only reviewed photo, native door snag and session error-handling functions may differ');
for(const file of ['config.js','manifest.json','sw.js','icon-192.png','icon-512.png'])assert.equal(cp.execFileSync('git',['hash-object',file],{cwd:root}).toString().trim(),cp.execFileSync('git',['rev-parse',meta.revision+':'+file],{cwd:root}).toString().trim());
for(const m of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi)){
 if(/^https?:/.test(m[1]))continue;
 assert(fs.existsSync(path.join(root,m[1].split('?')[0])),m[1]);
}
new vm.Script(read('sw.js'));
const manifest=JSON.parse(read('manifest.json'));
for(const icon of manifest.icons)assert(fs.existsSync(path.join(root,icon.src)));
// Run the existing authentication regressions against the reconstructed source.
const prior=fs.readFileSync(path.join(root,'tools/auth-regressions.cjs'),'utf8');
const testRequire=name=>name==='node:fs'?{...fs,readFileSync:(f,...args)=>f===path.join(root,'index.html')||f===root+'/index.html'?rebuilt:fs.readFileSync(f,...args)}:require(name);
vm.runInNewContext(prior,{require:testRequire,__dirname:root,console,Headers,FormData,process},{filename:'auth-regressions.cjs'});
console.log('PASS: 7 scripts parse; baseline unchanged outside reviewed photo/native snag/session/Orders/dashboard/Calendar regions; supporting files, local references, CSS paths, manifest icons and service worker syntax.');


