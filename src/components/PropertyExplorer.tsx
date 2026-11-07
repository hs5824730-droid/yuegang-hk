import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Bath, BedDouble, CarFront, ImageOff, MapPin, Play } from 'lucide-react';
import { cityName, useI18n } from '../i18n';
import { reducedMotion } from './ui';
import './property-explorer.css';

export interface ExplorerRoom {
  id: string;
  label: string;
  photoUrl: string;
  thumbnailUrl: string;
  videoUrl: string | null;
}
export interface ExplorerItem {
  id: string;
  address: string;
  suburb: string;
  city: string;
  postcode: string;
  beds: number | null;
  baths: number | null;
  cars: number | null;
  /** headline figure, e.g. "HK$700 / 月" or "HK$1,250,000" */
  price: string;
  statusLabel?: string;
  /** what the figure means, e.g. "掛牌月租，非成交租金" */
  priceNote: string;
  /** extra dated facts already formatted, e.g. ["成交日期 2026年3月2日"] */
  facts: string[];
  coverUrl: string | null;
  rooms: ExplorerRoom[];
  geo?: { latitude: number; longitude: number } | null;
}

interface Props {
  items: ExplorerItem[];
  selectedId: string;
  roomId: string;
  onSelect: (id: string) => void;
  onRoom: (id: string) => void;
  city: string;
  onCity: (city: string) => void;
  /** short label on the media, e.g. "歷史資料 / 內部樣品" */
  tag: string;
  cta: { label: string; onClick: () => void };
  /** shown when the current room's video fails or is missing */
  photoNote?: string;
  videoNote?: string;
}

/**
 * Immersive explorer: a large stage for the current room, room tabs, a facts panel and a
 * swipeable property strip. Horizontal swipes on the stage change property; vertical
 * scrolling is left to the browser (touch-action: pan-y), so the page never feels stuck.
 */
