import { useEffect, useState } from 'react';
import { cityName, formatDate, useI18n } from '../i18n';
import { useEnquiry } from './Enquiry';

/** Shared schema types; this import is erased and never loads server code in the browser. */
export type { MarketRecord } from '../../server/market-reference';
import type { MarketFile, MarketRecord } from '../../server/market-reference';

let cache: Promise<MarketFile | null> | null = null;
function loadMarket() {
  if (!cache)
    cache = fetch('/api/market-reference', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? (r.json() as Promise<MarketFile>) : null))
      .then((d) => (d && Array.isArray(d.records) ? d : null))
      .catch(() => null);
  return cache;
}

/** Missing file is not an error: the section simply doesn't render. */
export function useMarket() {
  const [data, setData] = useState<MarketFile | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    loadMarket().then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, []);
  return data;
}

export function MarketList({ records, mode }: { records: MarketRecord[]; mode: 'listings' | 'leased' }) {
  const { L, lang, pick } = useI18n();
  const enquire = useEnquiry();
  const basis = (b: MarketRecord['priceBasis']) =>
    b === 'achieved_sale' ? L('公開成交價', 'Reported sold price') : b === 'asking_sale' ? L('掛牌報價', 'Asking price') : b === 'sale_guide' ? L('賣方指導價', 'Seller price guide') : b === 'asking_weekly_rent' ? L('掛牌月租', 'Asking rent per month') : b === 'historical_asking_weekly_rent' ? L('原廣告月租 · 非成交租金', 'Previous asking rent · not achieved rent') : L('價格未公開', 'Price not disclosed');
  const propertyType = (type?: string) => ({ house: L('獨立屋', 'House'), apartment: L('公寓', 'Apartment'), townhouse: L('聯排屋', 'Townhouse'), duplex: L('雙拼住宅', 'Duplex') }[type || ''] || type || '');
  const kindLabel = (k: MarketRecord['kind']) => (k === 'sold' ? L('公開成交記錄', 'Public sale record') : k === 'sale' ? L('在售掛牌', 'Listed for sale') : k === 'rent' ? L('放租掛牌', 'Listed for lease') : L('公開租賃記錄', 'Public lease record'));

  return (
    <ul className="mkt">
      {records.map((r) => {
        const specs = [
          r.beds != null ? L(`${r.beds} 卧`, `${r.beds} bed`) : '',
          r.baths != null ? L(`${r.baths} 衞`, `${r.baths} bath`) : '',
          r.cars != null ? L(`${r.cars} 車位`, `${r.cars} car`) : '',
          propertyType(r.propertyType),
        ].filter(Boolean);
        const date = r.eventDate ? (r.dateLabel ? `${pick(r.dateLabel)} ${formatDate(r.eventDate, lang)}` : formatDate(r.eventDate, lang)) : '';
        return (
          <li key={r.id} className="mkt-item">
            <div className="mkt-main">
              <p className="mkt-kind">
                {kindLabel(r.kind)} · {cityName(r.city, lang)}
              </p>
              <h3>{r.address}</h3>
              <p className="mkt-sub">{[r.suburb, r.postcode].filter(Boolean).join(' ')}</p>
              {specs.length > 0 && <p className="mkt-specs">{specs.join(' · ')}</p>}
              {r.summary && pick(r.summary) && <p className="mkt-summary">{pick(r.summary)}</p>}
            </div>
            <div className="mkt-side">
              <p className="mkt-price">{pick(r.priceDisplay) || L('價格未公開', 'Price not disclosed')}</p>
              <p className="mkt-basis">{basis(r.priceBasis)}</p>
              {(date || r.kind === 'leased') && <p className="mkt-date">{date || L('出租日期未披露', 'Lease date not disclosed')}</p>}
            </div>
            <div className="mkt-foot">
                {r.kind === 'sale' || r.kind === 'sold' ? (
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => enquire({ service: 'buying', city: r.city })}>
                    {L('查詢買樓需求', 'Ask about buying')}
                  </button>
                ) : (
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => enquire({ service: 'letting', city: r.city })}>
                    {L('委託出租我嘅單位', 'Let my property')}
                  </button>
                )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function MarketNote() {
  const { L } = useI18n();
  return (
    <p className="mkt-note">
      {L(
        '市場參考：以下樓盤唔代表悦港代理或成交案例，價格同日期以各項記錄為準。',
        'Market references, not Harbour Joy agency listings or sales. Prices and dates are shown with each record.',
      )}
    </p>
  );
}
