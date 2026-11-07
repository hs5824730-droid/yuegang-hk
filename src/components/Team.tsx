import { ArrowUpRight, BadgeCheck, MapPin } from 'lucide-react';
import { useI18n } from '../i18n';
import { useEnquiry } from './Enquiry';
import { SmartImg } from './ui';

/**
 * 悦港 team. Hong Kong estate agency staff must hold an EAA licence; list a member only with
 * consent, a real photo and their licence number (E-/S-xxxxxx). Empty until the team is confirmed.
 */
export interface Member { id: string; zh: string; en: string; city: string; cityZh: string; licence: string; lineZh: string; lineEn: string; bioZh: string; bioEn: string }
export const MEMBERS: Member[] = [];

export default function Team() {
  const { L } = useI18n();
  const enquire = useEnquiry();
  // Nothing to show until real, licensed team members are added.
  if (!MEMBERS.length) return null;
  return (
    <section className="ds-sec team-section" id="team" aria-labelledby="team-title">
      <div className="wrap">
        <div className="ds-head">
          <div>
            <p className="ds-kicker">{L('團隊成員', 'Our people')}</p>
            <h2 id="team-title">{L('認識為你跟進嘅人', 'Meet the people behind the work')}</h2>
          </div>
        </div>
        <div className="ds-team">
          {MEMBERS.map((m) => (
            <article className="ds-member" key={m.id}>
              <div className="ds-member-photo"><SmartImg src={`/team/${m.id}.webp`} alt={m.en} position="50% 20%" /></div>
              <div className="ds-member-copy">
                <p className="ds-member-city"><MapPin size={14} aria-hidden />{L(m.cityZh, m.city)}</p>
                <h3>{L(m.zh, m.en)}<span>{L(m.en, m.zh)}</span></h3>
                <p className="ds-member-line"><BadgeCheck size={14} aria-hidden /> {L('牌照號碼：', 'Licence no.: ')}{m.licence}</p>
                <p className="ds-member-line">{L(m.lineZh, m.lineEn)}</p>
                <p className="ds-member-bio">{L(m.bioZh, m.bioEn)}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="ds-team-cta">
          <p>{L('想等團隊跟進你嘅單位？留低地區同需求，我哋安排對應同事聯絡你。', 'Want our team to look after your flat? Tell us the district and what you need, and the right person will be in touch.')}</p>
          <button type="button" className="btn btn-primary" onClick={() => enquire({ service: 'management' })}>
            {L('表格查詢', 'Enquire via form')}
            <ArrowUpRight size={18} aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
