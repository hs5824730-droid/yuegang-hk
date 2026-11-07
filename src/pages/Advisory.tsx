import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bath, ChefHat, ClipboardCheck, Hammer, House, Paintbrush, Search, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { useI18n } from '../i18n';
import { Reveal, SmartImg } from '../components/ui';
import { CtaBand } from '../components/sections';
import { PageHero, SectionHead } from '../components/v2/blocks';

type LFn = (zh: string, en: string) => string;
/** Credited Unsplash photographs and the same-space concept pair (see /credits). */
export const REN = (n: number | string) => `/img/renovation/${n}.webp`;

/** True only when the image actually loads — the comparison never shows an invented or partial pair. */
export function useLoads(src: string) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setOk(true);
    img.onerror = () => setOk(false);
    img.src = src;
  }, [src]);
  return ok;
}

/** Same-space renovation comparison: the licensed source photo and a design concept edited from it. */
export function BeforeAfter({ L }: { L: LFn }) {
  const [pos, setPos] = useState(50);
  return <figure className="ds-compare-ba v-compare-ba" style={{ ['--pos' as string]: `${pos}%` }}>
    <div className="ds-compare-ba-stage">
      <img src={REN('after-1')} alt={L('方案效果：同一空間完成牆面、地板同照明後嘅設計示意', 'Design concept: the same space with finished walls, flooring and lighting')} />
      <div className="ds-compare-ba-before"><img src={REN('before-1')} alt={L('改造前：施工中嘅同一空間', 'Before: the same space during works')} /></div>
      <span className="ds-compare-ba-line" aria-hidden><span /></span>
      <span className="ds-compare-ba-tag l">{L('改造前', 'Before')}</span>
      <span className="ds-compare-ba-tag r">{L('方案效果', 'Design concept')}</span>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} aria-label={L('拖動對比改造前同方案效果', 'Drag to compare before and the design concept')} />
    </div>
  </figure>;
}

