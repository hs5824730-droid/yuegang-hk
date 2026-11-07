import { z } from 'zod';
import { cities, tourHosts } from './policy.js';
import { findAdvisor, isContact, isPhone, normalizeService, type Service } from '../src/enquiry-options.js';

export const bilingual = z.object({ zh: z.string().max(12000), en: z.string().max(12000) });
const media = z.string().max(2000).refine(value => !value || /^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(value) || (() => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
})(), 'Use a secure image URL or an uploaded image');
const tour = z.string().max(2000).refine(value => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port && tourHosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host)); }
  catch { return false; }
}, 'Unsupported 3D tour provider');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Invalid date');
export const propertySchema = z.object({
  title: bilingual.refine(value => value.zh.trim() || value.en.trim(), 'Title required'),
  description: bilingual,
  address: z.string().trim().min(3).max(300), city: z.enum(cities),
  suburb: z.string().max(120), postcode: z.string().regex(/^\d{4}$/),
  type: z.enum(['house', 'apartment', 'townhouse', 'land']),
  status: z.enum(['sale', 'rent', 'sold', 'leased']),
  price: z.number().min(0).max(1e11).nullable(), priceLabel: bilingual,
  beds: z.number().int().min(0).max(100), baths: z.number().int().min(0).max(100), cars: z.number().int().min(0).max(100),
  area: z.number().min(0).max(1e9).nullable(), images: z.array(media).max(50), floorplan: media,
  tourUrl: tour, tourKind: z.enum(['none', 'real', 'illustration']), published: z.boolean(),
  events: z.array(z.object({ id: z.string().max(100).optional(), date,
    type: z.enum(['listed', 'price_changed', 'sold', 'leased']), price: z.number().min(0).max(1e11).nullable(), note: bilingual,
  })).max(200),
}).refine(value => value.tourKind === 'none' ? !value.tourUrl : Boolean(value.tourUrl), 'Tour type and URL must match');

export function isPhoneNumber(value: string) {
  return isPhone(value);
}

export const leadSchema = z.object({
  name: z.string().trim().min(1).max(100),
  contact: z.string().trim().min(1).max(160),
  city: z.string().trim().min(1).max(80).regex(/^[^\x00-\x1f\x7f]+$/),
  service: z.string().refine(value => Boolean(normalizeService(value)), 'Unknown service').transform(value => normalizeService(value) as Service),
  language: z.enum(['zh', 'en']), message: z.string().trim().max(4000).default(''),
  propertyId: z.string().max(100).optional(), propertyAddress: z.string().trim().max(300).default(''),
  // Not asked on the public form any more; omitted means unknown (null) and is confirmed by an assistant.
  currentlyManaged: z.boolean().nullable().optional().transform(value => value ?? null),
  // A checked box used to send true. The .com callback form no longer asks; a missing value is an implied agreement and stays distinct from an explicit true.
  consent: z.union([z.literal(true), z.literal('implied')]).default('implied'),
  website: z.string().max(200).optional(),
  requestId: z.uuid().default(() => crypto.randomUUID()),
  // Optional additions stay absent for old clients: existing request hashes remain valid.
  contactMethod: z.enum(['phone', 'whatsapp', 'wechat', 'email']).optional(),
  salutation: z.enum(['mr', 'ms']).optional(),
  propertyType: z.enum(['house', 'apartment', 'townhouse', 'other']).optional(),
  bedrooms: z.number().int().min(0).max(20).optional(), offerInterest: z.boolean().optional(),
  needSummary: z.string().trim().max(1000).optional(),
  startTime: z.enum(['asap', '1-3-months', 'later']).optional(),
  budgetRange: z.string().trim().max(160).optional(), saleTime: z.string().trim().max(160).optional(),
  preferredAdvisorId: z.string().max(80).refine(value => Boolean(findAdvisor(value)), 'Unknown preferred advisor').optional(),
  listingId: z.string().regex(/^reference-\d{5,12}$/).optional(),
}).superRefine((input, ctx) => {
  if (!isContact(input.contact, input.contactMethod)) ctx.addIssue({ code: 'custom', path: ['contact'], message: 'Enter a valid phone, WhatsApp, WeChat ID or email for the selected method' });
  if (input.listingId && input.propertyId) ctx.addIssue({ code: 'custom', path: ['listingId'], message: 'Choose either an internal sample or a published property' });
});
export const userSchema = z.object({
  name: z.string().trim().min(1).max(100), email: z.email().max(160).transform(value => value.toLowerCase()),
  password: z.string().min(12).max(128), role: z.enum(['admin', 'manager', 'assistant', 'mail']), city: z.enum(cities).nullable().optional(),
}).refine(value => value.role === 'admin' || value.role === 'mail' || value.city, 'A city is required for city team members')
 .refine(value=>value.role!=='mail'||['chengyu@eucove.com','jiangmu@eucove.com','jiangpeng@eucove.com'].includes(value.email),'邮件接待账号须使用已开通的员工邮箱');
export const leadPatch = z.object({
  status: z.enum(['new', 'contacted', 'following', 'completed', 'closed']).optional(),
  assignedTo: z.string().max(100).nullable().optional(), notes: z.string().max(12000).optional(),
  nextFollowUp: z.string().max(40).refine(value => !value || Number.isFinite(Date.parse(value)), 'Invalid follow-up date').nullable().transform(value => value ?? '').optional(),
  commissionOrdinal: z.number().int().min(1).max(10000).nullable().optional(),
  movingStatus: z.enum(['none', 'requested', 'scheduled', 'completed']).optional(),
}).strict();
export type PropertyInput = z.infer<typeof propertySchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type User = { id: string; name: string; email: string; role: 'admin' | 'manager' | 'assistant' | 'mail'; city: string | null };
