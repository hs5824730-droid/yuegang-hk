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
      <img src={REN('after-1')} alt={L('方案效果：同一空间完成墙面、地板与照明后的设计示意', 'Design concept: the same space with finished walls, flooring and lighting')} />
      <div className="ds-compare-ba-before"><img src={REN('before-1')} alt={L('改造前：施工中的同一空间', 'Before: the same space during works')} /></div>
      <span className="ds-compare-ba-line" aria-hidden><span /></span>
      <span className="ds-compare-ba-tag l">{L('改造前', 'Before')}</span>
      <span className="ds-compare-ba-tag r">{L('方案效果', 'Design concept')}</span>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} aria-label={L('拖动对比改造前与方案效果', 'Drag to compare before and the design concept')} />
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
    { id: 'renovation', Icon: Hammer, t: L('装修翻新', 'Renovation'), d: L('出租前翻新、局部改造、厨卫更新', 'Refreshes, makeovers, kitchens and bathrooms'), to: '#renovation' },
    { id: 'care', Icon: House, t: L('房屋服务', 'Home services'), d: L('园艺、清洁、居家照看，推广期人工半价', 'Garden, cleaning, home sitting; half-price labour'), to: '/home-services' },
    { id: 'maintenance', Icon: Wrench, t: L('维修维护', 'Repairs & maintenance'), d: L('报修处理、定期检查与小修', 'Repair requests, checks and small fixes'), to: '/advisory-registration?service=maintenance' },
    { id: 'buying', Icon: Search, t: L('购房咨询', 'Buying advice'), d: L('城市区域了解、筛选与看房', 'Area research, shortlisting, viewings'), to: '/advisory-registration?service=buyer-advisory' },
  ];

  const scope: { icon: ReactNode; t: string; s: string; d: string }[] = [
    { icon: <Paintbrush size={22} />, t: L('墙面与地面', 'Walls & floors'), s: L('刷新墙面、更换地板', 'Repainting, new flooring'), d: L('出租前的墙面修补与重新粉刷，地毯、木地板或瓷砖的更换与修复。', 'Patching and repainting before letting; replacing or repairing carpet, timber or tiles.') },
    { icon: <ChefHat size={22} />, t: L('厨房更新', 'Kitchens'), s: L('台面、橱柜、电器', 'Benchtops, cabinets, appliances'), d: L('按预算选择局部更新或整体改造：台面、柜门、五金和电器。', 'From targeted updates to a full refit, to suit the budget.') },
    { icon: <Bath size={22} />, t: L('卫浴翻新', 'Bathrooms'), s: L('防水、洁具、瓷砖', 'Waterproofing, fixtures, tiles'), d: L('处理防水与渗漏隐患，更换洁具、龙头与瓷砖，改善通风。', 'Waterproofing and leaks, fixtures, tapware, tiles and ventilation.') },
    { icon: <Sparkles size={22} />, t: L('出租前焕新', 'Pre-letting refresh'), s: L('清洁、小修、拍照前整理', 'Cleaning, small fixes, photo-ready'), d: L('结合招租安排，挂牌前完成清洁、小修和软装整理。', 'Cleaning, small repairs and styling timed before the listing goes live.') },
  ];

  const steps = [
    [L('沟通需求', 'Discuss your needs'), L('房屋情况、预算与时间。', 'The property, budget and timing.')],
    [L('上门评估', 'On-site assessment'), L('现场查看并记录要处理的项目。', 'We inspect and record what needs doing.')],
    [L('方案与报价', 'Plan & quote'), L('按项目报价，确认后开工。', 'A project quote for you to approve.')],
    [L('施工跟进', 'Works underway'), L('协调施工方，定期反馈进度。', 'We coordinate trades and update you.')],
    [L('验收交付', 'Handover'), L('完工检查、整改确认后交付。', 'Final inspection and sign-off.')],
  ];

  const values = [
    { Icon: ClipboardCheck, t: L('免费评估，按项目报价', 'Free assessment, quoted per project'), d: L('先评估再报价，确认方案后才开工。', 'Works begin only after you approve the plan.') },
    { Icon: ShieldCheck, t: L('与出租安排衔接', 'Aligned with letting'), d: L('翻新时间与招租计划一起安排，减少空置。', 'Planned around the letting timeline to limit vacancy.') },
    { Icon: House, t: L('现场有人跟进', 'Someone on site'), d: L('当地团队跟进，进度以照片和说明反馈。', 'Our local team reports progress with photos and notes.') },
  ];

  return (
    <div className="v-page advisory-page">
      <PageHero
        kicker={L('置业顾问', 'Property services')}
        title={<>{L('出租之外，', 'Beyond letting,')}<em>{L('房子的事也能交给我们。', 'the rest of the house too.')}</em></>}
        lead={L('装修翻新、房屋打理、维修维护和购房咨询。免费上门评估，按项目报价。', 'Renovation, home care, repairs and buying advice. A free on-site assessment, then a quote per project.')}
        actions={<>
          <Link className="btn btn-primary advisory-hero-cta" to="/advisory-registration?service=renovation">{L('预约免费评估', 'Book a free assessment')}<ArrowRight size={18} aria-hidden /></Link>
          <a className="btn btn-line" href="#renovation">{L('了解装修翻新', 'About renovation')}</a>
        </>}
        aside={pairPending ? <div className="ds-compare-ba-placeholder" aria-hidden /> : pairReady ? <div className="v-hero-compare"><BeforeAfter L={L} /><p className="v-compare-cap">{L('改造方案对比 · 示意', 'Renovation concept · illustrative')}</p></div> : <figure className="v-tile-photo"><SmartImg src={REN(3)} alt={L('墙面粉刷（示意）', 'Repainting (illustrative)')} /></figure>}
      />

      <section className="v-sec v-sec-tight" aria-labelledby="adv-svc-title">
        <div className="wrap">
          <h2 id="adv-svc-title" className="sr-only">{L('服务类型', 'Services')}</h2>
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
          <SectionHead kicker={L('装修翻新', 'Renovation')} title={L('从出租前焕新，到厨卫改造', 'From pre-letting refreshes to kitchens and bathrooms')} id="adv-reno-title" lead={L('免费评估，按项目报价；确认方案后才开工。', 'Free assessment, quoted per project; work starts once you approve.')} />
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

          <h3 className="v-subhead">{L('服务流程', 'How it works')}</h3>
          <ol className="v-timeline">
            {steps.map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 60}>
                <span className="v-flow-n">{i + 1}</span>
                <strong>{t}</strong>
                <span>{d}</span>
              </Reveal>
            ))}
          </ol>

          <h3 className="v-subhead">{L('效果参考', 'Gallery')}</h3>
          <div className="v-gallery">
            {[[3, L('墙面粉刷', 'Repainting')], [4, L('施工跟进', 'Works underway')], [5, L('客厅焕新', 'Living room refresh')]].map(([n, label]) => (
              <figure key={n}>
                <SmartImg src={REN(n)} alt={L('翻新相关示意照片', 'Renovation (illustrative)')} />
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
            <Link className="btn btn-primary" to="/advisory-registration?service=renovation">{L('预约免费评估', 'Book a free assessment')}<ArrowRight size={18} aria-hidden /></Link>
          </div>
        </div>
      </section>

      <CtaBand title={L('聊聊您的房子需要什么', 'Tell us what your property needs')} text={L('留下城市与需求，我们安排免费评估后再给出方案和报价。', 'Share the city and what you need; we assess for free, then propose a plan and quote.')} />
    </div>
  );
}
