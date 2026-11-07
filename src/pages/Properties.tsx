import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Bath, BedDouble, Car, ChevronLeft, ChevronRight, ExternalLink, Info, Maximize2, MessageCircle, SlidersHorizontal, X } from 'lucide-react';
import { api, type Property, type PropertyStatus } from '../api';
import LeadForm from '../components/LeadForm';
import { EmptyState, ErrorState, PageHead, PropertyCard, Timeline, priceText, tourBadge, useAsync } from '../components/parts';
import { exitMs, setScrollLock } from '../components/ui';
import { MarketList, MarketNote, useMarket } from '../components/market';
import { cityName, formatDate, money, statusLabel, typeLabel, useConfig, useI18n } from '../i18n';
import { NotFound } from './Info';
import {usePublishContactPage} from '../components/ContactPageContext';

/** Inline filters on desktop; a bottom sheet behind a "Filters" button on phones. */
function FilterBar({ children, count }: { children: ReactNode; count: number }) {
  const { L } = useI18n();
  const [open, setOpenRaw] = useState(false);
  const [closing, setClosing] = useState(false);
  const setOpen = (v: boolean) => {
    if (v) return setOpenRaw(true);
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      setOpenRaw(false);
    }, exitMs());
  };
  useEffect(() => {
    if (!open) return;
    setScrollLock('filters', true);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      setScrollLock('filters', false);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <>
      <button type="button" className="filter-btn" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="filter-panel">
        <SlidersHorizontal size={17} aria-hidden />
        {L('筛选', 'Filters')}
        {count > 0 && <span className="filter-count">{count}</span>}
      </button>
      <div className={`filter-wrap ${open ? 'open' : ''} ${closing ? 'closing' : ''}`}>
        <div className="filter-scrim" onClick={() => setOpen(false)} aria-hidden />
        <div className="filter-panel" id="filter-panel" role={open ? 'dialog' : undefined} aria-modal={open || undefined} aria-label={L('筛选', 'Filters')}>
          <div className="filter-head">
            <strong>{L('筛选', 'Filters')}</strong>
            <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label={L('关闭', 'Close')}>
              <X size={20} />
            </button>
          </div>
          {children}
          <div className="filter-foot">
            <button type="button" className="btn btn-primary btn-block" onClick={() => setOpen(false)}>
              {L('查看结果', 'Show results')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Filters({ statuses, historyMode = false, marketMode = false }: { statuses: PropertyStatus[]; historyMode?: boolean; marketMode?: boolean }) {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const [sp, setSp] = useSearchParams();
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v);
    else n.delete(k);
    setSp(n, { replace: true });
  };
  const g = (k: string) => sp.get(k) || '';
  return (
    <form className="filters" onSubmit={(e) => e.preventDefault()} role="search">
      <div className="field">
        <label htmlFor="f-q">{L('地址或区域', 'Address or suburb')}</label>
        <input id="f-q" type="search" value={g('q')} onChange={(e) => set('q', e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="f-city">{L('城市', 'City')}</label>
        <select id="f-city" value={g('city')} onChange={(e) => set('city', e.target.value)}>
          <option value="">{L('全部城市', 'All cities')}</option>
          {config.cities.map((c) => (
            <option key={c} value={c}>
              {cityName(c, lang)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="f-type">{L('类型', 'Type')}</label>
        <select id="f-type" value={g('type')} onChange={(e) => set('type', e.target.value)}>
          <option value="">{L('全部类型', 'All types')}</option>
          {(['house', 'apartment', 'townhouse', 'land'] as const).map((t) => (
            <option key={t} value={t}>
              {typeLabel(t, lang)}
            </option>
          ))}
        </select>
      </div>
      {historyMode && (
        <div className="field">
          <label htmlFor="f-st">{L('结果', 'Outcome')}</label>
          <select id="f-st" value={g('status')} onChange={(e) => set('status', e.target.value)}>
            <option value="">{L('已售和已租', 'Sold and leased')}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s, lang)}
              </option>
            ))}
          </select>
        </div>
      )}
      {!historyMode && (
        <>
          <div className="field">
            <label htmlFor="f-beds">{L('卧室', 'Bedrooms')}</label>
            <select id="f-beds" value={g('beds')} onChange={(e) => set('beds', e.target.value)}>
              <option value="">{L('不限', 'Any')}</option>
              {[1, 2, 3, 4, 5].map((b) => (
                <option key={b} value={b}>
                  {b}+
                </option>
              ))}
            </select>
          </div>
          {(!marketMode || ['sale', 'rent'].includes(g('marketKind'))) && <><div className="field">
            <label htmlFor="f-min">{marketMode && g('marketKind') === 'rent' ? L('最低周租 (A$)', 'Min weekly rent (A$)') : L('最低价 (A$)', 'Min price (A$)')}</label>
            <input id="f-min" inputMode="numeric" value={g('minPrice')} onChange={(e) => set('minPrice', e.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="field">
            <label htmlFor="f-max">{marketMode && g('marketKind') === 'rent' ? L('最高周租 (A$)', 'Max weekly rent (A$)') : L('最高价 (A$)', 'Max price (A$)')}</label>
            <input id="f-max" inputMode="numeric" value={g('maxPrice')} onChange={(e) => set('maxPrice', e.target.value.replace(/\D/g, ''))} />
          </div></>}
        </>
      )}
      {sp.toString() && (
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setSp(historyMode ? {} : { status: g('status') || 'sale' }, { replace: true })}>
          {L('清除筛选', 'Clear filters')}
        </button>
      )}
    </form>
  );
}

export function Properties() {
  const { L, lang } = useI18n();
  const [sp, setSp] = useSearchParams();
  const market = useMarket();
  const raw = sp.get('status');
  const status: 'sale' | 'rent' | 'market' = raw === 'rent' ? 'rent' : raw === 'market' ? 'market' : 'sale';
  const query = { city: sp.get('city') || undefined, status: status === 'market' ? 'sale' : status, type: sp.get('type') || undefined, q: sp.get('q') || undefined, minPrice: sp.get('minPrice') || undefined, maxPrice: sp.get('maxPrice') || undefined, beds: sp.get('beds') || undefined };
  const key = JSON.stringify(query);
  const { data, loading, error } = useAsync(() => api.properties(query), [key]);
  const tab = (s: 'sale' | 'rent' | 'market') => {
    const n = new URLSearchParams(sp);
    n.set('status', s);
    setSp(n, { replace: true });
  };
  const filterCount = ['city', 'type', 'q', 'minPrice', 'maxPrice', 'beds'].filter((k) => sp.get(k)).length;
  const filtered = filterCount > 0;
  const marketListings = (market?.records || []).filter((r) => r.kind === 'sale' || r.kind === 'rent');
  const marketKind = sp.get('marketKind') || '';
  const marketShown = marketListings.filter((r) =>
    (!marketKind || r.kind === marketKind) &&
    (!query.city || r.city === query.city) &&
    (!query.type || r.propertyType === query.type) &&
    (!query.q || `${r.address} ${r.suburb || ''} ${r.postcode || ''}`.toLowerCase().includes(query.q.toLowerCase())) &&
    (!query.beds || (r.beds != null && r.beds >= Number(query.beds))) &&
    (!query.minPrice || (r.priceAmount != null && (r.priceMax ?? r.priceAmount) >= Number(query.minPrice))) &&
    (!query.maxPrice || (r.priceAmount != null && r.priceAmount <= Number(query.maxPrice)))
  );
  useEffect(() => {
    if (!raw && !filtered && !loading && data?.properties.length === 0 && marketListings.length > 0) {
      const next = new URLSearchParams(sp); next.set('status', 'market'); setSp(next, { replace: true });
    }
  }, [raw, filtered, loading, data, marketListings.length, sp, setSp]);

  return (
    <>
      <PageHead
        title={L('房源', 'Homes')}
        lead={status === 'market' ? L('浏览公开挂牌资料，比较不同区域与户型。', 'Explore public listings and compare suburbs and home types.') : L('在售与出租房源；有实景 3D 导览的房源会单独标注。', 'Homes for sale and lease. Any listing with a real 3D tour is labelled.')}
      />
      <section className="section tight">
        <div className="wrap">
          <div className="list-toolbar">
            <div
              className="seg seg-slide"
              role="tablist"
              aria-label={L('房源类型', 'Listing type')}
              style={{ ['--n' as string]: marketListings.length > 0 ? 3 : 2, ['--i' as string]: status === 'sale' ? 0 : status === 'rent' ? 1 : 2 }}
            >
              {(['sale', 'rent'] as const).map((s) => (
                <button key={s} role="tab" aria-selected={status === s} className={status === s ? 'on' : ''} onClick={() => tab(s)}>
                  {statusLabel(s, lang)}
                </button>
              ))}
              {marketListings.length > 0 && (
                <button role="tab" aria-selected={status === 'market'} className={status === 'market' ? 'on' : ''} onClick={() => tab('market')}>
                  {L('市场参考', 'Market')}
                </button>
              )}
            </div>
            <FilterBar count={filterCount}>
              <Filters statuses={[]} marketMode={status === 'market'} />
            </FilterBar>
          </div>
          {status === 'market' ? (
            <>
              <MarketNote />
              <div className="market-toolbar">
                <div className="market-kinds" role="group" aria-label={L('参考类型', 'Reference type')}>
                  {(['', 'sale', 'rent'] as const).map(kind => <button type="button" key={kind} aria-pressed={marketKind === kind} onClick={() => {
                    const next = new URLSearchParams(sp); kind ? next.set('marketKind', kind) : next.delete('marketKind'); next.delete('minPrice'); next.delete('maxPrice'); setSp(next, { replace: true });
                  }}>{kind === '' ? L('全部', 'All') : kind === 'sale' ? L('在售', 'For sale') : L('招租', 'For lease')}</button>)}
                </div>
                <span className="fine">{L(`${marketShown.length} 条公开挂牌`, `${marketShown.length} public listings`)}</span>
              </div>
              {marketShown.length ? <MarketList records={marketShown} mode="listings" /> : <EmptyState title={L('没有符合条件的参考房源', 'No reference listings match')} />}
            </>
          ) : loading ? (
            <div className="pgrid">{[0, 1, 2].map((i) => <div key={i} className="skeleton-card" aria-busy />)}</div>
          ) : error ? (
            <ErrorState message={error} retry={() => window.location.reload()} />
          ) : data && data.properties.length > 0 ? (
            <>
              <p className="result-count">{L(`共 ${data.properties.length} 套`, `${data.properties.length} ${data.properties.length === 1 ? 'home' : 'homes'}`)}</p>
              <div className="pgrid">{data.properties.map((p) => <PropertyCard key={p.id} p={p} />)}</div>
            </>
          ) : (
            <EmptyState
              title={filtered ? L('没有符合条件的房源', 'No homes match these filters') : status === 'sale' ? L('暂时没有在售房源', 'No homes for sale right now') : L('暂时没有出租房源', 'No homes for lease right now')}
              action={
                <>
                  <Link to={status === 'sale' ? '/buying-registration' : '/rental-registration'} className="btn btn-primary">
                    {status === 'sale' ? L('留下买房需求', 'Tell us what you’re looking for') : L('委托出租我的房子', 'Let my property with you')}
                  </Link>
                  {marketListings.length > 0 && (
                    <button type="button" className="btn btn-line" onClick={() => tab('market')}>
                      {L('看看市场参考', 'See market reference')}
                    </button>
                  )}
                </>
              }
            >
              <p>{filtered ? L('放宽价格或城市条件再试试。', 'Try widening the price or city.') : L('新房源上线后会出现在这里。告诉我们您在找什么，有合适的房子时助理会联系您。', 'New listings will appear here. Tell us what you’re looking for and our assistant will be in touch.')}</p>
            </EmptyState>
          )}
          <p className="list-links">
            <Link to="/history">{L('历史房源', 'Track record')}</Link>
            <Link to="/viewings">{L('在线看房', 'Online viewings')}</Link>
          </p>
        </div>
      </section>
    </>
  );
}

function Gallery({ p }: { p: Property }) {
  const { L, pick } = useI18n();
  const [i, setI] = useState(0);
  if (!p.images.length)
    return (
      <div className="gallery gallery-empty">
        <p>{L('这套房源暂无照片。', 'No photos for this listing yet.')}</p>
      </div>
    );
  const go = (d: number) => setI((i + d + p.images.length) % p.images.length);
  return (
    <div className="gallery">
      <div className="gallery-main">
        <img src={p.images[i]} alt={`${pick(p.title)} ${i + 1}/${p.images.length}`} />
        {p.images.length > 1 && (
          <>
            <button className="g-prev" onClick={() => go(-1)} aria-label={L('上一张', 'Previous photo')}>
              <ChevronLeft />
            </button>
            <button className="g-next" onClick={() => go(1)} aria-label={L('下一张', 'Next photo')}>
              <ChevronRight />
            </button>
          </>
        )}
      </div>
      {p.images.length > 1 && (
        <div className="thumbs">
          {p.images.map((src, k) => (
            <button key={src + k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`${k + 1}`}>
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PropertyDetail() {
  const { id = '' } = useParams();
  const { L, pick, lang } = useI18n();
  const { data, loading, error } = useAsync(() => api.property(id), [id]);
  const [tourFailed, setTourFailed] = useState(false);
  usePublishContactPage(!loading&&!error&&data?.property?{city:data.property.city,propertyId:data.property.id,propertyAddress:data.property.address,service:data.property.status==='sale'||data.property.status==='sold'?'buy':'rent'}:{});

  if (loading) return <div className="wrap section"><div className="skeleton-card tall" aria-busy /></div>;
  if (error || !data) return /404|not found|找不到/i.test(error) || error.startsWith('HTTP 404') ? <NotFound /> : <div className="wrap section"><ErrorState message={error} retry={() => window.location.reload()} /></div>;
  const p = data.property;
  const done = p.status === 'sold' || p.status === 'leased';
  const tour = tourBadge(p, L);
  const title = pick(p.title) || p.address;
  const forOwners = p.status === 'rent' || p.status === 'leased' || p.status === 'sold';

  return (
    <>
      <section className="detail-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="breadcrumb">
            <Link to={done ? '/history' : `/properties?status=${p.status}`}>{done ? L('历史案例', 'Track record') : L('房源', 'Properties')}</Link>
            <span>/</span>
            <span>{title}</span>
          </nav>
          <div className="detail-title">
            <div>
              <span className={`tag tag-${p.status} static`}>{statusLabel(p.status, lang)}</span>
              <h1>{title}</h1>
              <p className="addr">
                {p.address}，{p.suburb} {p.postcode} · {cityName(p.city, lang)}
              </p>
            </div>
            <p className="detail-price">{priceText(p, pick, L)}</p>
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="wrap detail-grid">
          <div>
            <Gallery p={p} />
            <ul className="spec-bar">
              {p.type !== 'land' && (
                <>
                  <li><BedDouble aria-hidden /> <strong>{p.beds}</strong> {L('卧室', 'Bed')}</li>
                  <li><Bath aria-hidden /> <strong>{p.baths}</strong> {L('卫浴', 'Bath')}</li>
                  <li><Car aria-hidden /> <strong>{p.cars}</strong> {L('车位', 'Car')}</li>
                </>
              )}
              {p.area != null && <li><Maximize2 aria-hidden /> <strong>{p.area}</strong> m²</li>}
              <li>{typeLabel(p.type, lang)}</li>
            </ul>

            {pick(p.description) && (
              <div className="prose">
                <h2>{L('房源介绍', 'About this property')}</h2>
                {pick(p.description).split(/\n+/).map((para, k) => <p key={k}>{para}</p>)}
              </div>
            )}

            {p.tourUrl && p.tourKind !== 'none' && (
              <div className="tour-box">
                <h2>
                  {p.tourKind === 'real' ? L('3D 看房', '3D tour') : L('示意 3D 导览', 'Illustrative 3D tour')}
                  {tour && <span className="tag tag-tour static">{p.tourKind === 'real' ? L('实拍／扫描', 'Captured') : L('AI 示意／非实拍', 'Illustrative — not a real capture')}</span>}
                </h2>
                {p.tourKind === 'illustration' && (
                  <p className="notice notice-warn"><Info size={18} aria-hidden /> {L('此导览为示意内容，不代表房屋的实际状况或尺寸。', 'This tour is illustrative and doesn’t show the property’s actual condition or dimensions.')}</p>
                )}
                {tourFailed ? (
                  <p className="notice notice-info">{L('导览暂时无法加载，您仍可以查看上方照片并咨询。', 'The tour couldn’t load. You can still browse the photos above and enquire.')}</p>
                ) : (
                  <iframe
                    src={p.tourUrl}
                    title={L('3D 看房', '3D tour')}
                    loading="lazy"
                    allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    referrerPolicy="no-referrer"
                    onError={() => setTourFailed(true)}
                  />
                )}
                <a className="textlink" href={p.tourUrl} target="_blank" rel="noreferrer noopener">
                  {L('在新窗口打开', 'Open in a new window')} <ExternalLink size={14} aria-hidden />
                </a>
              </div>
            )}

            {p.floorplan && (
              <div className="prose">
                <h2>{L('户型图', 'Floor plan')}</h2>
                <img className="floorplan" src={p.floorplan} alt={L('户型图', 'Floor plan')} loading="lazy" />
              </div>
            )}

            {p.events.length > 0 && (
              <div className="prose">
                <h2>{L('挂牌与成交记录', 'Listing history')}</h2>
                <Timeline events={p.events} />
              </div>
            )}
            <p className="fine">{L(`资料更新于 ${formatDate(p.updatedAt, lang)}。价格单位为澳元。`, `Updated ${formatDate(p.updatedAt, lang)}. Prices in Australian dollars.`)}</p>
          </div>

          <aside className="detail-side">
            <div className="card-pad sticky">
              <h2>{forOwners ? L('您也有房子要出租？', 'Have a property to let?') : L('咨询这套房', 'Enquire about this property')}</h2>
              <p className="fine">
                {forOwners
                  ? L('告诉我们您的房产情况，助理会联系您。', 'Tell us about your property and an assistant will contact you.')
                  : L('可远程咨询；如需实时视频看房，请在补充说明中告诉我们，是否安排以团队确认为准。', 'Remote enquiries are welcome. If you’d like a live video viewing, say so in the notes — availability is confirmed by the team.')}
              </p>
              <LeadForm
                idPrefix="pd"
                defaultService={forOwners ? 'letting' : 'buying'}
                defaultCity={p.city}
                propertyId={forOwners ? undefined : p.id}
                propertyAddress={forOwners ? undefined : p.address}
              />
              {p.status==='sale'&&<Link className="btn btn-line btn-block" to={'/buying-registration?propertyId='+encodeURIComponent(p.id)}>{L('登记这套房的购房需求','Register interest in this home')}</Link>}

            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

/* ---------------- history ---------------- */
function SampleTimeline() {
  const { L } = useI18n();
  const rows = [
    [L('日期', 'Date'), L('挂牌', 'Listed')],
    [L('日期', 'Date'), L('调价', 'Price change')],
    [L('日期', 'Date'), L('成交／出租', 'Sold or leased')],
  ];
  return (
    <ol className="timeline sample" aria-hidden>
      {rows.map(([d, t], i) => (
        <li key={i}>
          <time>{d}</time>
          <div>
            <strong>{t}</strong>
            <span className="tl-price">A$ — —</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function History() {
  const { L, lang, pick } = useI18n();
  const [sp] = useSearchParams();
  const st = sp.get('status');
  const city = sp.get('city') || undefined;
  const type = sp.get('type') || undefined;
  const q = sp.get('q') || undefined;
  const key = [st, city, type, q].join('|');
  const { data, loading, error } = useAsync(async () => {
    const sts = st === 'sold' || st === 'leased' ? [st] : ['sold', 'leased'];
    const res = await Promise.all(sts.map((s) => api.properties({ status: s, city, type, q })));
    return res.flatMap((r) => r.properties).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [key]);
  const [open, setOpen] = useState<string | null>(null);
  const market = useMarket();
  const hasReferences = !!market?.records.some(r => r.kind === 'leased');
  const leasedRefs = (market?.records || []).filter((r) => r.kind === 'leased' && st !== 'sold' && (!city || r.city === city) && (!type || r.propertyType === type) && (!q || `${r.address} ${r.suburb || ''}`.toLowerCase().includes(q.toLowerCase())));
  const showOwnRecords = loading || !!error || !!data?.length || !hasReferences;
  const hasFilter = !!(st || city || type || q);
  const stats = useMemo(() => {
    const list = data || [];
    return { sold: list.filter((p) => p.status === 'sold').length, leased: list.filter((p) => p.status === 'leased').length };
  }, [data]);

  return (
    <>
      <PageHead
        title={L('历史房源', 'Track record')}
        lead={!showOwnRecords ? L('公开已出租记录，供比较房型与区域，并非桉湾经手案例。', 'Public lease records for comparing homes and areas, not properties handled by EUCOVE.') : L('我们经手的已售、已租房屋，以及每套房历次挂牌、调价和成交的时间线。', 'Homes we have sold or leased, with each one’s listing, price-change and result timeline.')}
      />
      {showOwnRecords && <section className="section tight">
        <div className="wrap">
          <div className="list-toolbar">
            <span className="list-title">{L('我们经手的记录', 'Our records')}</span>
            <FilterBar count={[st, city, type, q].filter(Boolean).length}>
              <Filters statuses={['sold', 'leased']} historyMode />
            </FilterBar>
          </div>
          {loading ? (
            <div className="skeleton-row tall" aria-busy />
          ) : error ? (
            <ErrorState message={error} retry={() => window.location.reload()} />
          ) : data && data.length > 0 ? (
            <>
              <p className="result-count">{L(`已租 ${stats.leased} 套，已售 ${stats.sold} 套`, `${stats.leased} leased, ${stats.sold} sold`)}</p>
              <ul className="cases">
                {data.map((p) => (
                  <li key={p.id} className="case">
                    <div className="case-main">
                      <span className={`tag tag-${p.status} static`}>{statusLabel(p.status, lang)}</span>
                      <div>
                        <h3>
                          <Link to={`/properties/${p.id}`}>{pick(p.title) || p.address}</Link>
                        </h3>
                        <p>
                          {p.suburb ? `${p.suburb} · ` : ''}
                          {cityName(p.city, lang)} · {typeLabel(p.type, lang)}
                        </p>
                      </div>
                      <p className="case-price">{p.price != null ? money(p.price) : pick(p.priceLabel)}</p>
                      <button className="btn btn-quiet btn-sm" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>
                        {open === p.id ? L('收起时间线', 'Hide timeline') : L('查看时间线', 'Show timeline')}
                      </button>
                    </div>
                    {open === p.id && <Timeline events={p.events} />}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="history-empty">
              <EmptyState
                title={hasFilter ? L('没有符合条件的记录', 'No records match these filters') : L('记录即将发布', 'Records coming soon')}
                action={
                  <Link to="/contact?service=letting" className="btn btn-primary">
                    {L('咨询出租委托', 'Enquire about letting')}
                  </Link>
                }
              >
                <p>
                  {hasFilter
                    ? L('试试清除筛选。', 'Try clearing the filters.')
                    : L('核实后的出租与成交记录会在这里发布。想先了解我们怎样服务房东，可以直接咨询助理。', 'Verified lettings and sales will be published here. To hear how we work with owners in the meantime, ask our assistant.')}
                </p>
              </EmptyState>
              {!hasFilter && (
                <div className="sample-wrap">
                  <h3>{L('每套房的记录包含', 'Each record shows')}</h3>
                  <p className="fine">{L('以下为格式示例，并非真实记录。', 'Format example only — not a real record.')}</p>
                  <SampleTimeline />
                </div>
              )}
            </div>
          )}
        </div>
      </section>}
      {hasReferences && (
        <section className="section section-alt">
          <div className="wrap">
            <div className="section-head">
              <h2>{L('公开租赁记录', 'Public lease records')}</h2>
              {!showOwnRecords && <FilterBar count={[st, city, type, q].filter(Boolean).length}><Filters statuses={['sold', 'leased']} historyMode /></FilterBar>}
            </div>
            <MarketNote />
            {leasedRefs.length > 0 ? <MarketList records={leasedRefs} mode="leased" /> : <EmptyState title={L('没有符合条件的公开记录', 'No public records match these filters')} />}
          </div>
        </section>
      )}
    </>
  );
}
