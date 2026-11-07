import {z} from 'zod';
import {isPhone} from './enquiry-options';

export const REGISTRATION_STATUSES={new:['待联系','To contact'],contacted:['已联系','Contacted'],following:['跟进中','Following up'],appointed:['已委托','Appointed'],paused:['暂缓','On hold']} as const;
export const REGISTRATION_SERVICES={marketing:['推广找租客','Marketing & finding tenants'],screening:['背景及申请审核','Tenant screening & applications'],viewings:['看房沟通','Inspections & communication'],handover:['合同入住交接','Lease & move-in handover'],management:['日常管理维修','Ongoing management & repairs']} as const;
export const PROPERTY_KINDS={house:['独立屋','House'],townhouse:['联排别墅','Townhouse'],apartment:['公寓 / 单元房','Apartment / Unit'],other:['其他','Other']} as const;
export const FURNISHING={furnished:['带家具','Furnished'],unfurnished:['不带家具','Unfurnished'],part:['部分家具','Partly furnished']} as const;
export const RENTAL_MODES={whole:['整租','Whole property'],rooms:['分房','By room'],advice:['希望提供建议','Advice needed']} as const;
const optionalNumber=(max:number)=>z.preprocess(v=>v===null||v===undefined||typeof v==='string'&&!v.trim()?undefined:typeof v==='string'||typeof v==='number'?Number(v):NaN,z.number().finite().min(0).max(max).optional());
export const rentalRegistrationSchema=z.object({
 requestId:z.uuid(),language:z.enum(['zh','en']),name:z.string().trim().min(1).max(100),
 phone:z.string().trim().min(1).max(40).refine(v=>isPhone(v),'invalid_phone'),
 email:z.string().trim().min(1).max(160).refine(v=>z.email().safeParse(v).success,'invalid_email'),
 street:z.string().trim().max(220).default(''),suburb:z.string().trim().max(100).default(''),city:z.string().trim().max(80).default(''),
 state:z.enum(['','VIC','NSW','QLD','WA','SA','ACT','TAS','NT','other']).default(''),postcode:z.string().trim().regex(/^$|^\d{4}$/).default(''),
 propertyType:z.enum(['','house','townhouse','apartment','other']).default(''),
 bedrooms:optionalNumber(30).refine(v=>v===undefined||Number.isInteger(v),'invalid_count'),bathrooms:optionalNumber(30).refine(v=>v===undefined||Number.isInteger(v),'invalid_count'),parking:optionalNumber(30).refine(v=>v===undefined||Number.isInteger(v),'invalid_count'),
 furnishing:z.enum(['','furnished','unfurnished','part']).default(''),rentMin:optionalNumber(1000000),rentMax:optionalNumber(1000000),
 availableWhen:z.enum(['','date','now','undecided']).default(''),availableDate:z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).default(''),
 rentalMode:z.enum(['','whole','rooms','advice']).default(''),services:z.array(z.enum(['marketing','screening','viewings','handover','management'])).max(5).default([]).transform(a=>[...new Set(a)].sort()),
 notes:z.string().trim().max(4000).default(''),website:z.string().max(100).optional(),
}).strict().superRefine((d,ctx)=>{
 if(d.rentMin!==undefined&&d.rentMax!==undefined&&d.rentMax<d.rentMin)ctx.addIssue({code:'custom',path:['rentMax'],message:'invalid_range'});
 if(d.availableWhen==='date'){const date=new Date(d.availableDate+'T00:00:00Z');if(!d.availableDate||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==d.availableDate)ctx.addIssue({code:'custom',path:['availableDate'],message:'date_required'});}
 for(const field of ['name','street','suburb','city'] as const)if(/[\u0000-\u001f\u007f]/.test(d[field]))ctx.addIssue({code:'custom',path:[field],message:'invalid_text'});
});
export type RentalRegistrationInput=z.infer<typeof rentalRegistrationSchema>;
export type RegistrationStatus=keyof typeof REGISTRATION_STATUSES;
export interface RentalRegistrationRecord extends Omit<RentalRegistrationInput,'requestId'|'website'> {id:string;seq:number;assignedTo?:string|null;assignedToName?:string;status:RegistrationStatus;followUp:string;version:number;createdAt:string;sync:{status:'pending'|'synced'|'failed';attempts:number;error:string;sentAt:string|null;revision:number;deliveredRevision:number}}
export const registrationPatchSchema=z.object({version:z.number().int().positive(),status:z.enum(['new','contacted','following','appointed','paused']),followUp:z.string().trim().max(4000).default('')}).strict();
