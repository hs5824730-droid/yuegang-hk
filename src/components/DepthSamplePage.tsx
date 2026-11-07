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
    <header className="depth-page-heading"><h1>{L('在线看房', 'Online viewings')}</h1><p>{L('先选一套示例，走近照片里的空间。', 'Choose a sample and look a little closer.')}</p></header>
    <div className="depth-sample-notice">{L('立体效果样品 / 示意图片', 'Depth effect sample / illustrative photographs')}</div>
    <Link to="/viewings?sample=light-house" className="depth-property">
      <img src={depthSample.photos[0].image} width={1280} height={870} alt={pick(depthSample.photos[0].alt)} fetchPriority="high" />
      <div className="depth-property-copy"><div><h2>{pick(depthSample.title)}</h2><p>{L('客餐厅 · 庭院 · 建筑 · 户外', 'Living · garden · architecture · outdoors')}</p></div><span>{L('4 张立体照片', '4 depth photographs')}<ArrowRight size={19} aria-hidden /></span></div>
    </Link>
    <p className="depth-disclosure">{L('这是一组效果演示，图片来自不同住宅场景，并非同一套真实房源，不代表在租、在售或桉湾经手房源。', 'This collection demonstrates the effect. It combines different homes and is not one real property, an available listing or a home represented by EUCOVE.')}</p>
    <Link className="depth-secondary-link" to="/viewings?mode=schematic">{L('查看历史资料与空间示意', 'Historical references & spatial illustrations')}<ArrowRight size={16} aria-hidden /></Link>
  </div>;
  return <div className="depth-page depth-detail wrap">
    <Link className="depth-back" to="/viewings"><ArrowLeft size={17} aria-hidden />{L('返回在线看房', 'Back to online viewings')}</Link>
    <header className="depth-detail-heading"><h1>{pick(depthSample.title)}</h1><p>{L('立体效果样品 / 示意图片', 'Depth effect sample / illustrative photographs')}</p></header>
    <section className="depth-gallery" tabIndex={0} aria-label={L('房源示例照片，左右方向键切换', 'Sample photographs; use left and right arrow keys')} aria-keyshortcuts="ArrowLeft ArrowRight"
      onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); choose(index + (event.key === 'ArrowLeft' ? -1 : 1)); } }}>
      <div className="depth-photo-heading"><h2 aria-live="polite">{pick(photo.title)}</h2><span>{index + 1} / {depthSample.photos.length}</span></div>
      <DepthPhotoViewer photo={photo} />
      <div className="depth-photo-nav"><button type="button" onClick={() => choose(index - 1)}><ChevronLeft size={19} aria-hidden />{L('上一张', 'Previous')}</button><button type="button" onClick={() => choose(index + 1)}>{L('下一张', 'Next')}<ChevronRight size={19} aria-hidden /></button></div>
      <div className="depth-thumbnails" role="group" aria-label={L('选择照片', 'Choose photograph')}>{depthSample.photos.map((item, i) => <button type="button" key={item.id} aria-pressed={i === index} onClick={() => choose(i)}><img src={item.thumbnail} width={160} height={120} alt="" loading="lazy" /><span>{pick(item.title)}</span></button>)}</div>
    </section>
    <div className="depth-detail-note"><p>{L('照片有了景深，空间多一点直观。', 'A little depth, a clearer sense of space.')}</p><p>{L('这是单张照片生成的小幅视角变化，不能看到镜头后方或被遮挡的空间；不是实景扫描，也不表示真实尺寸和户型。', 'The effect adds a small change of viewpoint to a single photo. It cannot reveal hidden areas or show measured dimensions or an actual floor plan.')}</p><p>{L('本示例由不同住宅图片组成，仅用于选择看房体验。', 'The sample combines photographs of different homes to demonstrate the viewing experience.')}</p></div>
    <div className="depth-detail-footer"><button type="button" className="btn btn-primary" onClick={() => enquire({ service: 'letting' })}>{L('咨询我的房产', 'Discuss my property')}<ArrowRight size={17} aria-hidden /></button></div>
  </div>;
}
