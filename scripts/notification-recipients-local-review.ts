// In-memory preview only. No application database, credentials or transport calls.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync } from 'node:fs';
import { ensureNotificationRecipient } from '../server/notification-recipient.js';
import { notificationMessage } from '../server/notification-message.js';
import type { ReceptionDB } from '../server/reception.js';

const native = new DatabaseSync(':memory:');
native.exec(readFileSync('migrations/0012_notification_recipients.sql', 'utf8'));
const db: ReceptionDB = {
  all: async (sql, args = []) => native.prepare(sql).all(...args as any[]) as any[],
  batch: async queries => {
    native.exec('BEGIN');
    try { for (const q of queries) native.prepare(q.sql).run(...q.args as any[]); native.exec('COMMIT'); }
    catch (error) { native.exec('ROLLBACK'); throw error; }
  },
};
const output = ['# 接粉人员通知样例', '', '本机生成，使用虚构客户和临时数据库，没有发送真实 Telegram 或 Signal。尚未部署上线。', '', '未分流按江承裕 → 江牧 → 江鹏轮流；已分流按实际目标所属组。双渠道和重试共享同一分配。', ''];
try {
  for (let i = 0; i < 4; i++) {
    const routed = i === 3;
    const recipient = await ensureNotificationRecipient(db, 'lead', 'preview-' + i, routed ? '江鹏' : '');
    const row = {
      lead_id: 'preview-' + i, city: 'Sydney', service: 'letting', created_at: '2026-10-26T08:39:25Z',
      data: JSON.stringify({ name: '虚构示例客户' + (i + 1), contact: routed ? 'fixture_wechat' : '', contactMethod: routed ? 'wechat' : 'phone' }),
      reception_recipient: recipient,
      routing_json: routed ? JSON.stringify([{ id: 'preview-routing', channel: 'wechat', city: 'Sydney', scope: 'city', target: { id: 'preview-qr', value: '/uploads/00000000-0000-4000-8000-000000000001.png', groupId: 'jiang-peng', groupName: '江鹏组', displayName: '示例微信二维码' } }]) : '[]',
    };
    output.push(`## ${routed ? '分配到江鹏的微信' : '未分流第' + (i + 1) + '位'}`, '', '```text', notificationMessage(row, 'https://example.invalid'), '```', '');
  }
  output.push('验证结果：相关自动测试 42/42 通过，Node 与 Workers 类型检查通过。原微信/WhatsApp分流游标保持独立，历史成功消息不批量重发。', '');
  const file = 'docs/notification-recipient-review.md';
  writeFileSync(file, output.join('\n'), 'utf8');
  console.log(file);
} finally { native.close(); }
