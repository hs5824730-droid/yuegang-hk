import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Expand, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { setScrollLock } from '../components/ui';
import GardenModel from '../components/GardenModel';

const designs = [
  ['天台圍坐，望住城市', 'Rooftop seating with a city view', '天台休憩', 'Rooftop lounge', '弧形座椅同綠植圍住一張矮茶几，傍晚上嚟坐吓，傾偈、睇夜景都得。', 'Curved seating and planting around a low table: a place to chat and watch the city lights.'],
  ['狹長平台，都可以分區', 'Zoning a long podium terrace', '狹長平台', 'Long terrace', '木地台、休閒區同通道串埋一齊，長條形嘅平台都有層次，行得舒服。', 'Decking, a lounge and a clear path bring structure to a long, narrow terrace.'],
  ['換個角度，睇空間細節', 'A closer look at the layout', '空間細節', 'Design details', '由上面望落嚟，睇清楚座位、吧枱同通道點樣配合，搵到啱你嘅佈局。', 'See how seating, a bar and circulation work together from above.'],
  ['平台加少少水景', 'A little water on the terrace', '平台水景', 'Terrace water feature', '細細個水景、木地台同綠植分開動靜兩邊，喺石屎森林入面多份清靜。', 'A small water feature, decking and planting create a calm corner among the towers.'],
  ['一個天台，幾種用法', 'One rooftop, more ways to use it', '多用途天台', 'Rooftop living', '涼棚下面招呼朋友、吧枱邊食嘢，中間位留空，平日點用都得。', 'Host under a pergola, gather at the bar, and keep the middle open for everyday use.'],
  ['將餐枱搬出露台', 'Dine out on the terrace', '露台用餐', 'Terrace dining', '太陽傘配戶外餐枱，花槽同長凳沿邊擺，屋企人朋友一齊食飯啱晒。', 'A shaded table with planters and a bench along the edge — made for family meals.'],
  ['留白，等平台更開揚', 'Leave space to breathe', '簡約平台', 'Simple terrace', '大面積鋪地加矮水景同靠牆座位，空間清爽，活動位夠晒。', 'Open paving, a low water feature and wall-side seating keep the terrace clear and generous.'],
  ['細露台，都有一角綠', 'A green retreat on a small balcony', '露台煥新', 'Balcony refresh', '木地台、窄花槽加一個坐位，幾十呎嘅露台都可以坐低嘆吓。', 'Timber decking, slim planters and a seat turn a small balcony into a retreat.'],
  ['轉角位，自成小天地', 'A quiet corner of your own', '小露台休憩', 'Compact balcony', '沿欄綠植、木色地台加一張休閒椅，將轉角露台變成每日放鬆嘅一角。', 'Green edges, a timber deck and a lounge chair make an everyday place to unwind.'],
] as const;
const image = (index: number) => `/img/home-services/garden/design-${index + 1}.webp`;

