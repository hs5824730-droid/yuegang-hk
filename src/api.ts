import type { ReceptionAssignment, ReceptionReport, ReceptionTarget, ReceptionChannel } from './reception-types';
export type Lang = 'zh' | 'en';
export type Bi = { zh: string; en: string };

export type PropertyType = 'house' | 'apartment' | 'townhouse' | 'land';
export type PropertyStatus = 'sale' | 'rent' | 'sold' | 'leased';
export type TourKind = 'none' | 'real' | 'illustration';
export type EventType = 'listed' | 'price_changed' | 'sold' | 'leased';

export interface PropertyEvent {
  id?: string;
  date: string;
  type: EventType;
  price: number | null;
  note: Bi;
}

export interface PropertyInput {
  title: Bi;
  description: Bi;
  address: string;
  city: string;
  suburb: string;
  postcode: string;
  type: PropertyType;
  status: PropertyStatus;
  price: number | null;
  priceLabel: Bi;
  beds: number;
  baths: number;
  cars: number;
  area: number | null;
  images: string[];
  floorplan: string;
  tourUrl: string;
  tourKind: TourKind;
  published: boolean;
  events: PropertyEvent[];
}

export interface Property extends PropertyInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

import type { EnquiryDetails, Service } from './enquiry-options';
export type { Service } from './enquiry-options';
export type LeadStatus = 'new' | 'contacted' | 'following' | 'completed' | 'closed';
export type MovingStatus = 'none' | 'requested' | 'scheduled' | 'completed';
export type Role = 'admin' | 'manager' | 'assistant' | 'mail';

export interface Lead extends EnquiryDetails {
  receptionRecipient?:string;
  routing?:import('./reception-types').LeadRouting;
  /** A missing row predates Signal activation; never backfill historical notifications. */
  signalNotification?: { status:'pending'|'sent'|'failed'|'uncertain';syncStatus:'pending'|'synced'|'failed'|'uncertain';attempts:number;revision:number;deliveredRevision:number;editAttempts:number;receipt:number|null;sentAt:string|null;error:string }|null;
  id: string;
  name: string;
  contact: string;
  city: string;
  service: Service;
  language: Lang;
  message: string | null;
  propertyId: string | null;
  propertyAddress: string | null;
  status: LeadStatus;
  assignedTo: string | null;
  createdAt: string;
  notes: string | null;
  nextFollowUp: string | null;
  notificationStatus: string;
  notificationSyncStatus?:string;
  commissionOrdinal: number | null;
  movingStatus: MovingStatus;
  /** null or missing = not asked yet, to be confirmed by an assistant */
  currentlyManaged?: boolean | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  city: string | null;
}

export interface Config {
  brand: Bi;
  whatsappNumber: string;
  telegramConfigured: boolean;
  cities: string[];
  promotion: { endMonth: string };
}

export interface Stats {
  totalLeads: number;
  newLeads: number;
  activeProperties: number;
  pendingNotifications: number;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function req<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(url, { credentials: 'same-origin', ...init, headers: { ...headers, ...(init.headers as object) } });
  } catch {
    throw new ApiError('network', 0);
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) throw new ApiError(data?.error || `HTTP ${res.status}`, res.status);
  return data as T;
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export interface LeadInput extends EnquiryDetails {
  name: string;
  contact: string;
  city: string;
  service: Service;
  language: Lang;
  message?: string;
  propertyId?: string;
  propertyAddress?: string;
  /** not asked on the public form; omitted = to be confirmed */
  currentlyManaged?: boolean | null;
  consent: true;
  website: string;
  requestId: string;
}

export interface PropertyQuery {
  city?: string;
  status?: string;
  type?: string;
  q?: string;
  minPrice?: string;
  maxPrice?: string;
  beds?: string;
}

