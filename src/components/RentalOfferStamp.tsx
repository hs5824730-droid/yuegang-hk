import {localizedHref} from '../language-path';
import {KeyRound} from 'lucide-react';
import {useConfig,useI18n,formatMonth} from '../i18n';
import './rental-offer-stamp.css';
export default function RentalOfferStamp({href='/offer'}:{href?:string}){
 const {L,lang}=useI18n();const {config}=useConfig();
 return <a className="rental-offer-stamp" href={localizedHref(href,lang)}><KeyRound size={20} aria-hidden/><span><strong>{L('首套免出租佣金','First letting fee waived')}</strong><small>{L(`第二套半价 · 免费搬家 · 至${formatMonth(config.promotion.endMonth,lang)}`,`Second half price · free moving · until ${formatMonth(config.promotion.endMonth,lang)}`)}</small></span></a>;
}
