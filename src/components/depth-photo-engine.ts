// A small WebGL renderer. No ML runtime or model weights are shipped to the browser.
export interface DepthEngine {
  offset: (x: number, y: number) => void;
  drift: (active: boolean) => void;
  strength: (value: number) => void;
  dispose: () => void;
}
const vertex = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = vec2(aPosition.x * 0.5 + 0.5, 0.5 - aPosition.y * 0.5);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;
const fragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPhoto;
uniform sampler2D uDepth;
uniform vec2 uCover;
uniform vec2 uOffset;
uniform float uStrength;
void main() {
  // Overscan leaves a margin for the virtual camera; edge clamping hides tiny residual gaps.
  vec2 base = (vUv - 0.5) * uCover * 0.92 + 0.5;
  vec2 shift = uOffset * vec2(0.048, 0.034) * uCover * uStrength;
  vec2 uv = base + shift * 0.65;
  vec2 stepUv = shift / 16.0;
  float layer = 0.0;
  float surface = 1.0 - texture2D(uDepth, uv).r;
  // Parallax occlusion mapping: find the ray/depth intersection, rather than move a flat image.
  for (int i = 0; i < 16; i++) {
    if (layer >= surface) break;
    uv -= stepUv;
    layer += 1.0 / 16.0;
    surface = 1.0 - texture2D(uDepth, uv).r;
  }
  vec2 previous = uv + stepUv;
  float after = surface - layer;
  float before = (1.0 - texture2D(uDepth, previous).r) - layer + 1.0 / 16.0;
  float blend = clamp(after / (after - before - 0.00001), 0.0, 1.0);
  uv = mix(uv, previous, blend);
  gl_FragColor = vec4(texture2D(uPhoto, clamp(uv, vec2(0.002), vec2(0.998))).rgb, 1.0);
}`;

async function loadImage(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Photo asset unavailable');
  const bitmap = await createImageBitmap(await response.blob());
  if (signal.aborted) { bitmap.close(); throw new DOMException('Aborted', 'AbortError'); }
  return bitmap;
}

export async function createDepthEngine(canvas: HTMLCanvasElement, image: string, depth: string, signal: AbortSignal, onLost: () => void): Promise<DepthEngine> {
  const assets = await Promise.allSettled([loadImage(image, signal), loadImage(depth, signal)]);
  if (assets.some(asset => asset.status === 'rejected') || signal.aborted) {
    assets.forEach(asset => { if (asset.status === 'fulfilled') asset.value.close(); });
    throw new Error('Photo or depth map unavailable');
  }
  const [photo, map] = assets.map(asset => (asset as PromiseFulfilledResult<ImageBitmap>).value);
  const imageAspect = photo.width / photo.height;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power' });
  if (!gl) { photo.close(); map.close(); throw new Error('WebGL unavailable'); }
  const shaders: WebGLShader[] = [], textures: WebGLTexture[] = [];
  let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null;
  let frame: number | null = null, disposed = false, visible = true, auto = false, amount = 1;
  let x = 0, y = 0, targetX = 0, targetY = 0, last = 0;
  let resize: ResizeObserver | undefined, intersection: IntersectionObserver | undefined;
  const lost = (event: Event) => { event.preventDefault(); auto = false; cancel(); onLost(); };
  const cancel = () => { if (frame !== null) cancelAnimationFrame(frame); frame = null; };
  const dispose = () => {
    if (disposed) return;
    disposed = true; cancel(); resize?.disconnect(); intersection?.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    canvas.removeEventListener('webglcontextlost', lost);
    textures.forEach(texture => gl.deleteTexture(texture)); shaders.forEach(shader => gl.deleteShader(shader));
    gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
  const visibility = () => { cancel(); if (!document.hidden) request(); };
  let draw = () => {};
  function request() {
    if (frame === null && !disposed && visible && !document.hidden && !gl!.isContextLost()) frame = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    frame = null;
    if (disposed || document.hidden || !visible || gl!.isContextLost()) return;
    if (now - last < 1000 / 30 - 1) { request(); return; }
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 30; last = now;
    if (auto) { targetX = Math.sin(now / 2400) * 0.72; targetY = Math.cos(now / 3300) * 0.35; }
    const ease = 1 - Math.exp(-12 * dt);
    x += (targetX - x) * ease; y += (targetY - y) * ease;
    draw();
    if (auto || Math.abs(targetX - x) + Math.abs(targetY - y) > 0.001) request();
  }
  try {
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type); if (!shader) throw new Error('Shader unavailable'); shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
      return shader;
    };
    program = gl.createProgram(); if (!program) throw new Error('Program unavailable');
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader linking failed');
    gl.useProgram(program);
    buffer = gl.createBuffer(); if (!buffer) throw new Error('Buffer unavailable');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    [photo, map].forEach((bitmap, i) => {
      const texture = gl.createTexture(); if (!texture) throw new Error('Texture unavailable'); textures.push(texture);
      gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
      gl.uniform1i(gl.getUniformLocation(program!, i === 0 ? 'uPhoto' : 'uDepth'), i);
    });
    const cover = gl.getUniformLocation(program, 'uCover'), offset = gl.getUniformLocation(program, 'uOffset'), strength = gl.getUniformLocation(program, 'uStrength');
    draw = () => {
      if (disposed || gl.isContextLost()) return;
      const width = canvas.clientWidth, height = canvas.clientHeight; if (!width || !height) return;
      const dpr = Math.min(devicePixelRatio || 1, 1.5, 1600 / width);
      const w = Math.round(width * dpr), h = Math.round(height * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      const viewAspect = width / height;
      gl.uniform2f(cover, Math.min(1, viewAspect / imageAspect), Math.min(1, imageAspect / viewAspect));
      gl.uniform2f(offset, x, y); gl.uniform1f(strength, amount); gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    resize = new ResizeObserver(request); resize.observe(canvas);
    intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) request(); else cancel(); }); intersection.observe(canvas);
    canvas.addEventListener('webglcontextlost', lost); document.addEventListener('visibilitychange', visibility);
    draw();
    return {
      offset: (nextX, nextY) => { targetX = Math.max(-1, Math.min(1, nextX)); targetY = Math.max(-1, Math.min(1, nextY)); request(); },
      drift: active => { auto = active; request(); },
      strength: value => { amount = Math.max(0, Math.min(1.35, value)); request(); },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
  finally { photo.close(); map.close(); }
}
