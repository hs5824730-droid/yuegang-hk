import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Expand, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { setScrollLock } from '../components/ui';
import GardenModel from '../components/GardenModel';

const designs = [
  ['曲線圍坐，綠意相伴', 'Curved seating, surrounded by green', '露台花園', 'Terrace garden', '弧形座椅同綠植圍合，留出休憩、會客同戶外料理嘅空間。', 'Curved seating and planting frame a space for relaxing, entertaining and outdoor cooking.'],
  ['長庭院，都可以由容分區', 'Make room in a long courtyard', '狹長庭院', 'Long courtyard', '木平台、休閒區同步道串聯，等狹長空間有層次，都更好走。', 'Decking, a lounge and a clear path bring structure to a long, narrow space.'],
  ['換個角度，睇空間細節', 'A closer look at the layout', '空間細節', 'Design details', '由俯瞰角度觀察圍坐區、啦枱同通道嘅關係，搵到適合自家嘅佈局。', 'Explore how seating, a bar and circulation can work together in your own outdoor space.'],
  ['將水景融進日常', 'A little water, a quieter garden', '水景庭院', 'Water garden', '以水景、木平台同綠植劃分動靜區域，等庭院多一份寧靜。', 'Water, timber decking and planting create distinct areas for activity and rest.'],
  ['一處庭院，幾種生活', 'One courtyard, more ways to live', '多功能戶外', 'Outdoor living', '廊架下會客、啦枱邊小聚，開敞區域留俾靈活嘅日常使用。', 'Gather beneath a pergola, sit at the bar, or keep the open area flexible.'],
  ['將餐桌搬到陽光下', 'Take the dining room outside', '戶外用餐', 'Outdoor dining', '遮陽傘搭配戶外餐桌，花池同長椅沿邊佈置，適合家人朋友相聚。', 'A shaded dining table, perimeter planting and a bench make room for gathering.'],
  ['留白，等庭院更舒展', 'Leave space to breathe', '簡約庭院', 'Simple courtyard', '大面積鋪裝搭配低矮水景同沿牆座椅，保留開闊、清晰嘅活動空間。', 'Open paving, a low water feature and wall-side seating keep the space clear and generous.'],
  ['小陽台，都有一席綠意', 'A green retreat on a small balcony', '陽台煥新', 'Balcony refresh', '用木平台、邊側花池同一角坐席，等有限嘅空間都可以坐下來享受。', 'Timber decking, slim planters and a seating nook turn a small balcony into a retreat.'],
  ['轉角之間，自有小天地', 'A quiet corner of your own', '小院休憩', 'Compact retreat', '沿欄綠植、木色地台同一張休閒椅，將小院變成日常放鬆嘅一角。', 'Green borders, a timber deck and a lounge chair create an everyday place to unwind.'],
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
          <p className="hs-kicker">{L('庭院 · 露台 · 陽台', 'Courtyards · Terraces · Balconies')}</p>
          <h2 className="hs-h2" id="hs-garden-title">{L('等戶外，都成為家嘅好風景', 'Make the outdoors feel like home')}</h2>
          <p className="hs-sub">{L('由一角綠意到整院煥新，先搵一份喜歡嘅靈感，再一齊睇吓你嘅空間。', 'From a green corner to a courtyard refresh, find an idea you love and let’s explore your space.')}</p>
        </div>
        <a className="hs-card-link" href="#hs-services">{L('查睇園藝服務', 'Explore garden care')}<ArrowUpRight size={17} aria-hidden /></a>
      </div>
      <div className="hs-garden-layout">
        <div className="hs-garden-feature" aria-live="polite">
          <div className="hs-garden-modes" role="group" aria-label={L('庭院展示方式', 'Garden display mode')}>
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
          <p className="hs-garden-label">{L('揀一份庭院靈感', 'Find your garden inspiration')}</p>
          <div className="hs-garden-thumbs" role="group" aria-label={L('庭院方案', 'Garden designs')}>
            {designs.map((d, i) => <button key={d[0]} type="button" className={selected === i ? 'is-selected' : ''} aria-pressed={selected === i} onClick={() => setSelected(i)} aria-label={L(d[0], d[1])}>
              <span className={`hs-garden-thumb-image ${i === 2 || i === 7 ? 'hs-garden-single' : ''}`}><img src={image(i)} alt="" loading="lazy" width="1168" height="1568" /></span>
              <span>{L(d[2], d[3])}</span>
            </button>)}
          </div>
          <Link className="hs-btn hs-btn-primary" to="/advisory-registration?service=garden">{L('傾吓我家嘅庭院', 'Talk about my garden')}<ArrowUpRight size={17} aria-hidden /></Link>
        </div>
      </div>
      <p className="hs-garden-note">{L('庭院設計靈感圖，僅供空間佈局同風格參考，非悦港完工案例。實際服務範圍同施工方案以現場評估及確認報價為準。', 'Design inspiration for layout and style, not completed Harbour Joy projects. Available work and proposals are subject to an on-site assessment and an agreed quote.')}</p>
      <dialog ref={dialog} className="hs-garden-dialog" aria-labelledby="hs-garden-dialog-title" onCancel={e => { e.preventDefault(); setExpanded(false); }}>
        <div className="hs-garden-dialog-head"><h3 id="hs-garden-dialog-title">{L(design[0], design[1])}</h3><button type="button" onClick={() => setExpanded(false)} aria-label={L('關閉完整方案', 'Close full design')}><X size={22} aria-hidden /></button></div>
        {expanded && <img src={image(selected)} alt={L(`${design[0]}：完整設計示意`, `${design[1]}: full design concept`)} width="1168" height="1568" />}
      </dialog>
    </div>
  </section>;
}
