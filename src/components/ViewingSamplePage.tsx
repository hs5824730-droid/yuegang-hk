import {usePublishContactPage} from './ContactPageContext';
import { viewingStatus } from '../viewing-status';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDate, useI18n } from '../i18n';
import { useEnquiry } from './Enquiry';
import type { ViewingListing } from '../viewing-types';
import PropertyExplorer, { type ExplorerItem } from './PropertyExplorer';
import { SHOW_DEMO_LISTINGS } from '../hk-site';
import './viewing-samples.css';

type Kind = 'rent' | 'sale' | 'sold';
type Choice = { listing:string;room:string;city:string };
type Listing = ViewingListing & { availabilityStatus?: unknown };
type Catalog = Record<Kind, Listing[]>;
const kinds: Kind[] = ['rent', 'sale', 'sold'];
const asKind = (value: string | null | undefined): Kind => value === 'sale' || value === 'sold' ? value : 'rent';

export default function ViewingSamplePage() {
  const { L, lang, pick } = useI18n();
  const [search, setSearch] = useSearchParams();
  const enquire = useEnquiry();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [unavailable, setUnavailable] = useState<Record<Kind, boolean>>({ rent: false, sale: false, sold: false });
  const choices = useRef<Partial<Record<Kind, Choice>>>({});
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all(kinds.map(async kind => {
      try {
        const response = await fetch(`/api/viewing-samples?kind=${kind}`, { signal: controller.signal });
        if (!response.ok) throw new Error('unavailable');
        const data = await response.json();
        const listings = (Array.isArray(data.listings) ? data.listings as Listing[] : []).filter(l => SHOW_DEMO_LISTINGS || !l.demo);
        return { kind, listings, failed: false };
      } catch { return { kind, listings: [] as Listing[], failed: true }; }
    })).then(results => {
      if (controller.signal.aborted) return;
      setCatalog(Object.fromEntries(results.map(r => [r.kind, r.listings])) as Catalog);
      setUnavailable(Object.fromEntries(results.map(r => [r.kind, r.failed])) as Record<Kind, boolean>);
    });
    return () => controller.abort();
  }, []);

  // The public rental pool contains only explicitly available rentals.
  const publicCatalog=catalog?{rent:catalog.rent.filter(l=>viewingStatus(l)==='available'),sale:catalog.sale,sold:catalog.sold}:null;
  const known=publicCatalog&&kinds.flatMap(k=>publicCatalog[k]).find(l=>l.id===search.get('listing'));
  const kind:Kind=known?asKind(known.kind):asKind(search.get('kind'));
  const listings=publicCatalog?.[kind]||[];
  const requestedCity=search.get('viewCity')||'';
  const city=listings.some(l=>l.city===requestedCity)?requestedCity:'';
  const visible=listings.filter(l=>!city||l.city===city);
  const chosen = visible.find(l => l.id === search.get('listing')) || visible[0];
  const room = chosen?.rooms.find(r => r.id === search.get('room'))?.id || '';
  const service = kind === 'rent' ? 'rent' : 'buy';
  usePublishContactPage(chosen?{city:chosen.city,service,listing:kind==='rent'?chosen.id:undefined,propertyAddress:`${chosen.address}, ${chosen.suburb}`}:{city:city||undefined});
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
    if (!publicCatalog || nextKind === kind) return;
    const remembered = choices.current[nextKind];
    const pool=publicCatalog[nextKind];
    const rememberedCity=pool.some(l=>l.city===remembered?.city)?remembered!.city:'';
    const candidates=pool.filter(l=>!rememberedCity||l.city===rememberedCity);
    const selected=candidates.find(l=>l.id===remembered?.listing)||candidates[0];
    navigate(nextKind,{listing:selected?.id||'',room:selected?.rooms.some(r=>r.id===remembered?.room)?remembered!.room:'',city:rememberedCity});
  };
  const openEnquiry = () => {
    if(!chosen)return;
    const propertyAddress=`${chosen.address}, ${chosen.suburb}`;
    if(kind==='rent'&&viewingStatus(chosen)==='available')enquire({service:'rent',listing:chosen.id,city:chosen.city,propertyAddress});
    else enquire({service:'buy',city:chosen.city,propertyAddress:kind==='sale'?propertyAddress:undefined});
  };
  const statusLabel=(l:Listing)=>l.kind==='sold'?L('已成交','Sold'):l.kind==='sale'?L('放售中','For sale'):L('可租','For rent');
  const priceNote=(l:Listing)=>l.kind==='sold'?(l.soldPrice===null?L('成交紀錄 · 成交價未公開','Sold record · price not disclosed'):L('成交紀錄 · 成交價','Sold record · sold price'))
    :l.kind==='sale'?L('業主叫價，最終以買賣合約為準。','Asking price; the sale agreement is final.'):L('掛牌月租，唔包差餉、地租同管理費（另有註明除外）。','Asking rent per month, excluding rates, government rent and management fees unless stated.');
  const items: ExplorerItem[] = listings.map(l => ({
    id: l.id, statusLabel:statusLabel(l), address: l.address, suburb: l.suburb, city: l.city, postcode: l.postcode,
    beds: l.beds, baths: l.baths, cars: l.cars, price: pick(l.priceDisplay),
    priceNote: priceNote(l),
    facts: [...(l.features||[]).map(pick), ...(l.kind === 'sold' ? (l.soldDate ? [L('成交日期：', 'Sold: ') + formatDate(l.soldDate, lang)] : []) : (l.availableDate ? [L('可入住日期：', 'Available from: ') + formatDate(l.availableDate, lang)] : []))],
    coverUrl: l.coverUrl, geo: l.geo,
    rooms: l.rooms.map(r => ({ id: r.id, label: pick(r.label), photoUrl: r.photoUrl, thumbnailUrl: r.thumbnailUrl, videoUrl: r.videoUrl })),
  }));
  const tabLabel = (k: Kind) => k === 'rent' ? L('租盤', 'To rent') : k === 'sale' ? L('售盤', 'For sale') : L('成交紀錄', 'Sold');
  const tabNote = (k: Kind) => k === 'rent' ? L('可租單位', 'Available homes') : k === 'sale' ? L('業主放售', 'Owner listings') : L('近期成交', 'Recent sales');

  return <div className="viewing-samples wrap">
    <header className="ds viewing-samples-heading"><p className="ds-kicker">{L('網上睇樓', 'Online viewings')}</p><h1>{L('未到現場，都可以先睇清楚層樓', 'See the flat clearly before you visit')}</h1><p className="ds-lead">{L('租盤、售盤同成交紀錄都喺度。睇中咗，撳一下就可以約我哋睇樓。', 'Rentals, sales and recent transactions in one place. Found one you like? Tap to book a viewing.')}</p></header>
    <div className="viewing-kind-tabs" role="group" aria-label={L('樓盤類型', 'Property category')}>
      {kinds.map(k => <button type="button" key={k} aria-pressed={kind === k} onClick={() => chooseKind(k)} disabled={!catalog}>
        <span>{tabLabel(k)}</span>
        <small>{tabNote(k)}{publicCatalog && ` · ${publicCatalog[k].length}`}</small>
      </button>)}
    </div>

    {!catalog ? <div className="px-skeleton" role="status" aria-label={L('讀緊樓盤資料…', 'Loading property records…')} />
      : !chosen ? <div className="viewing-sample-empty"><h2>{kind==='rent'?L('暫時未有租盤','No rentals right now'):kind==='sale'?L('暫時未有售盤','No homes for sale right now'):L('暫時未有成交紀錄','No sale records yet')}</h2>{city&&<button type="button" className="btn btn-line" onClick={()=>navigate(kind,{listing:listings[0]?.id||'',room:'',city:''})}>{L('清除篩揀','Clear filters')}</button>}<p>{unavailable[kind] ? L('樓盤資料暫時讀唔到，你可以先留低需求，我哋幫你搵。', 'Property records could not be loaded. Leave your requirements and we will look for you.') : L('話我哋知你想搵咩，我哋幫你留意。','Tell us what you are after and we will keep an eye out.')}</p><button type="button" className="btn btn-primary" onClick={() => enquire({ service: kind === 'rent' ? 'rent' : 'buy' })}>{L('留低需求', 'Leave your requirements')}</button></div>
      : <PropertyExplorer key={kind} items={items} selectedId={chosen.id} roomId={room}
        city={city} onCity={c => { const first = listings.find(l => !c || l.city === c); navigate(kind, { listing: first?.id || '', room: '', city: c }); }}
        onSelect={id => navigate(kind, { listing: id, room: '', city })}
        onRoom={id => navigate(kind, { listing: chosen.id, room: id, city })}
        tag={statusLabel(chosen)}
        photoNote={L('而家顯示緊屋苑相片。', 'Showing estate photos.')}
        videoNote={L('AI 影片可能會改變細節；實際間隔、面積同樓況以現場為準。', 'AI video may alter details; check layout, size and condition in person.')}
        cta={{ label: kind==='sold'?L('想買同區？問吓我哋','Buying nearby? Ask us'):kind==='sale'?L('約睇呢個盤','Book a viewing'):L('約睇樓','Book a viewing'), onClick: openEnquiry }}
      />}
  </div>;
}
