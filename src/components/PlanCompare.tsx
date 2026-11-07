import { Check,Minus } from 'lucide-react';
import { useI18n } from '../i18n';
import { useEnquiry } from './Enquiry';
export default function PlanCompare(){const{L}=useI18n();const enquire=useEnquiry();const rows:[string,boolean][]=[
 [L('準備、推廣同睇樓','Marketing & viewings'),true],
 [L('篩揀、簽約同入住','Screening & move-in'),true],
 [L('收租同租客聯絡','Rent & tenant contact'),false],
 [L('維修、巡檢同續租','Repairs & renewals'),false],
 ];return <div className="ds-service-compare ds-mini-compare"><table><caption>{L('自己管，定係交俾我哋管？','Letting or management?')}</caption><thead><tr><th scope="col">{L('服務','Service')}</th><th scope="col">{L('只放租','Letting only')}</th><th scope="col">{L('租務管理','Managed')}</th></tr></thead><tbody>{rows.map(([label,letting])=><tr key={label}><th scope="row">{label}</th><td>{letting?<><Check size={18}/><span className="sr-only">{L('包含','Included')}</span></>:<span className="ds-own"><Minus size={14}/>{L('自理','You')}</span>}</td><td><Check size={18}/><span className="sr-only">{L('包含','Included')}</span></td></tr>)}</tbody><tfoot><tr><td/><td><button type="button" className="btn btn-line rp-letting-cta" onClick={()=>enquire({service:'letting'})}>{L('查詢放租','Enquire')}</button></td><td><button type="button" className="btn btn-primary rp-management-cta" onClick={()=>enquire({service:'management'})}>{L('查詢託管','Enquire')}</button></td></tr></tfoot></table><p className="ds-fine">{L('工作範圍、巡檢頻次同費用，委託前書面確認。','Scope, inspection frequency and fees agreed in writing before appointment.')}</p></div>;}
