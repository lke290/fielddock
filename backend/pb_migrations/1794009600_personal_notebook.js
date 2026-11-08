migrate(app=>{
 const notes=app.findCollectionByNameOrId('personal_notes'),users=app.findCollectionByNameOrId('users');
 for(const field of [new TextField({name:'project_reference'}),new DateField({name:'deleted_at'}),new RelationField({name:'deleted_by',collectionId:users.id,maxSelect:1,cascadeDelete:false}),new JSONField({name:'deletion_history',maxSize:100000})]){if(notes.fields.getByName(field.name))throw new Error('Unexpected existing personal-note lifecycle field: '+field.name);notes.fields.add(field)}
 notes.fields.getByName('project').required=false;
 const owner='@request.auth.id != "" && user = @request.auth.id && deleted_at = ""';
 notes.listRule=owner;notes.viewRule=owner;notes.updateRule=owner+' && @request.body.user:changed = false';notes.deleteRule=null;
 notes.addIndex('idx_personal_notes_owner_deleted',false,'user, deleted_at, updated','');app.save(notes);
},()=>{throw new Error('Preserve personal notes and deletion audit. Restore the reviewed pre-release backup for rollback.');});
