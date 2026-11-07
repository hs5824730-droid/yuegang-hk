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
        <span className="home-offer-tag"><Sparkles size={15} aria-hidden />{L('限時活動', 'Limited time')}</span>
        <h2 id="home-offer-title">{L('第一層樓免出租佣金，第二個單位半價', 'First property: no letting commission. Second: half price.')}</h2>
        <p><Truck size={16} aria-hidden />{L(`出租仲送免費搬屋。活動至 ${end}，以查詢確認為準。`, `Free moving included with letting. Until ${end}; terms confirmed when you enquire.`)}</p>
      </div>
      <div className="home-offer-actions">
        <Link className="btn btn-primary" to="/?service=rent&offer=1">{L('即刻查詢', 'Enquire now')}<ArrowRight size={17} aria-hidden /></Link>
        <Link className="btn btn-line" to="/offer">{L('查睇限時優惠', 'See the offers')}</Link>
      </div>
    </div>
  </div></section>;
}

/** Written for each audience in its own language rather than translated line by line. */
export function LanguageService() {
  const { L, lang } = useI18n();
  const cards = lang === 'zh'
    ? [
        { icon: <Languages />, t: '華人業主：全程中文', d: '合同條款、維修報價、租客情況，都用中文俾你講明白。委託、睇報告、確認決定，在手機上就能完成。' },
        { icon: <Globe2 />, t: '英文客戶都歡迎', d: '習慣用英文嘅業主，同樣可以委託出租、託管、買賣同置業顧問服務，全程由英文對接。' },
      ]
    : [
        { icon: <Globe2 />, t: 'English-speaking owners', d: 'Letting, ongoing management, buying and selling, and property services — handled end to end in English, with clear reports and quotes from one point of contact.' },
        { icon: <Languages />, t: 'Prefer Chinese? Also covered', d: 'The same services are available fully in Chinese, including appointment, reports and approvals by phone.' },
      ];
  return <section className="section home-lang"><div className="wrap">
    <div className="section-head"><h2>{L('中文、英文，都能委託', 'Service in English — or Chinese')}</h2><p>{L('用你最習慣嘅語言，將單位嘅事交俾我哋。', 'Work with us in the language that suits you.')}</p></div>
    <ul className="lang-cards">{cards.map((c) => <li key={c.t}><span className="lang-icon" aria-hidden>{c.icon}</span><div><h3>{c.t}</h3><p>{c.d}</p></div></li>)}</ul>
  </div></section>;
}

export function HomeSteps() {
  const { L } = useI18n();
  const enquire = useEnquiry();
  const steps = [
    { icon: <MessageSquareText />, t: L('點「委託查詢」，填寫表單', 'Tap “Enquire” and send the form'), d: L('大約 1 分鐘：留低聯絡方式同房屋基本情況就可以。', 'About a minute: just your contact details and the basics of the property.'), cta: true },
    { icon: <PhoneCall />, t: L('同事聯絡你', 'An assistant gets in touch'), d: L('了解房屋同你嘅需求，一齊確認方案同費用。', 'We learn about the property and what you need, then agree the plan and fees with you.') },
    { icon: <FileSignature />, t: L('簽署委託', 'Sign the appointment'), d: L('服務內容同費用都寫進委託協議，確認後再開始。', 'Scope and fees go into the written agreement before anything starts.') },
    { icon: <ClipboardCheck />, t: L('開始服務，定期反饋', 'We get started and keep you posted'), d: L('開始放租、託管或其他服務，進展定期話你。', 'Letting, management or other services begin, with regular updates to you.') },
  ];
  return <section className="section home-steps" id="start"><div className="wrap">
    <div className="section-head"><h2>{L('委託好簡單，四步就好', 'Four simple steps')}</h2><p>{L('先傾一傾，覺得合適再委託。', 'It starts with a chat — appoint us only if it feels right.')}</p></div>
    <ol className="steps-line">{steps.map((s, i) => <li key={s.t}>
      <span className="steps-n">{i + 1}</span>
      <div className="steps-body">
        <h3><span className="steps-icon" aria-hidden>{s.icon}</span>{s.t}</h3>
        <p>{s.d}</p>
        {s.cta && <button type="button" className="btn btn-primary btn-sm" onClick={() => enquire({ service: 'letting' })}>{L('委託查詢', 'Enquire')}<ArrowRight size={16} aria-hidden /></button>}
      </div>
    </li>)}</ol>
  </div></section>;
}