const qs = (o: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  customerRegistration:(body:unknown)=>req<{created:boolean;receipt:{id:string;createdAt:string};city:string|null}>('/api/customer-registrations',json('POST',body)),
  customerRegistrations:()=>req<{records:import('./customer-registration').CustomerRegistrationRecord[]}>('/api/admin/customer-registrations'),
  customerRegistrationPatch:(id:string,body:unknown)=>req<{record:import('./customer-registration').CustomerRegistrationRecord}>('/api/admin/customer-registrations/'+id,json('PATCH',body)),
  customerRegistrationRetry:(id:string)=>req<{record:import('./customer-registration').CustomerRegistrationRecord}>('/api/admin/customer-registrations/'+id+'/retry',json('POST',{})),
  rentalRegistration:(body:unknown)=>req<{created:boolean;receipt:{id:string;createdAt:string}}>('/api/rental-registrations',json('POST',body)),
  registrations:()=>req<{records:import('./rental-registration').RentalRegistrationRecord[];sheetsConfigured:boolean;sheetsEnabled:boolean;sheetUrl?:string;google?:{clientConfigured:boolean;connected:boolean;enabled:boolean;connectedAt:string|null;startUrl:string}}>('/api/admin/rental-registrations'),
  registrationPatch:(id:string,body:unknown)=>req<{record:import('./rental-registration').RentalRegistrationRecord}>('/api/admin/rental-registrations/'+id,json('PATCH',body)),
  registrationRetry:(id:string)=>req<{queued:boolean}>('/api/admin/rental-registrations/'+id+'/retry',json('POST',{})),
  mailList:()=>req<{threads:import('./mail-types').MailThread[];configured:boolean;enabled:boolean;sendEnabled:boolean;sync:{checked_at:number;last_error:string}|null}>('/api/admin/mail'),
  mailDetail:(id:string)=>req<import('./mail-types').MailDetail>('/api/admin/mail/'+encodeURIComponent(id)),
  mailDraft:(id:string,content:string)=>req<{saved:boolean}>('/api/admin/mail/'+encodeURIComponent(id)+'/draft',json('PUT',{content})),
  mailReply:(id:string,body:{requestId:string;version:number;content:string})=>req<{reply:import('./mail-types').MailReply}>('/api/admin/mail/'+encodeURIComponent(id)+'/reply',json('POST',body)),
  mailResolve:(id:string,status:'sent'|'rejected')=>req<{resolved:boolean}>('/api/admin/mail/replies/'+encodeURIComponent(id)+'/resolve',json('POST',{status,checkedInZoho:true})),
  receptionAssign: (requestId:string,channel:ReceptionChannel,leadRequestId?:string,city?:string,service?:string,language?:'zh'|'en',direct?:{source:'website_direct';pagePath:string;contactMethod?:'phone'|'wechat'|'whatsapp'}) => req<ReceptionAssignment>('/api/reception/assign',json('POST',{requestId,channel,leadRequestId,city,service,language,...direct})),
  receptionEvent: (assignmentId:string,channel:ReceptionChannel,type:'whatsapp_click'|'wechat_qr_view'|'phone_dial',requestId:string) => req<{ok:boolean}>('/api/reception/events',json('POST',{assignmentId,channel,type,requestId})),
  whatsappPrefill:()=>req<import('./whatsapp-prefill').WhatsappPrefillConfig>('/api/admin/reception/whatsapp-prefill'),
  saveWhatsappPrefill:(b:{zh:string;en:string;expectedVersion:number})=>req<import('./whatsapp-prefill').WhatsappPrefillConfig>('/api/admin/reception/whatsapp-prefill',json('PUT',b)),
  receptionReport: () => req<ReceptionReport>('/api/admin/reception'),
  saveReception: (targets:ReceptionTarget[]) => req<{ok:boolean}>('/api/admin/reception',json('PUT',{targets})),
  config: () => req<Config>('/api/config'),
  properties: (q: PropertyQuery = {}) => req<{ properties: Property[] }>('/api/properties' + qs(q as Record<string, string>)),
  property: (id: string) => req<{ property: Property }>(`/api/properties/${encodeURIComponent(id)}`),
  createLead: (b: LeadInput) => req<{ id: string;city?:string }>('/api/leads', json('POST', b)),

  session: () => req<{ user: User | null }>('/api/admin/session'),
  login: (login: string, password: string) => req<{ user: User }>('/api/admin/login', json('POST', { login, password })),
  logout: () => req<{ ok: true }>('/api/admin/logout', json('POST', {})),
  stats: () => req<Stats>('/api/admin/stats'),
  leads: () => req<{ leads: Lead[] }>('/api/admin/leads'),
  patchLead: (id: string, b: Partial<Pick<Lead, 'status' | 'assignedTo' | 'notes' | 'nextFollowUp' | 'commissionOrdinal' | 'movingStatus'>>) =>
    req<{ lead: Lead }>(`/api/admin/leads/${id}`, json('PATCH', b)),
  users: () => req<{ users: User[] }>('/api/admin/users'),
  createUser: (b: { name: string; email: string; password: string; role: Role; city?: string }) =>
    req<{ user: User }>('/api/admin/users', json('POST', b)),
  adminProperties: () => req<{ properties: Property[] }>('/api/admin/properties'),
  createProperty: (b: PropertyInput) => req<{ property: Property }>('/api/admin/properties', json('POST', b)),
  updateProperty: (id: string, b: PropertyInput) => req<{ property: Property }>(`/api/admin/properties/${id}`, json('PUT', b)),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return req<{ url: string;originalFileName:string }>('/api/admin/uploads', { method: 'POST', body: fd });
  },
  retryNotifications: () => req<{ queued: number }>('/api/admin/notifications/retry', json('POST', {})),
};
