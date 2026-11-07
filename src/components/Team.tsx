import { useState } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { useI18n } from '../i18n';
import { SmartImg } from './ui';
import { useEnquiry } from './Enquiry';

/** Profiles condensed from data/team-source. No unsupported years, qualifications or language claims. */
export const MEMBERS = [
  { id: 'andy-xiang', zh: '项家龙', en: 'Andy Xiang', city: 'Sydney', cityZh: '悉尼',
    lineZh: '10 年物业管理经验，服务全悉尼', lineEn: '10 years in property management across Sydney',
    bioZh: '在悉尼从事物业管理 10 年，服务区域覆盖全悉尼。专注华人房东的 House 整租、分租及公寓出租。从房源推广、租客筛选到日常沟通与维护，亲自跟进每个环节。',
    bioEn: 'Ten years in property management, covering all of Sydney. Focused on whole-house, room and apartment lettings for Chinese-speaking owners. Handles marketing, tenant screening, day-to-day contact and maintenance personally.' },
  { id: 'chloe-xu', zh: '许安琪', en: 'Chloe Xu', city: 'Sydney', cityZh: '悉尼',
    lineZh: '入住交接与租期事务', lineEn: 'Move-in and tenancy matters',
    bioZh: '负责悉尼房源的入住办理与租约说明。租期内跟进租客问题，及时向房东反馈处理结果。',
    bioEn: 'Handles move-ins and lease explanations for Sydney properties, then follows up tenant queries during the tenancy and reports back to owners.' },
  { id: 'marina-wang', zh: '王丽丽', en: 'Marina Wang', city: '', cityZh: '澳洲',
    lineZh: '租务管理与物业维护', lineEn: 'Tenancy and maintenance',
    bioZh: '负责日常租务与物业维护协调，处理租务及合规相关事项。重视及时响应，让房东随时了解房屋状况。',
    bioEn: 'Coordinates day-to-day tenancy and property maintenance, including compliance matters, with prompt follow-up so owners know how their property is doing.' },
  { id: 'sophie-lin', zh: '林嘉宁', en: 'Sophie Lin', city: 'Melbourne', cityZh: '墨尔本',
    lineZh: '日常管理与维修跟进', lineEn: 'Day-to-day management and repairs',
    bioZh: '负责墨尔本房源的日常管理。协调维修安排并持续跟进进度，帮助房东保持物业良好状态。',
    bioEn: 'Manages Melbourne properties day to day, arranging repairs and following them through so the property stays in good condition.' },
  { id: 'olivia-chen', zh: '陈雅雯', en: 'Olivia Chen', city: 'Perth', cityZh: '珀斯',
    lineZh: '珀斯日常租务管理', lineEn: 'Tenancy management in Perth',
    bioZh: '负责珀斯房源的日常租务。了解房东与租客双方需求，协调并跟进租期内的各项安排。',
    bioEn: 'Looks after day-to-day tenancies in Perth, balancing owner and tenant needs and following through on arrangements during the lease.' },
  { id: 'ethan-zhou', zh: '周明轩', en: 'Ethan Zhou', city: 'Brisbane', cityZh: '布里斯班',
    lineZh: '看房组织与招租安排', lineEn: 'Viewings and letting',
    bioZh: '负责布里斯班房源的招租。组织看房、跟进租赁申请并协调出租安排，注重房源与租客需求的匹配。',
    bioEn: 'Leads letting in Brisbane: organising viewings, following up applications and matching each property with suitable tenants.' },
  { id: 'michelle-qin', zh: '秦川', en: 'Michelle', city: 'Melbourne', cityZh: '墨尔本',
    lineZh: '日常管理与维修协调', lineEn: 'Day-to-day management and repairs',
    bioZh: '跟进墨尔本房源的日常管理与维护保养，协调维修并持续跟进处理进度。注重细致沟通，可使用英语及普通话服务房东与租客。',
    bioEn: 'Looks after day-to-day management and upkeep of Melbourne properties, coordinating repairs and following them through. Communicates with owners and tenants in English and Mandarin.' },
  { id: 'crystal-liu', zh: '刘晓洁', en: 'Crystal', city: 'Sydney', cityZh: '悉尼',
    lineZh: '入住办理与租期跟进', lineEn: 'Move-ins and tenancy follow-up',
    bioZh: '协助悉尼租客办理入住、了解租赁事项，处理租期内的需求与问题。注重耐心沟通与主动跟进，兼顾房东利益和租客居住体验。',
    bioEn: 'Helps Sydney tenants with move-ins and understanding tenancy arrangements, then follows up needs and queries during the lease. Uses patient communication and proactive follow-up to support owners and tenants.' },
  { id: 'steven-zhou', zh: '周泰', en: 'Steven Zhou', city: 'Melbourne', cityZh: '墨尔本',
    lineZh: '5 年墨尔本房屋租赁服务', lineEn: '5 years in Melbourne rental services',
    bioZh: '在墨尔本提供房屋租赁服务 5 年，服务华人房东。跟进 House 整租、分租及公寓招租，负责租客沟通与日常租务管理。',
    bioEn: 'Five years providing rental services in Melbourne for Chinese-speaking property owners. Handles whole-house, room and apartment lettings, tenant communication and day-to-day tenancy management.' },
  { id: 'judy-liu', zh: '刘燕', en: 'Judy Liu', city: 'Brisbane', cityZh: '布里斯班',
    lineZh: '豪宅与豪华公寓出租', lineEn: 'Luxury house and apartment lettings',
    bioZh: '在布里斯班提供豪宅与豪华公寓出租服务，服务华人房东。跟进房源推广、租客筛选与日常管理，重视及时沟通和物业照料。',
    bioEn: 'Works with Chinese-speaking owners on luxury house and apartment lettings in Brisbane, following through on property marketing, tenant screening and day-to-day management with attentive care and timely communication.' },
];

