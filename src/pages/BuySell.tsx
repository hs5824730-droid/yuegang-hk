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
      kicker: L('賣樓', 'Selling'),
      title: L('先聽你嘅打算', 'We start with your plans'),
      image: '/img/hk/taikoo-shing.webp',
      alt: L('太古城屋苑（地區相片）', 'Taikoo Shing estate (district photo)'),
      lead: L('想賣到咩價、咩時候出售，先聽你嘅打算，再一齊安排推廣同睇樓。', 'Tell us your price and timing, then we plan marketing and viewings together.'),
      tasks: [L('了解房屋現狀、出售目標同時間', 'Understand the home, your goals and timing'), L('溝通估價方式、推廣方案及費用', 'Discuss appraisal, marketing and fees'), L('安排睇樓，整理反饋並溝通報價', 'Run viewings, collate feedback, discuss offers'), L('按約定跟進成交同交收', 'Follow through to settlement as agreed')],
      owner: L('價格預期、報價取捨同重要條件，由你決定。', 'You decide the price, the offers and the key terms.'),
      cta: L('我想賣樓', 'I want to sell'),
    },
    {
      id: 'buying' as const,
      kicker: L('買樓', 'Buying'),
      title: L('先傾清預算同需要', 'Budget and needs first'),
      image: '/img/hk/kowloon.webp',
      alt: L('九龍西環球貿易廣場（地區相片）', 'ICC, West Kowloon (district photo)'),
      lead: L('先傾清預算同生活需要，再篩揀值得睇嘅單位；睇樓後嘅疑問繼續幫你跟進。', 'We start with budget and everyday needs, shortlist homes worth seeing and follow up your questions.'),
      tasks: [L('梳理地區、預算、房型同用途', 'Clarify city, budget, home type and use'), L('協助篩揀，整理需要核實嘅資料', 'Shortlist and list what needs checking'), L('協調睇樓，跟進問題同反饋', 'Arrange viewings and follow up'), L('說明流程，按需求跟進後續', 'Explain the process and next steps')],
      owner: L('係咪出價、條件同最終購買，由你決定。', 'You decide whether to offer and whether to buy.'),
      cta: L('我想買樓', 'I want to buy'),
    },
  ];

  const scenarios = [
    { Icon: Signpost, need: L('準備出售現有住宅', 'Preparing to sell your home'), work: L('了解房況同時間，討論推廣、睇樓同報價。', 'Review the home and timing; plan marketing, viewings and offers.'), decision: L('確認出售預期同報價取捨。', 'Confirm expectations and how to respond to offers.') },
    { Icon: HomeIcon, need: L('為家人揀自住房', 'Choosing a home for your family'), work: L('整理區域、房型同生活需求，篩揀並安排睇樓。', 'Set out area and lifestyle needs; shortlist and arrange viewings.'), decision: L('確定優先條件，決定睇邊個單位、係咪出價。', 'Set priorities; choose viewings and whether to offer.') },
    { Icon: Compass, need: L('先了解一個地區再買樓', 'Getting to know a city first'), work: L('溝通預算同用途，梳理區域同樓盤資料。', 'Discuss budget and use; organise area and property information.'), decision: L('揀關注區域，確認置業範圍。', 'Pick areas to explore and refine your brief.') },
  ];

  const faq: [string, string][] = [
    [L('仲未確定時間或區域，可以先傾嗎？', 'Can we talk before I know my timing or area?'), L('可以。先話我哋房屋情況、地區同大致計劃，我哋幫你梳理下一步。', 'Yes. Share the home, the city and your plans, and we will help work out the next step.')],
    [L('服務範圍同收費咩時候確認？', 'When are scope and fees agreed?'), L('免費查詢，買賣前期唔收取服務費。服務範圍同佣金喺委託前書面確認；第三方費用另行說明。', 'Consultations are free, with no upfront service fee. Scope and commission are agreed in writing before you appoint us; third-party costs are explained separately.')],
    [L('網上睇樓裏嘅已售記錄係咩？', 'What are the sold records in online viewings?'), L('係公開市場嘅成交參考，用於了解區域同價格，唔係我哋經手嘅案例，都唔代表房屋仲喺度出售。', 'Public market sales to help you understand areas and prices — not our own sales, and not for sale.')],
  ];

  return (
    <div className="v-page sales-service-page">
      <PageHero
        className="sales-hero"
        bg="/img/hk/hk-island.webp"
        bgPos="50% 60%"
        kicker={L('買賣物業', 'Buying & selling')}
        title={<>{L('買樓賣樓，', 'Buying or selling')}<em>{L('由你嘅目標開始。', 'starts with your goals.')}</em></>}
        lead={L('先傾清楚價格預期、預算同時間，再一齊安排推廣、篩揀同睇樓。', 'We talk through price, budget and timing, then plan marketing, shortlists and viewings with you.')}
        actions={<>
          <Link className="btn btn-primary sales-selling-cta" to="/selling-registration">{L('登記賣樓需求', 'Register selling needs')}<ArrowRight size={18} aria-hidden /></Link>
          <Link className="btn btn-line sales-buying-cta" to="/buying-registration">{L('登記置業需求', 'Register buying needs')}</Link>
          <button type="button" className="btn btn-quiet" onClick={()=>enquire({service:'buy'})}>{L('先簡短查詢','Start with a short enquiry')}</button>
        </>}
        aside={
          <div className="v-rate sales-fee-highlight">
            <p className="v-rate-big"><span>HK$0</span><small>{L('未簽約，一蚊都唔收', 'nothing to pay before you sign')}</small></p>
            <ul>
              <li><Check size={17} aria-hidden />{L('佣金喺表格 3／表格 5 寫清楚', 'Commission written into Form 3 / Form 5')}</li>
              <li><Check size={17} aria-hidden />{L('免費市價參考同查冊', 'Free price guidance and land search')}</li>
              <li><Check size={17} aria-hidden />{L('成交之前唔收服務費', 'No fee before completion of the deal')}</li>
            </ul>
          </div>
        }
      />

      <section className="v-sec sales-paths" aria-labelledby="sales-paths-title">
        <div className="wrap">
          <SectionHead kicker={L('兩種協助', 'Two kinds of help')} title={L('賣樓同買樓，我哋分別做咩', 'What we do when you sell, and when you buy')} id="sales-paths-title" lead={L('具體工作寫喺呢度；重要決定始終由你嚟做。', 'The work is set out here. The important decisions are yours.')} />
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
                  <Link className={`btn btn-primary sales-${p.id}-cta`} to={'/'+p.id+'-registration'}>{p.id==='selling'?L('登記賣樓需求','Register selling needs'):L('登記置業需求','Register buying needs')}<ArrowRight size={18} aria-hidden /></Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="v-sec v-sec-sage sales-scenarios" aria-labelledby="sales-scenes-title">
        <div className="wrap">
          <SectionHead kicker={L('服務場景', 'When people come to us')} title={L('你喺邊個階段，我哋就由邊度開始', 'Wherever you are, we start from there')} id="sales-scenes-title" />
          <ul className="v-cards3">
            {scenarios.map(({ Icon, need, work, decision }, i) => (
              <Reveal as="li" key={need} delay={i * 70}>
                <span className="v-ico"><Icon size={22} aria-hidden /></span>
                <h3>{need}</h3>
                <p><strong>{L('我哋做：', 'We do: ')}</strong>{work}</p>
                <p><strong>{L('你決定：', 'You decide: ')}</strong>{decision}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {salesClientCases.length > 0 && (
        <section className="v-sec sales-client-cases">
          <div className="wrap">
            <h2>{L('客戶案例同反饋', 'Client work and feedback')}</h2>
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
          <SectionHead kicker={L('點樣開始', 'How it starts')} title={L('三步開始，查詢免費', 'Three steps. The first conversation is free.')} id="sales-start-title" />
          <ol className="v-flow">
            {[
              [L('傾清楚計劃', 'Talk through your plans'), L('確認地區、預算同時間。', 'Confirm the city, budget and timing.')],
              [L('確認範圍同費用', 'Agree scope and fees'), L('服務範圍同收費書面確認。', 'Scope and fees are agreed in writing.')],
              [L('按約定持續跟進', 'Follow through as agreed'), L('睇樓同報價進展持續溝通。', 'Viewings and offers are followed up with you.')],
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
              <h3>{L('先睇吓區域成交參考', 'Look at local sales first')}</h3>
              <p>{L('網上睇樓裏有公開市場嘅已成交記錄，幫你了解區域同價格；佢哋唔係我哋經手嘅案例。', 'Online viewings include public market sales to help you understand areas and prices. They are not our own sales.')}</p>
            </div>
            <Link to="/viewings?kind=sold" className="btn btn-line sales-viewings">{L('去網上睇樓', 'Open online viewings')}<ArrowUpRight size={18} aria-hidden /></Link>
          </Reveal>
        </div>
      </section>

      <section className="v-sec v-sec-tight" aria-labelledby="sales-faq-title">
        <div className="wrap">
          <SectionHead kicker={L('常見問題', 'FAQ')} title={L('先了解呢啲', 'A few useful answers')} id="sales-faq-title" />
          <QAGrid items={faq} />
        </div>
      </section>
    </div>
  );
}
