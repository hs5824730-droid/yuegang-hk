import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { Hand, Pause, Play, RotateCcw, Smartphone, Image as ImageIcon } from 'lucide-react';
import { useI18n } from '../i18n';
import type { DepthPhoto } from './depth-samples';
import type { DepthEngine } from './depth-photo-engine';

export default function DepthPhotoViewer({ photo }: { photo: DepthPhoto }) {
  const { L, pick } = useI18n();
  const help = useId();
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<DepthEngine | null>(null);
  const pointer = useRef<number | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [drag, setDrag] = useState(false);
  const [auto, setAuto] = useState(false);
  const [tilt, setTilt] = useState(false);
  const [tiltError, setTiltError] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReduced(media.matches); if (media.matches) { setAuto(false); setTilt(false); engine.current?.offset(0, 0); } };
    media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let instance: DepthEngine | null = null;
    setReady(false); setFailed(false);
    const fallback = () => { setFailed(true); setReady(false); setDrag(false); setAuto(false); setTilt(false); };
    void import('./depth-photo-engine')
      .then(({ createDepthEngine }) => createDepthEngine(canvas.current!, photo.image, photo.depth, controller.signal, fallback))
      .then(result => { if (controller.signal.aborted) { result.dispose(); return; } instance = result; engine.current = result; setReady(true); })
      .catch(() => { if (!controller.signal.aborted) fallback(); });
    return () => { controller.abort(); instance?.dispose(); engine.current = null; };
  }, [enabled, photo.image, photo.depth]);

  useEffect(() => { engine.current?.drift(auto && !reduced); }, [auto, ready, reduced]);
  useEffect(() => { setDrag(false); setTilt(false); pointer.current = null; }, [photo.id]);
  useEffect(() => {
    if (!tilt || !ready || reduced) return;
    let baseline: { beta: number; gamma: number } | null = null;
    const orient = (event: DeviceOrientationEvent) => {
      if (event.beta == null || event.gamma == null) return;
      baseline ||= { beta: event.beta, gamma: event.gamma };
      engine.current?.offset((event.gamma - baseline.gamma) / 22, (event.beta - baseline.beta) / 22);
    };
    window.addEventListener('deviceorientation', orient);
    return () => window.removeEventListener('deviceorientation', orient);
  }, [tilt, ready, reduced]);

  const begin = () => { setEnabled(true); setAuto(!reduced); };
  const still = () => { setEnabled(false); setReady(false); setAuto(false); setDrag(false); setTilt(false); };
  const reset = () => { setAuto(false); setTilt(false); setDrag(false); engine.current?.offset(0, 0); };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!ready || reduced || (event.pointerType !== 'mouse' && pointer.current !== event.pointerId)) return;
    setAuto(false); setTilt(false);
    const box = event.currentTarget.getBoundingClientRect();
    engine.current?.offset((event.clientX - box.left) / box.width * 2 - 1, (event.clientY - box.top) / box.height * 2 - 1);
  };
  const requestTilt = async () => {
    if (tilt) { setTilt(false); engine.current?.offset(0, 0); return; }
    try {
      const orientation = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      if (orientation.requestPermission && await orientation.requestPermission() !== 'granted') { setTiltError(true); return; }
      setAuto(false); setDrag(false); setTiltError(false); setTilt(true);
    } catch { setTiltError(true); }
  };

  return <div className="depth-viewer" onKeyDown={event => { if (event.key === 'Escape') reset(); }}>
    <div className={`depth-frame ${ready ? 'is-ready' : ''}`} style={{ touchAction: drag && ready ? 'none' : 'pan-y pinch-zoom' }}
      onPointerMove={move}
      onPointerDown={event => { if (!drag || !ready || reduced) return; pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); setAuto(false); setTilt(false); move(event); }}
      onPointerUp={() => { pointer.current = null; }} onPointerCancel={() => { pointer.current = null; }}
      onPointerLeave={() => { if (pointer.current == null && !auto) engine.current?.offset(0, 0); }}>
      <img src={photo.image} width={photo.width} height={photo.height} alt={pick(photo.alt)} fetchPriority="high" />
      <canvas key={`${photo.id}-${enabled ? 'depth' : 'still'}`} ref={canvas} aria-hidden="true" />
      {enabled && !ready && !failed && <span className="depth-frame-status" role="status">{L('正在准备立体照片…', 'Preparing the depth photo…')}</span>}
    </div>
    <div className="depth-controls" role="group" aria-label={L('立体照片控制', 'Depth photo controls')} aria-describedby={help}>
      {!enabled ? <button type="button" className="depth-primary" onClick={begin}><Play size={16} aria-hidden />{L('开启立体效果', 'Enable depth effect')}</button> : <>
        <button type="button" disabled={!ready || failed || reduced} aria-pressed={drag} onClick={() => { setDrag(!drag); setAuto(false); setTilt(false); }}><Hand size={16} aria-hidden />{drag ? L('退出拖动', 'Stop dragging') : L('拖动环顾', 'Drag to look')}</button>
        <button type="button" disabled={!ready || failed || reduced} aria-pressed={auto} onClick={() => { setAuto(!auto); setDrag(false); setTilt(false); }}>{auto ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}{auto ? L('暂停环顾', 'Pause motion') : L('自动环顾', 'Gentle motion')}</button>
        <button type="button" disabled={!ready || failed} onClick={reset} aria-label={L('视角居中', 'Center view')}><RotateCcw size={16} aria-hidden /></button>
        <button type="button" onClick={still}><ImageIcon size={16} aria-hidden />{L('普通照片', 'Still photo')}</button>
        {window.isSecureContext && typeof DeviceOrientationEvent !== 'undefined' && navigator.maxTouchPoints > 0 && <button type="button" disabled={!ready || failed || reduced} aria-pressed={tilt} onClick={() => void requestTilt()}><Smartphone size={16} aria-hidden />{L('倾斜手机', 'Tilt phone')}</button>}
      </>}
    </div>
    <p className="depth-help" id={help} role={failed || tiltError ? 'status' : undefined}>{failed ? L('当前设备未能显示立体效果，已保留普通照片。您可以继续切换图片。', 'Depth rendering is unavailable. The still photograph and photo navigation remain available.') : reduced ? L('已遵循系统“减少动态效果”设置，照片保持静止。', 'Your reduced-motion preference is respected; the photo stays still.') : tiltError ? L('未获得方向感应权限，您仍可用手指拖动照片。', 'Orientation permission was unavailable. You can still drag the photo.') : ready ? L('轻拖照片，或移动鼠标。退出拖动即可上下滑动页面。', 'Gently drag the photo or move your mouse. Stop dragging to scroll the page.') : L('先看照片，再开启立体效果。左右方向键可切换照片。', 'View the photo, then enable depth. Arrow keys switch photographs.')}</p>
  </div>;
}
