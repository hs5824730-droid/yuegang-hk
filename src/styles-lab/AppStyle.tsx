import { useEffect, useMemo, useState } from 'react';
import { BedDouble, ChevronLeft, ChevronRight, Hammer, Heart, House, KeyRound, LayoutGrid, Map as MapIcon, Ruler, Search, SlidersHorizontal, Tag, Wrench, X } from 'lucide-react';
import { useEnquiry } from '../components/Enquiry';
import HkMap from '../components/HkMap';
import { cityName, useI18n } from '../i18n';
import type { ViewingListing } from '../viewing-types';
import { area, estateName, REGIONS, unitName, useListings, type Kind } from './shared';
import './app-style.css';

const FAV_KEY = 'lab-favourites';

function Card({ l, fav, onFav, onOpen }: { l: ViewingListing; fav: boolean; onFav: () => void; onOpen: () => void }) {
  const { L, lang } = useI18n();
  const photos = [l.coverUrl, ...l.rooms.map(r => r.photoUrl)].filter((p, i, a) => p && a.indexOf(p) === i);
  const [n, setN] = useState(0);
  const sq = area(l);
  return (
    <article className="ap-card">
      <div className="ap-photo">
        <div className="ap-track" style={{ transform: `translateX(-${n * 100}%)` }}>
          {photos.map(p => <img key={p} src={p} alt="" loading="lazy" />)}
        </div>
        {photos.length > 1 && <>
          <button type="button" className="ap-nav ap-prev" onClick={() => setN((n - 1 + photos.length) % photos.length)} aria-label={L('上一張', 'Previous')}><ChevronLeft size={16} /></button>
          <button type="button" className="ap-nav ap-next" onClick={() => setN((n + 1) % photos.length)} aria-label={L('下一張', 'Next')}><ChevronRight size={16} /></button>
          <span className="ap-dots">{photos.map((p, i) => <i key={p} className={i === n ? 'on' : ''} />)}</span>
        </>}
        <button type="button" className={`ap-fav ${fav ? 'on' : ''}`} aria-pressed={fav} onClick={onFav} aria-label={L('收藏', 'Save')}><Heart size={18} /></button>
        <span className="ap-badge">{l.kind === 'rent' ? L('租盤', 'To let') : l.kind === 'sale' ? L('售盤', 'For sale') : L('已成交', 'Sold')}</span>
      </div>
      <button type="button" className="ap-info" onClick={onOpen}>
        <strong className="ap-price">{lang === 'en' ? l.priceDisplay.en : l.priceDisplay.zh}</strong>
        <span className="ap-title">{estateName(l)}<small>{unitName(l)}</small></span>
        <span className="ap-meta">
          <span>{l.suburb} · {cityName(l.city, lang)}</span>
          {l.beds ? <span><BedDouble size={14} />{l.beds}</span> : null}
          {sq ? <span><Ruler size={14} />{sq}{L('呎', ' ft²')}</span> : null}
        </span>
      </button>
    </article>
  );
}

