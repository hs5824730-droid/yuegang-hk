import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Bath, Car, Maximize2, Box, Building2 } from 'lucide-react';
import type { Property, PropertyEvent } from '../api';
import { SmartImg } from './ui';
import { cityName, eventLabel, formatDate, money, statusLabel, typeLabel, useI18n } from '../i18n';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; error: string; loading: boolean }>({ data: null, error: '', loading: true });
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    fn()
      .then((data) => live && setState({ data, error: '', loading: false }))
      .catch((e: Error) => live && setState({ data: null, error: e.message || 'error', loading: false }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function PageHead({ title, lead, children, img, pos, alt = '' }: { title: string; lead?: string; children?: ReactNode; img?: string; pos?: string; alt?: string }) {
  return (
    <section className={`page-head ${img ? 'with-img' : ''}`}>
      <div className="wrap">
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
        {children}
        {img && (
          <figure className="page-head-media">
            <SmartImg src={img} alt={alt} position={pos} eager />
          </figure>
        )}
      </div>
    </section>
  );
}

export function EmptyState({ title, children, action, icon }: { title: string; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden>
        {icon || <Building2 size={30} />}
      </div>
      <h3>{title}</h3>
      {children && <div className="empty-body">{children}</div>}
      {action && <div className="row-actions center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, retry }: { message?: string; retry?: () => void }) {
  const { L } = useI18n();
  return (
    <div className="notice notice-error" role="alert">
      <div>
        <strong>{L('内容暂时无法加载', 'This content couldn’t be loaded')}</strong>
        <p>{message && message !== 'network' && !/^HTTP/.test(message) ? message : L('请检查网络后重试。', 'Check your connection and try again.')}</p>
        {retry && (
          <button className="btn btn-quiet btn-sm" onClick={retry}>
            {L('重试', 'Retry')}
          </button>
        )}
      </div>
    </div>
  );
}

export function priceText(p: Property, pick: (b: Property['priceLabel']) => string, L: (zh: string, en: string) => string) {
  const label = pick(p.priceLabel);
  if (label) return label;
  if (p.price == null) return L('价格面议', 'Price on request');
  return p.status === 'rent' || p.status === 'leased' ? `${money(p.price)} ${L('/ 周', 'per week')}` : money(p.price);
}

export function tourBadge(p: Property, L: (zh: string, en: string) => string) {
  if (!p.tourUrl || p.tourKind === 'none') return null;
  return p.tourKind === 'real' ? L('3D 看房', '3D tour') : L('示意 3D', 'Illustrative 3D');
}

export function PropertyCard({ p }: { p: Property }) {
  const { L, pick, lang } = useI18n();
  const tour = tourBadge(p, L);
  return (
    <Link to={`/properties/${p.id}`} className="pcard">
      <div className="pcard-img">
        {p.images[0] ? <SmartImg src={p.images[0]} alt={pick(p.title)} /> : <div className="img-ph" aria-hidden><Building2 size={34} /><span>{L('暂无照片', 'Photos to come')}</span></div>}
        <span className={`tag tag-${p.status}`}>{statusLabel(p.status, lang)}</span>
        {tour && (
          <span className="tag tag-tour">
            <Box size={13} aria-hidden /> {tour}
          </span>
        )}
      </div>
      <div className="pcard-body">
        <p className="pcard-price">{priceText(p, pick, L)}</p>
        <h3>{pick(p.title) || p.address}</h3>
        <p className="pcard-addr">
          {p.address}
          {p.suburb ? `，${p.suburb}` : ''} · {cityName(p.city, lang)}
        </p>
        <ul className="specs">
          {p.type !== 'land' && (
            <>
              <li title={L('卧室', 'Bedrooms')}><BedDouble size={16} aria-hidden /> {p.beds}</li>
              <li title={L('卫浴', 'Bathrooms')}><Bath size={16} aria-hidden /> {p.baths}</li>
              <li title={L('车位', 'Car spaces')}><Car size={16} aria-hidden /> {p.cars}</li>
            </>
          )}
          {p.area != null && <li title={L('面积', 'Area')}><Maximize2 size={15} aria-hidden /> {p.area} m²</li>}
          <li className="spec-type">{typeLabel(p.type, lang)}</li>
        </ul>
      </div>
    </Link>
  );
}

export function Timeline({ events }: { events: PropertyEvent[] }) {
  const { L, pick, lang } = useI18n();
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  let last: number | null = null;
  return (
    <ol className="timeline">
      {sorted.map((e, i) => {
        const delta = e.type === 'price_changed' && e.price != null && last != null ? e.price - last : null;
        if (e.price != null) last = e.price;
        return (
          <li key={e.id || i} className={`tl-${e.type}`}>
            <time dateTime={e.date}>{formatDate(e.date, lang)}</time>
            <div>
              <strong>{eventLabel(e.type, lang)}</strong>
              {e.price != null && (
                <span className="tl-price">
                  {money(e.price)}
                  {delta != null && delta !== 0 && (
                    <em className={delta < 0 ? 'down' : 'up'}>
                      {' '}
                      {delta < 0 ? '−' : '+'}
                      {money(Math.abs(delta))}
                    </em>
                  )}
                </span>
              )}
              {pick(e.note) && <p>{pick(e.note)}</p>}
            </div>
          </li>
        );
      })}
      {sorted.length === 0 && <li className="tl-none">{L('暂无记录', 'No records yet')}</li>}
    </ol>
  );
}
