const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const revision='b45c5f9d06db73fa6ce22c75186f593dc4a0eb3a';
const original=cp.execFileSync('git',['show',revision+':index.html'],{cwd:root}).toString('utf8');
fs.mkdirSync(path.join(root,'baseline'),{recursive:true});
fs.writeFileSync(path.join(root,'baseline/index.html'),original);
for(const dir of ['css','js'])fs.mkdirSync(path.join(root,dir),{recursive:true});
let styles=0,scripts=0;
const assets=[];
// Match entire scripts before styles so print-document CSS inside JS stays in JS.
const output=original.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>|<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi,(full,sa,js,ca,css)=>{
 const script=sa!==undefined,attrs=script?sa:ca;
 if(script&&/\bsrc\s*=/.test(attrs))return full;
 const id=attrs.match(/\bid=['"]([^'"]+)['"]/i)?.[1];
 const number=script?++scripts:++styles;
 const name=(id|| (script?'app-core':'base')).replace(/^v\d+-/,'');
 const file=`${script?'js':'css'}/${String(number).padStart(2,'0')}-${name}.${script?'js':'css'}`;
 const body=script?js:css;
 fs.writeFileSync(path.join(root,file),body);
 assets.push({file,kind:script?'script':'style',attributes:attrs});
 // Classic, parser-blocking scripts preserve shared globals and original order.
 return script?`<script${attrs} src="${file}"></script>`:`<link${attrs} rel="stylesheet" href="${file}">`;
});
fs.writeFileSync(path.join(root,'index.html'),output);
fs.writeFileSync(path.join(root,'baseline/extraction.json'),JSON.stringify({revision,assets},null,2)+'\n');
console.log(`Extracted ${scripts} scripts and ${styles} stylesheets without changing their contents.`);
