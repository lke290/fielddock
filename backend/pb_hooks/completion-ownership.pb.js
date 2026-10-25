// Request hooks retain the collection API rules and add per-stage enforcement.
// All reads, validation and saving share one transaction. Never trust a client
// snapshot or a record-wide owner when deciding who may change a stage.
onRecordCreateRequest((e) => {
  require(`${__hooks}/completion-ownership.js`).save(e, true);
}, "completion_records");
onRecordUpdateRequest((e) => {
  require(`${__hooks}/completion-ownership.js`).save(e, false);
}, "completion_records");
// A Joiner must not bypass stage checks by deleting the shared door record.
onRecordDeleteRequest((e) => {
  if (!e.hasSuperuserAuth() && (!e.auth || !["admin", "supervisor"].includes(e.auth.getString("role"))))
    throw new ForbiddenError("Only management can delete completion records.");
  e.next();
}, "completion_records");
