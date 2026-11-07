import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildGarden } from './garden-scene';

export type GardenView = 'overview' | 'plan' | 'close';
export type GardenEngine = ReturnType<typeof createGardenEngine>;

/** One renderer per viewer; static scenes render only on interaction, resize or reveal. */
export function createGardenEngine(host: HTMLElement, initial: number, onContextLost: () => void) {
  const compact = matchMedia('(pointer: coarse)').matches || innerWidth < 600;
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  let release = () => { renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
  try {
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
    renderer.setClearColor(0xe7e5de);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    const canvas = renderer.domElement; canvas.setAttribute('aria-hidden', 'true'); host.appendChild(canvas);
    const scene = new T.Scene(); const camera = new T.OrthographicCamera(-6, 6, 5, -5, .05, 150);
    const controls = new OrbitControls(camera, canvas); controls.enableDamping = false;
    controls.enablePan = false; controls.minPolarAngle = .015; controls.maxPolarAngle = Math.PI * .47;
    controls.minZoom = .7; controls.maxZoom = 3.2; controls.zoomSpeed = .7; controls.rotateSpeed = .7;
    scene.add(new T.HemisphereLight(0xf7fbff, 0x9d9a81, 2.5));
    const sun = new T.DirectionalLight(0xfff3da, 3.2); sun.position.set(-4, 10, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(compact ? 1024 : 2048, compact ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: .1, far: 35 });
    sun.shadow.normalBias = .025; sun.shadow.bias = -.00015; scene.add(sun);
    const floorGeo = new T.PlaneGeometry(200, 200); const floorMat = new T.MeshStandardMaterial({ color: 0xe7e5de, roughness: 1 });
    const floor = new T.Mesh(floorGeo, floorMat); floor.rotation.x = -Math.PI / 2; floor.position.y = -.36; floor.receiveShadow = true; scene.add(floor);
    let garden: ReturnType<typeof buildGarden> | null = null;
    let disposed = false, lost = false, visible = true, dirty = false, current = initial;
    let view: GardenView = initial === 2 ? 'plan' : 'overview';
    const draw = () => {
      if (disposed || lost) return;
      if (!visible || document.hidden) { dirty = true; return; }
      renderer.render(scene, camera); dirty = false;
    };
    const resize = () => {
      if (!garden || disposed) return;
      const width = host.clientWidth, height = host.clientHeight; if (!width || !height) return;
      const aspect = width / height;
      const span = Math.max(3.5, garden.spec.depth * .58, (garden.spec.width + garden.spec.depth) * .38 / aspect);
      camera.left = -span * aspect; camera.right = span * aspect; camera.top = span; camera.bottom = -span;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact ? 1.5 : 2, Math.sqrt(2_000_000 / (width * height))));
      renderer.setSize(width, height, false); draw();
    };
    const setView = (next: GardenView) => {
      if (!garden) return;
      view = next; const { width: w, depth: d } = garden.spec; const r = Math.max(w, d);
      controls.target.set(0, .35, 0); camera.zoom = 1;
      if (next === 'plan') camera.position.set(0, r * 1.6, .015);
      else if (next === 'close') { camera.position.set(r * .55, r * .48, r * .9); controls.target.set(0, .6, -.2); camera.zoom = 1.35; }
      else camera.position.set(r * .85, r, r * 1.05);
      camera.updateProjectionMatrix(); controls.update(); draw();
    };
    const select = (index: number) => {
      if (disposed || lost) return;
      // Build before releasing the current scene so a failed rebuild leaves it disposable.
      const next = buildGarden(index); const previous = garden;
      if (previous) scene.remove(previous.root);
      garden = next; current = index; scene.add(next.root); previous?.dispose();
      renderer.shadowMap.needsUpdate = true;
      canvas.dataset.design = String(index); resize(); setView(index === 2 ? 'plan' : 'overview');
    };
    const interact = (enabled: boolean) => {
      controls.enabled = enabled; canvas.style.touchAction = enabled ? 'none' : 'pan-y';
      canvas.style.cursor = enabled ? 'grab' : 'default';
    };
    const zoom = (direction: number) => { camera.zoom = T.MathUtils.clamp(camera.zoom * (direction > 0 ? 1.18 : 1 / 1.18), .7, 3.2); camera.updateProjectionMatrix(); draw(); };
    const rotate = (direction: number) => { camera.position.sub(controls.target).applyAxisAngle(new T.Vector3(0, 1, 0), direction * Math.PI / 8).add(controls.target); controls.update(); draw(); };
    const observer = new ResizeObserver(resize); observer.observe(host);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible && dirty) draw(); }); intersection.observe(host);
    const visibility = () => { if (!document.hidden && dirty) draw(); };
    document.addEventListener('visibilitychange', visibility); controls.addEventListener('change', draw);
    const contextLost = (event: Event) => { event.preventDefault(); lost = true; onContextLost(); };
    canvas.addEventListener('webglcontextlost', contextLost);
    const baseRelease = release;
    release = () => {
      if (disposed) return; disposed = true;
      observer.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('webglcontextlost', contextLost); controls.removeEventListener('change', draw); controls.dispose();
      garden?.dispose(); sun.shadow.dispose(); floorGeo.dispose(); floorMat.dispose(); scene.clear(); baseRelease();
    };
    select(initial); interact(!compact);
    return { select, setView, interact, zoom, rotate, reset: () => setView(view), current: () => current, dispose: release };
  } catch (error) { release(); throw error; }
}
