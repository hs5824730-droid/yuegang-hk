import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { scrollBehavior } from './ui';

/**
 * Shared building blocks for the Harbour Joy service pages.
 * Motion is one-off (draw on reveal, quiet lift on hover); nothing loops and
 * everything is static under prefers-reduced-motion.
 */

/** Line icon that draws itself once when its Reveal ancestor enters the viewport. */
export function DrawIcon({ children, tone = 'orange', size = 'md' }: { children: ReactNode; tone?: 'orange' | 'light' | 'ink'; size?: 'md' | 'lg' }) {
  return <span className={`ds-icon ds-icon-${tone} ds-icon-${size}`} aria-hidden>{children}</span>;
}

/** In-page index for long service pages. It links to sections that are always fully shown. */
export function SectionIndex({ items, label }: { items: { id: string; label: string }[]; label: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const ids = items.map((it) => it.id).join('|');
  useEffect(() => {
    // The active entry is the last section whose top has passed 40% of the viewport.
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.4;
      let current = items[0]?.id;
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= line) current = it.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Keep the active entry visible in the horizontally scrolling phone row.
    const row = rowRef.current;
    const link = row?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!row || !link || row.scrollWidth <= row.clientWidth) return;
    const left = link.offsetLeft - (row.clientWidth - link.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, left), behavior: scrollBehavior() });
  }, [active]);
  const go = (id: string) => (e: MouseEvent) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    history.replaceState(history.state, '', `#${id}`);
    setActive(id);
  };
  return (
    <nav className="ds-index" aria-label={label}>
      <div className="wrap ds-index-row" ref={rowRef}>
        {items.map((it) => (
          <a key={it.id} href={`#${it.id}`} onClick={go(it.id)} aria-current={active === it.id ? 'true' : undefined}>
            {it.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

/**
 * Architectural split hero: a full-height photograph with a large figure and
 * fine labels on the left, a near-black information panel on the right.
 * The photograph keeps its subject: frames stay close to the source's 3:2.
 */
export function SplitHero({
  img, alt, pos, figure, labels, kicker, title, lead, children, className = '',
}: {
  img: string; alt: string; pos?: string;
  figure?: { value: string; unit?: string; label: string };
  labels?: { k: string; v: string }[];
  kicker: string; title: string; lead?: string; children?: ReactNode; className?: string;
}) {
  return (
    <section className={`ds-split ${className}`}>
      <div className="ds-split-media">
        <img src={img} alt={alt} style={pos ? { objectPosition: pos } : undefined} fetchPriority="high" />
        <div className="ds-split-shade" aria-hidden />
        {labels && labels.length > 0 && (
          <dl className="ds-split-labels">
            {labels.map((l) => (
              <div key={l.k}>
                <dt>{l.k}</dt>
                <dd>{l.v}</dd>
              </div>
            ))}
          </dl>
        )}
        {figure && (
          <p className="ds-split-figure">
            <span className="ds-split-label">{figure.label}</span>
            <span className="ds-num">
              {figure.value}
              {figure.unit && <sup>{figure.unit}</sup>}
            </span>
          </p>
        )}
      </div>
      <div className="ds-split-panel">
        <p className="ds-kicker">{kicker}</p>
        <h1>{title}</h1>
        {lead && <p className="ds-lead">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
