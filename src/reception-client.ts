/** Direct hand-off uses the shared persisted assignment contract.
 * The saved lead is authoritative for city in both independent channels.
 * Empty target cities cover all; specific lists restrict matching. Retries reuse the request id.
 */
import type { ReceptionChannel } from './reception-types';
export type DirectContactMethod='phone'|'wechat'|'whatsapp';

export function receptionRequestId(provider:Crypto=globalThis.crypto){
 if(typeof provider.randomUUID==='function')return provider.randomUUID();
 const bytes=provider.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}

/** Created on a real tap only. Reload/retry in the same history visit reuses its allocation. */
export function directVisitRequestId(scope:string){
 const state=window.history.state||{},visits=state.directContactVisits||{};
 const previous=visits[scope];if(typeof previous==='string'&&/^[a-f0-9-]{36}$/i.test(previous))return previous;
 const id=receptionRequestId();
 try{window.history.replaceState({...state,directContactVisits:{...Object.fromEntries(Object.entries(visits).slice(-19)),[scope]:id}},'');}catch{/* The mounted button still retains its request for retries. */}
 return id;
}

export type AssignReason = 'no_target' | 'no_city_target';
export type DirectAssignment = import('./reception-types').ReceptionAssignment;

export async function assignForLead(requestId: string, channel: ReceptionChannel, leadRequestId: string, city: string): Promise<DirectAssignment> {
  const res = await fetch('/api/reception/assign', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, channel, leadRequestId, city }),
  });
  if (!res.ok) throw new Error('assign ' + res.status);
  return res.json();
}

/** Fire-and-forget event; keepalive lets it finish while the page navigates to WhatsApp. */
export function recordReceptionEvent(assignmentId: string, channel: ReceptionChannel, type: 'whatsapp_click' | 'wechat_qr_view' | 'phone_dial',requestId?:string) {
  try {
    void fetch('/api/reception/events', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId, channel, type, requestId:requestId||receptionRequestId() }),
    }).catch(() => {});
  } catch {
    /* never block the hand-off */
  }
}

/** A fixed E.164 telephone URL only. No extensions, USSD, query, recipient or scheme injection. */
export function telLink(value:string):string|null {return /^\+[1-9]\d{6,14}$/.test(value)?'tel:'+value:null;}
export function qrLink(value:string):string|null {return /^\/uploads\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(value)?value:null;}

/** Only an E.164-style number becomes a wa.me link; anything else is refused. */
export function waLink(value: string,assignedUrl?:string): string | null {
  const digits = value.replace(/^\+/, '');
  if(!/^[1-9]\d{6,14}$/.test(digits))return null;
  const base=`https://wa.me/${digits}`;if(!assignedUrl)return base;
  try{const url=new URL(assignedUrl);if(url.origin!=='https://wa.me'||url.username||url.password||url.hash||url.pathname!=='/'+digits||[...url.searchParams.keys()].some(k=>k!=='text')||url.searchParams.getAll('text').length>1)return null;return assignedUrl;}catch{return null;}
}

/** Navigation is isolated so tests can intercept it. */
export function goTo(url: string) {
  window.location.assign(url);
}
