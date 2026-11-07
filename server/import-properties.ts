import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { propertySchema } from './schema.js';
import { db, transaction } from './db.js';

const filename = process.argv[2];
if (!filename) { console.error('用法：npm run data:import -- 房源资料.json'); process.exitCode = 1; }
else {
  try {
    const records = z.array(propertySchema).max(10000).parse(JSON.parse(readFileSync(filename, 'utf8').replace(/^\uFEFF/, '')));
    // An entire batch validates before any changes; every import starts as a draft for human review.
    transaction(() => {
      const now = new Date().toISOString();
      const insert = db.prepare('INSERT INTO properties(id,city,published,data,created_at,updated_at) VALUES(?,?,?,?,?,?)');
      for (const record of records) {
        const draft = { ...record, published: false };
        insert.run(randomUUID(), draft.city, 0, JSON.stringify(draft), now, now);
      }
    });
    console.log(`已导入 ${records.length} 套房源为草稿，请在后台核对后发布。重复导入会创建新草稿。`);
  } catch (error) {
    console.error(error instanceof z.ZodError ? JSON.stringify(error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))) : '导入失败，请检查文件路径及 JSON 格式。');
    process.exitCode = 1;
  }
}
