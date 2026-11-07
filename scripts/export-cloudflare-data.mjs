// Read-only local export. Does not authenticate, contact Cloudflare, or execute SQL remotely.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
const database = args[args.indexOf('--database') + 1];
const output = args[args.indexOf('--out') + 1];
if (!args.includes('--database') || !args.includes('--out') || !database || !output) {
  console.error('用法：node scripts/export-cloudflare-data.mjs --database <本地SQLite备份> --out data/cloudflare-import.sql'); process.exit(1);
}
const target = path.resolve(output);
if (existsSync(target) || existsSync(target + '.media.json')) throw new Error('输出文件已存在，请使用新的路径；不会覆盖备份');
const db = new DatabaseSync(path.resolve(database), { readOnly: true });
const tables = ['users', 'properties', 'owners', 'leads', 'customer_registrations', 'customer_registration_sync', 'notifications', 'audit', 'reception_settings', 'reception_channel_assignments', 'reception_channel_events', 'reception_targets', 'reception_channel_cursor', 'reception_city_cursor', 'notification_recipients', 'mail_threads', 'mail_messages', 'mail_drafts', 'mail_replies', 'mail_notifications', 'mail_sync', 'notification_recipient_cursor'];
const quote = value => value === null ? 'NULL' : typeof value === 'number' ? String(value) : "'" + String(value).replaceAll("'", "''") + "'";
try {
  db.exec('BEGIN'); // Read snapshot only, never modifies the source.
  const statements = ['-- Sensitive application export. Import only into a NEW, EMPTY D1 after migrations.', '-- Sessions are intentionally excluded. All users must sign in again.'];
  const counts = {}; const media = new Set();
  // Assignments precede agents so the allocation trigger cannot advance during import.
  for (const table of tables) {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table)) continue;
    const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name).filter(name => name !== 'claim_token');
    const rows = db.prepare(`SELECT * FROM ${table}`).all(); counts[table] = rows.length;
    for (const row of rows) {
      if (table === 'notifications' || table === 'mail_notifications' || table === 'customer_registration_sync') row.claimed_until = 0;
      if (table === 'mail_sync') row.lease_until = 0;
      if (table === 'properties') {
        const data = JSON.parse(row.data);
        for (const url of [...(data.images || []), data.floorplan || '']) if (/^\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(url)) media.add(url.slice(9));
      }
      if (table === 'reception_targets' || table === 'reception_channel_assignments') {
        const data = JSON.parse((table === 'reception_targets' ? row.data : row.target_data) || 'null');
        if (data?.channel === 'wechat' && data.value && /^\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(data.value)) media.add(data.value.slice(9));
      }
      if (columns.some(key => typeof row[key] === 'string' && row[key].includes('\0'))) throw new Error('源数据含不支持的 NUL 字符，请单独核对');
      const sql = `INSERT ${table === 'customer_registration_sync' || table === 'reception_channel_cursor' || table === 'reception_city_cursor' || table === 'reception_settings' || table === 'notification_recipient_cursor' ? 'OR REPLACE ' : ''}INTO ${table}(${columns.join(',')}) VALUES(${columns.map(key => quote(row[key])).join(',')});`;
      if (Buffer.byteLength(sql) > 99000) throw new Error('单条记录过大，请使用 D1 参数绑定导入；未生成不完整文件');
      statements.push(sql);
    }
  }
  db.exec('COMMIT');
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, statements.join('\n') + '\n', { flag: 'wx', mode: 0o600 });
  writeFileSync(target + '.media.json', JSON.stringify({ counts, files: [...media], excluded: ['sessions', 'data/market-reference.json', 'data/viewing-source', 'data/viewing-video'], note: 'Only uploaded images referenced by application properties or reception QR codes. Review rights before upload.' }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log('已生成本地导出与上传图片清单；未连接 Cloudflare。此文件含客户资料和密码哈希，请按备份保护。');
} finally { db.close(); }
