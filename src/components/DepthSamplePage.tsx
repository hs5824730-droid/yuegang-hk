import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useEnquiry } from './Enquiry';
import { depthSample } from './depth-samples';
import DepthPhotoViewer from './DepthPhotoViewer';
import './depth-sample.css';

export default function DepthSamplePage() {
  const { L, pick } = useI18n();
  const enquire = useEnquiry();
  const [search, setSearch] = useSearchParams();
  const detail = search.get('sample') === depthSample.id;
  const index = Math.max(0, depthSample.photos.findIndex(photo => photo.id === search.get('photo')));
  const photo = depthSample.photos[index];
  const choose = (next: number) => {
    const params = new URLSearchParams(search); params.set('photo', depthSample.photos[(next + depthSample.photos.length) % depthSample.photos.length].id);
    setSearch(params, { replace: true, preventScrollReset: true });
  };
  if (!detail) return <div className="depth-page wrap">
    <header className="depth-page-heading"><h1>{L('網上睇樓', 'Online viewings')}</h1><p>{L('先選一套示例，走近照片裏的空間。', 'Choose a sample and look a little closer.')}</p></header>
    <div className="depth-sample-notice">{L('立體效果樣品 / 示意圖片', 'Depth effect sample / illustrative photographs')}</div>
    <Link to="/viewings?sample=light-house" className="depth-property">
      <img src={depthSample.photos[0].image} width={1280} height={870} alt={pick(depthSample.photos[0].alt)} fetchPriority="high" />
      <div className="depth-property-copy"><div><h2>{pick(depthSample.title)}</h2><p>{L('客餐廳 · 庭院 · 建築 · 戶外', 'Living · garden · architecture · outdoors')}</p></div><span>{L('4 張立體照片', '4 depth photographs')}<ArrowRight size={19} aria-hidden /></span></div>
    </Link>
    <p className="depth-disclosure">{L('這是一組效果演示，圖片來自不同住宅場景，並非同一套真實樓盤，不代表在租、在售或悦港經手樓盤。', 'This collection demonstrates the effect. It combines different homes and is not one real property, an available listing or a home represented by Harbour Joy.')}</p>
    <Link className="depth-secondary-link" to="/viewings?mode=schematic">{L('查看歷史資料與空間示意', 'Historical references & spatial illustrations')}<ArrowRight size={16} aria-hidden /></Link>
  </div>;
  return <div className="depth-page depth-detail wrap">
    <Link className="depth-back" to="/viewings"><ArrowLeft size={17} aria-hidden />{L('返回網上睇樓', 'Back to online viewings')}</Link>
    <header className="depth-detail-heading"><h1>{pick(depthSample.title)}</h1><p>{L('立體效果樣品 / 示意圖片', 'Depth effect sample / illustrative photographs')}</p></header>
    <section className="depth-gallery" tabIndex={0} aria-label={L('樓盤示例照片，左右方向鍵切換', 'Sample photographs; use left and right arrow keys')} aria-keyshortcuts="ArrowLeft ArrowRight"
      onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); choose(index + (event.key === 'ArrowLeft' ? -1 : 1)); } }}>
      <div className="depth-photo-heading"><h2 aria-live="polite">{pick(photo.title)}</h2><span>{index + 1} / {depthSample.photos.length}</span></div>
      <DepthPhotoViewer photo={photo} />
      <div className="depth-photo-nav"><button type="button" onClick={() => choose(index - 1)}><ChevronLeft size={19} aria-hidden />{L('上一張', 'Previous')}</button><button type="button" onClick={() => choose(index + 1)}>{L('下一張', 'Next')}<ChevronRight size={19} aria-hidden /></button></div>
      <div className="depth-thumbnails" role="group" aria-label={L('選擇照片', 'Choose photograph')}>{depthSample.photos.map((item, i) => <button type="button" key={item.id} aria-pressed={i === index} onClick={() => choose(i)}><img src={item.thumbnail} width={160} height={120} alt="" loading="lazy" /><span>{pick(item.title)}</span></button>)}</div>
    </section>
    <div className="depth-detail-note"><p>{L('照片有了景深，空間多一點直觀。', 'A little depth, a clearer sense of space.')}</p><p>{L('這是單張照片生成的小幅視角變化，不能看到鏡頭後方或被遮擋的空間；不是實景掃描，也不表示真實尺寸和戶型。', 'The effect adds a small change of viewpoint to a single photo. It cannot reveal hidden areas or show measured dimensions or an actual floor plan.')}</p><p>{L('本示例由不同住宅圖片組成，僅用於選擇睇樓體驗。', 'The sample combines photographs of different homes to demonstrate the viewing experience.')}</p></div>
    <div className="depth-detail-footer"><button type="button" className="btn btn-primary" onClick={() => enquire({ service: 'letting' })}>{L('查詢我的房產', 'Discuss my property')}<ArrowRight size={17} aria-hidden /></button></div>
  </div>;
}
