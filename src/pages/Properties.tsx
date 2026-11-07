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
        {L('篩揀', 'Filters')}
        {count > 0 && <span className="filter-count">{count}</span>}
      </button>
      <div className={`filter-wrap ${open ? 'open' : ''} ${closing ? 'closing' : ''}`}>
        <div className="filter-scrim" onClick={() => setOpen(false)} aria-hidden />
        <div className="filter-panel" id="filter-panel" role={open ? 'dialog' : undefined} aria-modal={open || undefined} aria-label={L('篩揀', 'Filters')}>
          <div className="filter-head">
            <strong>{L('篩揀', 'Filters')}</strong>
            <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label={L('關閉', 'Close')}>
              <X size={20} />
            </button>
          </div>
          {children}
          <div className="filter-foot">
            <button type="button" className="btn btn-primary btn-block" onClick={() => setOpen(false)}>
              {L('查睇結果', 'Show results')}
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
        <label htmlFor="f-q">{L('地址或區域', 'Address or suburb')}</label>
        <input id="f-q" type="search" value={g('q')} onChange={(e) => set('q', e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="f-city">{L('地區', 'City')}</label>
        <select id="f-city" value={g('city')} onChange={(e) => set('city', e.target.value)}>
          <option value="">{L('全部地區', 'All cities')}</option>
          {config.cities.map((c) => (
            <option key={c} value={c}>
              {cityName(c, lang)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="f-type">{L('類型', 'Type')}</label>
        <select id="f-type" value={g('type')} onChange={(e) => set('type', e.target.value)}>
          <option value="">{L('全部類型', 'All types')}</option>
          {(['house', 'apartment', 'townhouse', 'land'] as const).map((t) => (
            <option key={t} value={t}>
              {typeLabel(t, lang)}
            </option>
          ))}
        </select>
      </div>
      {historyMode && (
        <div className="field">
          <label htmlFor="f-st">{L('結果', 'Outcome')}</label>
          <select id="f-st" value={g('status')} onChange={(e) => set('status', e.target.value)}>
            <option value="">{L('已售同已租', 'Sold and leased')}</option>
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
            <label htmlFor="f-min">{marketMode && g('marketKind') === 'rent' ? L('最低月租 (HK$)', 'Min monthly rent (HK$)') : L('最低價 (HK$)', 'Min price (HK$)')}</label>
            <input id="f-min" inputMode="numeric" value={g('minPrice')} onChange={(e) => set('minPrice', e.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="field">
            <label htmlFor="f-max">{marketMode && g('marketKind') === 'rent' ? L('最高月租 (HK$)', 'Max monthly rent (HK$)') : L('最高價 (HK$)', 'Max price (HK$)')}</label>
            <input id="f-max" inputMode="numeric" value={g('maxPrice')} onChange={(e) => set('maxPrice', e.target.value.replace(/\D/g, ''))} />
          </div></>}
        </>
      )}
      {sp.toString() && (
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setSp(historyMode ? {} : { status: g('status') || 'sale' }, { replace: true })}>
          {L('清除篩揀', 'Clear filters')}
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
        title={L('樓盤', 'Homes')}
        lead={status === 'market' ? L('瀏覽公開掛牌資料，比較唔同區域同戶型。', 'Explore public listings and compare suburbs and home types.') : L('在售同出租樓盤；有實景 3D 導覽嘅樓盤會單獨標註。', 'Homes for sale and lease. Any listing with a real 3D tour is labelled.')}
      />
      <section className="section tight">
        <div className="wrap">
          <div className="list-toolbar">
            <div
              className="seg seg-slide"
              role="tablist"
              aria-label={L('樓盤類型', 'Listing type')}
              style={{ ['--n' as string]: marketListings.length > 0 ? 3 : 2, ['--i' as string]: status === 'sale' ? 0 : status === 'rent' ? 1 : 2 }}
            >
              {(['sale', 'rent'] as const).map((s) => (
                <button key={s} role="tab" aria-selected={status === s} className={status === s ? 'on' : ''} onClick={() => tab(s)}>
                  {statusLabel(s, lang)}
                </button>
              ))}
              {marketListings.length > 0 && (
                <button role="tab" aria-selected={status === 'market'} className={status === 'market' ? 'on' : ''} onClick={() => tab('market')}>
                  {L('市場參考', 'Market')}
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
                <div className="market-kinds" role="group" aria-label={L('參考類型', 'Reference type')}>
                  {(['', 'sale', 'rent'] as const).map(kind => <button type="button" key={kind} aria-pressed={marketKind === kind} onClick={() => {
                    const next = new URLSearchParams(sp); kind ? next.set('marketKind', kind) : next.delete('marketKind'); next.delete('minPrice'); next.delete('maxPrice'); setSp(next, { replace: true });
                  }}>{kind === '' ? L('全部', 'All') : kind === 'sale' ? L('在售', 'For sale') : L('放租', 'For lease')}</button>)}
                </div>
                <span className="fine">{L(`${marketShown.length} 條公開掛牌`, `${marketShown.length} public listings`)}</span>
              </div>
              {marketShown.length ? <MarketList records={marketShown} mode="listings" /> : <EmptyState title={L('冇符合條件嘅參考樓盤', 'No reference listings match')} />}
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
              title={filtered ? L('冇符合條件嘅樓盤', 'No homes match these filters') : status === 'sale' ? L('暫時冇在售樓盤', 'No homes for sale right now') : L('暫時冇出租樓盤', 'No homes for lease right now')}
              action={
                <>
                  <Link to={status === 'sale' ? '/buying-registration' : '/rental-registration'} className="btn btn-primary">
                    {status === 'sale' ? L('留低買樓需求', 'Tell us what you’re looking for') : L('委託出租我嘅單位', 'Let my property with you')}
                  </Link>
                  {marketListings.length > 0 && (
                    <button type="button" className="btn btn-line" onClick={() => tab('market')}>
                      {L('睇吓市場參考', 'See market reference')}
                    </button>
                  )}
                </>
              }
            >
              <p>{filtered ? L('放寬價格或地區條件再試試。', 'Try widening the price or city.') : L('新樓盤上線後會出而家呢度。話我哋你在搵咩，有合適嘅單位時同事會聯絡你。', 'New listings will appear here. Tell us what you’re looking for and our assistant will be in touch.')}</p>
            </EmptyState>
          )}
          <p className="list-links">
            <Link to="/history">{L('歷史樓盤', 'Track record')}</Link>
            <Link to="/viewings">{L('網上睇樓', 'Online viewings')}</Link>
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
        <p>{L('呢層樓盤暫無照片。', 'No photos for this listing yet.')}</p>
      </div>
    );
  const go = (d: number) => setI((i + d + p.images.length) % p.images.length);
  return (
    <div className="gallery">
      <div className="gallery-main">
        <img src={p.images[i]} alt={`${pick(p.title)} ${i + 1}/${p.images.length}`} />
        {p.images.length > 1 && (
          <>
            <button className="g-prev" onClick={() => go(-1)} aria-label={L('上一張', 'Previous photo')}>
              <ChevronLeft />
            </button>
            <button className="g-next" onClick={() => go(1)} aria-label={L('下一張', 'Next photo')}>
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
  if (error || !data) return /404|not found|搵不到/i.test(error) || error.startsWith('HTTP 404') ? <NotFound /> : <div className="wrap section"><ErrorState message={error} retry={() => window.location.reload()} /></div>;
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
            <Link to={done ? '/history' : `/properties?status=${p.status}`}>{done ? L('歷史案例', 'Track record') : L('樓盤', 'Properties')}</Link>
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
                  <li><Bath aria-hidden /> <strong>{p.baths}</strong> {L('衞浴', 'Bath')}</li>
                  <li><Car aria-hidden /> <strong>{p.cars}</strong> {L('車位', 'Car')}</li>
                </>
              )}
              {p.area != null && <li><Maximize2 aria-hidden /> <strong>{p.area}</strong> m²</li>}
              <li>{typeLabel(p.type, lang)}</li>
            </ul>

            {pick(p.description) && (
              <div className="prose">
                <h2>{L('樓盤介紹', 'About this property')}</h2>
                {pick(p.description).split(/\n+/).map((para, k) => <p key={k}>{para}</p>)}
              </div>
            )}

            {p.tourUrl && p.tourKind !== 'none' && (
              <div className="tour-box">
                <h2>
                  {p.tourKind === 'real' ? L('3D 睇樓', '3D tour') : L('示意 3D 導覽', 'Illustrative 3D tour')}
                  {tour && <span className="tag tag-tour static">{p.tourKind === 'real' ? L('實拍／掃描', 'Captured') : L('AI 示意／非實拍', 'Illustrative — not a real capture')}</span>}
                </h2>
                {p.tourKind === 'illustration' && (
                  <p className="notice notice-warn"><Info size={18} aria-hidden /> {L('此導覽為示意內容，唔代表房屋嘅實際狀況或尺寸。', 'This tour is illustrative and doesn’t show the property’s actual condition or dimensions.')}</p>
                )}
                {tourFailed ? (
                  <p className="notice notice-info">{L('導覽暫時無法加載，你仍可以查睇上方照片並查詢。', 'The tour couldn’t load. You can still browse the photos above and enquire.')}</p>
                ) : (
                  <iframe
                    src={p.tourUrl}
                    title={L('3D 睇樓', '3D tour')}
                    loading="lazy"
                    allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    referrerPolicy="no-referrer"
                    onError={() => setTourFailed(true)}
                  />
                )}
                <a className="textlink" href={p.tourUrl} target="_blank" rel="noreferrer noopener">
                  {L('在新窗口打開', 'Open in a new window')} <ExternalLink size={14} aria-hidden />
                </a>
              </div>
            )}

            {p.floorplan && (
              <div className="prose">
                <h2>{L('戶型圖', 'Floor plan')}</h2>
                <img className="floorplan" src={p.floorplan} alt={L('戶型圖', 'Floor plan')} loading="lazy" />
              </div>
            )}

            {p.events.length > 0 && (
              <div className="prose">
                <h2>{L('掛牌同成交記錄', 'Listing history')}</h2>
                <Timeline events={p.events} />
              </div>
            )}
            <p className="fine">{L(`資料更新於 ${formatDate(p.updatedAt, lang)}。價格單位為澳元。`, `Updated ${formatDate(p.updatedAt, lang)}. Prices in Hong Kong dollars.`)}</p>
          </div>

          <aside className="detail-side">
            <div className="card-pad sticky">
              <h2>{forOwners ? L('你都有單位要出租？', 'Have a property to let?') : L('查詢呢層房', 'Enquire about this property')}</h2>
              <p className="fine">
                {forOwners
                  ? L('話我哋你嘅房產情況，同事會聯絡你。', 'Tell us about your property and an assistant will contact you.')
                  : L('可遠程查詢；如需實時影片睇樓，請在補充說明中話我哋，係咪安排以團隊確認為準。', 'Remote enquiries are welcome. If you’d like a live video viewing, say so in the notes — availability is confirmed by the team.')}
              </p>
              <LeadForm
                idPrefix="pd"
                defaultService={forOwners ? 'letting' : 'buying'}
                defaultCity={p.city}
                propertyId={forOwners ? undefined : p.id}
                propertyAddress={forOwners ? undefined : p.address}
              />
              {p.status==='sale'&&<Link className="btn btn-line btn-block" to={'/buying-registration?propertyId='+encodeURIComponent(p.id)}>{L('登記呢層房嘅置業需求','Register interest in this home')}</Link>}

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
    [L('日期', 'Date'), L('掛牌', 'Listed')],
    [L('日期', 'Date'), L('調價', 'Price change')],
    [L('日期', 'Date'), L('成交／出租', 'Sold or leased')],
  ];
  return (
    <ol className="timeline sample" aria-hidden>
      {rows.map(([d, t], i) => (
        <li key={i}>
          <time>{d}</time>
          <div>
            <strong>{t}</strong>
            <span className="tl-price">HK$ — —</span>
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
        title={L('歷史樓盤', 'Track record')}
        lead={!showOwnRecords ? L('公開已出租記錄，供比較房型同區域，並非悦港經手案例。', 'Public lease records for comparing homes and areas, not properties handled by Harbour Joy.') : L('我哋經手嘅已售、已租房屋，同埋每層樓歷次掛牌、調價同成交嘅時間線。', 'Homes we have sold or leased, with each one’s listing, price-change and result timeline.')}
      />
      {showOwnRecords && <section className="section tight">
        <div className="wrap">
          <div className="list-toolbar">
            <span className="list-title">{L('我哋經手嘅記錄', 'Our records')}</span>
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
                        {open === p.id ? L('收起時間線', 'Hide timeline') : L('查睇時間線', 'Show timeline')}
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
                title={hasFilter ? L('冇符合條件嘅記錄', 'No records match these filters') : L('記錄即將發佈', 'Records coming soon')}
                action={
                  <Link to="/contact?service=letting" className="btn btn-primary">
                    {L('查詢出租委託', 'Enquire about letting')}
                  </Link>
                }
              >
                <p>
                  {hasFilter
                    ? L('試試清除篩揀。', 'Try clearing the filters.')
                    : L('核實後嘅出租同成交記錄會在呢度發佈。想先了解我哋點樣服務業主，可以直接查詢同事。', 'Verified lettings and sales will be published here. To hear how we work with owners in the meantime, ask our assistant.')}
                </p>
              </EmptyState>
              {!hasFilter && (
                <div className="sample-wrap">
                  <h3>{L('每層樓嘅記錄包含', 'Each record shows')}</h3>
                  <p className="fine">{L('以下為格式示例，並非真實記錄。', 'Format example only — not a real record.')}</p>
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
              <h2>{L('公開租賃記錄', 'Public lease records')}</h2>
              {!showOwnRecords && <FilterBar count={[st, city, type, q].filter(Boolean).length}><Filters statuses={['sold', 'leased']} historyMode /></FilterBar>}
            </div>
            <MarketNote />
            {leasedRefs.length > 0 ? <MarketList records={leasedRefs} mode="leased" /> : <EmptyState title={L('冇符合條件嘅公開記錄', 'No public records match these filters')} />}
          </div>
        </section>
      )}
    </>
  );
}
