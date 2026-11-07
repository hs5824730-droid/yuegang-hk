import { Check,Minus } from 'lucide-react';
import { useI18n } from '../i18n';
import { useEnquiry } from './Enquiry';
export default function PlanCompare(){const{L}=useI18n();const enquire=useEnquiry();const rows:[string,boolean][]=[
 [L('准备、推广与看房','Marketing & viewings'),true],
 [L('筛选、签约与入住','Screening & move-in'),true],
 [L('收租与租客联络','Rent & tenant contact'),false],
 [L('维修、巡检与续租','Repairs & renewals'),false],
 ];return <div className="ds-service-compare ds-mini-compare"><table><caption>{L('自己管，还是交给我们管？','Letting or management?')}</caption><thead><tr><th scope="col">{L('服务','Service')}</th><th scope="col">{L('仅招租','Letting only')}</th><th scope="col">{L('长期托管','Managed')}</th></tr></thead><tbody>{rows.map(([label,letting])=><tr key={label}><th scope="row">{label}</th><td>{letting?<><Check size={18}/><span className="sr-only">{L('包含','Included')}</span></>:<span className="ds-own"><Minus size={14}/>{L('自理','You')}</span>}</td><td><Check size={18}/><span className="sr-only">{L('包含','Included')}</span></td></tr>)}</tbody><tfoot><tr><td/><td><button type="button" className="btn btn-line rp-letting-cta" onClick={()=>enquire({service:'letting'})}>{L('咨询招租','Enquire')}</button></td><td><button type="button" className="btn btn-primary rp-management-cta" onClick={()=>enquire({service:'management'})}>{L('咨询托管','Enquire')}</button></td></tr></tfoot></table><p className="ds-fine">{L('工作范围、巡检频次与费用，委托前书面确认。','Scope, inspection frequency and fees agreed in writing before appointment.')}</p></div>;}
