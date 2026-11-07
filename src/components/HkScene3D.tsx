import { useEffect, useRef, useState } from 'react';
import { Move3d } from 'lucide-react';
import { useI18n } from '../i18n';
import type { HkEngine, HkScene } from './hk-scene-engine';
import './hk-scene.css';

/** Licensed Wikimedia photographs (see /credits) with depth precomputed by scripts/create-hk-depth-maps.py. */
export const HK_SCENES: (HkScene & { zh: string; en: string; pos: string })[] = [
  { id: 'harbour-night', zh: '維港夜景', en: 'Victoria Harbour', image: '/depth/hk/harbour-night.webp', depth: '/depth/hk/harbour-night.depth.png', width: 1600, height: 757, pos: '50% 50%' },
  { id: 'hk-island', zh: '港島', en: 'HK Island', image: '/depth/hk/hk-island.webp', depth: '/depth/hk/hk-island.depth.png', width: 1400, height: 842, pos: '60% 50%' },
  { id: 'kowloon', zh: '九龍', en: 'Kowloon', image: '/depth/hk/kowloon.webp', depth: '/depth/hk/kowloon.depth.png', width: 1400, height: 818, pos: '35% 60%' },
  { id: 'new-territories', zh: '新界', en: 'New Territories', image: '/depth/hk/new-territories.webp', depth: '/depth/hk/new-territories.depth.png', width: 1400, height: 1051, pos: '50% 40%' },
  { id: 'islands', zh: '離島', en: 'Islands', image: '/depth/hk/islands.webp', depth: '/depth/hk/islands.depth.png', width: 1400, height: 1050, pos: '55% 40%' },
];

function webglAvailable() {
  try { const c = document.createElement('canvas'); return Boolean(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Full-bleed 3D relief of Hong Kong behind the home hero. Falls back to the still photo. */
export default function HkScene3D() {
  const { L } = useI18n();
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<HkEngine | null>(null);
  const [active, setActive] = useState(HK_SCENES[0].id);
  const [mode, setMode] = useState<'loading' | '3d' | 'still'>('loading');
  const [dragged, setDragged] = useState(false);
  const scene = HK_SCENES.find(s => s.id === active)!;

  useEffect(() => {
    const element = canvas.current;
    if (!element || !webglAvailable()) { setMode('still'); return; }
    let cancelled = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dense = window.matchMedia('(min-width: 760px)').matches;
    void import('./hk-scene-engine').then(({ createHkEngine }) => {
      if (cancelled) return;
      try {
        engine.current = createHkEngine(element, { reducedMotion, dense, onDrag: () => setDragged(true) });
        return engine.current.show(HK_SCENES[0]).then(() => { if (!cancelled) setMode('3d'); });
      } catch { setMode('still'); }
    }).catch(() => { if (!cancelled) setMode('still'); });
    return () => { cancelled = true; engine.current?.dispose(); engine.current = null; };
  }, []);

  const choose = (id: string) => {
    if (id === active) return;
    setActive(id);
    const next = HK_SCENES.find(s => s.id === id)!;
    if (engine.current) void engine.current.show(next).catch(() => setMode('still'));
  };

  return <div className={`hk3d hk3d-${mode}`}>
    <img className="hk3d-still" src={scene.image} alt="" style={{ objectPosition: scene.pos }} fetchPriority="high" />
    <canvas ref={canvas} className="hk3d-canvas" aria-hidden />
    <div className="hk3d-ui wrap">
      <div className="hk3d-chips" role="group" aria-label={L('揀立體實景', 'Choose a 3D scene')}>
        <span className="hk3d-label"><Move3d size={15} aria-hidden />{L('立體實景', '3D scene')}</span>
        {HK_SCENES.map(s => <button key={s.id} type="button" aria-pressed={s.id === active} onClick={() => choose(s.id)}>{L(s.zh, s.en)}</button>)}
      </div>
      {mode === '3d' && !dragged && <p className="hk3d-hint" aria-hidden>{L('按住拖動，轉動視角', 'Drag to look around')}</p>}
    </div>
  </div>;
}
