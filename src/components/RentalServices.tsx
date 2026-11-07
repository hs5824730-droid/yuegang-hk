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
      alt: L('整洁的厨房（示意）', 'A tidy kitchen (illustrative)'),
      step: L('出租前准备', 'Prepare the home'),
      title: L('先把房子和计划准备好', 'Get the home ready to let'),
      text: L('一起看房况和附近租金，商量清洁或小修；准备清单、租金建议和费用都给您说明白。', 'We review the home and local rents with you and agree any cleaning or small repairs. You get a preparation list, rent guidance and the fees.'),
      decide: L('做哪些、花多少，由您确认。', 'You approve the work and spending.'),
    },
    {
      img: '/img/renovation/8.webp',
      alt: L('明亮的客厅（示意）', 'A bright living room (illustrative)'),
      step: L('推广与筛选', 'Market & screen'),
      title: L('找对的租客，不只是挂出去', 'The right tenant, not just any tenant'),
      text: L('整理照片和房源介绍，安排推广与看房，认真核对申请；看房反馈和申请情况都告诉您。', 'We prepare the listing, run marketing and viewings, check applications properly and tell you how it went.'),
      decide: L('租给谁、什么条件，由您决定。', 'You choose the tenant and the terms.'),
    },
    {
      img: '/img/renovation/5.webp',
      alt: L('整理好的客厅（示意）', 'A prepared living room (illustrative)'),
      step: L('签约与入住', 'Lease & move in'),
      title: L('从签约到交钥匙，把入住接好', 'From signing to keys'),
      text: L('沟通租约和入住时间，整理房况记录，安排钥匙交接；进度您随时看得到。', 'We coordinate the lease and move-in date, the condition record and the keys, and keep you posted.'),
      decide: L('租约条件由您确认；入住搬家可按优惠一起安排。', 'You confirm the lease; moving help under the offer can be arranged too.'),
    },
  ];

  const care = [
    { Icon: MessagesSquare, title: L('租金和租客的事，及时跟您说', 'Rent and tenant questions, kept on top of'), text: L('跟进租金和租客日常咨询；需要调整或重要决定时先与您商量。', 'We follow up rent and tenant questions; changes and big decisions are discussed with you first.') },
    { Icon: Wrench, title: L('小问题及时跟进，大支出先商量', 'Small repairs handled, big costs discussed first'), text: L('协调报修和约定巡检，反馈房况与进度；重大支出按您确认的授权推进。', 'We coordinate repairs and agreed inspections and report back; major spending follows the limits you set.') },
    { Icon: CalendarClock, title: L('租约快到期，提前安排下一步', 'Lease ending? We plan ahead'), text: L('跟进续租意向，讨论租金与条件；如需退租，协调检查和钥匙交回。', 'We follow up renewals and terms with you; if the tenant leaves, we handle the exit check and keys.') },
  ];

  const faq: [string, string][] = [
    [L('开始委托前，需要先做什么？', 'What happens before I appoint you?'), L('告诉我们城市、地址或区域，以及想仅招租还是长期托管。了解房况后说明准备事项、服务范围与费用，确认合适再签委托。', 'Tell us the city, address or suburb, and which service you want. We explain preparation, scope and fees before you decide.')],
    [L('出租前的清洁、维修费用怎么算？', 'How are cleaning and repairs paid for?'), L('这类支出与出租佣金、管理费分开说明；先沟通报价和授权，再按确认范围推进。', 'These are separate from letting commission and management fees, and agreed with you before any work.')],
    [L('房子正在其他中介管理，可以转来吗？', 'Can I transfer from another agency?'), L('目前不承接由其他中介转来的出租或托管委托。可以先说明房屋现状，我们确认能否安排。', 'We do not currently take over letting or management from another agency. Tell us about the property and we will confirm.')],
    [L('免费搬家怎么安排？', 'How does the free moving help work?'), L('免费搬家是出租配套，用于入住该房屋的房东或租客；区域、次数和安排由团队确认。', 'Free moving comes with letting, for the owner or tenant moving into that property. Areas, number of moves and timing are confirmed with our team.')],
  ];

  const index = [
    { id: 'rental-offer', label: L('房东优惠', 'Owner offer') },
    { id: 'letting', label: L('招租三步', 'Letting') },
    { id: 'management', label: L('长期托管', 'Management') },
    { id: 'service-options', label: L('两种委托对比', 'Compare') },
    { id: 'rental-faq', label: L('常见问题', 'FAQ') },
  ];

  return (
    <div className="v-page rental-product services-page">
      <PageHero
        kicker={L('出租与托管', 'Letting & management')}
        title={<>{L('房子租出去，', 'Let your home,')}<em>{L('也有人一直照看。', 'and have it looked after.')}</em></>}
        lead={L('只委托招租，或从招租到整个租期持续托管。中英文沟通，当地团队到场处理。', 'Letting only, or care through the whole tenancy. Chinese or English, with a local team on site.')}
        actions={<>
          <button type="button" className="btn btn-primary rp-letting-cta" onClick={() => enquire({ service: 'letting' })}>{L('咨询仅招租', 'Letting enquiry')}<ArrowRight size={18} aria-hidden /></button>
          <button type="button" className="btn btn-line rp-management-cta" onClick={() => enquire({ service: 'management' })}>{L('咨询长期托管', 'Management enquiry')}</button>
        </>}
        aside={<OfferReceipt className="v-hero-receipt" />}
        bg="/img/renovation/8.webp"
        bgPos="50% 60%"
      />

      <SectionIndex items={index} label={L('本页内容', 'On this page')} />

      <OfferSection />

      <section className="v-sec rp-section" id="letting" aria-labelledby="rp-letting-title">
        <div className="wrap">
          <SectionHead kicker={L('两种委托都包含', 'Included in both')} title={L('招租三步，每一步都说清楚', 'Three letting stages, each one explained')} id="rp-letting-title" lead={L('准备、推广和交接我们来做；关键决定始终由您来做。', 'We prepare, market and hand over. The key decisions stay with you.')} />
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
              <p className="v-kicker">{L('长期托管', 'Ongoing management')}</p>
              <h2 id="rp-management-title">{L('租出去以后，日常也交给我们', 'After move-in, the day-to-day is ours')}</h2>
              <p>{L('包含招租三步，并在整个租期内持续跟进。', 'Everything in the three stages, then care for the whole tenancy.')}</p>
              <button type="button" className="btn btn-primary rp-management-cta" onClick={() => enquire({ service: 'management' })}>{L('咨询长期托管', 'Enquire about management')}<ArrowRight size={18} aria-hidden /></button>
              <figure className="v-care-photo">
                <SmartImg src="/img/renovation/6.webp" alt={L('外墙维护（示意）', 'Exterior maintenance (illustrative)')} position="50% 55%" />
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
          <SectionHead kicker={L('两种委托', 'Two ways to appoint us')} title={L('自己管，还是交给我们管？', 'Manage it yourself, or leave it to us?')} id="rp-compare-title" />
          <PlanCompare />
        </div>
      </section>

      <section className="v-sec" id="rental-faq" aria-labelledby="rp-faq-title">
        <div className="wrap">
          <SectionHead kicker={L('常见问题', 'FAQ')} title={L('开始前，先说清楚', 'A few things to clear up first')} id="rp-faq-title" />
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
    { Icon: KeyRound, v: 'A$0', t: L('首套免出租佣金', 'No letting fee on your first property') },
    { Icon: Percent, v: L('半价', '50%'), t: L('第二套出租佣金半价', 'Half the letting fee on your second') },
    { Icon: Truck, v: L('免费', 'Free'), t: L('出租配套免费搬家', 'Free moving with letting') },
  ];
  return (
    <section className={`v-sec v-offer rp-offer ${compact ? 'offer-compact' : ''}`} id="rental-offer" aria-labelledby="rp-offer-title">
      <div className="wrap">
        <div className="v-offer-panel">
          <div className="v-offer-copy">
            <p className="v-kicker">{L(`房东优惠 · 至 ${end}`, `Owner offer · until ${end}`)}</p>
            <h2 id="rp-offer-title">{L('减价不减服务', 'Lower fees, same service')}</h2>
            <p>{L('同一位房东，按委托出租的顺序计算。', 'For one owner, counted in the order properties are appointed for letting.')}</p>
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
            <p>{L('优惠只针对出租佣金，不是免租金；长期托管管理费另计，买卖佣金及其他费用不减免。', 'Letting commission only — not free rent. Management fees are separate; sales commission and other costs are not discounted.')}</p>
            <div className="v-actions">
              <button type="button" className="btn btn-primary rp-offer-cta" onClick={() => enquire({ service: 'letting', offer: true })}>{L('咨询这项优惠', 'Ask about the offer')}<ArrowRight size={18} aria-hidden /></button>
              {compact && <Link className="btn btn-line" to="/offer">{L('优惠说明', 'Offer details')}</Link>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
