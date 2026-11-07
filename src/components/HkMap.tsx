import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BedDouble, MapPin, MousePointerClick, X } from 'lucide-react';
import { useEnquiry } from './Enquiry';
import { cityName, useI18n } from '../i18n';
import { DISTRICTS, LAND, MAP_VIEWBOX, type District, type Region } from './hk-districts';
import type { Service } from '../enquiry-options';
import type { ViewingListing } from '../viewing-types';
import './hk-map.css';

const REGIONS: Region[] = ['Hong Kong Island', 'Kowloon', 'New Territories', 'Islands'];

/** Well-known neighbourhoods per district; also used to place listings, whose records carry a neighbourhood. */
const AREAS: Record<string, [string, string][]> = {
  A: [['中環', 'Central'], ['上環', 'Sheung Wan'], ['西營盤', 'Sai Ying Pun'], ['堅尼地城', 'Kennedy Town'], ['半山', 'Mid-Levels']],
  B: [['灣仔', 'Wan Chai'], ['銅鑼灣', 'Causeway Bay'], ['跑馬地', 'Happy Valley'], ['大坑', 'Tai Hang']],
  C: [['北角', 'North Point'], ['鰂魚涌', 'Quarry Bay'], ['太古', 'Tai Koo'], ['筲箕灣', 'Shau Kei Wan'], ['柴灣', 'Chai Wan']],
  D: [['香港仔', 'Aberdeen'], ['鴨脷洲', 'Ap Lei Chau'], ['薄扶林', 'Pok Fu Lam'], ['淺水灣', 'Repulse Bay'], ['赤柱', 'Stanley']],
  E: [['尖沙咀', 'Tsim Sha Tsui'], ['油麻地', 'Yau Ma Tei'], ['旺角', 'Mong Kok'], ['大角咀', 'Tai Kok Tsui'], ['九龍站', 'Kowloon Station']],
  F: [['深水埗', 'Sham Shui Po'], ['長沙灣', 'Cheung Sha Wan'], ['荔枝角', 'Lai Chi Kok'], ['美孚', 'Mei Foo'], ['石硤尾', 'Shek Kip Mei']],
  G: [['九龍城', 'Kowloon City'], ['何文田', 'Ho Man Tin'], ['紅磡', 'Hung Hom'], ['土瓜灣', 'To Kwa Wan'], ['啟德', 'Kai Tak']],
  H: [['黃大仙', 'Wong Tai Sin'], ['鑽石山', 'Diamond Hill'], ['新蒲崗', 'San Po Kong'], ['樂富', 'Lok Fu'], ['慈雲山', 'Tsz Wan Shan']],
  J: [['觀塘', 'Kwun Tong'], ['藍田', 'Lam Tin'], ['牛頭角', 'Ngau Tau Kok'], ['九龍灣', 'Kowloon Bay'], ['油塘', 'Yau Tong']],
  K: [['荃灣', 'Tsuen Wan'], ['深井', 'Sham Tseng'], ['馬灣', 'Ma Wan']],
  L: [['屯門', 'Tuen Mun'], ['掃管笏', 'So Kwun Wat'], ['黃金海岸', 'Gold Coast'], ['兆康', 'Siu Hong']],
  M: [['元朗', 'Yuen Long'], ['天水圍', 'Tin Shui Wai'], ['錦田', 'Kam Tin'], ['洪水橋', 'Hung Shui Kiu']],
  N: [['上水', 'Sheung Shui'], ['粉嶺', 'Fanling'], ['沙頭角', 'Sha Tau Kok'], ['古洞', 'Kwu Tung']],
  P: [['大埔', 'Tai Po'], ['太和', 'Tai Wo'], ['白石角', 'Pak Shek Kok'], ['大尾篤', 'Tai Mei Tuk']],
  Q: [['西貢', 'Sai Kung'], ['將軍澳', 'Tseung Kwan O'], ['清水灣', 'Clear Water Bay'], ['日出康城', 'LOHAS Park']],
  R: [['沙田', 'Sha Tin'], ['大圍', 'Tai Wai'], ['馬鞍山', 'Ma On Shan'], ['火炭', 'Fo Tan']],
  S: [['葵涌', 'Kwai Chung'], ['青衣', 'Tsing Yi'], ['荔景', 'Lai King']],
  T: [['東涌', 'Tung Chung'], ['愉景灣', 'Discovery Bay'], ['大嶼山', 'Lantau'], ['長洲', 'Cheung Chau'], ['南丫島', 'Lamma'], ['坪洲', 'Peng Chau']],
};
const EXTRA_AREAS: Record<string, string> = { 中半山: 'A', 西半山: 'A', 太古城: 'C', 黃埔: 'G', 馬鞍山: 'R' };
const districtOfArea = (area: string) => EXTRA_AREAS[area] || Object.keys(AREAS).find(id => AREAS[id].some(([zh]) => area.includes(zh)));