export default function AppStyle() {
  const { L, lang } = useI18n();
  const enquire = useEnquiry();
  const data = useListings();
  const [kind, setKind] = useState<Kind>('rent');
  const [region, setRegion] = useState<string>('');
  const [beds, setBeds] = useState(0);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'new' | 'low' | 'high'>('new');
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [open, setOpen] = useState<ViewingListing | null>(null);
  const [favs, setFavs] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; } });
  useEffect(() => { try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch { /* private mode */ } }, [favs]);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);

  const price = (l: ViewingListing) => l.soldPrice || Number((l.priceDisplay.en.match(/[\d,.]+/)?.[0] || '0').replace(/,/g, '')) * (/萬|M/.test(l.priceDisplay.zh) ? 10000 : 1);
  const list = useMemo(() => {
    let r = data[kind].filter(l => (!region || l.city === region) && (!beds || (l.beds || 0) >= beds) && (!q || (l.address + l.suburb).includes(q.trim())));
    if (sort === 'low') r = [...r].sort((a, b) => price(a) - price(b));
    if (sort === 'high') r = [...r].sort((a, b) => price(b) - price(a));
    if (sort === 'new' && kind === 'sold') r = [...r].sort((a, b) => (b.soldDate || '').localeCompare(a.soldDate || ''));
    return r;
  }, [data, kind, region, beds, q, sort]);

  const quick = [
    { Icon: KeyRound, t: L('放租', 'Let'), s: 'letting' }, { Icon: House, t: L('租務管理', 'Manage'), s: 'management' }, { Icon: Tag, t: L('放售', 'Sell'), s: 'selling' },
    { Icon: Search, t: L('買樓', 'Buy'), s: 'buying' }, { Icon: Hammer, t: L('翻新', 'Renovate'), s: 'renovation' }, { Icon: Wrench, t: L('維修', 'Repairs'), s: 'maintenance' },
  ] as const;

  return (
    <div className="ap">
      <header className="ap-top">
        <span className="ap-logo"><b>悦港</b> Harbour Joy</span>
        <nav><a href="#ap-list">{L('搵樓', 'Search')}</a><a href="#ap-services">{L('業主服務', 'Owners')}</a><a href="/viewings">{L('網上睇樓', 'Listings')}</a></nav>
        <button type="button" className="ap-saved" onClick={() => { setKind('rent'); setQ(''); }}><Heart size={16} />{favs.length}</button>
      </header>

      <section className="ap-hero">
        <img src="/img/hk/harbour-night.webp" alt="" />
        <div className="ap-hero-in">
          <h1>{L('搵樓、放盤，一個 App 搞掂', 'Find a home or list yours, in one place')}</h1>
          <div className="ap-search">
            <div className="ap-kinds" role="tablist">
              {(['rent', 'sale', 'sold'] as Kind[]).map(k => (
                <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}>
                  {k === 'rent' ? L('租樓', 'Rent') : k === 'sale' ? L('買樓', 'Buy') : L('成交', 'Sold')}<small>{data[k].length}</small>
                </button>
              ))}
            </div>
            <label className="ap-field"><Search size={20} /><input value={q} onChange={e => setQ(e.target.value)} placeholder={L('輸入屋苑或地區，例如：太古城、沙田', 'Estate or area, e.g. Taikoo Shing')} />{q && <button type="button" onClick={() => setQ('')} aria-label={L('清除', 'Clear')}><X size={16} /></button>}</label>
          </div>
        </div>
      </section>

      <section className="ap-quick" id="ap-services" aria-label={L('業主服務', 'Owner services')}>
        {quick.map(({ Icon, t, s }) => <button key={s} type="button" onClick={() => enquire({ service: s })}><span><Icon size={22} /></span>{t}</button>)}
      </section>

      <section className="ap-list" id="ap-list">
        <div className="ap-filters">
          <span className="ap-filters-icon"><SlidersHorizontal size={16} /></span>
          <button type="button" aria-pressed={!region} onClick={() => setRegion('')}>{L('全港', 'All')}</button>
          {REGIONS.map(r => <button key={r} type="button" aria-pressed={region === r} onClick={() => setRegion(region === r ? '' : r)}>{cityName(r, lang)}</button>)}
          <span className="ap-sep" />
          {[1, 2, 3].map(b => <button key={b} type="button" aria-pressed={beds === b} onClick={() => setBeds(beds === b ? 0 : b)}>{b}+ {L('房', 'bd')}</button>)}
          <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} aria-label={L('排序', 'Sort')}>
            <option value="new">{kind === 'sold' ? L('最新成交', 'Latest') : L('推介', 'Featured')}</option>
            <option value="low">{L('價錢由低至高', 'Price: low to high')}</option>
            <option value="high">{L('價錢由高至低', 'Price: high to low')}</option>
          </select>
          <div className="ap-view">
            <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')} aria-label={L('卡片', 'Grid')}><LayoutGrid size={16} /></button>
            <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')} aria-label={L('地圖', 'Map')}><MapIcon size={16} /></button>
          </div>
        </div>
        <p className="ap-count" aria-live="polite">{L(`搵到 ${list.length} 個${kind === 'rent' ? '租盤' : kind === 'sale' ? '售盤' : '成交紀錄'}`, `${list.length} ${kind === 'rent' ? 'to let' : kind === 'sale' ? 'for sale' : 'sold'}`)}</p>
        {view === 'map' ? <div className="ap-map"><HkMap /></div> : (
          <div className="ap-grid" key={kind + region + beds + sort}>
            {list.map((l, i) => <div key={l.id} className="ap-cell" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}><Card l={l} fav={favs.includes(l.id)} onFav={() => setFavs(f => f.includes(l.id) ? f.filter(x => x !== l.id) : [...f, l.id])} onOpen={() => setOpen(l)} /></div>)}
            {!list.length && <p className="ap-empty">{L('冇符合條件嘅盤，試吓放寬條件，或者留低需求等我哋通知你。', 'Nothing matches. Widen the filters, or leave your needs with us.')}</p>}
          </div>
        )}
      </section>

      <section className="ap-owner">
        <div>
          <h2>{L('業主放盤，首個單位免佣', 'List with us — no owner commission on your first flat')}</h2>
          <p>{L('另送交吉清潔一次，至 2027 年 2 月。一位顧問由睇樓跟到交收。', 'Plus a free pre-letting clean, until February 2027. One adviser from viewing to handover.')}</p>
        </div>
        <button type="button" onClick={() => enquire({ service: 'letting', offer: true })}>{L('立即放盤', 'List my flat')}</button>
      </section>

      {open && (
        <div className="ap-sheet-wrap" onClick={() => setOpen(null)}>
          <div className="ap-sheet" role="dialog" aria-modal="true" aria-label={estateName(open)} onClick={e => e.stopPropagation()}>
            <span className="ap-grab" />
            <button type="button" className="ap-close" onClick={() => setOpen(null)} aria-label={L('關閉', 'Close')}><X size={18} /></button>
            <img src={open.coverUrl} alt="" />
            <div className="ap-sheet-body">
              <strong className="ap-price">{lang === 'en' ? open.priceDisplay.en : open.priceDisplay.zh}</strong>
              <h3>{open.address}</h3>
              <p className="ap-sheet-sub">{open.suburb} · {cityName(open.city, lang)}{open.soldDate ? ` · ${L('成交', 'Sold')} ${open.soldDate}` : ''}</p>
              <ul>{(open.features || []).map(f => <li key={f.zh}>{lang === 'en' ? f.en : f.zh}</li>)}</ul>
              <button type="button" className="ap-cta" onClick={() => enquire({ service: open.kind === 'rent' ? 'letting' : 'buying', city: open.city })}>{open.kind === 'sold' ? L('查詢同屋苑盤源', 'Ask about this estate') : L('預約睇樓', 'Book a viewing')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
