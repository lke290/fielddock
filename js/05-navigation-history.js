
(()=>{
 let restoring=false;
 const activePanel=()=>document.querySelector('.panel.active')?.id||'dashboard';
 const baseOpenTab=window.openTab;if(typeof baseOpenTab!=='function')return;
 const stateFor=(panel,extra={})=>({fieldDock:true,panel,...extra});
 function push(panel,extra={}){if(restoring)return;const next=stateFor(panel,extra),cur=history.state||{};if(cur.fieldDock&&cur.panel===next.panel&&cur.projectTool===next.projectTool&&cur.formulaTool===next.formulaTool)return;history.pushState(next,'',location.href)}
 window.openTab=function(id){const before=activePanel();const result=baseOpenTab.apply(this,arguments);if(!restoring&&id&&id!==before)push(id);return result};
 history.replaceState(stateFor(activePanel()),'',location.href);
 document.addEventListener('click',e=>{const tile=e.target.closest?.('[data-project-tool]');if(tile&&activePanel()==='projects')push('projects',{projectTool:tile.dataset.projectTool})},true);
 document.addEventListener('click',e=>{const tile=e.target.closest?.('[data-open-formula]');if(tile&&activePanel()==='formula')push('formula',{formulaTool:tile.dataset.openFormula})},true);
 window.addEventListener('popstate',e=>{const st=e.state;if(!st?.fieldDock)return;restoring=true;try{baseOpenTab(st.panel||'dashboard');if(st.panel==='projects'){if(st.projectTool)document.querySelector('[data-project-tool="'+CSS.escape(st.projectTool)+'"]')?.click();else document.getElementById('v415ProjectBack')?.click()}if(st.panel==='formula'){if(st.formulaTool)document.querySelector('[data-open-formula="'+CSS.escape(st.formulaTool)+'"]')?.click();else{const back=document.querySelector('#formula .formula-back');if(back&&!back.hidden)back.click()}}}finally{queueMicrotask(()=>{restoring=false})}});
})();
