import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Compass, Home as HomeIcon, Signpost, UserRoundCheck } from 'lucide-react';
import { useEnquiry } from '../components/Enquiry';
import { Reveal, SmartImg } from '../components/ui';
import { PageHero, QAGrid, SectionHead } from '../components/v2/blocks';
import { useI18n } from '../i18n';
import { salesClientCases } from '../content/sales-cases';

export default function BuySell() {
  const { L, pick } = useI18n();
  const enquire = useEnquiry();
  const [search] = useSearchParams();
  const legacyListing = search.get('listing');
  if (legacyListing && /^reference-\d{5,12}$/.test(legacyListing)) {
    const next = new URLSearchParams(search);
    next.set('kind', 'sold');
    return <Navigate to={'/viewings?' + next.toString()} replace />;
  }

  const paths = [
    {
      id: 'selling' as const,
      kicker: L('卖房', 'Selling'),
      title: L('先听您的打算', 'We start with your plans'),
      image: '/img/renovation/1.webp',
      alt: L('明亮的客厅与楼梯（示意）', 'A bright living room and staircase (illustrative)'),
      lead: L('想卖到什么价、什么时候出售，先听您的打算，再一起安排推广和看房。', 'Tell us your price and timing, then we plan marketing and viewings together.'),
      tasks: [L('了解房屋现状、出售目标与时间', 'Understand the home, your goals and timing'), L('沟通估价方式、推广方案及费用', 'Discuss appraisal, marketing and fees'), L('安排看房，整理反馈并沟通报价', 'Run viewings, collate feedback, discuss offers'), L('按约定跟进成交与交接', 'Follow through to settlement as agreed')],
      owner: L('价格预期、报价取舍和重要条件，由您决定。', 'You decide the price, the offers and the key terms.'),
      cta: L('我想卖房', 'I want to sell'),
    },
    {
      id: 'buying' as const,
      kicker: L('买房', 'Buying'),
      title: L('先聊清预算和需要', 'Budget and needs first'),
      image: '/img/adelaide.jpg',
      alt: L('阿德莱德市中心（城市照片）', 'Adelaide city centre (city photo)'),
      lead: L('先聊清预算和生活需要，再筛选值得看的房子；看房后的疑问继续帮您跟进。', 'We start with budget and everyday needs, shortlist homes worth seeing and follow up your questions.'),
      tasks: [L('梳理城市、预算、房型与用途', 'Clarify city, budget, home type and use'), L('协助筛选，整理需要核实的信息', 'Shortlist and list what needs checking'), L('协调看房，跟进问题与反馈', 'Arrange viewings and follow up'), L('说明流程，按需求跟进后续', 'Explain the process and next steps')],
      owner: L('是否出价、条件和最终购买，由您决定。', 'You decide whether to offer and whether to buy.'),
      cta: L('我想买房', 'I want to buy'),
    },
  ];

  const scenarios = [
    { Icon: Signpost, need: L('准备出售现有住宅', 'Preparing to sell your home'), work: L('了解房况与时间，讨论推广、看房和报价。', 'Review the home and timing; plan marketing, viewings and offers.'), decision: L('确认出售预期与报价取舍。', 'Confirm expectations and how to respond to offers.') },
    { Icon: HomeIcon, need: L('为家人选择自住房', 'Choosing a home for your family'), work: L('整理区域、房型和生活需求，筛选并安排看房。', 'Set out area and lifestyle needs; shortlist and arrange viewings.'), decision: L('确定优先条件，决定看哪套、是否出价。', 'Set priorities; choose viewings and whether to offer.') },
    { Icon: Compass, need: L('先了解一个城市再买房', 'Getting to know a city first'), work: L('沟通预算与用途，梳理区域和房源信息。', 'Discuss budget and use; organise area and property information.'), decision: L('选择关注区域，确认购房范围。', 'Pick areas to explore and refine your brief.') },
  ];

  const faq: [string, string][] = [
    [L('还没确定时间或区域，可以先聊吗？', 'Can we talk before I know my timing or area?'), L('可以。先告诉我们房屋情况、城市和大致计划，我们帮您梳理下一步。', 'Yes. Share the home, the city and your plans, and we will help work out the next step.')],
    [L('服务范围与收费什么时候确认？', 'When are scope and fees agreed?'), L('免费咨询，买卖前期不收取服务费。服务范围与佣金在委托前书面确认；第三方费用另行说明。', 'Consultations are free, with no upfront service fee. Scope and commission are agreed in writing before you appoint us; third-party costs are explained separately.')],
    [L('在线看房里的已售记录是什么？', 'What are the sold records in online viewings?'), L('是公开市场的成交参考，用于了解区域与价格，不是我们经手的案例，也不表示房屋仍在出售。', 'Public market sales to help you understand areas and prices — not our own sales, and not for sale.')],
  ];

  return (
    <div className="v-page sales-service-page">
      <PageHero
        className="sales-hero"
        bg="/img/melbourne.jpg"
        bgPos="50% 60%"
        kicker={L('买卖房屋', 'Buying & selling')}
        title={<>{L('买房卖房，', 'Buying or selling')}<em>{L('从您的目标开始。', 'starts with your goals.')}</em></>}
        lead={L('先聊清楚价格预期、预算和时间，再一起安排推广、筛选和看房。', 'We talk through price, budget and timing, then plan marketing, shortlists and viewings with you.')}
        actions={<>
          <Link className="btn btn-primary sales-selling-cta" to="/selling-registration">{L('登记卖房需求', 'Register selling needs')}<ArrowRight size={18} aria-hidden /></Link>
          <Link className="btn btn-line sales-buying-cta" to="/buying-registration">{L('登记购房需求', 'Register buying needs')}</Link>
          <button type="button" className="btn btn-quiet" onClick={()=>enquire({service:'buy'})}>{L('先简短咨询','Start with a short enquiry')}</button>
        </>}
        aside={
          <div className="v-rate sales-fee-highlight">
            <p className="v-rate-big"><span>30%</span><small>{L('佣金比同行低', 'lower commission than competitors')}</small></p>
            <ul>
              <li><Check size={17} aria-hidden />{L('佣金比同行低30%', 'Commission 30% lower than competitors')}</li>
              <li><Check size={17} aria-hidden />{L('免费咨询', 'Free consultation')}</li>
              <li><Check size={17} aria-hidden />{L('买卖前期不收取服务费', 'No upfront service fee')}</li>
            </ul>
          </div>
        }
      />

      <section className="v-sec sales-paths" aria-labelledby="sales-paths-title">
        <div className="wrap">
          <SectionHead kicker={L('两种协助', 'Two kinds of help')} title={L('卖房和买房，我们分别做什么', 'What we do when you sell, and when you buy')} id="sales-paths-title" lead={L('具体工作写在这里；重要决定始终由您来做。', 'The work is set out here. The important decisions are yours.')} />
          <div className="v-paths">
            {paths.map((p, i) => (
              <Reveal as="article" key={p.id} className="v-path" delay={i * 90}>
                <span id={p.id} className="v-anchor" />
                <figure><SmartImg src={p.image} alt={p.alt} position="50% 55%" /></figure>
                <div className="v-path-body">
                  <p className="v-kicker">{p.kicker}</p>
                  <h3>{p.title}</h3>
                  <p>{p.lead}</p>
                  <ol className="v-steps">{p.tasks.map((t) => <li key={t}>{t}</li>)}</ol>
                  <p className="v-decide"><UserRoundCheck size={17} aria-hidden />{p.owner}</p>
                  <Link className={`btn btn-primary sales-${p.id}-cta`} to={'/'+p.id+'-registration'}>{p.id==='selling'?L('登记卖房需求','Register selling needs'):L('登记购房需求','Register buying needs')}<ArrowRight size={18} aria-hidden /></Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="v-sec v-sec-sage sales-scenarios" aria-labelledby="sales-scenes-title">
        <div className="wrap">
          <SectionHead kicker={L('服务场景', 'When people come to us')} title={L('您在哪个阶段，我们就从哪里开始', 'Wherever you are, we start from there')} id="sales-scenes-title" />
          <ul className="v-cards3">
            {scenarios.map(({ Icon, need, work, decision }, i) => (
              <Reveal as="li" key={need} delay={i * 70}>
                <span className="v-ico"><Icon size={22} aria-hidden /></span>
                <h3>{need}</h3>
                <p><strong>{L('我们做：', 'We do: ')}</strong>{work}</p>
                <p><strong>{L('您决定：', 'You decide: ')}</strong>{decision}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {salesClientCases.length > 0 && (
        <section className="v-sec sales-client-cases">
          <div className="wrap">
            <h2>{L('客户案例与反馈', 'Client work and feedback')}</h2>
            {salesClientCases.map((item) => (
              <article key={item.id}>
                <h3>{pick(item.need)}</h3>
                <p>{pick(item.process)}</p>
                <p>{pick(item.result)}</p>
                {item.feedback && <blockquote>{pick(item.feedback)}</blockquote>}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="v-sec sales-start" aria-labelledby="sales-start-title">
        <div className="wrap">
          <SectionHead kicker={L('怎么开始', 'How it starts')} title={L('三步开始，咨询免费', 'Three steps. The first conversation is free.')} id="sales-start-title" />
          <ol className="v-flow">
            {[
              [L('聊清楚计划', 'Talk through your plans'), L('确认城市、预算与时间。', 'Confirm the city, budget and timing.')],
              [L('确认范围与费用', 'Agree scope and fees'), L('服务范围和收费书面确认。', 'Scope and fees are agreed in writing.')],
              [L('按约定持续跟进', 'Follow through as agreed'), L('看房与报价进展持续沟通。', 'Viewings and offers are followed up with you.')],
            ].map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 80}>
                <span className="v-flow-n">{i + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </Reveal>
            ))}
          </ol>
          <Reveal className="v-ref">
            <div>
              <h3>{L('先看看区域成交参考', 'Look at local sales first')}</h3>
              <p>{L('在线看房里有公开市场的已成交记录，帮您了解区域和价格；它们不是我们经手的案例。', 'Online viewings include public market sales to help you understand areas and prices. They are not our own sales.')}</p>
            </div>
            <Link to="/viewings?kind=sold" className="btn btn-line sales-viewings">{L('去在线看房', 'Open online viewings')}<ArrowUpRight size={18} aria-hidden /></Link>
          </Reveal>
        </div>
      </section>

      <section className="v-sec v-sec-tight" aria-labelledby="sales-faq-title">
        <div className="wrap">
          <SectionHead kicker={L('常见问题', 'FAQ')} title={L('先了解这些', 'A few useful answers')} id="sales-faq-title" />
          <QAGrid items={faq} />
        </div>
      </section>
    </div>
  );
}
