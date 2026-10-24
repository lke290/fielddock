const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const meta=JSON.parse(read('baseline/extraction.json')),original=read('baseline/index.html'),html=read('index.html');
assert.equal(original,cp.execFileSync('git',['show',meta.revision+':index.html'],{cwd:root}).toString());
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
// Only the reviewed photo compatibility changes may differ from the frozen source.
let compared=rebuilt;
for(const [start,end] of [['function mapPbPhoto(', 'function pbPhotoKind('],['async function refreshPhotoUI(', 'function bindPhotoControls(']]){
 const a=compared.indexOf(start),b=compared.indexOf(end,a);
 assert(a>=0&&b>a);
 compared=compared.slice(0,a)+original.slice(original.indexOf(start),original.indexOf(end,original.indexOf(start)))+compared.slice(b);
}
compared=compared.replace("Photos: …</div><div class='photo-gallery' data-photo-gallery='${esc(r.id)}' data-photo-filter='other'></div>","Photos: …</div>");
assert.equal(compared,original,'Only reviewed photo mapping/filtering and fallback gallery may differ');
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
console.log('PASS: 7 scripts parse; baseline unchanged outside reviewed photo fix; supporting files, local references, CSS paths, manifest icons and service worker syntax.');


