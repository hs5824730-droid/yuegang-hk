import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { formatMonth, useConfig, useI18n } from '../../i18n';
import { Reveal } from '../ui';

/** The owner offer as a price-list "receipt": three lines, the limits underneath. */
export function OfferReceipt({ cta, className = '' }: { cta?: ReactNode; className?: string }) {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const end = formatMonth(config.promotion.endMonth, lang);
  const rows = [
    [L('第 1 個單位 · 業主佣金', '1st flat · owner commission'), L('免佣', 'HK$0')],
    [L('第 2 個單位 · 業主佣金', '2nd flat · owner commission'), L('半價', '50% off')],
    [L('交吉清潔 + 洗冷氣', 'Deep clean + air-con wash'), L('送', 'Free')],
  ];
  return (
    <div className={`v-receipt ${className}`}>
      <p className="v-receipt-head">
        <span>{L('業主優惠', 'Owner offer')}</span>
        <span>{L(`至 ${end}`, `Until ${end}`)}</span>
      </p>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="v-receipt-note">{L('按同一業主委託次序計；租客佣金按市場慣例，管理費另計。', 'Counted per owner in order. Tenant commission follows market practice; management fees are separate.')}</p>
      {cta && <div className="v-receipt-actions">{cta}</div>}
    </div>
  );
}

/** Page opening shared by the service pages: copy on the left, one visual on the right. */
export function PageHero({ kicker, title, lead, actions, aside, className = '', bg, bgPos }: { kicker: string; title: ReactNode; lead?: string; actions?: ReactNode; aside?: ReactNode; className?: string; bg?: string; bgPos?: string }) {
  return (
    <section className={`v-hero v-page-hero ${bg ? 'has-bg' : ''} ${className}`}>
      {bg && <><img className="v-hero-bg" src={bg} alt="" style={bgPos ? { objectPosition: bgPos } : undefined} fetchPriority="high" /><span className="v-hero-shade" aria-hidden /></>}
      <div className="wrap v-hero-grid">
        <div className="v-hero-copy">
          <p className="v-pill">{kicker}</p>
          <h1>{title}</h1>
          {lead && <p className="v-lead">{lead}</p>}
          {actions && <div className="v-actions">{actions}</div>}
        </div>
        {aside && <div className="v-hero-aside">{aside}</div>}
      </div>
    </section>
  );
}

export function SectionHead({ kicker, title, lead, id, more }: { kicker?: string; title: string; lead?: string; id?: string; more?: { to: string; label: string } }) {
  return (
    <Reveal className="v-head">
      <div>
        {kicker && <p className="v-kicker">{kicker}</p>}
        <h2 id={id}>{title}</h2>
      </div>
      {(lead || more) && (
        <div className="v-head-side">
          {lead && <p>{lead}</p>}
          {more && (
            <Link className="v-link" to={more.to}>
              {more.label}
              <ArrowUpRight size={16} aria-hidden />
            </Link>
          )}
        </div>
      )}
    </Reveal>
  );
}

/** Questions and answers shown in full — nothing to open. */
export function QAGrid({ items }: { items: [string, string][] }) {
  return (
    <dl className="v-qa">
      {items.map(([q, a], i) => (
        <Reveal key={q} className="v-qa-item" delay={i * 50}>
          <dt>{q}</dt>
          <dd>{a}</dd>
        </Reveal>
      ))}
    </dl>
  );
}
