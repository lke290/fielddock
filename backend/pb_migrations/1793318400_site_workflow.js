migrate((app)=>{
 const users=app.findCollectionByNameOrId('users'),projects=app.findCollectionByNameOrId('projects');
 if(!users.fields.getByName('display_initials'))users.fields.add(new TextField({name:'display_initials',max:6}));app.save(users);
 for(const name of ['personal_notes','project_notes']){
  const c=app.findCollectionByNameOrId(name);
  for(const f of [new TextField({name:'reference',max:40}),new TextField({name:'processed_kind',max:10}),new TextField({name:'processed_target',max:80})])if(!c.fields.getByName(f.name))c.fields.add(f);
  c.addIndex('idx_'+name+'_reference',true,'reference',"reference != ''");app.save(c);
 }
 const sequences=new Collection({name:'workflow_sequences',type:'base',fields:[{type:'text',name:'prefix',required:true},{type:'number',name:'value',onlyInt:true,min:0}],indexes:['CREATE UNIQUE INDEX idx_workflow_prefix ON workflow_sequences (prefix)']});app.save(sequences);
 for(const prefix of ['N','TD','SN']){const rec=new Record(sequences);rec.set('prefix',prefix);rec.set('value',0);app.save(rec)}
 const member='@request.auth.id != "" && (@request.auth.role = "admin" || @request.auth.role = "supervisor" || project.project_members_via_project.user ?= @request.auth.id)';
 const relation=(name,id,required=false)=>({type:'relation',name,collectionId:id,maxSelect:1,required,cascadeDelete:false});
 const notes=app.findCollectionByNameOrId('personal_notes');
 app.save(new Collection({name:'todos',type:'base',listRule:member,viewRule:member,createRule:member,updateRule:member,deleteRule:null,
 fields:[relation('project',projects.id,true),{type:'text',name:'reference',max:40},{type:'text',name:'description',required:true,max:10000},{type:'text',name:'location',max:1000},{type:'select',name:'priority',values:['Normal','Important','Urgent'],maxSelect:1,required:true},relation('assigned_to',users.id),relation('created_by',users.id,true),{type:'autodate',name:'created',onCreate:true},{type:'autodate',name:'updated',onCreate:true,onUpdate:true},{type:'bool',name:'complete'},relation('completed_by',users.id),{type:'date',name:'completed_at'},relation('source_note',notes.id),relation('source_project_note',app.findCollectionByNameOrId('project_notes').id),{type:'json',name:'origin',maxSize:100000}],indexes:['CREATE UNIQUE INDEX idx_todos_reference ON todos (reference)',"CREATE UNIQUE INDEX idx_todos_source ON todos (source_note) WHERE source_note != ''","CREATE UNIQUE INDEX idx_todos_shared_source ON todos (source_project_note) WHERE source_project_note != ''"]}));
},(app)=>{throw new Error('Non-destructive rollback: retain workflow records/identities; review a backup before removing schema.');});
