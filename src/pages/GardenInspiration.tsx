import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Expand, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { setScrollLock } from '../components/ui';
import GardenModel from '../components/GardenModel';

const designs = [
  ['曲线围坐，绿意相伴', 'Curved seating, surrounded by green', '露台花园', 'Terrace garden', '弧形座椅与绿植围合，留出休憩、会客和户外料理的空间。', 'Curved seating and planting frame a space for relaxing, entertaining and outdoor cooking.'],
  ['长庭院，也能从容分区', 'Make room in a long courtyard', '狭长庭院', 'Long courtyard', '木平台、休闲区和步道串联，让狭长空间有层次，也更好走。', 'Decking, a lounge and a clear path bring structure to a long, narrow space.'],
  ['换个角度，看空间细节', 'A closer look at the layout', '空间细节', 'Design details', '从俯瞰角度观察围坐区、吧台与通道的关系，找到适合自家的布局。', 'Explore how seating, a bar and circulation can work together in your own outdoor space.'],
  ['把水景融进日常', 'A little water, a quieter garden', '水景庭院', 'Water garden', '以水景、木平台和绿植划分动静区域，让庭院多一份宁静。', 'Water, timber decking and planting create distinct areas for activity and rest.'],
  ['一处庭院，几种生活', 'One courtyard, more ways to live', '多功能户外', 'Outdoor living', '廊架下会客、吧台边小聚，开敞区域留给灵活的日常使用。', 'Gather beneath a pergola, sit at the bar, or keep the open area flexible.'],
  ['把餐桌搬到阳光下', 'Take the dining room outside', '户外用餐', 'Outdoor dining', '遮阳伞搭配户外餐桌，花池与长椅沿边布置，适合家人朋友相聚。', 'A shaded dining table, perimeter planting and a bench make room for gathering.'],
  ['留白，让庭院更舒展', 'Leave space to breathe', '简约庭院', 'Simple courtyard', '大面积铺装搭配低矮水景和沿墙座椅，保留开阔、清晰的活动空间。', 'Open paving, a low water feature and wall-side seating keep the space clear and generous.'],
  ['小阳台，也有一席绿意', 'A green retreat on a small balcony', '阳台焕新', 'Balcony refresh', '用木平台、边侧花池与一角坐席，让有限的空间也能坐下来享受。', 'Timber decking, slim planters and a seating nook turn a small balcony into a retreat.'],
  ['转角之间，自有小天地', 'A quiet corner of your own', '小院休憩', 'Compact retreat', '沿栏绿植、木色地台与一张休闲椅，把小院变成日常放松的一角。', 'Green borders, a timber deck and a lounge chair create an everyday place to unwind.'],
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
          <p className="hs-kicker">{L('庭院 · 露台 · 阳台', 'Courtyards · Terraces · Balconies')}</p>
          <h2 className="hs-h2" id="hs-garden-title">{L('让户外，也成为家的好风景', 'Make the outdoors feel like home')}</h2>
          <p className="hs-sub">{L('从一角绿意到整院焕新，先找一份喜欢的灵感，再一起看看您的空间。', 'From a green corner to a courtyard refresh, find an idea you love and let’s explore your space.')}</p>
        </div>
        <a className="hs-card-link" href="#hs-services">{L('查看园艺服务', 'Explore garden care')}<ArrowUpRight size={17} aria-hidden /></a>
      </div>
      <div className="hs-garden-layout">
        <div className="hs-garden-feature" aria-live="polite">
          <div className="hs-garden-modes" role="group" aria-label={L('庭院展示方式', 'Garden display mode')}>
            <button type="button" aria-pressed={mode === 'photo'} onClick={() => setMode('photo')}>{L('设计图', 'Design images')}</button>
            <button type="button" aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>{L('3D 空间预览', '3D space preview')}</button>
          </div>
          {mode === '3d' ? <GardenModel design={selected} title={L(design[0], design[1])} onPhoto={() => setMode('photo')} /> :
          <button className={`hs-garden-image ${selected === 2 || selected === 7 ? 'hs-garden-single' : ''}`} type="button" onClick={() => setExpanded(true)} aria-label={L(`查看完整方案：${design[0]}`, `View full design: ${design[1]}`)} aria-haspopup="dialog">
            <img key={selected} src={image(selected)} alt={L(design[0], design[1])} loading="lazy" width="1168" height="1568" />
            <span className="hs-garden-expand"><Expand size={16} aria-hidden />{L('查看完整方案', 'View full design')}</span>
          </button>}
          <div className="hs-garden-caption">
            <span className="hs-garden-number">{String(selected + 1).padStart(2, '0')} / 09</span>
            <div><h3 className="hs-h3">{L(design[0], design[1])}</h3><p>{L(design[4], design[5])}</p></div>
          </div>
        </div>
        <div className="hs-garden-picker">
          <p className="hs-garden-label">{L('选择一份庭院灵感', 'Find your garden inspiration')}</p>
          <div className="hs-garden-thumbs" role="group" aria-label={L('庭院方案', 'Garden designs')}>
            {designs.map((d, i) => <button key={d[0]} type="button" className={selected === i ? 'is-selected' : ''} aria-pressed={selected === i} onClick={() => setSelected(i)} aria-label={L(d[0], d[1])}>
              <span className={`hs-garden-thumb-image ${i === 2 || i === 7 ? 'hs-garden-single' : ''}`}><img src={image(i)} alt="" loading="lazy" width="1168" height="1568" /></span>
              <span>{L(d[2], d[3])}</span>
            </button>)}
          </div>
          <Link className="hs-btn hs-btn-primary" to="/advisory-registration?service=garden">{L('聊聊我家的庭院', 'Talk about my garden')}<ArrowUpRight size={17} aria-hidden /></Link>
        </div>
      </div>
      <p className="hs-garden-note">{L('庭院设计灵感图，仅供空间布局与风格参考，非桉湾完工案例。实际服务范围与施工方案以现场评估及确认报价为准。', 'Design inspiration for layout and style, not completed EUCOVE projects. Available work and proposals are subject to an on-site assessment and an agreed quote.')}</p>
      <dialog ref={dialog} className="hs-garden-dialog" aria-labelledby="hs-garden-dialog-title" onCancel={e => { e.preventDefault(); setExpanded(false); }}>
        <div className="hs-garden-dialog-head"><h3 id="hs-garden-dialog-title">{L(design[0], design[1])}</h3><button type="button" onClick={() => setExpanded(false)} aria-label={L('关闭完整方案', 'Close full design')}><X size={22} aria-hidden /></button></div>
        {expanded && <img src={image(selected)} alt={L(`${design[0]}：完整设计示意`, `${design[1]}: full design concept`)} width="1168" height="1568" />}
      </dialog>
    </div>
  </section>;
}
