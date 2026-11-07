import { isPhone, SALUTATIONS, SERVICES, SERVICE_GROUPS, type Salutation, type Service } from '../src/enquiry-options.js';
import { leadRouting } from './lead-routing.js';
import { notificationContactMethod, notificationRecipientLabel } from './notification-recipient.js';

export interface NotificationMessageRow { lead_id: string; city: string; service: string; data: string; created_at: string; owner_name?: string; owner_contact?: string; routing_json?: string; reception_recipient?: string; }
export const notificationLine = (value: unknown, limit = 160) => typeof value === 'string' || typeof value === 'number'
  ? String(value).replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit) : '';
const cityLabels: Record<string, string> = { 'Hong Kong Island': '港島', Kowloon: '九龍', 'New Territories': '新界', Islands: '離島', other: '其他地區' };
const beijingClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
export function notificationBeijingTime(createdAt: string) {
  // Legacy SQLite timestamps without an offset also represent UTC, never the host timezone.
  const value = String(createdAt).trim();
  const utc = /^\d{4}-\d\d-\d\d$/.test(value) ? `${value}T00:00:00Z`
    : /^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:\.\d+)?$/.test(value) ? `${value.replace(' ', 'T')}Z` : value;
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(utc)) return '未提供';
  const date = new Date(utc);
  if (!Number.isFinite(date.getTime())) return '未提供';
  const parts = Object.fromEntries(beijingClock.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
export function notificationMessage(row: NotificationMessageRow, _appUrl: string) {
  const data = JSON.parse(String(row.data));
  if (data.source === 'meta_instant_form' && data.manualAssignment === true) {
    const meta=data.meta||{};
    const cities=Array.isArray(meta.cities)?meta.cities.map((c:unknown)=>notificationLine(cityLabels[String(c)]||c,80)).filter(Boolean):[];
    const needs=Array.isArray(meta.services)?meta.services.map((s:unknown)=>notificationLine(s,100)).filter(Boolean):[];
    const groupByNeed:Record<string,string>={寻找租客:'出租与托管',出租招租:'出租与托管',房屋出租:'出租与托管',长期托管:'出租与托管',买卖房屋:'买卖房屋',买房:'买卖房屋',卖房:'买卖房屋',装修服务:'置业顾问',装修翻新:'置业顾问',购房咨询:'置业顾问',置业咨询:'置业顾问'};
    const formGroup:Record<string,string>={ '1514382803854555':'出租与托管', '1869659250874417':'房屋服务' };
    const groups=formGroup[String(meta.formId)]?[formGroup[String(meta.formId)]]:[...new Set(needs.map((need:string)=>groupByNeed[need]||'其他咨询'))];
    return [
      `【客户姓名】${notificationLine(data.name,100)||'未提供'}`,
      ...(meta.salutation?[`【称呼】${notificationLine(meta.salutation,100)}`]:[]),
      `【联系电话】${notificationLine(data.contact)||'未提供'}`,
      ...(meta.startTime?[`【希望开始时间】${notificationLine(meta.startTime,200)}`]:[]),
      `【房屋所在城市】${cities.join('、')||'未提供'}`,
      `分组：${groups.join('、')||'其他咨询'}`,
      `类型：${needs.join('、')||'未提供'}`,
      '', '联系方式种类：电话', '分流渠道：未自动分流',
      '分配目标：等待主动分配', '分流名称：未设置',
      `接粉人员：${notificationLine(notificationRecipientLabel(row.reception_recipient),100)}`,
      `北京时间：${notificationBeijingTime(meta.submittedAt||row.created_at)}`,
    ].join('\n');
  }
  const contact = notificationLine(data.contact || row.owner_contact);
  const explicitPhone = notificationLine(data.phone || data.phoneNumber);
  const method = notificationContactMethod(data, row.owner_contact);
  const phone = explicitPhone && isPhone(explicitPhone) ? explicitPhone
    : method !== 'wechat' && contact && isPhone(contact) ? contact : '未提供';
  const methodLabel = ({ phone: '电话', whatsapp: 'WhatsApp', wechat: '微信', email: '邮箱' } as Record<string, string>)[method] || '原记录联系方式';
  const contactDetail = method === 'wechat' ? `（微信号：${contact || '未提供'}）`
    : method === 'email' || method === 'other' ? `（${contact || '未提供'}）` : '';
  const service = SERVICES[String(row.service) as Service];
  const salutation = Object.hasOwn(SALUTATIONS, String(data.salutation)) ? SALUTATIONS[data.salutation as Salutation] : null;
  const routing = leadRouting(data, row.city, row.routing_json);
  const assignment = routing.assignments.find(item => item.channel === method) || routing.assignments.at(-1);
  const target = assignment?.target;
  const channel = assignment ? assignment.channel === 'whatsapp' ? 'WhatsApp' : '微信'
    : routing.state === 'phone_callback' ? '未分流（电话回访）'
    : method === 'email' ? '未分流（邮件回复）'
    : method === 'whatsapp' ? 'WhatsApp' : method === 'wechat' ? '微信' : '未分流';
  const destination = target ? assignment!.channel === 'whatsapp' ? notificationLine(target.value) : '微信二维码'
    : routing.state === 'no_city_match' ? '该城暂无可用接待'
    : routing.state === 'unconfigured' ? '暂无可用接待'
    : routing.state === 'awaiting_assignment' ? '等待分配' : '未分流';
  const name = target && (notificationLine(target.displayName, 80) || notificationLine(target.originalName, 80) || notificationLine(target.originalFileName, 160));
  // Both transports send this exact plain text without parse_mode. Links and detailed
  // routing events remain in the protected snapshot; notification copy stays concise.
  return [
    `【客户姓名】${notificationLine(data.name || row.owner_name, 100) || '未提供'}`,
    `【客户性别】${salutation ? `${salutation.gender}（${salutation.zh}）` : '未提供'}`,
    `【联系电话】${phone}`,
    `【房屋所在城市】${notificationLine(cityLabels[row.city] || row.city, 80) || '未提供'}`,
    `分组：${service ? SERVICE_GROUPS[service.group].zh : '未提供'}`,
    `类型：${notificationLine(service?.zh || row.service, 80) || '未提供'}`,
    '',
    `联系方式种类：${methodLabel}${contactDetail}`,
    `分流渠道：${channel}`,
    `分配目标：${destination}`,
    `分流名称：${name || '未设置'}`,
    `接粉人员：${notificationLine(notificationRecipientLabel(row.reception_recipient),100)}`,
    `北京时间：${notificationBeijingTime(row.created_at)}`,
  ].join('\n');
}
