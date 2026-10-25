migrate((app) => {
  const c = app.findCollectionByNameOrId("completion_records");
  const users = app.findCollectionByNameOrId("users");
  for (const name of ["frame_completed_by", "door_completed_by", "ironmongery_completed_by"]) {
    if (!c.fields.getByName(name)) c.fields.add(new RelationField({
      name, collectionId: users.id, maxSelect: 1, required: false, cascadeDelete: false
    }));
  }
  app.save(c);
}, (app) => {
  // Deliberately retain ownership/history on rollback. Restore the verified backup
  // for a full rollback rather than silently discarding recorded ownership.
});
