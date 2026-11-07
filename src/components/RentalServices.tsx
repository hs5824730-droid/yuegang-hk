import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, KeyRound, MessagesSquare, Percent, Truck, UserRoundCheck, Wrench } from 'lucide-react';
import { formatMonth, useConfig, useI18n } from '../i18n';
import { SectionIndex } from './ds';
import PlanCompare from './PlanCompare';
import { useEnquiry } from './Enquiry';
import { Reveal, SmartImg } from './ui';
import { OfferReceipt, PageHero, QAGrid, SectionHead } from './v2/blocks';

/** Letting & management. Photos are credited Unsplash images (see /credits); none are our own listings. */
export default function RentalServices() {
  const { L } = useI18n();
  const enquire = useEnquiry();

  const stages = [
    {
      img: '/img/renovation/2.webp',
      alt: L('整潔嘅廚房（示意）', 'A tidy kitchen (illustrative)'),
      step: L('出租前準備', 'Prepare the home'),
      title: L('先將單位同計劃準備好', 'Get the home ready to let'),
      text: L('一齊睇樓況同附近租金，商量清潔或小修；準備清單、租金建議同費用都俾你講清楚。', 'We review the home and local rents with you and agree any cleaning or small repairs. You get a preparation list, rent guidance and the fees.'),
      decide: L('做邊啲、花幾多，由你確認。', 'You approve the work and spending.'),
    },
    {
      img: '/img/renovation/8.webp',
      alt: L('明亮嘅客廳（示意）', 'A bright living room (illustrative)'),
      step: L('推廣同篩揀', 'Market & screen'),
      title: L('搵啱嘅租客，唔止係掛出去', 'The right tenant, not just any tenant'),
      text: L('整理照片同樓盤介紹，安排推廣同睇樓，認真核對申請；睇樓反饋同申請情況都話你。', 'We prepare the listing, run marketing and viewings, check applications properly and tell you how it went.'),
      decide: L('租俾邊個、咩條件，由你決定。', 'You choose the tenant and the terms.'),
    },
    {
      img: '/img/renovation/hk-living.webp',
      alt: L('整理好嘅客廳（示意）', 'A prepared living room (illustrative)'),
      step: L('簽約同入住', 'Lease & move in'),
      title: L('由簽約到交鑰匙，將入住接好', 'From signing to keys'),
      text: L('溝通租約同入住時間，整理房況記錄，安排鑰匙交收；進度你隨時睇到。', 'We coordinate the lease and move-in date, the condition record and the keys, and keep you posted.'),
      decide: L('租約條件由你確認；入住搬屋可按優惠一齊安排。', 'You confirm the lease; moving help under the offer can be arranged too.'),
    },
  ];

  const care = [
    { Icon: MessagesSquare, title: L('租金同租客嘅事，即時同你講', 'Rent and tenant questions, kept on top of'), text: L('跟進租金同租客日常查詢；需要調整或重要決定時先同你商量。', 'We follow up rent and tenant questions; changes and big decisions are discussed with you first.') },
    { Icon: Wrench, title: L('小問題即時跟進，大支出先商量', 'Small repairs handled, big costs discussed first'), text: L('協調報修同約定巡檢，反饋房況同進度；重大支出按你確認嘅授權推進。', 'We coordinate repairs and agreed inspections and report back; major spending follows the limits you set.') },
    { Icon: CalendarClock, title: L('租約快到期，提前安排下一步', 'Lease ending? We plan ahead'), text: L('跟進續租意向，討論租金同條件；如需退租，協調檢查同鑰匙交回。', 'We follow up renewals and terms with you; if the tenant leaves, we handle the exit check and keys.') },
  ];

  const faq: [string, string][] = [
    [L('開始委託前，需要先做咩？', 'What happens before I appoint you?'), L('話我哋地區、地址或區域，同埋想只放租定係租務管理。了解房況後說明準備事項、服務範圍同費用，確認合適再籤委託。', 'Tell us the city, address or suburb, and which service you want. We explain preparation, scope and fees before you decide.')],
    [L('出租前嘅清潔、維修費用點樣算？', 'How are cleaning and repairs paid for?'), L('呢類支出同出租佣金、管理費分開說明；先溝通報價同授權，再按確認範圍推進。', 'These are separate from letting commission and management fees, and agreed with you before any work.')],
    [L('單位正喺其他代理管理，可以轉嚟嗎？', 'Can I transfer from another agency?'), L('目前唔接由其他代理轉嚟嘅出租或託管委託。可以先說明房屋現狀，我哋確認能否安排。', 'We do not currently take over letting or management from another agency. Tell us about the property and we will confirm.')],
    [L('免費搬屋點樣安排？', 'How does the free moving help work?'), L('免費搬屋係出租配套，用於入住該房屋嘅業主或租客；區域、次數同安排由團隊確認。', 'Free moving comes with letting, for the owner or tenant moving into that property. Areas, number of moves and timing are confirmed with our team.')],
  ];

  const index = [
    { id: 'rental-offer', label: L('業主優惠', 'Owner offer') },
    { id: 'letting', label: L('放租三步', 'Letting') },
    { id: 'management', label: L('租務管理', 'Management') },
    { id: 'service-options', label: L('兩種委託對比', 'Compare') },
    { id: 'rental-faq', label: L('常見問題', 'FAQ') },
  ];

  return (
    <div className="v-page rental-product services-page">
      <PageHero
        kicker={L('放租同管理', 'Letting & management')}
        title={<>{L('單位租出去，', 'Let your home,')}<em>{L('都有人一直睇住。', 'and have it looked after.')}</em></>}
        lead={L('只委託放租，或由放租到整個租期持續託管。粵語、普通話、英文都講得，本地團隊到場處理。', 'Letting only, or care through the whole tenancy. Chinese or English, with a local team on site.')}
        actions={<>
          <button type="button" className="btn btn-primary rp-letting-cta" onClick={() => enquire({ service: 'letting' })}>{L('查詢只放租', 'Letting enquiry')}<ArrowRight size={18} aria-hidden /></button>
          <button type="button" className="btn btn-line rp-management-cta" onClick={() => enquire({ service: 'management' })}>{L('查詢租務管理', 'Management enquiry')}</button>
        </>}
        aside={<OfferReceipt className="v-hero-receipt" />}
        bg="/img/renovation/8.webp"
        bgPos="50% 60%"
      />

      <SectionIndex items={index} label={L('本頁內容', 'On this page')} />

      <OfferSection />

      <section className="v-sec rp-section" id="letting" aria-labelledby="rp-letting-title">
        <div className="wrap">
          <SectionHead kicker={L('兩種委託都包含', 'Included in both')} title={L('放租三步，每一步都講清楚', 'Three letting stages, each one explained')} id="rp-letting-title" lead={L('準備、推廣同交收我哋嚟做；關鍵決定始終由你嚟做。', 'We prepare, market and hand over. The key decisions stay with you.')} />
          <ol className="v-stages rp-stage-list">
            {stages.map((s, i) => (
              <Reveal as="li" key={s.step} className="v-stage" delay={i * 80}>
                <figure>
                  <SmartImg src={s.img} alt={s.alt} />
                  <span className="v-stage-n">{String(i + 1).padStart(2, '0')}</span>
                </figure>
                <div>
                  <p className="v-kicker">{s.step}</p>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  <p className="v-decide"><UserRoundCheck size={17} aria-hidden />{s.decide}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="v-sec rp-management" id="management" aria-labelledby="rp-management-title">
        <div className="wrap">
          <div className="v-care">
            <div className="v-care-copy">
              <p className="v-kicker">{L('租務管理', 'Ongoing management')}</p>
              <h2 id="rp-management-title">{L('租出去之後，日常都交俾我哋', 'After move-in, the day-to-day is ours')}</h2>
              <p>{L('包含放租三步，並喺整個租期內持續跟進。', 'Everything in the three stages, then care for the whole tenancy.')}</p>
              <button type="button" className="btn btn-primary rp-management-cta" onClick={() => enquire({ service: 'management' })}>{L('查詢租務管理', 'Enquire about management')}<ArrowRight size={18} aria-hidden /></button>
              <figure className="v-care-photo">
                <SmartImg src="/img/hk/whampoa.webp" alt={L('香港住宅屋苑（示意）', 'A Hong Kong housing estate (illustrative)')} position="50% 55%" />
              </figure>
            </div>
            <ul className="v-care-list">
              {care.map(({ Icon, title, text }, i) => (
                <Reveal as="li" key={title} delay={i * 80}>
                  <span className="v-ico"><Icon size={22} aria-hidden /></span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="v-sec v-sec-sage" id="service-options" aria-labelledby="rp-compare-title">
        <div className="wrap v-narrow">
          <SectionHead kicker={L('兩種委託', 'Two ways to appoint us')} title={L('自己管，定係交俾我哋管？', 'Manage it yourself, or leave it to us?')} id="rp-compare-title" />
          <PlanCompare />
        </div>
      </section>

      <section className="v-sec" id="rental-faq" aria-labelledby="rp-faq-title">
        <div className="wrap">
          <SectionHead kicker={L('常見問題', 'FAQ')} title={L('開始前，先講清楚', 'A few things to clear up first')} id="rp-faq-title" />
          <QAGrid items={faq} />
        </div>
      </section>
    </div>
  );
}

/** The owner letting offer with its limits; shared by /services and /offer. */
export function OfferSection({ compact = false }: { compact?: boolean }) {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const enquire = useEnquiry();
  const end = formatMonth(config.promotion.endMonth, lang);
  const items = [
    { Icon: KeyRound, v: 'HK$0', t: L('首個單位免出租佣金', 'No letting fee on your first property') },
    { Icon: Percent, v: L('半價', '50%'), t: L('第二個單位出租佣金半價', 'Half the letting fee on your second') },
    { Icon: Truck, v: L('免費', 'Free'), t: L('出租配套免費搬屋', 'Free moving with letting') },
  ];
  return (
    <section className={`v-sec v-offer rp-offer ${compact ? 'offer-compact' : ''}`} id="rental-offer" aria-labelledby="rp-offer-title">
      <div className="wrap">
        <div className="v-offer-panel">
          <div className="v-offer-copy">
            <p className="v-kicker">{L(`業主優惠 · 至 ${end}`, `Owner offer · until ${end}`)}</p>
            <h2 id="rp-offer-title">{L('減價唔減服務', 'Lower fees, same service')}</h2>
            <p>{L('同一位業主，按委託出租嘅順序計算。', 'For one owner, counted in the order properties are appointed for letting.')}</p>
          </div>
          <ul className="v-offer-items">
            {items.map(({ Icon, v, t }, i) => (
              <Reveal as="li" key={t} delay={compact ? 0 : i * 70}>
                <Icon size={20} aria-hidden />
                <strong>{v}</strong>
                <span>{t}</span>
              </Reveal>
            ))}
          </ul>
          <div className="v-offer-foot">
            <p>{L('優惠只針對出租佣金，唔係免租金；租務管理管理費另計，買賣佣金及其他費用唔減免。', 'Letting commission only — not free rent. Management fees are separate; sales commission and other costs are not discounted.')}</p>
            <div className="v-actions">
              <button type="button" className="btn btn-primary rp-offer-cta" onClick={() => enquire({ service: 'letting', offer: true })}>{L('查詢呢項優惠', 'Ask about the offer')}<ArrowRight size={18} aria-hidden /></button>
              {compact && <Link className="btn btn-line" to="/offer">{L('優惠說明', 'Offer details')}</Link>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
