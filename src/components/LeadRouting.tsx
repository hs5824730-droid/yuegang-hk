import { useState } from 'react';
import { cityName,formatDate,useI18n } from '../i18n';
import type { LeadRouting,LeadRoutingAssignment } from '../reception-types';
export type { LeadRouting } from '../reception-types';
export type WithRouting<T> = T & {routing?:LeadRouting};
type LFn=(zh:string,en:string)=>string;
function stateText(state:LeadRouting['state'],L:LFn){return ({phone_callback:L('電話回訪，無渠道分流','Phone callback, no channel routing'),awaiting_assignment:L('等待分配','Awaiting assignment'),assigned:L('已分配','Assigned'),no_city_match:L('該地區未配置接待','No target for this city'),unconfigured:L('渠道未配置','Channel not configured'),not_requested:L('無渠道分流','No channel routing')})[state];}
export function RoutingSummary({routing}:{routing?:LeadRouting|null}){const{L}=useI18n();if(!routing)return null;return <small className={`routing-summary st-${routing.state}`}>{stateText(routing.state,L)}{routing.assignments.map(a=><span key={a.id}> · {a.channel==='whatsapp'?'WhatsApp':L('微信','WeChat')}{a.target?' '+(a.channel==='whatsapp'?a.target.value:L('已分配二維碼','QR assigned')):''}</span>)}</small>;}
function Assignment({item}:{item:LeadRoutingAssignment}){const{L,lang}=useI18n();const[copied,setCopied]=useState(false);const link=item.target?new URL(item.target.url,location.origin).href:null;return <dl className="kv">
 <dt>{L('渠道','Channel')}</dt><dd>{item.channel==='whatsapp'?'WhatsApp':L('微信','WeChat')}</dd>
 <dt>{L('房屋地區','Property city')}</dt><dd>{cityName(item.city,lang)}</dd>
 <dt>{L('分配狀態','Assignment status')}</dt><dd>{stateText(item.outcome,L)}</dd>
 {item.target&&<><dt>{L('目標快照','Target snapshot')}</dt><dd>{item.target.displayName&&<strong>{item.target.displayName}<br/></strong>}{item.target.originalName&&<small className="record-secondary">{L('原圖暱稱','Original nickname')}: {item.target.originalName}</small>}{item.target.originalFileName&&<small className="record-secondary">{item.target.fileNameSource==='archive'?L('原圖歸檔文件名','Archived source filename'):L('上傳原文件名','Original upload filename')}: {item.target.originalFileName}</small>}{item.target.value}<small className="record-secondary">{item.target.groupName} · {item.target.id}</small></dd>
 {item.channel==='whatsapp'&&item.target.prefillText!==undefined&&<><dt>{L('當次進線語','Assigned chat draft')}</dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.target.prefillText||L('不預填文字','No prefilled text')}<small className="record-secondary">{L('模板版本','Template version')} {item.target.templateVersion}</small></dd></>}
 <dt>{L('實際目標連結','Actual destination link')}</dt><dd className="routing-link"><code>{link}</code><button type="button" className="btn btn-line" onClick={()=>void navigator.clipboard.writeText(link!).then(()=>setCopied(true)).catch(()=>{})}>{copied?L('已複製','Copied'):L('複製','Copy')}</button></dd>
 {item.channel==='wechat'&&<><dt>{L('分配的二維碼','Assigned QR')}</dt><dd><img className="routing-detail-qr" src={item.target.url} alt={L('分配給這條查詢的二維碼','QR assigned to this enquiry')}/></dd></>}</>}
 <dt>{L('分配時間','Assigned at')}</dt><dd>{formatDate(item.assignedAt,lang)} {new Date(item.assignedAt).toLocaleTimeString(lang==='zh'?'zh-HK':'en-HK')}</dd>
 <dt>{L('操作記錄','Action recorded')}</dt><dd>{item.whatsappOpenAttempted?L('已請求打開 WhatsApp','WhatsApp open requested'):item.wechatQrDisplayed?L('二維碼已顯示','QR displayed'):L('尚無打開/展示記錄','No open/display event')}</dd>
 </dl>;}
export function RoutingDetail({routing}:{routing?:LeadRouting|null}){const{L}=useI18n();return <section className="routing-detail" aria-label={L('聯繫分流','Contact routing')}><h3 className="admin-section-label">{L('聯繫分流','Contact routing')}</h3><p>{routing?stateText(routing.state,L):L('沒有分流記錄','No routing record')}</p>{routing?.assignments.map(a=><Assignment key={a.id} item={a}/>)}<p className="admin-subtitle">{L('分配、跳轉意圖及二維碼展示不代表已聊天或加好友。','Assignment, open attempts and QR displays do not confirm a chat or new contact.')}</p></section>;}
