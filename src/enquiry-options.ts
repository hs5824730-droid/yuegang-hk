/** Shared public vocabulary. Existing persisted service values remain canonical. */
export const SERVICES = {
  letting: { group: 'rental', zh: '出租招租', en: 'Letting' },
  management: { group: 'rental', zh: '长期托管', en: 'Ongoing management' },
  selling: { group: 'sales', zh: '卖房', en: 'Selling' },
  buying: { group: 'sales', zh: '买房', en: 'Buying' },
  renovation: { group: 'advisory', zh: '装修翻新', en: 'Renovation' },
  'house-care': { group: 'advisory', zh: '房屋打理', en: 'House care' },
  maintenance: { group: 'advisory', zh: '维修维护', en: 'Repairs & maintenance' },
  'buyer-advisory': { group: 'advisory', zh: '购房咨询', en: 'Buying advice' },
  other: { group: 'other', zh: '其他咨询', en: 'Other enquiries' },
  moving: { group: 'rental', zh: '搬家服务', en: 'Moving service' },
} as const;
export type Service = keyof typeof SERVICES;
export type PublicService = Exclude<Service, 'moving'>;
export type ServiceInput = Service | 'rent' | 'manage' | 'sell' | 'buy' | 'care';
export const SERVICE_GROUPS = {
  rental: { zh: '出租与托管', en: 'Letting & management' },
  sales: { zh: '买卖房屋', en: 'Buying & selling' },
  advisory: { zh: '置业顾问', en: 'Property services' },
  other: { zh: '其他咨询', en: 'Other enquiries' },
} as const;
export type ServiceGroup = keyof typeof SERVICE_GROUPS;
export const PUBLIC_SERVICES = Object.keys(SERVICES).filter(service => service !== 'moving') as PublicService[];
const aliases: Record<string, Service> = { rent: 'letting', manage: 'management', sell: 'selling', buy: 'buying', care: 'house-care' };
export function normalizeService(value: string | null | undefined): Service | undefined {
  if (!value) return undefined;
  return Object.hasOwn(SERVICES, value) ? value as Service : Object.hasOwn(aliases, value) ? aliases[value] : undefined;
}
/** Legacy advisory links used buying for buying advice; API buying keeps its historic meaning. */
export const normalizeServiceQuery = (value: string | null | undefined) => value === 'buying' ? 'buyer-advisory' : normalizeService(value);
export const serviceGroup = (value: Service): ServiceGroup => SERVICES[value].group;
export const CONTACT_METHODS = { phone: { zh: '电话', en: 'Phone' }, whatsapp: { zh: 'WhatsApp', en: 'WhatsApp' }, wechat: { zh: '微信', en: 'WeChat' }, email: { zh: '邮箱', en: 'Email' } } as const;
export type ContactMethod = keyof typeof CONTACT_METHODS;
export function isPhone(value: string) {
  const text = value.trim(); const digits = text.replace(/\D/g, '').length;
  return /^\+?[\d\s().-]+$/.test(text) && digits >= 7 && digits <= 15;
}
export function isContact(value: string, method?: ContactMethod) {
  const text = value.trim();
  if (!text || text.length > 160 || /[\x00-\x1f\x7f]/.test(text)) return false;
  if (method === 'wechat') return /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/.test(text);
  if (method === 'email' || (!method && text.includes('@'))) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  return isPhone(text);
}
export const ADVISORS = [
  { id: 'andy-xiang', name: 'Andy Xiang', zh: '项家龙', city: 'Sydney' },
  { id: 'chloe-xu', name: 'Chloe Xu', zh: '许安琪', city: 'Sydney' },
  { id: 'marina-wang', name: 'Marina Wang', zh: '王丽丽', city: '' },
  { id: 'sophie-lin', name: 'Sophie Lin', zh: '林嘉宁', city: 'Melbourne' },
  { id: 'olivia-chen', name: 'Olivia Chen', zh: '陈雅雯', city: 'Perth' },
  { id: 'ethan-zhou', name: 'Ethan Zhou', zh: '周明轩', city: 'Brisbane' },
  { id: 'michelle-qin', name: 'Michelle', zh: '秦川', city: 'Melbourne' },
  { id: 'crystal-liu', name: 'Crystal', zh: '刘晓洁', city: 'Sydney' },
  { id: 'steven-zhou', name: 'Steven Zhou', zh: '周泰', city: 'Melbourne' },
  { id: 'judy-liu', name: 'Judy Liu', zh: '刘燕', city: 'Brisbane' },
] as const;
export const findAdvisor = (id?: string | null) => ADVISORS.find(advisor => advisor.id === id);
export const START_TIMES = { asap: { zh: '尽快', en: 'As soon as possible' }, '1-3-months': { zh: '1–3 个月', en: '1–3 months' }, later: { zh: '之后', en: 'Later' } } as const;
/** Optional form of address chosen on the callback form; the notification reports it as the customer's gender. */
export const SALUTATIONS = { mr: { zh: '先生', en: 'Mr', gender: '男' }, ms: { zh: '女士', en: 'Ms', gender: '女' } } as const;
export type Salutation = keyof typeof SALUTATIONS;
export interface EnquiryDetails {
  contactMethod?: ContactMethod;
  salutation?: Salutation;
  propertyType?: 'house' | 'apartment' | 'townhouse' | 'other';
  bedrooms?: number;
  offerInterest?: boolean;
  needSummary?: string;
  startTime?: keyof typeof START_TIMES;
  budgetRange?: string;
  saleTime?: string;
  preferredAdvisorId?: string;
  /** Internal viewing sample, separate from a published property in our inventory. */
  listingId?: string;
}
