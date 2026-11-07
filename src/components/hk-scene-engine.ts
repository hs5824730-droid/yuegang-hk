// Turns a licensed photograph and its precomputed depth map into a navigable 3D point relief.
// Each pixel is unprojected along the front camera's ray, so the opening view matches the photo
// exactly; moving the camera reveals the depth. No model runs in the visitor's browser.
import {
  BufferAttribute, BufferGeometry, Color, LinearFilter, PerspectiveCamera, Points, Scene, ShaderMaterial,
  NoColorSpace, Texture, Vector3, WebGLRenderer,
} from 'three';

export interface HkScene { id: string; image: string; depth: string; width: number; height: number }
export interface HkEngine { show: (scene: HkScene) => Promise<void>; dispose: () => void }

const vertex = /* glsl */`
uniform float uProgress;
uniform float uSize;
uniform float uDist;
attribute vec3 aScatter;
attribute vec2 aUv;
attribute float aDelay;
varying vec2 vUv;
varying float vFade;
void main() {
  float local = clamp((uProgress - aDelay) / (1.0 - 0.45), 0.0, 1.0);
  float eased = 1.0 - pow(1.0 - local, 3.0);
  vec3 pos = mix(aScatter, position, eased);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * ((uDist - position.z) / -mv.z) * mix(0.55, 1.0, eased);
  vUv = aUv;
  vFade = eased;
}`;
const fragment = /* glsl */`
uniform sampler2D uPhoto;
uniform float uProgress;
uniform vec2 uCell;
varying vec2 vUv;
varying float vFade;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  // Round sparks while flying, square tiles once settled so the photo closes without gaps.
  if (length(c) > mix(0.5, 0.72, vFade)) discard;
  // Each settled tile shows its own patch of the photo, so the relief stays as sharp as the source.
  vec3 color = texture2D(uPhoto, vUv + c * uCell * 1.18 * vFade).rgb;
  gl_FragColor = vec4(color * mix(1.35, 1.0, vFade), mix(0.0, 1.0, smoothstep(0.0, 0.25, vFade + 0.12)));
}`;

const loadBitmap = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('3D asset unavailable: ' + url);
  return createImageBitmap(await response.blob());
};

