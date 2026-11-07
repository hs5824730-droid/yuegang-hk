import {usePublishContactPage} from './ContactPageContext';
import { viewingStatus } from '../viewing-status';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDate, useI18n } from '../i18n';
import { useEnquiry } from './Enquiry';
import type { ViewingListing } from '../viewing-types';
import PropertyExplorer, { type ExplorerItem } from './PropertyExplorer';
import './viewing-samples.css';

type Kind = 'rent' | 'sold';
type Choice = { listing:string;room:string;city:string };
type Listing = ViewingListing & { availabilityStatus?: unknown };
type Catalog = Record<Kind, Listing[]>;
const kinds: Kind[] = ['rent', 'sold'];

export default function ViewingSamplePage() {
  const { L, lang, pick } = useI18n();
  const [search, setSearch] = useSearchParams();
  const enquire = useEnquiry();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [unavailable, setUnavailable] = useState<Record<Kind, boolean>>({ rent: false, sold: false });
  const choices = useRef<Partial<Record<Kind, Choice>>>({});
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all(kinds.map(async kind => {
      try {
        const response = await fetch(`/api/viewing-samples?kind=${kind}`, { signal: controller.signal });
        if (!response.ok) throw new Error('unavailable');
        const data = await response.json();
        return { kind, listings: Array.isArray(data.listings) ? data.listings as Listing[] : [], failed: false };
      } catch { return { kind, listings: [] as Listing[], failed: true }; }
    })).then(results => {
      if (controller.signal.aborted) return;
      setCatalog(Object.fromEntries(results.map(r => [r.kind, r.listings])) as Catalog);
      setUnavailable(Object.fromEntries(results.map(r => [r.kind, r.failed])) as Record<Kind, boolean>);
    });
    return () => controller.abort();
  }, []);

  // The public rental pool contains only explicitly verified active rentals.
  // Missing/leased source records stay in the API/archive, never get relabelled.
  const publicCatalog=catalog?{rent:catalog.rent.filter(l=>viewingStatus(l)==='available'),sold:catalog.sold}:null;
  const known=publicCatalog&&kinds.flatMap(k=>publicCatalog[k]).find(l=>l.id===search.get('listing'));
  const kind:Kind=known?.kind==='sold'||known?.kind==='rent'?known.kind:search.get('kind')==='sold'?'sold':'rent';
  const listings=publicCatalog?.[kind]||[];
  const requestedCity=search.get('viewCity')||'';
  const city=listings.some(l=>l.city===requestedCity)?requestedCity:'';
  const visible=listings.filter(l=>!city||l.city===city);
  const chosen = visible.find(l => l.id === search.get('listing')) || visible[0];
  const room = chosen?.rooms.find(r => r.id === search.get('room'))?.id || '';
  usePublishContactPage(chosen?{city:chosen.city,service:kind==='sold'?'buy':'rent',listing:kind==='rent'?chosen.id:undefined,propertyAddress:`${chosen.address}, ${chosen.suburb}`}:{city:city||undefined});
  const searchKey = search.toString();

  useEffect(() => {
    if (!catalog) return;
    const next = new URLSearchParams(searchKey);
    next.set('kind', kind);
    if (chosen) next.set('listing', chosen.id); else next.delete('listing');
    if (room) next.set('room', room); else next.delete('room');
    if (city) next.set('viewCity', city); else next.delete('viewCity');
    next.delete('availability');
    if (next.toString() !== searchKey) setSearch(next, { replace: true, preventScrollReset: true });
    choices.current[kind] = { listing: chosen?.id||'', room, city };
  }, [catalog, kind, chosen?.id, room, city, searchKey, setSearch]);

  const navigate = (nextKind: Kind, choice: Choice) => {
    const next = new URLSearchParams(search);
    // Viewing navigation must not reopen a drawer from an old enquiry query.
    for (const key of ['service', 'city', 'member', 'offer', 'listing', 'room', 'viewCity', 'availability']) next.delete(key);
    next.set('kind', nextKind);
    if (choice.listing) next.set('listing', choice.listing);
    if (choice.room) next.set('room', choice.room);
    if (choice.city) next.set('viewCity', choice.city);

    setSearch(next, { preventScrollReset: true });
  };
  const chooseKind = (nextKind: Kind) => {
    if (!catalog || nextKind === kind) return;
    const remembered = choices.current[nextKind];
    const pool=nextKind==='rent'?catalog.rent.filter(l=>viewingStatus(l)==='available'):catalog.sold;
    const rememberedCity=pool.some(l=>l.city===remembered?.city)?remembered!.city:'';
    const candidates=pool.filter(l=>!rememberedCity||l.city===rememberedCity);
    const selected=candidates.find(l=>l.id===remembered?.listing)||candidates[0];
    navigate(nextKind,{listing:selected?.id||'',room:selected?.rooms.some(r=>r.id===remembered?.room)?remembered!.room:'',city:rememberedCity});
  };
  const openEnquiry = () => {
    if(chosen)enquire(viewingStatus(chosen)==='available'?{service:'rent',listing:chosen.id,city:chosen.city,propertyAddress:`${chosen.address}, ${chosen.suburb}`}:{service:kind==='sold'?'buy':'rent',city:chosen.city});
  };
  const statusLabel=(l:Listing)=>l.kind==='sold'?L('已成交','Sold'):L('可租','Available');
  const items: ExplorerItem[] = listings.map(l => ({
    id: l.id, statusLabel:statusLabel(l), address: l.address, suburb: l.suburb, city: l.city, postcode: l.postcode,
    beds: l.beds, baths: l.baths, cars: l.cars, price: pick(l.priceDisplay),
    priceNote: kind === 'sold' ? (l.soldPrice === null ? L('已成交记录 · 成交价未公开', 'Sold record · price not disclosed') : L('已成交记录 · 成交价', 'Sold record · sold price')) : L('挂牌周租，非成交租金。', 'Asking rent per week, not achieved rent.'),
    facts: [...(l.features||[]).map(pick), ...(kind === 'sold' ? (l.soldDate ? [L('成交日期：', 'Sold: ') + formatDate(l.soldDate, lang)] : []) : (l.availableDate ? [L('可入住时间：', 'Available from: ') + formatDate(l.availableDate, lang)] : []))],
    coverUrl: l.coverUrl, geo: l.geo,
    rooms: l.rooms.map(r => ({ id: r.id, label: pick(r.label), photoUrl: r.photoUrl, thumbnailUrl: r.thumbnailUrl, videoUrl: r.videoUrl })),
  }));

  return <div className="viewing-samples wrap">
    <header className="ds viewing-samples-heading"><p className="ds-kicker">{L('在线看房', 'Online viewings')}</p><h1>{L('不在现场，也能先把房子看清楚', 'See the home clearly before you visit')}</h1><p className="ds-lead">{L('浏览出租房源及市场成交参考。市场参考不代表桉湾经手案例。', 'Explore rental homes and market sale references. Market references are not EUCOVE transactions.')}</p></header>
    <div className="viewing-kind-tabs" role="group" aria-label={L('房源类型', 'Property category')}>
      {kinds.map(k => <button type="button" key={k} aria-pressed={kind === k} onClick={() => chooseKind(k)} disabled={!catalog}>
        <span>{k === 'rent' ? L('出租房源', 'Rental homes') : L('买卖房屋', 'Buying & selling')}</span>
        <small>{k === 'sold' ? L('已成交记录', 'Sold records') : L('挂牌资料', 'Listing records')}{catalog && ` · ${publicCatalog?.[k].length||0}`}</small>
      </button>)}
    </div>

    {!catalog ? <div className="px-skeleton" role="status" aria-label={L('正在读取房源资料…', 'Loading property records…')} />
      : !chosen ? <div className="viewing-sample-empty"><h2>{kind==='rent'?L('暂无可展示的出租房源','No rental homes to display'):L('暂无成交参考','No sold references to display')}</h2>{city&&<button type="button" className="btn btn-line" onClick={()=>navigate(kind,{listing:listings[0]?.id||'',room:'',city:''})}>{L('清除筛选','Clear filters')}</button>}<p>{unavailable[kind] ? L('房源资料暂未读取成功，您可以先留下需求。', 'Property records could not be loaded. You can still leave an enquiry.') : kind==='rent'?L('可先浏览成交参考，或咨询出租服务。','Explore sold references or enquire about letting services.'):L('您可以先告诉我们想了解什么。','Tell us what you would like to discuss.')}</p>{kind==='rent'&&<button type="button" className="btn btn-line" onClick={()=>chooseKind('sold')}>{L('浏览已成交参考','Browse sold references')}</button>}<button type="button" className="btn btn-primary" onClick={() => enquire({ service: kind === 'sold' ? 'buy' : 'rent' })}>{L('提交咨询', 'Enquire')}</button></div>
      : chosen && <PropertyExplorer key={kind} items={items} selectedId={chosen.id} roomId={room}
        city={city} onCity={c => { const first = listings.find(l => !c || l.city === c); navigate(kind, { listing: first?.id || '', room: '', city: c }); }}
        onSelect={id => navigate(kind, { listing: id, room: '', city })}
        onRoom={id => navigate(kind, { listing: chosen.id, room: id, city })}
        tag={kind==='sold'?L('市场成交参考 · 已成交','Market reference · sold'):statusLabel(chosen)}
        photoNote={L('当前显示房源照片。', 'Showing property photos.')}
        videoNote={L('AI 视频可能改变细节；实际布局、尺寸与房况以现场为准。', 'AI video may alter details; check layout, size and condition in person.')}
        cta={{ label: kind==='sold'?L('咨询买卖服务','Discuss buying or selling'):viewingStatus(chosen)==='available'?L('预约看房','Arrange a viewing'):L('咨询出租服务','Discuss letting services'), onClick: openEnquiry }}
      />}
  </div>;
}
