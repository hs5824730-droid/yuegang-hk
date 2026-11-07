import {localizedHref} from '../language-path';
import {KeyRound} from 'lucide-react';
import {useConfig,useI18n,formatMonth} from '../i18n';
import './rental-offer-stamp.css';
export default function RentalOfferStamp({href='/offer'}:{href?:string}){
 const {L,lang}=useI18n();const {config}=useConfig();
 return <a className="rental-offer-stamp" href={localizedHref(href,lang)}><KeyRound size={20} aria-hidden/><span><strong>{L('首個單位業主免佣','No owner commission on your first flat')}</strong><small>{L(`第二個單位半價 · 送交吉清潔 · 至${formatMonth(config.promotion.endMonth,lang)}`,`Second half price · free pre-letting clean · until ${formatMonth(config.promotion.endMonth,lang)}`)}</small></span></a>;
}
