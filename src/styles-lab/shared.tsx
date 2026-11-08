import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { ViewingListing } from '../viewing-types';
import { useI18n } from '../i18n';
import LanguageMenu from '../components/LanguageMenu';
import { FULL_LARGE, FULL_PHOTOS } from '../photo-full';

export type Kind = ViewingListing['kind'];

/** All published sample listings, grouped by kind. Same source as the online viewings page. */
export function useListings() {
  const [data, setData] = useState<Record<Kind, ViewingListing[]>>({ rent: [], sale: [], sold: [] });
  useEffect(() => {
    const controller = new AbortController();
    Promise.all((['rent', 'sale', 'sold'] as Kind[]).map(kind =>
      fetch(`/api/viewing-samples?kind=${kind}`, { signal: controller.signal })
        .then(r => (r.ok ? r.json() : { listings: [] }))
        .then(j => [kind, (j.listings || []) as ViewingListing[]] as const)
        .catch(() => [kind, [] as ViewingListing[]] as const)))
      .then(parts => setData(Object.fromEntries(parts) as Record<Kind, ViewingListing[]>))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return data;
}

export const estateName = (l: ViewingListing) => l.address.split('·')[0].trim();
export const unitName = (l: ViewingListing) => l.address.split('·')[1]?.trim() || '';
export const area = (l: ViewingListing) => {
  const f = l.features?.find(x => /呎|sq ft/.test(x.zh));
  const m = f?.zh.match(/([\d,]+)\s*呎/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
};

/** Unique estates with one representative photo, for galleries. */
export function estates(list: ViewingListing[]) {
  const seen = new Map<string, ViewingListing>();
  for (const l of list) if (l.coverUrl && !seen.has(estateName(l))) seen.set(estateName(l), l);
  return [...seen.values()];
}

export const REGIONS = ['Hong Kong Island', 'Kowloon', 'New Territories', 'Islands'] as const;

export const STYLES = [
  { id: 'app', zh: '找樓 App', en: 'Property app' },
  { id: 'immersive', zh: '沉浸全屏', en: 'Immersive' },
  { id: 'magazine', zh: '樓書雜誌', en: 'Magazine' },
  { id: 'cinema', zh: '深色影院', en: 'Cinema' },
] as const;

/** Floating switcher shared by every prototype, so the four directions can be compared quickly. */
export function StyleSwitcher() {
  const { L } = useI18n();
  const { pathname } = useLocation();
  return (
    <nav className="lab-switch" aria-label={L('切換風格', 'Switch style')}>
      <Link to="/styles" className="lab-switch-home">{L('風格比較', 'Styles')}</Link>
      {STYLES.map(s => <Link key={s.id} to={`/styles/${s.id}`} aria-current={pathname.endsWith('/' + s.id) ? 'page' : undefined}>{L(s.zh, s.en)}</Link>)}
      <span className="lab-switch-lang"><LanguageMenu compact /></span>
    </nav>
  );
}

/**
 * A full-screen photograph: graded 16:9 crops on desktop, a 9:16 crop on phones.
 * Falls back to the original site image when no graded crop exists.
 */
export function FullPhoto({ src, className, eager }: { src: string; className?: string; eager?: boolean }) {
  const name = src.match(/\/img\/hk\/([^/]+)\.webp$/)?.[1];
  const loading = eager ? 'eager' : 'lazy';
  if (!name || !FULL_PHOTOS.has(name)) return <img src={src} alt="" className={className} loading={loading} />;
  const wide = `/img/hk/full/${name}-1600.webp 1600w${FULL_LARGE.has(name) ? `, /img/hk/full/${name}-2560.webp 2560w` : ''}`;
  return (
    <picture className={className}>
      <source media="(max-width: 700px) and (orientation: portrait)" srcSet={`/img/hk/full/${name}-tall.webp`} />
      <source srcSet={wide} sizes="100vw" />
      <img src={`/img/hk/full/${name}-1600.webp`} alt="" loading={loading} />
    </picture>
  );
}
