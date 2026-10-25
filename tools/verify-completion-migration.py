"""Read-only backup/schema/history verifier for the approved live migration."""
import json,sqlite3,sys
mode,path,snapshot=sys.argv[1:]
c=sqlite3.connect('file:'+path.replace('\\','/')+'?mode=ro',uri=True);c.row_factory=sqlite3.Row
assert c.execute('pragma integrity_check').fetchone()[0]=='ok'
names=['frame_completed_by','door_completed_by','ironmongery_completed_by']
rows=[dict(r) for r in c.execute('select * from completion_records order by id')]
schema=dict(c.execute("select * from _collections where name='completion_records'").fetchone())
if mode=='before':
 assert len(rows)==21, 'Production count changed; review before deploying'
 assert not any(n in rows[0] for n in names), 'Already migrated; review before deploying'
 json.dump({'rows':rows,'collection':schema},open(snapshot,'w'),indent=2)
 print('PASS: full backup integrity, 21 records; pre-migration snapshot captured')
else:
 before=json.load(open(snapshot)); original=before['rows']
 assert [{k:v for k,v in r.items() if k not in names} for r in rows]==original, 'Historical completion data changed'
 assert all(not r[n] for r in rows for n in names), 'Historical owners must remain blank'
 oldfields=json.loads(before['collection']['fields']);fields=json.loads(schema['fields'])
 assert [f for f in fields if f['name'] not in names]==oldfields, 'Existing schema changed'
 assert sorted(f['name'] for f in fields if f['name'] in names)==sorted(names)
 for k,v in before['collection'].items():
  if k not in ['fields','updated']:assert schema[k]==v, 'Unexpected collection/rule change: '+k
 print('PASS: exactly three fields added; all 21 records, historical values, API rules and existing schema unchanged')