export default function Team() {
  const { L } = useI18n();
  const enquire = useEnquiry();
  const [filter, setFilter] = useState('');
  const filters = [['', '全部', 'Everyone'], ['Sydney', '悉尼', 'Sydney'], ['Melbourne', '墨尔本', 'Melbourne'], ['Perth', '珀斯', 'Perth'], ['Brisbane', '布里斯班', 'Brisbane']];
  const shown = MEMBERS.filter((m) => !filter || m.city === filter);
  return (
    <section className="ds-sec team-section" id="team" aria-labelledby="team-title">
      <div className="wrap">
        <div className="ds-head">
          <div>
            <p className="ds-kicker">{L('团队成员', 'Our people')}</p>
            <h2 id="team-title">{L('认识为您跟进的人', 'Meet the people behind the work')}</h2>
          </div>
          <div className="ds-chips" role="group" aria-label={L('按服务地区筛选成员', 'Filter team by service area')}>
            {filters.map(([value, zh, en]) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {L(zh, en)}
              </button>
            ))}
          </div>
        </div>
        <div className="ds-team">
          {shown.map((m) => (
            <article className="ds-member" key={m.id}>
              <div className="ds-member-photo">
                <SmartImg src={`/team/${m.id}.webp`} alt={m.en} position="50% 20%" />
              </div>
              <div className="ds-member-copy">
                <p className="ds-member-city">
                  <MapPin size={14} aria-hidden />
                  {L(m.cityZh, m.city || 'Australia')}
                </p>
                <h3>
                  {L(m.zh, m.en)}
                  <span>{L(m.en, m.zh)}</span>
                </h3>
                <p className="ds-member-line">{L(m.lineZh, m.lineEn)}</p>
                <p className="ds-member-bio">{L(m.bioZh, m.bioEn)}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="ds-team-cta">
          <p>{L('想让团队跟进您的房子？留下城市和需求，我们安排对应同事联系您。', 'Want our team to look after your property? Tell us the city and what you need, and the right person will be in touch.')}</p>
          <button type="button" className="btn btn-primary" onClick={() => enquire({ city: filter || undefined, service: 'management' })}>
            {L('表单咨询', 'Enquire via form')}
            <ArrowUpRight size={18} aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