const KIND_SERVICE: Record<Service, ViewingListing['kind'] | null> = { letting: 'rent', management: 'rent', selling: 'sale', buying: 'sale', renovation: null, 'house-care': null, maintenance: null, 'buyer-advisory': 'sale', other: null, moving: null };

export default function HkMap() {
  const { L, lang } = useI18n();
  const enquire = useEnquiry();
  const [service, setService] = useState<Service>('letting');
  const [region, setRegion] = useState<Region | null>(null);
  const [selected, setSelected] = useState<District | null>(null);
  const [hover, setHover] = useState<{ d: District; x: number; y: number } | null>(null);
  const [listings, setListings] = useState<ViewingListing[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(['rent', 'sale'].map(kind => fetch(`/api/viewing-samples?kind=${kind}`, { signal: controller.signal }).then(r => (r.ok ? r.json() : { listings: [] })).catch(() => ({ listings: [] }))))
      .then(parts => setListings(parts.flatMap(p => (p.listings || []) as ViewingListing[])))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const services: [Service, string][] = [
    ['letting', L('放租', 'Let')], ['management', L('租務管理', 'Manage')], ['buying', L('買樓', 'Buy')], ['selling', L('賣樓', 'Sell')], ['renovation', L('翻新', 'Renovate')],
  ];
  const serviceName = services.find(([s]) => s === service)?.[1] || '';
  const name = (d: District) => (lang === 'en' ? d.en : `${d.zh}區`);

  const byDistrict = useMemo(() => {
    const map: Record<string, ViewingListing[]> = {};
    for (const l of listings) { const id = districtOfArea(l.suburb) || districtOfArea(l.address); if (id) (map[id] ||= []).push(l); }
    return map;
  }, [listings]);
  const kind = KIND_SERVICE[service];
  const shown = (id: string) => (byDistrict[id] || []).filter(l => !kind || l.kind === kind);

  const pick = (d: District | null) => { setSelected(d); if (d) setRegion(null); };
  const onKey = (e: KeyboardEvent<SVGPathElement>, d: District) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(d); } };
  const onMove = (e: PointerEvent<SVGPathElement>, d: District) => {
    if (e.pointerType !== 'mouse' || !box.current) return;
    const r = box.current.getBoundingClientRect();
    setHover({ d, x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const activeRegion = selected?.region || region;
  const list = selected ? shown(selected.id) : [];

  return (
    <div className="hm" data-contact={service} data-contact-city={activeRegion || undefined}>
      <div className="hm-bar">
        <div className="hm-seg" role="radiogroup" aria-label={L('需要咩服務', 'Service')} style={{ ['--i' as string]: services.findIndex(([s]) => s === service), ['--n' as string]: services.length }}>
          <span className="hm-seg-thumb" aria-hidden />
          {services.map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={service === value} onClick={() => setService(value)}>{label}</button>
          ))}
        </div>
        <div className="hm-regions" role="group" aria-label={L('揀區域', 'Region')}>
          {REGIONS.map(r => (
            <button key={r} type="button" aria-pressed={activeRegion === r} onClick={() => { setSelected(null); setRegion(region === r && !selected ? null : r); }}>{cityName(r, lang)}</button>
          ))}
        </div>
      </div>

      <div className="hm-body">
        <div className="hm-canvas" ref={box} onPointerLeave={() => setHover(null)}>
          <svg viewBox={MAP_VIEWBOX} role="group" aria-label={L('香港十八區地圖', 'Map of Hong Kong’s 18 districts')}>
            <defs>
              <clipPath id="hm-land"><path d={LAND} /></clipPath>
              <pattern id="hm-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.1" /></pattern>
            </defs>
            <rect className="hm-sea" width="100%" height="100%" fill="url(#hm-dots)" />
            <path className="hm-coast" d={LAND} />
            <g clipPath="url(#hm-land)">
              {DISTRICTS.map((d, i) => {
                const dim = activeRegion && d.region !== activeRegion;
                return (
                  <path key={d.id} d={d.d} tabIndex={0} role="button" aria-label={name(d)} aria-pressed={selected?.id === d.id}
                    className={`hm-d hm-r-${REGIONS.indexOf(d.region)} ${selected?.id === d.id ? 'is-on' : ''} ${dim ? 'is-dim' : ''} ${hover?.d.id === d.id ? 'is-hover' : ''}`}
                    style={{ animationDelay: `${i * 40}ms` }}
                    onClick={() => pick(selected?.id === d.id ? null : d)} onKeyDown={e => onKey(e, d)}
                    onPointerMove={e => onMove(e, d)} onFocus={() => setHover(null)} />
                );
              })}
            </g>
            {DISTRICTS.map(d => {
              const n = shown(d.id).length;
              return n ? <g key={d.id} transform={`translate(${d.cx} ${d.cy})`} aria-hidden><g className={`hm-pin ${activeRegion && d.region !== activeRegion ? 'is-dim' : ''}`}><circle r="13" /><text dy="4.5">{n}</text></g></g> : null;
            })}
            {selected && <g className="hm-pulse" transform={`translate(${selected.cx} ${selected.cy})`} aria-hidden><circle r="10" /><circle r="10" className="hm-pulse-ring" /></g>}
          </svg>
          {hover && <div className="hm-tip" style={{ left: hover.x, top: hover.y }} aria-hidden><strong>{name(hover.d)}</strong><span>{cityName(hover.d.region, lang)} · {shown(hover.d.id).length ? L(`${shown(hover.d.id).length} 個盤源`, `${shown(hover.d.id).length} listings`) : L('撳一下睇詳情', 'Click for details')}</span></div>}
          <p className="hm-legend" aria-hidden><span className="hm-legend-pin" />{L('數字＝區內盤源', 'Number = listings in the district')}</p>
        </div>

        <aside className="hm-panel" aria-live="polite">
          {selected ? (
            <div className="hm-pane" key={selected.id + service}>
              <div className="hm-pane-head">
                <p className="hm-tag"><MapPin size={14} aria-hidden />{cityName(selected.region, lang)}</p>
                <button type="button" className="hm-close" onClick={() => pick(null)} aria-label={L('返回總覽', 'Back to overview')}><X size={16} aria-hidden /></button>
              </div>
              <h3>{name(selected)}</h3>
              <ul className="hm-areas">{AREAS[selected.id].map(([zh, en]) => <li key={zh}>{lang === 'en' ? en : zh}</li>)}</ul>

              <div className="hm-block">
                <p className="hm-block-title">{kind === 'sale' ? L('區內放售盤源', 'For sale here') : kind === 'rent' ? L('區內放租盤源', 'To let here') : L('區內服務', 'Services here')}</p>
                {kind && list.length > 0 ? (
                  <ul className="hm-listings">
                    {list.slice(0, 3).map(l => (
                      <li key={l.id}>
                        <Link to="/viewings">
                          {l.coverUrl && <img src={l.coverUrl} alt="" loading="lazy" />}
                          <span><strong>{l.address}</strong><small>{l.beds ? <><BedDouble size={13} aria-hidden />{L(`${l.beds} 房`, `${l.beds} bed`)} · </> : null}{lang === 'en' ? l.priceDisplay.en : l.priceDisplay.zh}</small></span>
                          <ArrowUpRight size={15} aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="hm-empty">{kind ? L(`${name(selected)}暫時未有公開盤源。留低需求，有合適嘅盤我哋第一時間通知你。`, `No public listings in ${selected.en} yet. Leave your needs and we will tell you first.`) : L(`${name(selected)}嘅住宅都可以預約上門評估，免費報價。`, `Homes in ${selected.en} can book a free on-site assessment and quote.`)}</p>
                )}
              </div>

              <div className="hm-summary">
                <span>{L('你揀咗', 'Your choice')}</span>
                <strong>{name(selected)} · {serviceName}</strong>
              </div>
              <button type="button" className="btn btn-primary hm-cta" onClick={() => enquire({ service, city: selected.region })}>{L(`預約${name(selected)}${serviceName}服務`, `Book ${serviceName.toLowerCase()} in ${selected.en}`)}<ArrowRight size={18} aria-hidden /></button>
            </div>
          ) : (
            <div className="hm-pane" key={'overview' + (region || '') + service}>
              <p className="hm-hint"><MousePointerClick size={16} aria-hidden />{L('撳地圖上任何一區開始', 'Click any district to begin')}</p>
              <h3>{region ? cityName(region, lang) : L('港九新界及離島', 'All of Hong Kong')}</h3>
              <ul className="hm-overview">
                {(region ? DISTRICTS.filter(d => d.region === region) : REGIONS.map(r => ({ id: r, region: r } as unknown as District))).map(item => {
                  const isRegion = !region;
                  const ids = isRegion ? DISTRICTS.filter(d => d.region === item.region).map(d => d.id) : [item.id];
                  const count = ids.reduce((n, id) => n + shown(id).length, 0);
                  return (
                    <li key={item.id}>
                      <button type="button" onClick={() => (isRegion ? setRegion(item.region) : pick(item))} onMouseEnter={() => !isRegion && setHover(null)}>
                        <span>{isRegion ? cityName(item.region, lang) : name(item)}</span>
                        <small>{isRegion ? L(`${ids.length} 區`, `${ids.length} districts`) : AREAS[item.id].slice(0, 2).map(([zh, en]) => (lang === 'en' ? en : zh)).join(' · ')}</small>
                        {count > 0 && <em>{count}</em>}
                        <ArrowRight size={15} aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="btn btn-primary hm-cta" onClick={() => enquire({ service, city: region || undefined })}>{L(`預約${serviceName}服務`, `Book ${serviceName.toLowerCase()}`)}<ArrowRight size={18} aria-hidden /></button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
