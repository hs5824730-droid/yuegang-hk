import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Bath, CarFront, ArrowUpRight, Box, MapPin } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useI18n, cityName, formatDate } from '../i18n';
import { useMarket } from '../components/market';
import { useEnquiry } from '../components/Enquiry';
import RoomModel from '../components/RoomModel';
import DepthSamplePage from '../components/DepthSamplePage';

export default function Viewings() {
  const [search] = useSearchParams();
  return search.get('mode') === 'schematic' ? <HistoricalViewings /> : <DepthSamplePage />;
}

function HistoricalViewings() {
  const { L,lang,pick } = useI18n();
  const data=useMarket();
  const enquire=useEnquiry();
  const [search,setSearch]=useSearchParams();
  const kind=search.get('type')==='rent'?'rent':'leased';
  const [city,setCity]=useState('');
  const records=(data?.records || []).filter(r=>r.kind===kind&&(!city||r.city===city)).sort((a,b)=>Number(b.priceAmount!=null)-Number(a.priceAmount!=null));
  const chosen=records.find(r=>r.id===search.get('record')) || records[0];
  const changeKind = (value:'leased'|'rent') => { const next=new URLSearchParams(search); next.set('type',value); next.delete('record'); setSearch(next,{replace:true,preventScrollReset:true}); };
  const cities=[...new Set((data?.records||[]).filter(r=>r.kind==='leased'||r.kind==='rent').map(r=>r.city))];
  return <div className="viewing-page">
    <section className="viewing-heading"><div className="wrap"><h1>{L('網上睇樓','Online viewings')}</h1><p>{L('先看出租資料與掛牌租金，再瞭解空間。為線上瞭解房屋多一個直觀的入口。','Explore rental details and asking rents, with an interactive introduction to the space.')}</p></div></section>
    <section className="section viewing-content"><div className="wrap">
      <div className="viewing-filter"><div role="group" aria-label={L('出租記錄類型','Rental record type')}><button type="button" aria-pressed={kind==='leased'} onClick={()=>changeKind('leased')}>{L('歷史出租記錄','Historical rentals')}</button><button type="button" aria-pressed={kind==='rent'} onClick={()=>changeKind('rent')}>{L('公開放租掛牌','Public rental listings')}</button></div><label>{L('地區','City')}<select value={city} onChange={e=>setCity(e.target.value)}><option value="">{L('全部地區','All cities')}</option>{cities.map(c=><option value={c} key={c}>{cityName(c,lang)}</option>)}</select></label></div>
      {data===undefined ? <p role="status">{L('正在讀取出租資料…','Loading rental records…')}</p> : chosen ? <>
        <div className="viewing-records" role="group" aria-label={L('選擇出租記錄','Choose a rental record')}>{records.map(r=><button type="button" className="viewing-record" key={r.id} aria-pressed={chosen.id===r.id} onClick={()=>{const next=new URLSearchParams(search);next.set('record',r.id);setSearch(next,{replace:true,preventScrollReset:true});}}><span className="viewing-record-city"><MapPin size={13} aria-hidden />{cityName(r.city,lang)}</span><strong>{r.address}</strong><span>{pick(r.priceDisplay)}</span><small>{L(`${r.beds??'—'} 卧 · ${r.baths??'—'} 衞`,`${r.beds??'—'} bed · ${r.baths??'—'} bath`)}</small></button>)}</div>
        <div className="viewing-detail">
          <div className="viewing-model"><RoomModel key={chosen.id} beds={chosen.beds??2} baths={chosen.baths??1} /></div>
          <aside className="viewing-facts" aria-live="polite">
            <p className="viewing-status">{chosen.kind==='leased'?L('歷史已出租記錄','Historical leased record'):L('查閲時的公開掛牌','Public listing at time of review')}</p>
            <h2>{chosen.address}</h2><p className="viewing-address">{chosen.suburb}, {cityName(chosen.city,lang)} {chosen.postcode}</p>
            <p className="viewing-price">{pick(chosen.priceDisplay)}</p><p className="viewing-price-basis">{chosen.priceBasis==='undisclosed'?L('租金未公開','Rent not disclosed'):chosen.kind==='leased'?L('原廣告掛牌月租，非成交租金','Previous asking rent per month, not achieved rent'):L('掛牌月租，非成交租金','Asking rent per month, not achieved rent')}</p>
            <dl className="viewing-specs"><div><dt><BedDouble size={20} aria-hidden />{L('卧室','Bedrooms')}</dt><dd>{chosen.beds??'—'}</dd></div><div><dt><Bath size={20} aria-hidden />{L('衞浴','Bathrooms')}</dt><dd>{chosen.baths??'—'}</dd></div><div><dt><CarFront size={20} aria-hidden />{L('車位','Parking')}</dt><dd>{chosen.cars??L('未披露','Not stated')}</dd></div></dl>
            <p className="fine">{chosen.eventDate ? <>{chosen.dateLabel?pick(chosen.dateLabel):L('記錄日期','Record date')} · {formatDate(chosen.eventDate,lang)}</> : chosen.kind==='leased' ? L('出租日期未披露','Lease date not disclosed') : L('掛牌日期未披露','Listing date not disclosed')}</p>
            <p className="viewing-illustration">{L('空間示意按公開卧衞數量生成。沒有該樓盤的戶型圖或掃描資料，因此不能用於判斷實際佈局、尺寸、裝修或朝向。','The spatial illustration uses the published bedroom and bathroom count. Without a floor plan or scan it does not show the actual layout, dimensions, finishes or orientation.')}</p>
            <button type="button" className="textlink viewing-enquiry" onClick={()=>enquire({city:chosen.city,service:'letting'})}>{L('我有房屋想委託出租','I have a property to let')}<ArrowUpRight size={17} aria-hidden /></button>
            <p className="fine">{L('市場參考，非悦港代理或經手的樓盤。','Market reference; not a property represented or handled by Harbour Joy.')}</p>
          </aside>
        </div>
      </> : <div className="viewing-empty"><Box size={28} aria-hidden /><h2>{L('先看看空間預覽的方式','Explore how online previews work')}</h2><p>{L('該地區暫沒有可展示的出租記錄。您可以換一個地區，或查看已發佈樓盤。','There are no records to show for this area. Choose another city or browse published properties.')}</p><Link className="btn btn-primary" to="/properties?status=rent">{L('瀏覽出租樓盤','Browse rental properties')}</Link></div>}
    </div></section>
  </div>;
}
