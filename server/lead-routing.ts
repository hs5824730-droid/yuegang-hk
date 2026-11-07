import { whatsappDestination } from '../src/whatsapp-prefill.js';
import type { LeadRouting, LeadRoutingAssignment } from '../src/reception-types.js';

// Correlated to the authenticated lead query, never recomputed from today's target configuration.
export const routingSelect = `(SELECT json_group_array(json_object('id',a.id,'channel',a.channel,'city',a.routing_city,'scope',a.routing_scope,'outcome',a.outcome,'createdAt',a.created_at,'target',json(a.target_data),'wa',(SELECT COUNT(*) FROM reception_channel_events e WHERE e.assignment_id=a.id AND e.type='whatsapp_click'),'qr',(SELECT COUNT(*) FROM reception_channel_events e WHERE e.assignment_id=a.id AND e.type='wechat_qr_view'))) FROM reception_channel_assignments a WHERE a.lead_id=l.id AND a.id=(SELECT b.id FROM reception_channel_assignments b WHERE b.lead_id=l.id AND b.channel=a.channel ORDER BY b.created_at DESC,b.id DESC LIMIT 1)) AS routing_json`;

export function targetUrl(channel: string, value: string,prefillText='') {
  if (channel === 'whatsapp' && /^\+[1-9]\d{6,14}$/.test(value)) return whatsappDestination(value,prefillText);
  if (channel === 'wechat' && /^\/uploads\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(value)) return value;
  return null;
}
export function leadRouting(data: Record<string, unknown>, city: string, raw?: string | null): LeadRouting {
  const rows = JSON.parse(raw || '[]') as Record<string, any>[];
  const assignments: LeadRoutingAssignment[] = rows.map(row => {
    const url = row.target && targetUrl(row.channel, row.target.value,typeof row.target.prefillText==='string'?row.target.prefillText:'');
    return { id: row.id, channel: row.channel, city: row.city || city, scope: row.scope,
      outcome: url ? 'assigned' : row.scope === 'city' ? 'no_city_match' : 'unconfigured', assignedAt: row.createdAt,
      target: url ? { id: row.target.id, value: row.target.value, url, groupId: row.target.groupId, groupName: row.target.groupName, displayName:row.target.displayName,originalName:row.target.originalName,originalFileName:row.target.originalFileName,fileNameSource:row.target.fileNameSource,note:row.target.note,prefillText:row.target.prefillText,templateVersion:row.target.templateVersion } : null,
      whatsappOpenAttempted: Boolean(row.wa), wechatQrDisplayed: Boolean(row.qr) };
  });
  const selected = assignments.find(a => a.channel === data.contactMethod) || assignments.at(-1);
  // Historical phone enquiries could subsequently choose a channel. Persisted facts win.
  return { state: selected?.outcome || (data.contactMethod === 'phone' ? 'phone_callback' : ['whatsapp','wechat'].includes(String(data.contactMethod)) ? 'awaiting_assignment' : 'not_requested'), assignments };
}
