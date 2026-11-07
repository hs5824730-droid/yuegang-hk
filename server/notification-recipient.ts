import { isPhone } from '../src/enquiry-options.js';
import { leadRouting } from './lead-routing.js';
import type { ReceptionDB } from './reception.js';

export function notificationContactMethod(data: Record<string, any>, ownerContact?: string) {
  const contact = String(data.contact || ownerContact || '');
  return data.contactMethod || (contact.includes('@') ? 'email' : isPhone(contact) ? 'phone' : 'other');
}

/** The saved group owns the destination; a QR nickname or filename does not identify staff. */
export function recipientFromTarget(target?: { groupName?: string; groupId?: string } | null): string {
  const group = typeof target?.groupName === 'string' ? target.groupName.trim().replace(/\s*组$/, '').trim() : '';
  const knownGroups: Record<string, string> = { 'jiang-chengyu': '江承裕', 'jiang-mu': '江牧', 'jiang-peng': '江鹏' };
  return group || knownGroups[target?.groupId || ''] || '';
}

export function leadRoutedRecipient(row: { data: string; city: string; routing_json?: string; owner_contact?: string }) {
  const data = JSON.parse(row.data);
  const routing = leadRouting(data, row.city, row.routing_json);
  const method = notificationContactMethod(data, row.owner_contact);
  return recipientFromTarget((routing.assignments.find(item => item.channel === method) || routing.assignments.at(-1))?.target);
}

/** One fallback per enquiry/visit, shared by both transports and every retry. */
export async function ensureNotificationRecipient(db: ReceptionDB, source: 'lead' | 'direct', sourceId: string, routedRecipient: string) {
  const [saved]=await db.all('SELECT recipient FROM notification_recipients WHERE source=? AND source_id=?',[source,sourceId]);
  if(saved?.recipient)return String(saved.recipient);
  await db.batch([{
    sql: 'INSERT INTO notification_recipients(source,source_id,recipient) VALUES(?,?,?) ON CONFLICT(source,source_id) DO NOTHING',
    args: [source, sourceId, routedRecipient],
  }]);
  const [row] = await db.all('SELECT recipient FROM notification_recipients WHERE source=? AND source_id=?', [source, sourceId]);
  return String(row?.recipient||'');
}

export const recipientSelect="(SELECT recipient FROM notification_recipients r WHERE r.source='lead' AND r.source_id=l.id) AS reception_recipient";
export function notificationRecipientLabel(value:unknown){
 const name=typeof value==='string'?value.trim():'';
 return ['江承裕','江牧','江鹏'].includes(name)?`${name}（${name}组）`:name||'待分配';
}
