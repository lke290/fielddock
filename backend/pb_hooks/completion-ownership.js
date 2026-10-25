const stages = [
  ["frame_fitted", "frame_fitted_at", "frame_completed_by"],
  ["door_hung", "door_hung_at", "door_completed_by"],
  ["ironmongery_fitted", "ironmongery_fitted_at", "ironmongery_completed_by"]
];
const derived = ["installation_complete", "installation_complete_at", "ironmongery_snag_complete", "ironmongery_snag_complete_at", "fully_complete", "fully_complete_at"];
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
module.exports.save = (e, creating) => {
  const info = e.requestInfo(), originalApp = e.app;
  const superuser = e.hasSuperuserAuth();
  if (!e.auth) throw new ForbiddenError("Authentication required.");
  const manager = superuser || ["admin", "supervisor"].includes(e.auth.getString("role"));
  const uid = e.auth.id, incoming = e.record;
  const body = info.body || {};
  try {
    originalApp.runInTransaction((app) => {
      e.app = app;
      const before = creating ? new Record(incoming.collection()) : app.findRecordById("completion_records", incoming.id);
      const record = creating ? incoming : before.fresh();
      // Use only explicitly submitted fields, on a freshly read DB record.
      // Reject modifiers/unknown fields instead of permitting a parallel bypass.
      const allowed = ["id", "project", "schedule_record", "note", ...stages.flat(), ...derived,
        "snags_cleared", "snags_cleared_at", "completed_by", "completion_dates", "frame_done", "door_done", "ironmongery_done", "snags_done", "complete"];
      for (const key of Object.keys(body)) {
        if (!allowed.includes(key)) throw new BadRequestError("Unsupported completion field: " + key);
        if (key !== "id") record.set(key, incoming.get(key));
      }
      if (!creating && (record.getString("project") !== before.getString("project") || record.getString("schedule_record") !== before.getString("schedule_record")))
        throw new ForbiddenError("Completion relationships cannot be changed.");
      const project = record.getString("project"), door = record.getString("schedule_record");
      const schedule = app.findRecordById("schedule_records", door);
      if (schedule.getString("project") !== project) throw new ForbiddenError("Door/project mismatch.");
      // Recheck collection membership against the latest record inside the transaction.
      if (!manager && !app.findRecordsByFilter("project_members", "project = {:project} && user = {:uid}", "", 1, 0, {project, uid}).length)
        throw new ForbiddenError("Project membership required.");
      if (creating && app.findRecordsByFilter("completion_records", "project = {:project} && schedule_record = {:door}", "", 1, 0, {project, door}).length)
        throw new BadRequestError("A completion already exists for this door. Refresh and retry.");
      for (const [flag, date, owner] of stages) {
        const changed = creating ? (record.getBool(flag) || !!record.getString(date) || !!record.getString(owner)) :
          [flag, date, owner].some(k => !equal(record.get(k), before.get(k)));
        if (!changed) continue;
        if (!manager && before.getBool(flag) && before.getString(owner) !== uid)
          throw new ForbiddenError("Only the completing user can change this stage.");
        // Never allow owner forgery, including an owner-only change on an incomplete stage.
        if (!manager && record.getString(owner) && record.getString(owner) !== uid)
          throw new ForbiddenError("Cannot assign another user as completer.");
        if (!record.getBool(flag)) {
          if (!manager && !before.getBool(flag) && (record.getString(owner) || record.getString(date)))
            throw new ForbiddenError("An incomplete stage cannot have completion metadata.");
          record.set(owner, ""); record.set(date, "");
        } else {
          // Preserve an existing owner's identity on manager corrections. New
          // completions always derive their owner from the authenticated actor.
          record.set(owner, before.getBool(flag) ? (manager ? record.getString(owner) : uid) : (superuser ? record.getString(owner) : uid));
          if (!record.getString(date)) record.set(date, new Date().toISOString());
        }
      }
      if (!manager) {
        for (const key of ["completed_by", "completion_dates", "frame_done", "door_done", "ironmongery_done", "snags_done", "complete", "snags_cleared", "snags_cleared_at"]) {
          if (!equal(record.get(key), before.get(key))) throw new ForbiddenError("Legacy completion fields are read-only.");
        }
      }
      // Derived/reporting fields cannot be forged independently of the stages.
      for (const [flag, date, value] of [
        ["installation_complete", "installation_complete_at", record.getBool("frame_fitted") && record.getBool("door_hung")],
        ["ironmongery_snag_complete", "ironmongery_snag_complete_at", record.getBool("ironmongery_fitted")],
        ["fully_complete", "fully_complete_at", record.getBool("frame_fitted") && record.getBool("door_hung") && record.getBool("ironmongery_fitted")]
      ]) {
        record.set(flag, value);
        record.set(date, value ? (before.getString(date) || new Date().toISOString()) : "");
      }
      e.record = record;
      e.next();
    });
  } finally { e.app = originalApp; }
};
