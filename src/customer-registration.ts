import {z} from 'zod';
import {isContact} from './enquiry-options';

export const INTAKE_TYPES={buying:['买房','Buying'],selling:['卖房','Selling'],advisory:['置业顾问','Property services']} as const;
export type IntakeType=keyof typeof INTAKE_TYPES;
export const INTAKE_PATHS={buying:'/buying-registration',selling:'/selling-registration',advisory:'/advisory-registration'} as const;
export const INTAKE_STATUSES={new:['待联系','To contact'],contacted:['已联系','Contacted'],following:['需求确认','Confirming needs'],appointed:['服务中','In progress'],completed:['已完成','Completed'],paused:['暂缓','Paused']} as const;
export const ADVISORY_NEEDS={'buyer-advisory':['购房咨询','Buying advice'],renovation:['装修翻新','Renovation'],'house-care':['房屋打理','Home care'],garden:['草坪与园艺','Lawn & garden'],cleaning:['清洁服务','Cleaning'],'home-sitting':['空置与居家照看','Vacancy & home sitting'],maintenance:['维修维护','Repairs & maintenance'],other:['其他','Other']} as const;
export const TIMINGS={'':['尚未确定','Not decided'],asap:['尽快','As soon as possible'],'1-3-months':['1–3个月内','Within 1–3 months'],'3-6-months':['3–6个月内','Within 3–6 months'],later:['6个月以后','After 6 months']} as const;
export const PROPERTY_TYPES={'':['尚未确定','Not decided'],house:['独立屋','House'],townhouse:['联排住宅','Townhouse'],apartment:['公寓','Apartment'],other:['其他','Other']} as const;
export const PURPOSES={'':['尚未确定','Not decided'],home:['自住','To live in'],investment:['投资','Investment'],both:['两者兼顾','Both']} as const;
export const OCCUPANCIES={'':['尚未确定','Not decided'],owner:['自住','Owner occupied'],tenanted:['出租中','Tenanted'],vacant:['空置','Vacant']} as const;
export const YES_NO={'':['尚未确定','Not decided'],yes:['是','Yes'],no:['否','No']} as const;
export const CARE_FREQUENCIES={'':['尚未确定','Not decided'],once:['一次性','One-off'],regular:['定期','Regular']} as const;
export const URGENCIES={'':['尚未确定','Not decided'],routine:['一般安排','Routine'],soon:['希望尽快处理','As soon as possible']} as const;
const text=(max:number)=>z.string().trim().max(max).refine(v=>!/[\u0000-\u001f\u007f]/.test(v),'invalid_text');
const money=z.preprocess(v=>v==null||typeof v==='string'&&!v.trim()?undefined:typeof v==='number'||typeof v==='string'?Number(v):NaN,z.number().finite().min(0).max(1000000000).optional());
const count=z.preprocess(v=>v==null||typeof v==='string'&&!v.trim()?undefined:typeof v==='number'||typeof v==='string'?Number(v):NaN,z.number().int().min(0).max(30).optional());
const common={requestId:z.uuid(),language:z.enum(['zh','en']),name:text(100).min(1),contactMethod:z.enum(['phone','whatsapp','wechat','email']),contact:text(160).min(1),email:z.union([z.literal(''),z.email().max(160)]).default(''),city:text(80).default(''),notes:z.string().trim().max(4000).default(''),website:z.string().max(100).optional(),leadRequestId:z.uuid().optional(),propertyId:z.uuid().optional(),listingId:z.string().regex(/^reference-\d{5,12}$/).optional()};
const buying={suburb:text(200).default(''),budgetMin:money,budgetMax:money,purpose:z.enum(['','home','investment','both']).default(''),propertyType:z.enum(['','house','townhouse','apartment','other']).default(''),bedrooms:count,parking:count,timing:z.enum(['','asap','1-3-months','3-6-months','later']).default(''),desiredProperty:text(500).default('')};
/** Home services that share the same details: address, occupancy, scope, frequency and start. */
export const CARE_SERVICES=['house-care','garden','cleaning','home-sitting'] as const;
const care={street:text(220).default(''),occupancy:z.enum(['','owner','tenanted','vacant']).default(''),scope:text(1000).default(''),frequency:z.enum(['','once','regular']).default(''),timing:buying.timing};
export const customerRegistrationSchema=z.discriminatedUnion('type',[
 z.object({...common,type:z.literal('buying'),details:z.object(buying).strict()}).strict(),
 z.object({...common,type:z.literal('selling'),details:z.object({street:text(220).default(''),suburb:text(100).default(''),propertyType:buying.propertyType,bedrooms:count,bathrooms:count,parking:count,occupancy:z.enum(['','owner','tenanted','vacant']).default(''),timing:buying.timing,expectedPrice:money,listedElsewhere:z.enum(['','yes','no']).default('')}).strict()}).strict(),
 z.object({...common,type:z.literal('advisory'),details:z.discriminatedUnion('service',[
  z.object({service:z.literal('buyer-advisory'),question:text(1000).default(''),suburb:buying.suburb,budgetMin:money,budgetMax:money}).strict(),
  z.object({service:z.literal('renovation'),street:text(220).default(''),scope:text(1000).default(''),budgetMin:money,budgetMax:money,timing:buying.timing}).strict(),
  ...CARE_SERVICES.map(service=>z.object({service:z.literal(service),...care}).strict()),
  z.object({service:z.literal('maintenance'),street:text(220).default(''),issue:text(1000).default(''),urgency:z.enum(['','routine','soon']).default('')}).strict(),
  z.object({service:z.literal('other'),question:text(1000).default('')}).strict(),
 ])}).strict(),
]).superRefine((data,ctx)=>{
 if(!isContact(data.contact,data.contactMethod))ctx.addIssue({code:'custom',path:['contact'],message:'invalid_contact'});
 if(data.type==='buying'||data.type==='advisory'&&'budgetMin' in data.details){const d=data.details as {budgetMin?:number;budgetMax?:number};if(d.budgetMin!==undefined&&d.budgetMax!==undefined&&d.budgetMax<d.budgetMin)ctx.addIssue({code:'custom',path:['details','budgetMax'],message:'invalid_range'});}
 if((data.propertyId||data.listingId)&&data.type!=='buying')ctx.addIssue({code:'custom',path:['type'],message:'listing_requires_buying'});
 if(data.propertyId&&data.listingId)ctx.addIssue({code:'custom',path:['propertyId'],message:'one_listing_only'});
});
export type CustomerRegistrationInput=z.infer<typeof customerRegistrationSchema>;
type StoredInput<T=CustomerRegistrationInput>=T extends unknown?Omit<T,'requestId'|'website'|'leadRequestId'>:never;
export type CustomerRegistrationRecord=StoredInput & {id:string;category:IntakeType;status:keyof typeof INTAKE_STATUSES;followUp:string;assignedTo:string|null;assignedToName?:string;nextFollowUp:string;relatedLeadId:string|null;version:number;createdAt:string;updatedAt:string;propertyAddress?:string;sync?:{status:string;attempts:number;lastError:string;sentAt:string|null}};
export const customerFollowUpSchema=z.object({version:z.number().int().positive(),status:z.enum(['new','contacted','following','appointed','completed','paused']),followUp:z.string().trim().max(4000),assignedTo:z.uuid().nullable(),nextFollowUp:z.union([z.literal(''),z.iso.datetime()]),category:z.enum(['buying','selling','advisory'])}).strict();
export function registrationPath(service:string){return service==='buying'?INTAKE_PATHS.buying:service==='selling'?INTAKE_PATHS.selling:service==='letting'||service==='management'?'/rental-registration':INTAKE_PATHS.advisory+'?service='+encodeURIComponent(service);}
