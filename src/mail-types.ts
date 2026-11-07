export const MAIL_ADDRESS = 'contact@eucove.com';
export const MAIL_STAFF = [
  { name: '江承裕', email: 'chengyu@eucove.com' },
  { name: '江牧', email: 'jiangmu@eucove.com' },
  { name: '江鹏', email: 'jiangpeng@eucove.com' },
] as const;
export interface MailThread { id:string; subject:string; sender_email:string; sender_name:string; recipient:string; updated_at:string; version:number; status:string; }
export interface MailMessage { id:string; sender_email:string; sender_name:string; subject:string; body:string; received_at:string; has_attachment:number; }
export interface MailReply { id:string; content:string; status:'sending'|'sent'|'rejected'|'uncertain'; created_at:string; actor_name:string; }
export interface MailDelivery { id:string; message_id:string; channel:'telegram'|'signal'; status:'pending'|'sending'|'sent'|'failed'|'uncertain'; attempts:number; last_error:string; receipt:string; sent_at:string|null; snapshot:string; }
export interface MailDetail { thread:MailThread; messages:MailMessage[]; replies:MailReply[]; draft:string; notifications?:MailDelivery[]; }
