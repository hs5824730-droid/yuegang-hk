export interface ReceptionNames {displayName?:string;originalName?:string;originalFileName?:string;fileNameSource?:'upload'|'archive';note?:string;}
export type ReceptionChannel = 'whatsapp'|'wechat';
export type ReceptionCity = 'Melbourne'|'Sydney'|'Perth'|'Adelaide'|'Canberra'|'Brisbane'|'other';
export interface LeadRoutingAssignment { id:string;channel:ReceptionChannel;city:string;scope:'city'|'global';outcome:'assigned'|'no_city_match'|'unconfigured';assignedAt:string;target:{id:string;value:string;url:string;groupId:string;groupName:string;prefillText?:string;templateVersion?:number}&ReceptionNames|null;whatsappOpenAttempted:boolean;wechatQrDisplayed:boolean; }
export interface LeadRouting {state:'phone_callback'|'awaiting_assignment'|'assigned'|'no_city_match'|'unconfigured'|'not_requested';assignments:LeadRoutingAssignment[];}
export interface ReceptionTarget extends ReceptionNames {id:string;cities?:ReceptionCity[];queueOrder?:number;channel:ReceptionChannel;enabled:boolean;groupId:string;groupName:string;groupOrder:number;targetOrder:number;value:string;}
export interface ReceptionAssignment {id:string;channel:ReceptionChannel;contactMethod?:'phone'|'wechat'|'whatsapp';city?:ReceptionCity|null;scope?:'city'|'global';outcome?:'assigned'|'no_city_match'|'unconfigured';target:{id:string;value:string;url?:string}|null;}
export interface DirectContactContext {source:'website_direct';pagePath:string;city?:string;service?:string;language:'zh'|'en';contactMethod?:'phone'|'wechat'|'whatsapp';}
export interface DirectNotificationStatus {transport:'telegram'|'signal';status:'pending'|'sent'|'failed'|'uncertain';syncStatus:string;attempts:number;sentAt:string|null;error:string;}
export interface ReceptionReport {
 targets:ReceptionTarget[];totals:{channel:ReceptionChannel;visits:number;assigned:number}[];events:{channel:ReceptionChannel;type:string;count:number}[];
 records:{receptionRecipient?:string;id:string;channel:ReceptionChannel;leadId:string|null;city?:ReceptionCity|null;scope?:'city'|'global';outcome?:'assigned'|'no_city_match'|'unconfigured';target:ReceptionTarget|null;createdAt:string;actions:number;destinationUrl?:string|null;directContext?:DirectContactContext|null;notifications?:DirectNotificationStatus[]}[];
 breakdown:{channel:ReceptionChannel;groupId:string;groupName:string;targetId:string;assignments:number;actions:number}[];
}
