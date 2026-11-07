import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Hand, Minus, Plus, RotateCcw } from 'lucide-react';
import { useI18n } from '../i18n';
import type { GardenEngine, GardenView } from './garden-engine';

export default function GardenModel({ design, title, onPhoto }: { design: number; title: string; onPhoto: () => void }) {
  const { L } = useI18n(); const help = useId();
  const host = useRef<HTMLDivElement>(null); const engine = useRef<GardenEngine | null>(null);
  const latestDesign = useRef(design); latestDesign.current = design;
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [interactive, setInteractive] = useState(() => !matchMedia('(pointer: coarse)').matches && innerWidth >= 600);
  const [view, setView] = useState<GardenView>(design === 2 ? 'plan' : 'overview');
  useEffect(() => {
    let cancelled = false; let instance: GardenEngine | null = null;
    setStatus('loading');
    void import('./garden-engine').then(({ createGardenEngine }) => {
      if (cancelled || !host.current) return;
      instance = createGardenEngine(host.current, latestDesign.current, () => { if (!cancelled) setStatus('failed'); });
      engine.current = instance; setStatus('ready');
    }).catch(() => { if (!cancelled) setStatus('failed'); });
    return () => { cancelled = true; instance?.dispose(); engine.current = null; };
  }, [attempt]);
  useEffect(() => {
    if (status !== 'ready' || !engine.current) return;
    try {
      if (engine.current.current() !== design) engine.current.select(design);
      setView(design === 2 ? 'plan' : 'overview');
    } catch { setStatus('failed'); }
  }, [design, status]);
  useEffect(() => { if (status === 'ready') engine.current?.interact(interactive); }, [interactive, status]);
  const chooseView = (value: GardenView) => { engine.current?.setView(value); setView(value); };
  return <div className="garden-model" onKeyDown={event => { if (event.key === 'Escape') setInteractive(false); }}>
    <div className="garden-model-views" role="group" aria-label={L('三維視角', '3D viewpoints')}>
      {(['overview', 'plan', 'close'] as const).map((value, i) => <button key={value} type="button" aria-pressed={view === value} disabled={status !== 'ready'} onClick={() => chooseView(value)}>{[L('鳥瞰', 'Overview'), L('俯視', 'Top view'), L('近景', 'Close view')][i]}</button>)}
      <span>{L('3D 設計示意', '3D design study')}</span>
    </div>
    <div className="garden-model-stage">
      <div className="garden-model-canvas" ref={host} role="img" aria-label={L(`${title}，可旋轉嘅三維設計示意`, `${title}, interactive 3D design study`)} aria-describedby={help} hidden={status === 'failed'} />
      {status === 'loading' && <p className="garden-model-status" role="status">{L('正在構建三維庭院…', 'Building the 3D garden…')}</p>}
      {status === 'failed' && <div className="garden-model-error" role="status">
        <p>{L('當前設備暫時無法顯示三維場景，可以繼續查睇完整設計圖。', '3D is unavailable on this device. You can still view the full design image.')}</p>
        <button type="button" onClick={onPhoto}>{L('返回設計圖', 'Back to images')}</button>
        <button type="button" onClick={() => setAttempt(a => a + 1)}>{L('重新加載 3D', 'Reload 3D')}</button>
      </div>}
    </div>
    <div className="garden-model-tools" role="group" aria-label={L('三維操作', '3D controls')}>
      <button type="button" className="garden-model-drag" disabled={status !== 'ready'} aria-pressed={interactive} onClick={() => setInteractive(v => !v)}><Hand size={16} aria-hidden />{interactive ? L('結束拖動', 'Stop dragging') : L('啓用拖動', 'Enable dragging')}</button>
      <button type="button" disabled={status !== 'ready'} aria-label={L('向左旋轉', 'Rotate left')} onClick={() => engine.current?.rotate(-1)}><ArrowLeft size={17} aria-hidden /></button>
      <button type="button" disabled={status !== 'ready'} aria-label={L('向右旋轉', 'Rotate right')} onClick={() => engine.current?.rotate(1)}><ArrowRight size={17} aria-hidden /></button>
      <button type="button" disabled={status !== 'ready'} aria-label={L('縮小模型', 'Zoom out')} onClick={() => engine.current?.zoom(-1)}><Minus size={17} aria-hidden /></button>
      <button type="button" disabled={status !== 'ready'} aria-label={L('放大模型', 'Zoom in')} onClick={() => engine.current?.zoom(1)}><Plus size={17} aria-hidden /></button>
      <button type="button" disabled={status !== 'ready'} aria-label={L('復位視角', 'Reset viewpoint')} onClick={() => engine.current?.reset()}><RotateCcw size={17} aria-hidden /></button>
    </div>
    <p id={help} className="garden-model-help">{interactive ? L('拖動旋轉，滾輪或雙指縮放；結束拖動後可繼續滾動頁面。', 'Drag to rotate, scroll or pinch to zoom. Stop dragging to scroll the page.') : L('可用上方按鈕切換視角、旋轉同縮放；啓用拖動後支持鼠標同觸屏。', 'Use the controls to change views, rotate and zoom, or enable dragging for mouse and touch.')}</p>
    <p className="garden-model-disclosure">{L('依據參考圖重建嘅空間示意，非原始模型或實測尺寸。', 'Rebuilt from the reference images; not the original model or measured dimensions.')}</p>
  </div>;
}