export function HomeFaq() {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const end = formatMonth(config.promotion.endMonth, lang);
  const items = [
    [L('費用點樣收？', 'How are fees charged?'), L('出租佣金同租務管理嘅管理費分開計算。具體金額同收費方式跟單位情況、服務範圍有關，同事會喺委託前書面說明，確認後再開始。', 'Letting commission and ongoing management fees are separate. The amounts depend on the property and the services you choose, and your assistant sets them out in writing before you appoint us.')],
    [L('限時優惠點樣用？', 'How do the limited-time offers work?'), L(`同一位業主委託出租嘅第一層樓免出租佣金，第二個單位半價，出租仲配套免費搬屋，活動至 ${end}。管理費唔喺優惠範圍內。查詢時話同事即可，具體以確認為準。`, `For the same owner, the first property has no letting commission and the second is half price, with free moving included — until ${end}. Management fees aren’t included. Just mention it when you enquire; terms are confirmed then.`)],
    [L('人唔喺香港，可以委託嗎？', 'Can I appoint you from overseas?'), L('可以。睇樓、交收、巡檢呢啲需要到場嘅事，由本地團隊處理；你通過電話、WhatsApp 或報告了解進展，需要決定嘅事情再確認。', 'Yes. Viewings, handovers and inspections are handled by our local team; you follow progress by phone, messages or reports and confirm the decisions that need you.')],
    [L('多久能租出去？', 'How long does it take to find a tenant?'), L('跟地區、房屋狀況、租金定價同季節都有關係，沒法俾統一嘅時間。我哋會先參考同區域樓盤俾出租金建議，幫你將單位準備好，再安排推廣同睇樓。具體以查詢時嘅評估為準。', 'It depends on the area, the property, the asking rent and the season, so there’s no single answer. We advise on rent from comparable listings, help prepare the home and then market it. Your assistant can give a view once they know the property.')],
    [L('租務管理包括咩？', 'What does ongoing management include?'), L('一般包括放租嘅全部工作，加上租期內嘅租金跟進、租客日常聯絡、報修處理同維修協調、定期巡檢，同埋續租或退租交收。具體範圍寫喺委託協議裏。', 'Generally everything in letting, plus rent follow-up, day-to-day tenant contact, repair requests and trades, routine inspections, and renewals or end-of-lease handover. The exact scope is set out in your agreement.')],
    [L('單位需要維修點樣辦？', 'What happens when something needs repairing?'), L('揀租務管理時，租客報修由我哋接收，安排維修方上門。小額維修按協議約定嘅授權處理，較大支出會先跟你確認再做。', 'Under management we take the repair request and arrange a tradesperson. Small jobs follow the authority agreed in writing; anything larger is confirmed with you first.')],
    [L('可以只放租、不託管嗎？', 'Can I choose letting only?'), L('可以。只放租包括出租準備、推廣睇樓、申請篩揀同簽約交收入住；租客入住後，日常事務由你自己處理。之後想改為租務管理，都可以再溝通。', 'Yes. Letting only covers preparation, marketing and viewings, applications, and the lease and move-in. After that you manage the tenancy yourself — and you can switch to management later.')],
    [L('其他地區都可以服務嗎？', 'Do you cover other cities?'), L('我哋嘅重點地區係墨爾本、悉尼、珀斯、阿德萊德、堪培拉同布里斯班，但唔限於呢啲地方。其他地區嘅單位都歡迎來查詢，我哋會根據情況說明能點樣安排。', 'Our focus cities are Melbourne, Sydney, Perth, Adelaide, Canberra and Brisbane, but we’re not limited to them. Get in touch about other areas and we’ll explain what we can arrange.')],
  ];
  return <section className="section home-faq"><div className="wrap">
    <div className="section-head split-head"><div><h2>{L('你可能仲想問', 'You might also ask')}</h2><p>{L('點開睇答案；沒搵到嘅，直接問同事。', 'Tap a question to open it. Can’t find yours? Ask our assistant.')}</p></div><Link className="textlink" to="/services">{L('更多服務說明', 'More about our services')}<ArrowRight size={16} aria-hidden /></Link></div>
    <div className="faq-cards">{items.map(([q, a]) => <details key={q} className="faq-card"><summary><span>{q}</span><Plus size={18} aria-hidden className="faq-card-icon" /></summary><p>{a}</p></details>)}</div>
  </div></section>;
}