export default function PropertyExplorer({ items, selectedId, roomId, onSelect, onRoom, city, onCity, tag, cta, photoNote, videoNote }: Props) {
  const { L, lang } = useI18n();
  const [failedVideo, setFailedVideo] = useState('');
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const stripRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const cities = [...new Set(items.map((i) => i.city))];
  const visible = items.filter((i) => !city || i.city === city);
  const current = visible.find((i) => i.id === selectedId) || visible[0] || items[0];
  const room = current?.rooms.find((r) => r.id === roomId) || current?.rooms[0];
  const index = visible.findIndex((i) => i.id === current?.id);
  const hasVideo = Boolean(room?.videoUrl && room.videoUrl !== failedVideo);

  const go = (step: number) => {
    if (!visible.length) return;
    const next = visible[(Math.max(index, 0) + step + visible.length) % visible.length];
    setDir(step > 0 ? 'next' : 'prev');
    onSelect(next.id);
  };

  // keep the active card in view inside the strip
  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-id="${current?.id}"]`);
    if (strip && el) {
      const stripBox = strip.getBoundingClientRect();
      const itemBox = el.getBoundingClientRect();
      strip.scrollTo({ left: strip.scrollLeft + itemBox.left - stripBox.left - (strip.clientWidth - itemBox.width) / 2, behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
  }, [current?.id]);

  if (!current) return null;

  const pickCity = (c: string) => {
    onCity(c);
  };

  const photo = room?.photoUrl || current.coverUrl || '';
  const media = room ? (hasVideo
    ? <video key={room.videoUrl} controls playsInline preload="metadata" poster={room.photoUrl} src={room.videoUrl!} onError={() => setFailedVideo(room.videoUrl!)} />
    : <img key={room.photoUrl} src={room.photoUrl} alt={`${current.address} · ${room.label}`} fetchPriority="high" />)
    : current.coverUrl ? <img src={current.coverUrl} alt={current.address} />
    : <div className="px-media-empty"><ImageOff size={28} aria-hidden /><span>{L('照片整理中', 'Photos coming soon')}</span></div>;
  const pad = (n: number) => String(n).padStart(2, '0');

  return <div className="px">
    {cities.length > 1 && <div className="px-cities" role="group" aria-label={L('按地區查睇', 'Filter by city')}>
      <button type="button" aria-pressed={!city} onClick={() => pickCity('')}>{L('全部', 'All')}<span>{items.length}</span></button>
      {cities.map((c) => <button key={c} type="button" aria-pressed={city === c} onClick={() => pickCity(c)}>{cityName(c, lang)}<span>{items.filter((i) => i.city === c).length}</span></button>)}
    </div>}

    <div className="px-main">
      <section className={`px-stage${hasVideo ? ' px-stage-video' : ''}`} aria-roledescription={L('樓盤瀏覽', 'property viewer')} aria-label={current.address}
        onTouchStart={(e) => { touch.current = e.target instanceof HTMLVideoElement || e.touches.length !== 1 ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchCancel={() => { touch.current = null; }}
        onTouchEnd={(e) => {
          const t = touch.current; touch.current = null;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x; const dy = e.changedTouches[0].clientY - t.y;
          if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
        }}>
        {photo && !hasVideo && <img className="px-backdrop" src={photo} alt="" aria-hidden key={`bg-${photo}`} />}
        <div className={`px-media dir-${dir}`} key={`${current.id}-${room?.id}`}>{media}</div>
        <dl className="px-labels">
          <div><dt>{L('位置', 'Location')}</dt><dd>{current.suburb}, {cityName(current.city, lang)}</dd></div>
          {room && <div><dt>{L('當前房間', 'Room')}</dt><dd>{room.label}</dd></div>}
        </dl>
        <span className="px-tag">{tag}</span>
        {hasVideo && <span className="px-video-flag"><Play size={13} aria-hidden />{L('AI 影片', 'AI video')}</span>}
        <p className="px-count"><span className="px-num">{pad(index + 1)}</span><span className="px-count-total">/ {pad(visible.length)}</span>{visible.length > 1 && <span className="px-count-hint">{L('左右滑動切換', 'Swipe to change')}</span>}</p>
      </section>

      <aside className="px-panel" aria-live="polite">
        <div className="px-panel-in" key={current.id}>
          <p className="px-panel-kicker">{tag}</p>
          <h2 className="px-address">{current.address}</h2>
          <p className="px-suburb">{current.suburb}, {cityName(current.city, lang)} {current.postcode}</p>
          <p className="px-price">{current.price}</p>
          <p className="px-price-note">{current.priceNote}</p>
          <ul className="px-specs">
            <li><span>{L('卧室', 'Bedrooms')}</span><strong><BedDouble size={18} aria-hidden />{current.beds ?? '—'}</strong></li>
            <li><span>{L('衞浴', 'Bathrooms')}</span><strong><Bath size={18} aria-hidden />{current.baths ?? '—'}</strong></li>
            <li><span>{L('車位', 'Car spaces')}</span><strong><CarFront size={18} aria-hidden />{current.cars ?? '—'}</strong></li>
          </ul>
          {current.facts.map((f) => <p className="px-fact" key={f}>{f}</p>)}
          {current.rooms.length > 0 && <>
            <p className="px-section-label">{L('房間', 'Rooms')}<span>{current.rooms.length}</span></p>
            <div className="px-rooms" role="group" aria-label={L('揀房間', 'Choose a room')}>
              {current.rooms.map((r) => <button key={r.id} type="button" aria-pressed={room?.id === r.id} onClick={() => onRoom(r.id)}>
                <img src={r.thumbnailUrl} alt="" loading="lazy" /><span>{r.label}{r.videoUrl && r.videoUrl !== failedVideo && <Play size={11} aria-hidden />}</span>
              </button>)}
            </div>
          </>}
          {room && <p className="px-room-state" role="status">{hasVideo ? videoNote : photoNote}</p>}
        </div>
        <div className="px-actions">
          {visible.length > 1 && <>
            <button type="button" className="px-nav px-prev" onClick={() => go(-1)} aria-label={L('上一套樓盤', 'Previous property')}><ArrowLeft size={20} /></button>
            <button type="button" className="px-nav px-next" onClick={() => go(1)} aria-label={L('下一套樓盤', 'Next property')}><ArrowRight size={20} /></button>
          </>}
          <button type="button" className="btn btn-primary px-cta" onClick={cta.onClick}>{cta.label}<ArrowUpRight size={18} aria-hidden /></button>
        </div>
        <PropertyMap key={`map-${current.id}`} item={current} />
      </aside>
    </div>

    {items.length > 1 && <div className="px-strip-wrap">
      <h3>{L('切換樓盤', 'More properties')}</h3>
      <div className="px-strip" ref={stripRef} role="group" aria-label={L('切換樓盤', 'Choose a property')}>
        {visible.map((i) => <button key={i.id} data-id={i.id} type="button" className={i.id === current.id ? 'on' : ''} aria-current={i.id === current.id || undefined} onClick={() => { setDir(visible.indexOf(i) < index ? 'prev' : 'next'); onSelect(i.id); }}>
          <span className="px-strip-img">{i.coverUrl ? <img src={i.coverUrl} alt="" loading="lazy" /> : <ImageOff size={20} aria-hidden />}</span>
          <span className="px-strip-text"><strong>{i.address}</strong><span>{i.suburb} · {cityName(i.city, lang)}</span><em>{i.price}</em>{i.statusLabel&&<span className="px-strip-status">{i.statusLabel}</span>}</span>
        </button>)}
      </div>
    </div>}
  </div>;
}

function PropertyMap({ item }: { item: ExplorerItem }) {
  const { L, lang } = useI18n();
  const [opened, setOpened] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [frameError, setFrameError] = useState(false);
  const [waited, setWaited] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const frame = frameRef.current;
    const handleError = () => setFrameError(true);
    frame?.addEventListener('error', handleError);
    return () => frame?.removeEventListener('error', handleError);
  }, [opened, attempt, frameError]);
  useEffect(() => {
    if (!opened || frameError) return;
    // A cross-origin frame load cannot confirm that its map tiles rendered.
    // This timer offers help; it deliberately does not declare success or failure.
    const timer = window.setTimeout(() => setWaited(true), 15000);
    return () => window.clearTimeout(timer);
  }, [opened, attempt, frameError]);
  const geo = item.geo;
  const valid = geo && Number.isFinite(geo.latitude) && Number.isFinite(geo.longitude) && Math.abs(geo.latitude) <= 90 && Math.abs(geo.longitude) <= 180;
  const src = valid ? 'https://www.openstreetmap.org/export/embed.html?' + new URLSearchParams({
    bbox: [geo.longitude - .006, geo.latitude - .004, geo.longitude + .006, geo.latitude + .004].join(','),
    layer: 'mapnik', marker: `${geo.latitude},${geo.longitude}`,
  }) : undefined;
  return <section className="px-map" aria-label={L('樓盤位置', 'Property location')}>
    <div className="px-map-head"><h3><MapPin size={16} aria-hidden />{L('樓盤位置', 'Property location')}</h3>{src && <button type="button" aria-expanded={opened} onClick={() => { setOpened(!opened); setInteractive(false); setWaited(false); setFrameError(false); }}>{opened ? L('收起地圖', 'Hide map') : L('展開地圖', 'Show map')}</button>}</div>
    <address>{item.address}, {item.suburb}, {cityName(item.city, lang)} {item.postcode}</address>
    {src && opened && <>
      <p className="px-map-help" role="status">{frameError ? L('地圖暫時未能打開。你可以重試，或按上方地址了解位置。', 'The map could not open. Retry, or use the address above.') : waited ? L('如果底圖仍為空白，可以重試或收起地圖；地址始終顯示在上方。', 'If the map is still blank, retry or hide it. The address remains above.') : L('地圖由 OpenStreetMap 提供；如未顯示，可重試或收起。', 'Map provided by OpenStreetMap. Retry or hide it if it does not appear.')}</p>
      {!frameError && <iframe ref={frameRef} key={attempt} className={interactive ? 'is-interactive' : ''} src={src} title={`${item.address} — ${L('地圖', 'Map')}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" tabIndex={interactive ? 0 : -1} />}
      <div className="px-map-actions">
        {!frameError && <button type="button" aria-pressed={interactive} onClick={() => setInteractive(!interactive)}>{interactive ? L('結束地圖操作', 'Done with map') : L('操作地圖', 'Interact with map')}</button>}
        <button type="button" onClick={() => { setAttempt(a => a + 1); setFrameError(false); setWaited(false); setInteractive(false); }}>{L('重試地圖', 'Retry map')}</button>
      </div>
    </>}
  </section>;
}
