import type { ReceptionDB } from './reception.js';

export const TELEGRAM_DISPATCH_PATH = '/api/integrations/telegram-dispatch';
export const DISPATCH_STAFF = ['江承裕', '江牧', '江鹏'] as const;
type Source = 'lead' | 'direct' | 'mail' | 'registration';
const dispatchTable=(source:Source)=>source==='registration'?'registration_notifications':'manual_lead_dispatch';
type Telegram = { token: string; chatId: string };
export type DispatchSettings = Telegram & { webhookSecret?: string };
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

/** This predicate belongs in both candidate selection and the atomic send claim. */
export function dispatchReadySql(source: Source, sourceId: string) {
  return `NOT EXISTS(SELECT 1 FROM ${dispatchTable(source)} d WHERE d.source='${source}' AND d.source_id=${sourceId} AND d.selected_at IS NULL)`;
}
function dispatchText(text: string, recipient: string) {
  return text.replace(/^接粉人员：.*$/m, `接粉人员：${recipient ? recipient + '（' + recipient + '组）' : '待你选择'}`)
    .replace(/^接待组：.*$/m, `接待组：${recipient ? recipient + '组' : '待你选择'}`);
}
export async function dispatchPresentation(db: ReceptionDB, source: Source, sourceId: string, text: string) {
  const [dispatch] = await db.all(`SELECT * FROM ${dispatchTable(source)} WHERE source=? AND source_id=?`, [source, sourceId]);
  if (!dispatch) return { text };
  await db.batch([{ sql: `UPDATE ${dispatchTable(source)} SET telegram_text=? WHERE id=?`, args: [text, dispatch.id] }]);
  return {
    text: dispatchText(text, dispatch.recipient),
    reply_markup: { inline_keyboard: dispatch.selected_at ? [] : [DISPATCH_STAFF.map((name, index) => ({ text: name, callback_data: `assign:${dispatch.id}:${index}` }))] },
  };
}
export async function recordDispatchTelegram(db: ReceptionDB, source: Source, sourceId: string, messageId: number | null) {
  if (messageId === null) return;
  await db.batch([{ sql: `UPDATE ${dispatchTable(source)} SET telegram_message_id=?,telegram_dirty=CASE WHEN selected_at IS NOT NULL THEN 1 ELSE telegram_dirty END WHERE source=? AND source_id=?`, args: [messageId, source, sourceId] }]);
}
async function telegramCall(settings: Telegram, method: string, body: unknown) {
  const response = await fetch(`https://api.telegram.org/bot${settings.token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(12000),
  });
  const result = await response.json() as { ok?: boolean; error_code?: number; description?: string };
  return response.ok && result.ok === true || method === 'editMessageText' && result.error_code === 400 && Boolean(result.description?.includes('message is not modified'));
}
/** Retried independently of Signal; a Telegram edit failure must never erase the selection. */
export async function syncDispatchTelegram(db: ReceptionDB, settings: Telegram, limit = 5) {
  for(const table of ['manual_lead_dispatch','registration_notifications']) {
  const rows = await db.all(`SELECT * FROM ${table} WHERE telegram_dirty=1 AND telegram_message_id IS NOT NULL AND telegram_text<>? AND telegram_next_attempt<=? ORDER BY created_at LIMIT ?`, ['', Date.now(), limit]);
  for (const row of rows) {
    let ok = false;
    try { ok = await telegramCall(settings, 'editMessageText', { chat_id: settings.chatId, message_id: row.telegram_message_id, text: dispatchText(row.telegram_text, row.recipient), reply_markup: { inline_keyboard: [] }, link_preview_options: { is_disabled: true } }); } catch { /* No token URLs or remote text in logs. */ }
    await db.batch([{ sql: `UPDATE ${table} SET telegram_dirty=?,telegram_next_attempt=? WHERE id=? AND telegram_text=? AND recipient=? AND telegram_message_id=?`, args: [ok ? 0 : 1, Date.now() + 60000, row.id, row.telegram_text, row.recipient, row.telegram_message_id] }]);
  }
  }
}
async function secretEqual(actual: string, expected: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', crypto.getRandomValues(new Uint8Array(32)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return crypto.subtle.verify('HMAC', key, await crypto.subtle.sign('HMAC', key, encoder.encode(expected)), encoder.encode(actual));
}
async function readUpdate(request: Request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw Error('body');
  const reader = request.body?.getReader(); if (!reader) throw Error('body');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length; if (length > 65536) { await reader.cancel(); throw Error('body'); } chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
/** Only the owner of the existing private Telegram chat may choose. First choice wins. */
export async function telegramDispatch(request: Request, db: ReceptionDB, settings: DispatchSettings) {
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  if (!settings.token || !/^[1-9]\d*$/.test(settings.chatId) || !settings.webhookSecret || settings.webhookSecret.length < 32) return reply({ error: '分配入口尚未启用' }, 503);
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
  if (secret.length > 256 || !await secretEqual(secret, settings.webhookSecret)) return reply({ error: '验证失败' }, 401);
  let update;
  try { update = await readUpdate(request); } catch { return reply({ error: '请求格式无效' }, 400); }
  const callback = update?.callback_query;
  if (!callback || typeof callback !== 'object') return reply({ ok: true });
  const match = typeof callback.data === 'string' && callback.data.match(/^assign:([a-f0-9]{32}):([0-2])$/);
  const message = callback.message;
  if (!match || String(callback.from?.id) !== settings.chatId || String(message?.chat?.id) !== settings.chatId || message?.chat?.type !== 'private' || !Number.isSafeInteger(message.message_id) || typeof callback.id !== 'string' || callback.id.length > 200) return reply({ ok: true });
  let table='manual_lead_dispatch';
  let [row] = await db.all('SELECT * FROM manual_lead_dispatch WHERE id=?', [match[1]]);
  if(!row){table='registration_notifications';[row]=await db.all('SELECT * FROM registration_notifications WHERE id=?',[match[1]]);}
  if (!row || row.telegram_message_id !== null && Number(row.telegram_message_id) !== message.message_id) return reply({ ok: true });
  const recipient=DISPATCH_STAFF[Number(match[2])];
  const needsOwner=table==='registration_notifications'||row.source==='lead'||row.source==='direct';
  if(!row.selected_at&&needsOwner){
    const users=await db.all('SELECT id FROM users WHERE name=?',[recipient]);
    if(users.length!==1){
      try{await telegramCall(settings,'answerCallbackQuery',{callback_query_id:callback.id,text:'该人员尚未唯一绑定后台账号，请先核对团队账号。'});}catch{}
      return reply({ok:true});
    }
  }
  await db.batch([{
    sql: `UPDATE ${table} SET recipient=?,selected_at=?,selected_by=?,telegram_message_id=COALESCE(telegram_message_id,?),telegram_dirty=1,telegram_next_attempt=0 WHERE id=? AND selected_at IS NULL AND (?=0 OR (SELECT COUNT(*) FROM users WHERE name=?)=1)`,
    args: [recipient, new Date().toISOString(), String(callback.from.id), message.message_id, row.id,Number(needsOwner),recipient],
  }]);
  const [saved] = await db.all(`SELECT recipient FROM ${table} WHERE id=?`, [row.id]);
  try { await telegramCall(settings, 'answerCallbackQuery', { callback_query_id: callback.id, text: saved.recipient?`已分配给${saved.recipient}，Signal通知已排队`:'后台账号已变化，请核对后重试。' }); } catch { /* Durable selection is already committed. */ }
  return reply({ ok: true });
}
