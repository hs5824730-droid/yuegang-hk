import { readFileSync,readdirSync } from 'node:fs';
// D1 prepare supports one complete trigger, not a naive semicolon split of its body.
export async function applyTestMigrations(db:{prepare:(sql:string)=>{run:()=>Promise<unknown>}}){
 for(const name of readdirSync('migrations').filter(n=>n.endsWith('.sql')).sort()){
  const source=readFileSync('migrations/'+name,'utf8').replace(/^--.*$/gm,'');
  const triggers=source.match(/CREATE TRIGGER[\s\S]*?END;/g)||[];
  const statements=source.replace(/CREATE TRIGGER[\s\S]*?END;/g,'').split(';').filter(s=>s.trim());
  for(const sql of [...statements,...triggers])await db.prepare(sql).run();
 }
}
