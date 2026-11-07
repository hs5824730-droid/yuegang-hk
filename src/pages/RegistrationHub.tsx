import {useEffect} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';
import {useI18n} from '../i18n';
import './rental-registration.css';
import './customer-registration.css';

export default function RegistrationHub(){
 const {L}=useI18n();
 useEffect(()=>{document.title=L('需求登記 | 悦港 Harbour Joy','Register your needs | Harbour Joy')},[L]);
 const options=[['rental','出租託管','Let & manage','登記房屋、出租時間同託管需求。','Share your property, availability and management needs.'],['buying','我想買樓','I want to buy','話我哋意向區域、預算同置業計劃。','Tell us your areas, budget and buying plans.'],['selling','我想賣樓','I want to sell','登記房屋情況、價格預期同出售計劃。','Share your home, price expectations and selling plans.'],['advisory','置業顧問','Property services','置業查詢、裝修翻新、房屋打理同維修。','Buying advice, renovation, home care and repairs.']];
 return <section className="rr-page wrap cr-page"><header className="rr-intro"><h1>{L('你希望我哋協助咩？','How can we help?')}</h1><p>{L('揀你嘅需求，填寫方便提供嘅資料。暫未確定嘅內容，可以在溝通時補充。','Choose a service and share what you know. You can add the details later.')}</p></header><div className="cr-options">{options.map(([type,zh,en,descZh,descEn])=><Link key={type} to={'/'+type+'-registration'}><h2>{L(zh,en)}</h2><p>{L(descZh,descEn)}</p><span>{L('開始登記','Start registration')}<ArrowRight size={18} aria-hidden/></span></Link>)}</div><p className="cr-help">{L('暫時只想留低聯絡方式？','Prefer to leave your contact details first?')} <Link to="/contact">{L('留低你嘅聯絡方式','Leave your contact details')}</Link></p></section>;
}
