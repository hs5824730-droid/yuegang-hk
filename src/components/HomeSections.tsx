import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, FileSignature, Globe2, Languages, MessageSquareText, PhoneCall, Plus, Sparkles, Truck } from 'lucide-react';
import { formatMonth, useConfig, useI18n } from '../i18n';
import { useEnquiry } from './Enquiry';

/** Prominent but short: the launch offers, linking to full details and straight to the form. */
export function OfferBanner() {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const end = formatMonth(config.promotion.endMonth, lang);
  return <section className="home-offer" aria-labelledby="home-offer-title"><div className="wrap">
    <div className="home-offer-card">
      <div className="home-offer-copy">
        <span className="home-offer-tag"><Sparkles size={15} aria-hidden />{L('限时活动', 'Limited time')}</span>
        <h2 id="home-offer-title">{L('第一套房免出租佣金，第二套半价', 'First property: no letting commission. Second: half price.')}</h2>
        <p><Truck size={16} aria-hidden />{L(`出租还送免费搬家。活动至 ${end}，以咨询确认为准。`, `Free moving included with letting. Until ${end}; terms confirmed when you enquire.`)}</p>
      </div>
      <div className="home-offer-actions">
        <Link className="btn btn-primary" to="/?service=rent&offer=1">{L('立即咨询', 'Enquire now')}<ArrowRight size={17} aria-hidden /></Link>
        <Link className="btn btn-line" to="/offer">{L('查看限时优惠', 'See the offers')}</Link>
      </div>
    </div>
  </div></section>;
}

/** Written for each audience in its own language rather than translated line by line. */
export function LanguageService() {
  const { L, lang } = useI18n();
  const cards = lang === 'zh'
    ? [
        { icon: <Languages />, t: '华人房东：全程中文', d: '合同条款、维修报价、租客情况，都用中文给您讲明白。委托、看报告、确认决定，在手机上就能完成。' },
        { icon: <Globe2 />, t: '英文客户也欢迎', d: '习惯用英文的房东，同样可以委托出租、托管、买卖和置业顾问服务，全程由英文对接。' },
      ]
    : [
        { icon: <Globe2 />, t: 'English-speaking owners', d: 'Letting, ongoing management, buying and selling, and property services — handled end to end in English, with clear reports and quotes from one point of contact.' },
        { icon: <Languages />, t: 'Prefer Chinese? Also covered', d: 'The same services are available fully in Chinese, including appointment, reports and approvals by phone.' },
      ];
  return <section className="section home-lang"><div className="wrap">
    <div className="section-head"><h2>{L('中文、英文，都能委托', 'Service in English — or Chinese')}</h2><p>{L('用您最习惯的语言，把房子的事交给我们。', 'Work with us in the language that suits you.')}</p></div>
    <ul className="lang-cards">{cards.map((c) => <li key={c.t}><span className="lang-icon" aria-hidden>{c.icon}</span><div><h3>{c.t}</h3><p>{c.d}</p></div></li>)}</ul>
  </div></section>;
}

export function HomeSteps() {
  const { L } = useI18n();
  const enquire = useEnquiry();
  const steps = [
    { icon: <MessageSquareText />, t: L('点「委托咨询」，填写表单', 'Tap “Enquire” and send the form'), d: L('大约 1 分钟：留下联系方式和房屋基本情况就可以。', 'About a minute: just your contact details and the basics of the property.'), cta: true },
    { icon: <PhoneCall />, t: L('助理联系您', 'An assistant gets in touch'), d: L('了解房屋和您的需求，一起确认方案和费用。', 'We learn about the property and what you need, then agree the plan and fees with you.') },
    { icon: <FileSignature />, t: L('签署委托', 'Sign the appointment'), d: L('服务内容和费用都写进委托协议，确认后再开始。', 'Scope and fees go into the written agreement before anything starts.') },
    { icon: <ClipboardCheck />, t: L('开始服务，定期反馈', 'We get started and keep you posted'), d: L('开始招租、托管或其他服务，进展定期告诉您。', 'Letting, management or other services begin, with regular updates to you.') },
  ];
  return <section className="section home-steps" id="start"><div className="wrap">
    <div className="section-head"><h2>{L('委托很简单，四步就好', 'Four simple steps')}</h2><p>{L('先聊一聊，觉得合适再委托。', 'It starts with a chat — appoint us only if it feels right.')}</p></div>
    <ol className="steps-line">{steps.map((s, i) => <li key={s.t}>
      <span className="steps-n">{i + 1}</span>
      <div className="steps-body">
        <h3><span className="steps-icon" aria-hidden>{s.icon}</span>{s.t}</h3>
        <p>{s.d}</p>
        {s.cta && <button type="button" className="btn btn-primary btn-sm" onClick={() => enquire({ service: 'letting' })}>{L('委托咨询', 'Enquire')}<ArrowRight size={16} aria-hidden /></button>}
      </div>
    </li>)}</ol>
  </div></section>;
}

