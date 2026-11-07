import {useEffect} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';
import {useI18n} from '../i18n';
import './rental-registration.css';
import './customer-registration.css';

export default function RegistrationHub(){
 const {L}=useI18n();
 useEffect(()=>{document.title=L('需求登记 | 桉湾 EUCOVE','Register your needs | EUCOVE')},[L]);
 const options=[['rental','出租托管','Let & manage','登记房屋、出租时间与托管需求。','Share your property, availability and management needs.'],['buying','我想买房','I want to buy','告诉我们意向区域、预算和购房计划。','Tell us your areas, budget and buying plans.'],['selling','我想卖房','I want to sell','登记房屋情况、价格预期和出售计划。','Share your home, price expectations and selling plans.'],['advisory','置业顾问','Property services','购房咨询、装修翻新、房屋打理与维修。','Buying advice, renovation, home care and repairs.']];
 return <section className="rr-page wrap cr-page"><header className="rr-intro"><h1>{L('您希望我们协助什么？','How can we help?')}</h1><p>{L('选择您的需求，填写方便提供的资料。暂未确定的内容，可以在沟通时补充。','Choose a service and share what you know. You can add the details later.')}</p></header><div className="cr-options">{options.map(([type,zh,en,descZh,descEn])=><Link key={type} to={'/'+type+'-registration'}><h2>{L(zh,en)}</h2><p>{L(descZh,descEn)}</p><span>{L('开始登记','Start registration')}<ArrowRight size={18} aria-hidden/></span></Link>)}</div><p className="cr-help">{L('暂时只想留下联系方式？','Prefer to leave your contact details first?')} <Link to="/contact">{L('留下你的联系方式','Leave your contact details')}</Link></p></section>;
}
