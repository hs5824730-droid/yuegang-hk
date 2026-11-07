import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** Image with a quiet, honest fallback: never swaps in a different place's photo. */
export function SmartImg({ src, alt, className = '', style, eager = false, position }: { src: string; alt: string; className?: string; style?: CSSProperties; eager?: boolean; position?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div className={`img-fallback ${className}`} style={style} role="img" aria-label={alt}>
        <span>{alt}</span>
      </div>
    );
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ ...(position ? { objectPosition: position } : null), ...style }}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

/** Reveals once when scrolled into view. Content is always visible without JS or with reduced motion. */
export function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'section' | 'li' | 'article' }) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Cmp = Tag as 'div';
  return (
    <Cmp ref={ref as never} className={`reveal ${shown ? 'in' : ''} ${className}`} style={{ transitionDelay: delay ? `${delay}ms` : undefined }}>
      {children}
    </Cmp>
  );
}

export function useScrolled(threshold = 24) {
  const [s, setS] = useState(false);
  useEffect(() => {
    const on = () => setS(window.scrollY > threshold);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [threshold]);
  return s;
}

/** Unified icon frame: same stroke, same container, so icons read as one family. */
export function IconBadge({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'dark' | 'gold' }) {
  return <span className={`ibadge ibadge-${tone}`} aria-hidden>{children}</span>;
}

export const IMG = {
  hero: '/img/hk/harbour-night.webp',
  interior: '/img/interior.jpg',
  queenslander: '/img/hk/tai-po.webp',
  white: '/img/hk/mid-levels.webp',
  detail: '/img/apartment-detail.jpg',
  'Hong Kong Island': '/img/hk/hk-island.webp',
  Kowloon: '/img/hk/kowloon.webp',
  'New Territories': '/img/hk/new-territories.webp',
  Islands: '/img/hk/islands.webp',
} as const;

/** Scroll behaviour that respects prefers-reduced-motion. */
export const scrollBehavior = (): ScrollBehavior =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

/** Reference-counted body scroll lock so the menu and the drawer can't strand each other. */
const locks = new Set<string>();
export function setScrollLock(key: string, on: boolean) {
  if (on) locks.add(key);
  else locks.delete(key);
  document.body.style.overflow = locks.size ? 'hidden' : '';
}

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Exit animation length for sheets; zero when the user prefers reduced motion. */
export const exitMs = () => (reducedMotion() ? 0 : 200);
