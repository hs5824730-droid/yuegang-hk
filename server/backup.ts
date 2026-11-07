import { backup } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { db } from './db.js';

const folder = path.resolve('data/backups');
mkdirSync(folder, { recursive: true });
const destination = path.join(folder, `platform-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
await backup(db, destination);
console.log('数据库备份已保存到：' + destination);
console.log('图片文件需另行备份 uploads 目录；凭证 .env.local 请独立保管。');