export default function Advisory() {
  const { L } = useI18n();
  const beforeOk = useLoads(REN('before-1'));
  const afterOk = useLoads(REN('after-1'));
  const pairReady = beforeOk === true && afterOk === true;
  const pairPending = !pairReady && (beforeOk === null || afterOk === null);

  const services: { id: string; Icon: typeof Hammer; t: string; d: string; to: string }[] = [
    { id: 'renovation', Icon: Hammer, t: L('裝修翻新', 'Renovation'), d: L('出租前翻新、局部改造、廚衞更新', 'Refreshes, makeovers, kitchens and bathrooms'), to: '#renovation' },
    { id: 'care', Icon: House, t: L('房屋服務', 'Home services'), d: L('園藝、清潔、居家睇住，推廣期人工半價', 'Garden, cleaning, home sitting; half-price labour'), to: '/home-services' },
    { id: 'maintenance', Icon: Wrench, t: L('維修維護', 'Repairs & maintenance'), d: L('報修處理、定期檢查同小修', 'Repair requests, checks and small fixes'), to: '/advisory-registration?service=maintenance' },
    { id: 'buying', Icon: Search, t: L('置業查詢', 'Buying advice'), d: L('地區區域了解、篩揀同睇樓', 'Area research, shortlisting, viewings'), to: '/advisory-registration?service=buyer-advisory' },
  ];

  const scope: { icon: ReactNode; t: string; s: string; d: string }[] = [
    { icon: <Paintbrush size={22} />, t: L('牆面同地面', 'Walls & floors'), s: L('刷新牆面、更換地板', 'Repainting, new flooring'), d: L('出租前嘅牆面修補同重新粉刷，地毯、木地板或瓷磚嘅更換同修復。', 'Patching and repainting before letting; replacing or repairing carpet, timber or tiles.') },
    { icon: <ChefHat size={22} />, t: L('廚房更新', 'Kitchens'), s: L('枱面、櫥櫃、電器', 'Benchtops, cabinets, appliances'), d: L('按預算揀局部更新或整體改造：枱面、櫃門、五金同電器。', 'From targeted updates to a full refit, to suit the budget.') },
    { icon: <Bath size={22} />, t: L('衞浴翻新', 'Bathrooms'), s: L('防水、潔具、瓷磚', 'Waterproofing, fixtures, tiles'), d: L('處理防水同滲漏隱患，更換潔具、龍頭同瓷磚，改善通風。', 'Waterproofing and leaks, fixtures, tapware, tiles and ventilation.') },
    { icon: <Sparkles size={22} />, t: L('出租前煥新', 'Pre-letting refresh'), s: L('清潔、小修、拍照前整理', 'Cleaning, small fixes, photo-ready'), d: L('結合放租安排，掛牌前完成清潔、小修同軟裝整理。', 'Cleaning, small repairs and styling timed before the listing goes live.') },
  ];

  const steps = [
    [L('溝通需求', 'Discuss your needs'), L('房屋情況、預算同時間。', 'The property, budget and timing.')],
    [L('上門評估', 'On-site assessment'), L('現場查睇並記錄要處理嘅項目。', 'We inspect and record what needs doing.')],
    [L('方案同報價', 'Plan & quote'), L('按項目報價，確認後開工。', 'A project quote for you to approve.')],
    [L('施工跟進', 'Works underway'), L('協調施工方，定期反饋進度。', 'We coordinate trades and update you.')],
    [L('驗收交付', 'Handover'), L('完工檢查、整改確認後交付。', 'Final inspection and sign-off.')],
  ];

  const values = [
    { Icon: ClipboardCheck, t: L('免費評估，按項目報價', 'Free assessment, quoted per project'), d: L('先評估再報價，確認方案後先開工。', 'Works begin only after you approve the plan.') },
    { Icon: ShieldCheck, t: L('同出租安排銜接', 'Aligned with letting'), d: L('翻新時間同放租計劃一齊安排，減少空置。', 'Planned around the letting timeline to limit vacancy.') },
    { Icon: House, t: L('現場有人跟進', 'Someone on site'), d: L('本地團隊跟進，進度以照片同說明反饋。', 'Our local team reports progress with photos and notes.') },
  ];

  return (
    <div className="v-page advisory-page">
      <PageHero
        kicker={L('置業顧問', 'Property services')}
        title={<>{L('出租之外，', 'Beyond letting,')}<em>{L('單位嘅事都可以交俾我哋。', 'the rest of the house too.')}</em></>}
        lead={L('裝修翻新、房屋打理、維修維護同置業查詢。免費上門評估，按項目報價。', 'Renovation, home care, repairs and buying advice. A free on-site assessment, then a quote per project.')}
        actions={<>
          <Link className="btn btn-primary advisory-hero-cta" to="/advisory-registration?service=renovation">{L('預約免費評估', 'Book a free assessment')}<ArrowRight size={18} aria-hidden /></Link>
          <a className="btn btn-line" href="#renovation">{L('了解裝修翻新', 'About renovation')}</a>
        </>}
        aside={pairPending ? <div className="ds-compare-ba-placeholder" aria-hidden /> : pairReady ? <div className="v-hero-compare"><BeforeAfter L={L} /><p className="v-compare-cap">{L('改造方案對比 · 示意', 'Renovation concept · illustrative')}</p></div> : <figure className="v-tile-photo"><SmartImg src={REN(3)} alt={L('牆面粉刷（示意）', 'Repainting (illustrative)')} /></figure>}
      />

      <section className="v-sec v-sec-tight" aria-labelledby="adv-svc-title">
        <div className="wrap">
          <h2 id="adv-svc-title" className="sr-only">{L('服務類型', 'Services')}</h2>
          <ul className="v-tiles4">
            {services.map(({ id, Icon, t, d, to }, i) => (
              <Reveal as="li" key={id} delay={i * 60} className={id === 'renovation' ? 'is-featured' : ''}>
                {to.startsWith('#')
                  ? <a href={to}><span className="v-ico"><Icon size={22} aria-hidden /></span><strong>{t}</strong><small>{d}</small><ArrowRight size={18} aria-hidden className="v-go" /></a>
                  : <Link to={to}><span className="v-ico"><Icon size={22} aria-hidden /></span><strong>{t}</strong><small>{d}</small><ArrowUpRight size={18} aria-hidden className="v-go" /></Link>}
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="v-sec v-sec-sage" id="renovation" aria-labelledby="adv-reno-title">
        <div className="wrap">
          <SectionHead kicker={L('裝修翻新', 'Renovation')} title={L('由出租前煥新，到廚衞改造', 'From pre-letting refreshes to kitchens and bathrooms')} id="adv-reno-title" lead={L('免費評估，按項目報價；確認方案後先開工。', 'Free assessment, quoted per project; work starts once you approve.')} />
          <ul className="v-cards2">
            {scope.map((s, i) => (
              <Reveal as="li" key={s.t} delay={i * 60}>
                <span className="v-ico">{s.icon}</span>
                <div>
                  <h3>{s.t}</h3>
                  <p className="v-sub">{s.s}</p>
                  <p>{s.d}</p>
                </div>
              </Reveal>
            ))}
          </ul>

          <h3 className="v-subhead">{L('服務流程', 'How it works')}</h3>
          <ol className="v-timeline">
            {steps.map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 60}>
                <span className="v-flow-n">{i + 1}</span>
                <strong>{t}</strong>
                <span>{d}</span>
              </Reveal>
            ))}
          </ol>

          <h3 className="v-subhead">{L('效果參考', 'Gallery')}</h3>
          <div className="v-gallery">
            {[[3, L('牆面粉刷', 'Repainting')], [4, L('施工跟進', 'Works underway')], [5, L('客廳煥新', 'Living room refresh')]].map(([n, label]) => (
              <figure key={n}>
                <SmartImg src={REN(n)} alt={L('翻新相關示意照片', 'Renovation (illustrative)')} />
                <figcaption><span>{label}</span><small>{L('示意', 'Illustrative')}</small></figcaption>
              </figure>
            ))}
          </div>

          <ul className="v-values">
            {values.map(({ Icon, t, d }, i) => (
              <Reveal as="li" key={t} delay={i * 60}>
                <span className="v-ico"><Icon size={22} aria-hidden /></span>
                <h3>{t}</h3>
                <p>{d}</p>
              </Reveal>
            ))}
          </ul>
          <div className="v-actions v-center">
            <Link className="btn btn-primary" to="/advisory-registration?service=renovation">{L('預約免費評估', 'Book a free assessment')}<ArrowRight size={18} aria-hidden /></Link>
          </div>
        </div>
      </section>

      <CtaBand title={L('傾吓你嘅單位需要咩', 'Tell us what your property needs')} text={L('留低地區同需求，我哋安排免費評估後再俾出方案同報價。', 'Share the city and what you need; we assess for free, then propose a plan and quote.')} />
    </div>
  );
}
