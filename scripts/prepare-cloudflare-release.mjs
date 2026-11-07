// Local-only release preparation. Does not contact Cloudflare or print secrets.
import { DatabaseSync, backup } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';

const release = path.resolve('data/deployment-private/release-2026-10-23');
mkdirSync(release, { recursive: true });
const writeNew = (name, text) => writeFileSync(path.join(release, name), text, { flag: 'wx', mode: 0o600 });
const db = new DatabaseSync(path.resolve('data/platform.sqlite'), { readOnly: true });
try {
  if (existsSync(path.join(release, 'reception-only.sql'))) throw new Error('Release already prepared; review and reuse it rather than regenerate credentials.');
  await backup(db, path.join(release, 'local-before-release.sqlite'));
  const tables = ['users','properties','owners','leads','notifications','reception_targets','reception_channel_cursor','reception_channel_assignments','reception_channel_events'];
  const localCounts = Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count]));
  const targets = db.prepare('SELECT * FROM reception_targets ORDER BY position,id').all();
  const cursors = db.prepare('SELECT channel,ordinal FROM reception_channel_cursor ORDER BY channel').all();
  const channelCounts = Object.fromEntries(['whatsapp','wechat'].map(channel => [channel, targets.filter(row=>row.channel===channel).length]));
  if (channelCounts.whatsapp !== 7 || channelCounts.wechat !== 6) throw new Error('Reception target count changed; review current configuration.');
  const quote = value => typeof value === 'number' ? String(value) : "'" + String(value).replaceAll("'", "''") + "'";
  const statements = ['-- Only import into the NEW EMPTY production D1 after schema migrations.', '-- No users, leads, customers, sessions, notifications, routing visits or events are imported.'];
  const media = [];
  for (const row of targets) {
    const data = JSON.parse(row.data);
    if (data.channel !== row.channel || data.id !== row.id) throw new Error('Reception identity mismatch.');
    if (data.channel === 'wechat') {
      if (!/^\/uploads\/[a-f0-9-]{36}\.png$/.test(data.value)) throw new Error('Unexpected QR path.');
      const file = path.resolve('uploads', data.value.slice(9));
      const bytes = readFileSync(file);
      media.push({ id:row.id, url:data.value, filename:path.basename(file), bytes:bytes.length, sha256:createHash('sha256').update(bytes).digest('hex') });
    }
    // Preserve actual persisted position and original JSON (including optional queueOrder).
    statements.push(`INSERT INTO reception_targets(id,channel,position,enabled,data) VALUES(${[row.id,row.channel,row.position,row.enabled,row.data].map(quote).join(',')});`);
  }
  for (const row of cursors) statements.push(`UPDATE reception_channel_cursor SET ordinal=${Number(row.ordinal)} WHERE channel=${quote(row.channel)};`);
  writeNew('reception-only.sql', statements.join('\n')+'\n');
  writeNew('reception-source-snapshot.json', JSON.stringify({targets,cursors},null,2)+'\n');
  writeNew('reception-media.json', JSON.stringify(media,null,2)+'\n');
  writeNew('production-secrets.json', JSON.stringify({SESSION_SECRET:randomBytes(48).toString('base64url'),ADMIN_EMAIL:'hs5824730@gmail.com',ADMIN_PASSWORD:randomBytes(27).toString('base64url')},null,2)+'\n');
  writeNew('preparation-summary.json',JSON.stringify({preparedAt:new Date().toISOString(),targetAccount:'b65685ed0ee606d73747149aff303600',targetZone:'1ab5538aa9a868d6268d4accc4875288',databaseId:'f5f5b5d7-f6d0-4fd7-8aaf-0c58ece47204',localCounts,channelCounts,cursors,excluded:['all local users/passwords/sessions','all local customers/leads/notifications/audit','all local routing assignments/events','all private third-party listing/3D media'],note:'Two local enquiries remain only in the local snapshot; neither imported nor deleted. Production admin credentials are newly random and private.'},null,2)+'\n');
  console.log(JSON.stringify({release,localCounts,channelCounts,cursors,qrFiles:media.length,secrets:'Generated new private production credentials; values not logged.'}));
} finally { db.close(); }