export default function GardenInspiration() {
  const { L } = useI18n();
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<'photo' | '3d'>('3d');
  const dialog = useRef<HTMLDialogElement>(null);
  const design = designs[selected];
  useEffect(() => {
    if (!expanded) return;
    const el = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    el?.showModal();
    setScrollLock('garden-preview', true);
    return () => { el?.close(); setScrollLock('garden-preview', false); trigger?.focus({ preventScroll: true }); };
  }, [expanded]);
  return <section className="hs-sec hs-garden" id="hs-garden" aria-labelledby="hs-garden-title">
    <div className="wrap">
      <div className="hs-garden-heading">
        <div className="hs-head">
          <p className="hs-kicker">{L('露台 · 平台 · 天台', 'Balconies · Terraces · Rooftops')}</p>
          <h2 className="hs-h2" id="hs-garden-title">{L('等露台，都成為屋企嘅好風景', 'Make your balcony part of home')}</h2>
          <p className="hs-sub">{L('由幾十呎嘅露台到成個天台，先搵一份喜歡嘅靈感，再一齊睇吓你嘅空間。', 'From a small balcony to a whole rooftop, find an idea you love and let’s look at your space.')}</p>
        </div>
        <a className="hs-card-link" href="#hs-services">{L('睇吓露台打理服務', 'Explore balcony care')}<ArrowUpRight size={17} aria-hidden /></a>
      </div>
      <div className="hs-garden-layout">
        <div className="hs-garden-feature" aria-live="polite">
          <div className="hs-garden-modes" role="group" aria-label={L('露台展示方式', 'Terrace display mode')}>
            <button type="button" aria-pressed={mode === 'photo'} onClick={() => setMode('photo')}>{L('設計圖', 'Design images')}</button>
            <button type="button" aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>{L('3D 空間預覽', '3D space preview')}</button>
          </div>
          {mode === '3d' ? <GardenModel design={selected} title={L(design[0], design[1])} onPhoto={() => setMode('photo')} /> :
          <button className={`hs-garden-image ${selected === 2 || selected === 7 ? 'hs-garden-single' : ''}`} type="button" onClick={() => setExpanded(true)} aria-label={L(`查睇完整方案：${design[0]}`, `View full design: ${design[1]}`)} aria-haspopup="dialog">
            <img key={selected} src={image(selected)} alt={L(design[0], design[1])} loading="lazy" width="1168" height="1568" />
            <span className="hs-garden-expand"><Expand size={16} aria-hidden />{L('查睇完整方案', 'View full design')}</span>
          </button>}
          <div className="hs-garden-caption">
            <span className="hs-garden-number">{String(selected + 1).padStart(2, '0')} / 09</span>
            <div><h3 className="hs-h3">{L(design[0], design[1])}</h3><p>{L(design[4], design[5])}</p></div>
          </div>
        </div>
        <div className="hs-garden-picker">
          <p className="hs-garden-label">{L('揀一份露台靈感', 'Find your terrace inspiration')}</p>
          <div className="hs-garden-thumbs" role="group" aria-label={L('露台方案', 'Terrace designs')}>
            {designs.map((d, i) => <button key={d[0]} type="button" className={selected === i ? 'is-selected' : ''} aria-pressed={selected === i} onClick={() => setSelected(i)} aria-label={L(d[0], d[1])}>
              <span className={`hs-garden-thumb-image ${i === 2 || i === 7 ? 'hs-garden-single' : ''}`}><img src={image(i)} alt="" loading="lazy" width="1168" height="1568" /></span>
              <span>{L(d[2], d[3])}</span>
            </button>)}
          </div>
          <Link className="hs-btn hs-btn-primary" to="/advisory-registration?service=garden">{L('傾吓我屋企嘅露台', 'Talk about my terrace')}<ArrowUpRight size={17} aria-hidden /></Link>
        </div>
      </div>
      <p className="hs-garden-note">{L('露台設計靈感圖，僅供空間佈局同風格參考，非悦港完工案例。實際服務範圍同施工方案以現場評估及確認報價為準。', 'Design inspiration for layout and style, not completed Harbour Joy projects. Available work and proposals are subject to an on-site assessment and an agreed quote.')}</p>
      <dialog ref={dialog} className="hs-garden-dialog" aria-labelledby="hs-garden-dialog-title" onCancel={e => { e.preventDefault(); setExpanded(false); }}>
        <div className="hs-garden-dialog-head"><h3 id="hs-garden-dialog-title">{L(design[0], design[1])}</h3><button type="button" onClick={() => setExpanded(false)} aria-label={L('關閉完整方案', 'Close full design')}><X size={22} aria-hidden /></button></div>
        {expanded && <img src={image(selected)} alt={L(`${design[0]}：完整設計示意`, `${design[1]}: full design concept`)} width="1168" height="1568" />}
      </dialog>
    </div>
  </section>;
}