export function createHkEngine(canvas: HTMLCanvasElement, input: { reducedMotion: boolean; dense: boolean; onDrag?: () => void }): HkEngine {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(new Color('#0b0c0f'), 1);
  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 100);
  const dist = 10;
  const target = new Vector3(0, 0, 0);
  let points: Points<BufferGeometry, ShaderMaterial> | null = null;
  let texture: Texture | null = null;
  let aspect = 1.6, progress = input.reducedMotion ? 1 : 0, goal = 1;
  let yaw = 0, pitch = 0, dragYaw = 0, dragPitch = 0, velYaw = 0, velPitch = 0;
  let pointerX = 0, pointerY = 0, dragging = false, lastX = 0, lastY = 0, idleSince = performance.now();
  let frame: number | null = null, visible = true, disposed = false, start = performance.now(), lastFrame = performance.now();
  let settle: (() => void) | null = null;

  const fit = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Cover the canvas like object-fit: cover, with a small overscan so gentle orbiting never shows an edge.
    const planeH = 2 * dist * Math.tan((camera.fov * Math.PI) / 360);
    const needH = Math.max(planeH, (planeH * camera.aspect) / aspect);
    camera.zoom = (needH / planeH) * 1.14;
    camera.updateProjectionMatrix();
    if (points) points.material.uniforms.uSize.value = pointSize();
  };
  const pointSize = () => {
    if (!points) return 1;
    const cols = points.userData.cols as number;
    const planeH = 2 * dist * Math.tan((camera.fov * Math.PI) / 360) / camera.zoom;
    const pxPerUnit = renderer.domElement.height / planeH;
    return (aspect * 2 * dist * Math.tan((camera.fov * Math.PI) / 360) / cols) * pxPerUnit * 1.18;
  };

  async function build(next: HkScene) {
    const [photo, depthMap] = await Promise.all([loadBitmap(next.image), loadBitmap(next.depth)]);
    if (disposed) { photo.close(); depthMap.close(); return; }
    aspect = next.width / next.height;
    const cols = input.dense ? 600 : 300;
    const rows = Math.round(cols / aspect);
    const sample = document.createElement('canvas');
    sample.width = cols; sample.height = rows;
    const ctx = sample.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(depthMap, 0, 0, cols, rows);
    const depth = ctx.getImageData(0, 0, cols, rows).data;
    depthMap.close();
    const count = cols * rows;
    const pos = new Float32Array(count * 3), uv = new Float32Array(count * 2), scatter = new Float32Array(count * 3), delay = new Float32Array(count);
    const planeH = 2 * dist * Math.tan((camera.fov * Math.PI) / 360);
    const planeW = planeH * aspect;
    for (let r = 0, i = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) {
      const u = (c + 0.5) / cols, v = (r + 0.5) / rows;
      let d = depth[i * 4] / 255; // white = near
      // Snap pixels on a depth edge to the nearer side of the edge, so towers do not trail curtains when the camera turns.
      let lo = d, hi = d;
      for (const [dc, dr] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
        const cc = Math.min(cols - 1, Math.max(0, c + dc)), rr = Math.min(rows - 1, Math.max(0, r + dr));
        const n = depth[(rr * cols + cc) * 4] / 255; if (n < lo) lo = n; if (n > hi) hi = n;
      }
      if (hi - lo > 0.06) d = d - lo < hi - d ? lo : hi;
      // Inverse-depth to scene depth: near objects come forward, sky and far hills recede.
      const z = (d - 0.42) * 5.2;
      const k = (dist - z) / dist; // keep the front view identical to the photograph
      pos[i * 3] = (u - 0.5) * planeW * k;
      pos[i * 3 + 1] = (0.5 - v) * planeH * k;
      pos[i * 3 + 2] = z;
      uv[i * 2] = u; uv[i * 2 + 1] = v;
      const a = Math.random() * Math.PI * 2, s = 6 + Math.random() * 10;
      scatter[i * 3] = pos[i * 3] * 1.6 + Math.cos(a) * s;
      scatter[i * 3 + 1] = pos[i * 3 + 1] * 1.6 + Math.sin(a) * s * 0.6;
      scatter[i * 3 + 2] = -12 - Math.random() * 18;
      // Near details land first, then the city settles back toward the horizon.
      delay[i] = (1 - d) * 0.3 + Math.random() * 0.15;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(pos, 3));
    geometry.setAttribute('aUv', new BufferAttribute(uv, 2));
    geometry.setAttribute('aScatter', new BufferAttribute(scatter, 3));
    geometry.setAttribute('aDelay', new BufferAttribute(delay, 1));
    const tex = new Texture(photo);
    // Raw sRGB in, raw sRGB out: the custom shader does no colour conversion. ImageBitmap uploads are never flipped.
    tex.colorSpace = NoColorSpace; tex.minFilter = LinearFilter; tex.generateMipmaps = false; tex.flipY = false; tex.needsUpdate = true;
    const material = new ShaderMaterial({
      vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: true,
      uniforms: { uPhoto: { value: tex }, uProgress: { value: progress }, uSize: { value: 1 }, uDist: { value: dist }, uCell: { value: [1 / cols, 1 / rows] } },
    });
    if (points) { scene.remove(points); points.geometry.dispose(); points.material.dispose(); }
    texture?.dispose();
    texture = tex;
    points = new Points(geometry, material);
    points.userData.cols = cols;
    scene.add(points);
    fit();
  }

  const render = (now: number) => {
    frame = null;
    if (disposed || !visible) return;
    const t = (now - start) / 1000;
    const step = Math.min(0.1, (now - lastFrame) / 1000); lastFrame = now;
    // About 2.4 s to assemble and 1.2 s to scatter, independent of frame rate.
    const speed = input.reducedMotion ? 100 : goal > progress ? 0.42 : 0.85;
    progress += Math.sign(goal - progress) * Math.min(Math.abs(goal - progress), speed * step);
    if (settle && Math.abs(goal - progress) < 1e-3) { const done = settle; settle = null; done(); }
    if (!dragging) {
      velYaw *= 0.92; velPitch *= 0.92; dragYaw += velYaw; dragPitch += velPitch;
      if (now - idleSince > 2600) { dragYaw *= 0.985; dragPitch *= 0.985; }
    }
    const auto = input.reducedMotion ? 0 : 1;
    yaw = dragYaw + auto * (Math.sin(t * 0.16) * 0.16 + pointerX * 0.06);
    pitch = dragPitch + auto * (Math.sin(t * 0.11) * 0.035 - pointerY * 0.035);
    yaw = Math.max(-0.5, Math.min(0.5, yaw)); pitch = Math.max(-0.22, Math.min(0.22, pitch));
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(target);
    if (points) points.material.uniforms.uProgress.value = progress;
    renderer.render(scene, camera);
    request();
  };
  const request = () => { if (frame === null && visible && !disposed) frame = requestAnimationFrame(render); };

  const down = (event: PointerEvent) => {
    if ((event.target as HTMLElement).closest('a,button,input,select,textarea,[role="dialog"]')) return;
    event.preventDefault(); dragging = true; lastX = event.clientX; lastY = event.clientY; velYaw = velPitch = 0; input.onDrag?.();
  };
  const move = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    if (!dragging) return;
    const dx = (event.clientX - lastX) / rect.width, dy = (event.clientY - lastY) / rect.height;
    lastX = event.clientX; lastY = event.clientY;
    velYaw = -dx * 2.2; velPitch = dy * 1.2; dragYaw += velYaw; dragPitch += velPitch; idleSince = performance.now();
  };
  const up = () => { if (dragging) idleSince = performance.now(); dragging = false; };
  const host = (canvas.closest('section') || canvas.parentElement)!;
  host.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  const resize = new ResizeObserver(fit); resize.observe(canvas);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && !document.hidden; request(); });
  intersection.observe(canvas);
  const visibility = () => { visible = !document.hidden; request(); };
  document.addEventListener('visibilitychange', visibility);

  return {
    async show(next) {
      if (points && !input.reducedMotion) { goal = 0; await new Promise<void>(resolve => { settle = resolve; request(); }); }
      await build(next);
      start = performance.now();
      goal = 1; progress = input.reducedMotion ? 1 : 0;
      request();
    },
    dispose() {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      host.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.removeEventListener('visibilitychange', visibility);
      resize.disconnect(); intersection.disconnect();
      if (points) { points.geometry.dispose(); points.material.dispose(); }
      texture?.dispose(); renderer.dispose();
    },
  };
}