export function HomeFaq() {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const end = formatMonth(config.promotion.endMonth, lang);
  const items = [
    [L('费用怎么收？', 'How are fees charged?'), L('出租佣金和长期托管的管理费分开计算。具体金额和收费方式跟房子情况、服务范围有关，助理会在委托前书面说明，确认后再开始。', 'Letting commission and ongoing management fees are separate. The amounts depend on the property and the services you choose, and your assistant sets them out in writing before you appoint us.')],
    [L('限时优惠怎么用？', 'How do the limited-time offers work?'), L(`同一位房东委托出租的第一套房免出租佣金，第二套半价，出租还配套免费搬家，活动至 ${end}。管理费不在优惠范围内。咨询时告诉助理即可，具体以确认为准。`, `For the same owner, the first property has no letting commission and the second is half price, with free moving included — until ${end}. Management fees aren’t included. Just mention it when you enquire; terms are confirmed then.`)],
    [L('人不在澳洲，可以委托吗？', 'Can I appoint you from overseas?'), L('可以。看房、交接、巡检这些需要到场的事，由当地团队处理；您通过电话、WhatsApp 或报告了解进展，需要决定的事情再确认。', 'Yes. Viewings, handovers and inspections are handled by our local team; you follow progress by phone, messages or reports and confirm the decisions that need you.')],
    [L('多久能租出去？', 'How long does it take to find a tenant?'), L('跟地区、房屋状况、租金定价和季节都有关系，没法给统一的时间。我们会先参考同区域房源给出租金建议，帮您把房子准备好，再安排推广和看房。具体以咨询时的评估为准。', 'It depends on the area, the property, the asking rent and the season, so there’s no single answer. We advise on rent from comparable listings, help prepare the home and then market it. Your assistant can give a view once they know the property.')],
    [L('长期托管包括什么？', 'What does ongoing management include?'), L('一般包括招租的全部工作，加上租期内的租金跟进、租客日常联络、报修处理与维修协调、定期巡检，以及续租或退租交接。具体范围写在委托协议里。', 'Generally everything in letting, plus rent follow-up, day-to-day tenant contact, repair requests and trades, routine inspections, and renewals or end-of-lease handover. The exact scope is set out in your agreement.')],
    [L('房子需要维修怎么办？', 'What happens when something needs repairing?'), L('选择长期托管时，租客报修由我们接收，安排维修方上门。小额维修按协议约定的授权处理，较大支出会先跟您确认再做。', 'Under management we take the repair request and arrange a tradesperson. Small jobs follow the authority agreed in writing; anything larger is confirmed with you first.')],
    [L('可以只招租、不托管吗？', 'Can I choose letting only?'), L('可以。仅招租包括出租准备、推广看房、申请筛选和签约入住交接；租客入住后，日常事务由您自己处理。之后想改为长期托管，也可以再沟通。', 'Yes. Letting only covers preparation, marketing and viewings, applications, and the lease and move-in. After that you manage the tenancy yourself — and you can switch to management later.')],
    [L('其他城市也能服务吗？', 'Do you cover other cities?'), L('我们的重点城市是墨尔本、悉尼、珀斯、阿德莱德、堪培拉和布里斯班，但不限于这些地方。其他城市的房子也欢迎来咨询，我们会根据情况说明能怎么安排。', 'Our focus cities are Melbourne, Sydney, Perth, Adelaide, Canberra and Brisbane, but we’re not limited to them. Get in touch about other areas and we’ll explain what we can arrange.')],
  ];
  return <section className="section home-faq"><div className="wrap">
    <div className="section-head split-head"><div><h2>{L('您可能还想问', 'You might also ask')}</h2><p>{L('点开看答案；没找到的，直接问助理。', 'Tap a question to open it. Can’t find yours? Ask our assistant.')}</p></div><Link className="textlink" to="/services">{L('更多服务说明', 'More about our services')}<ArrowRight size={16} aria-hidden /></Link></div>
    <div className="faq-cards">{items.map(([q, a]) => <details key={q} className="faq-card"><summary><span>{q}</span><Plus size={18} aria-hidden className="faq-card-icon" /></summary><p>{a}</p></details>)}</div>
  </div></section>;
}
