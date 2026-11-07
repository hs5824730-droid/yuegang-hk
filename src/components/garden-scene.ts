import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Image-derived design studies. Units are illustrative, never measured dimensions. */
export const GARDEN_LAYOUTS = [
  { kind: 'curved', width: 8.6, depth: 6.2 },
  { kind: 'long', width: 10.4, depth: 4.3 },
  { kind: 'curved', width: 8.6, depth: 6.2 },
  { kind: 'water', width: 9, depth: 6.2 },
  { kind: 'pergola', width: 8.2, depth: 7.4 },
  { kind: 'dining', width: 10.4, depth: 3.8 },
  { kind: 'minimal', width: 8.8, depth: 5.4 },
  { kind: 'balcony', width: 3.8, depth: 8 },
  { kind: 'compact', width: 4.5, depth: 4.8 },
] as const;

function seeded(seed: number) {
  let n = seed;
  return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
}

/** Lightweight procedural surfaces, owned and released with each scene. */
function surface(kind: 'wood' | 'stone' | 'fabric' | 'rug', random: () => number) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = { wood: '#b08155', stone: '#e8e4dc', fabric: '#e8dfcd', rug: '#c7b897' }[kind];
  c.fillRect(0, 0, 256, 256);
  if (kind === 'wood') {
    for (let i = 0; i < 220; i++) {
      c.strokeStyle = `rgba(65,35,16,${.03 + random() * .15})`; c.lineWidth = .3 + random();
      const y = random() * 256; c.beginPath(); c.moveTo(0, y);
      c.bezierCurveTo(80, y + random() * 6, 160, y - random() * 6, 256, y); c.stroke();
    }
  } else if (kind === 'stone') {
    for (let i = 0; i < 30; i++) {
      c.strokeStyle = `rgba(99,96,85,${random() * .09})`; c.lineWidth = .3 + random();
      c.beginPath(); c.moveTo(random() * 256, 0); c.bezierCurveTo(random() * 256, 80, random() * 256, 160, random() * 256, 256); c.stroke();
    }
  } else {
    for (let i = 0; i < 256; i += 2) {
      c.strokeStyle = i % 4 ? '#ffffff22' : '#53493622'; c.lineWidth = .65;
      c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 256); c.moveTo(0, i); c.lineTo(256, i); c.stroke();
    }
    if (kind === 'rug') {
      c.strokeStyle = '#35372f'; c.lineWidth = 2;
      for (let r = 18; r < 126; r += 10) { c.beginPath(); c.arc(128, 128, r, 0, Math.PI * 2); c.stroke(); }
      for (let a = 0; a < 40; a++) {
        const t = a / 40 * Math.PI * 2; c.beginPath(); c.moveTo(128 + Math.cos(t) * 25, 128 + Math.sin(t) * 25);
        c.lineTo(128 + Math.cos(t) * 125, 128 + Math.sin(t) * 125); c.stroke();
      }
    }
  }
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.anisotropy = 4;
  return texture;
}

export function buildGarden(index: number) {
  const spec = GARDEN_LAYOUTS[index] || GARDEN_LAYOUTS[0];
  const random = seeded(730 + (index === 2 ? 0 : index));
  const root = new T.Group(); root.name = `garden-${index + 1}`;
  const textures = new Set<T.Texture>(); const materials = new Set<T.Material>();
  const geometries = new Set<T.BufferGeometry>();
  const mat = (color: number, roughness = .8, extra: T.MeshStandardMaterialParameters = {}) => {
    const m = new T.MeshStandardMaterial({ color, roughness, ...extra }); materials.add(m); return m;
  };
  const textured = (kind: Parameters<typeof surface>[0]) => { const texture = surface(kind, random); textures.add(texture); return mat(0xffffff, .85, { map: texture }); };
  const ivory = mat(0xf3efe5), stone = textured('stone'), wood = textured('wood');
  const fabric = textured('fabric'), charcoal = mat(0x282d29, .6), metal = mat(0x232a27, .4, { metalness: .65 });
  const soil = mat(0x33352a), gravel = mat(0x66665b), cushion = mat(0xb3a58d);
  const greens = [mat(0x284d29), mat(0x466e32), mat(0x78904a), mat(0x305f3c)];
  function mesh(g: T.BufferGeometry, material: T.Material, x: number, y: number, z: number, parent: T.Object3D = root) {
    geometries.add(g); const m = new T.Mesh(g, material); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  function box(x: number, y: number, z: number, w: number, h: number, d: number, material: T.Material, parent: T.Object3D = root) {
    return mesh(new T.BoxGeometry(w, h, d), material, x, y, z, parent);
  }
  function cyl(x: number, y: number, z: number, r: number, h: number, material: T.Material, parent: T.Object3D = root, top = r) {
    return mesh(new T.CylinderGeometry(top, r, h, 24), material, x, y, z, parent);
  }
  function sphere(x: number, y: number, z: number, r: number, material: T.Material, parent: T.Object3D = root) {
    return mesh(new T.SphereGeometry(r, 12, 8), material, x, y, z, parent);
  }
  function rod(from: T.Vector3, to: T.Vector3, radius: number, material: T.Material, parent: T.Object3D = root) {
    const delta = to.clone().sub(from); const m = cyl(0, 0, 0, radius, delta.length(), material, parent);
    m.position.copy(from).add(to).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()); return m;
  }
  function deck(x: number, z: number, w: number, d: number) {
    box(x, .055, z, w, .1, d, charcoal);
    const count = Math.ceil(d / .16);
    for (let i = 0; i < count; i++) box(x, .12, z - d / 2 + (i + .5) * d / count, w, .08, d / count - .009, wood);
  }
  function planter(x: number, z: number, w: number, d: number, height = .52, dark = false) {
    box(x, height / 2, z, w, height, d, dark ? charcoal : ivory);
    box(x, height + .008, z, w - .12, .025, d - .12, soil);
    for (let i = 0; i < Math.ceil(w * d * 10); i++) bush(x + (random() - .5) * (w - .2), height, z + (random() - .5) * (d - .2), .17 + random() * .16);
  }
  // All foliage is instanced below, sharing one curved leaf geometry and four materials.
  const leaves: { position: T.Vector3; rotation: T.Euler; scale: T.Vector3; color: number }[] = [];
  function leaf(x: number, y: number, z: number, length: number, width: number, tilt: number, yaw: number, color = 0) {
    leaves.push({ position: new T.Vector3(x, y, z), rotation: new T.Euler(tilt, yaw, random() * .3), scale: new T.Vector3(width, length, length), color });
  }
  function bush(x: number, y: number, z: number, size: number) {
    for (let i = 0; i < 15; i++) {
      const a = random() * Math.PI * 2, spread = random() * size;
      leaf(x + Math.cos(a) * spread, y + random() * size * .5, z + Math.sin(a) * spread, size * (1.1 + random()), size * .48, random() * 1.3 - .3, a, Math.floor(random() * 4));
    }
    if (random() > .75) for (let i = 0; i < 3; i++) sphere(x + (random() - .5) * size, y + size * 1.4, z + (random() - .5) * size, .035, ivory);
  }
  function tropical(x: number, y: number, z: number, height = 1.4) {
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4, h = height * (.48 + random() * .35), dx = Math.cos(a) * .24, dz = Math.sin(a) * .24;
      rod(new T.Vector3(x, y, z), new T.Vector3(x + dx, y + h, z + dz), .012, greens[0]);
      leaf(x + dx, y + h * .67, z + dz, height * .55, height * .27, .35 + random() * .8, a, i % 4);
    }
  }
  function tree(x: number, z: number, height = 2.1) {
    const trunk = mat(0x7e6b4d); const y = .48;
    rod(new T.Vector3(x, y, z), new T.Vector3(x + .06, height + y, z), .032, trunk);
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4, startY = y + height * (.35 + i * .055), end = new T.Vector3(x + Math.cos(a) * .55, startY + .5, z + Math.sin(a) * .55);
      rod(new T.Vector3(x, startY, z), end, .013, trunk);
      for (let j = 0; j < 15; j++) leaf(end.x + (random() - .5) * .65, end.y + (random() - .5) * .5, end.z + (random() - .5) * .65, .2, .08, random() * 2, random() * 6, j % 4);
    }
  }
  function bench(x: number, z: number, w: number, rotation = 0, timber = false) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rotation; root.add(g);
    box(0, .28, 0, w, .5, .67, timber ? wood : ivory, g);
    box(0, .57, -.02, w - .08, .13, .61, timber ? cushion : fabric, g);
    box(0, .83, -.3, w, .45, .12, timber ? wood : ivory, g);
    for (let i = 0; i < Math.max(1, Math.floor(w / 1.1)); i++) {
      const pillow = box(-w / 2 + .4 + i * 1.05, .88, -.12, .39, .37, .15, i % 2 ? cushion : fabric, g); pillow.rotation.z = (i % 2 ? 1 : -1) * .12;
    }
  }
  function curvedSeat(x: number, z: number, radius: number) {
    function arc(inner: number, outer: number, height: number, y: number, material: T.Material) {
      const shape = new T.Shape(); shape.absarc(0, 0, outer, Math.PI / 2, Math.PI * 1.5, false);
      shape.absarc(0, 0, inner, Math.PI * 1.5, Math.PI / 2, true); shape.closePath();
      const g = new T.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 2, steps: 1, curveSegments: 40 });
      const m = mesh(g, material, x, y, z); m.rotation.x = -Math.PI / 2;
    }
    arc(radius - .66, radius, .43, .06, ivory); arc(radius - .66, radius - .05, .13, .49, fabric); arc(radius - .18, radius, .48, .6, ivory);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * (.65 + i * .22), r = radius - .28;
      const p = box(x + Math.cos(a) * r, .83, z - Math.sin(a) * r, .4, .4, .17, i % 2 ? cushion : fabric); p.rotation.y = a - Math.PI / 2;
    }
  }
  function lounge(x: number, z: number, angle = -.5) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = angle; root.add(g);
    for (const dx of [-.34, .34]) {
      rod(new T.Vector3(dx, .07, .45), new T.Vector3(dx, .55, -.45), .028, wood, g);
      rod(new T.Vector3(dx, .07, -.42), new T.Vector3(dx, .56, .35), .028, wood, g);
    }
    box(0, .44, .06, .8, .09, .72, wood, g);
    const back = box(0, .78, -.32, .8, .82, .075, wood, g); back.rotation.x = -.23;
    for (let i = 0; i < 16; i++) {
      const slat = box(-.35 + i * .047, .78, -.276, .018, .75, .024, charcoal, g); slat.rotation.x = -.23;
    }
    for (let i = 0; i < 10; i++) box(0, .499, -.22 + i * .057, .72, .012, .022, charcoal, g);
    const seat = box(0, .55, .1, .65, .09, .53, fabric, g); seat.rotation.x = -.05;
  }
  // Hong Kong terraces and rooftops do not allow open fires: a low stone coffee table instead.
  function lowTable(x: number, z: number, radius = .5) {
    cyl(x, .2, z, radius * .55, .36, stone); cyl(x, .4, z, radius, .06, ivory);
    cyl(x + radius * .3, .47, z - radius * .2, .09, .08, charcoal); sphere(x - radius * .25, .5, z + radius * .15, .07, greens[2]);
  }
  // Neighbouring high-rises behind the back wall, so every design reads as a terrace among towers.
  function skyline() {
    const concrete = [mat(0xd8d4cb), mat(0xc9ccd0), mat(0xe2ddd2)], glass = mat(0x8ea2b2, .35);
    let x = -w / 2 + .2;
    while (x < w / 2 + .6) {
      const tw = 1.1 + random() * 1.2, th = 3.2 + random() * 4.2, z = -d / 2 - 1.1 - random() * 1.8;
      box(x + tw / 2, th / 2 - .3, z, tw, th, 1.2, concrete[Math.floor(random() * 3)]);
      for (let y = .55; y < th - .6; y += .5) box(x + tw / 2, y - .3, z + .61, tw * .82, .16, .02, glass);
      x += tw + .15 + random() * .4;
    }
  }
  function rug(x: number, z: number, r: number) {
    const m = mesh(new T.CircleGeometry(r, 64), textured('rug'), x, .044, z); m.rotation.x = -Math.PI / 2; m.castShadow = false;
  }
  function stool(x: number, z: number) {
    cyl(x, .78, z, .24, .075, wood);
    for (const dx of [-.15, .15]) for (const dz of [-.15, .15]) rod(new T.Vector3(x + dx * 1.25, .02, z + dz * 1.25), new T.Vector3(x + dx, .75, z + dz), .016, metal);
    box(x, .3, z, .35, .025, .025, metal);
  }
  function kitchen(x: number, z: number, length: number, angle = 0, withHob = true) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = angle; root.add(g);
    box(0, .49, 0, length, .9, .69, wood, g); box(0, .98, 0, length + .06, .1, .78, stone, g);
    box(-length / 2 + .05, .49, 0, .1, .9, .72, stone, g); box(length / 2 - .05, .49, 0, .1, .9, .72, stone, g);
    for (let i = 1; i < length / .08 - 1; i++) box(-length / 2 + i * .08, .49, .351, .018, .8, .018, charcoal, g);
    box(-length * .22, 1.04, 0, .55, .018, .43, metal, g); box(-length * .22, 1.053, 0, .4, .018, .3, charcoal, g);
    const pipe = new T.CatmullRomCurve3([new T.Vector3(-length * .22, 1.04, -.26), new T.Vector3(-length * .22, 1.4, -.26), new T.Vector3(-length * .22, 1.43, 0), new T.Vector3(-length * .22, 1.31, .04)]);
    mesh(new T.TubeGeometry(pipe, 20, .018, 8, false), metal, 0, 0, 0, g);
    if (withHob) cyl(length * .24, 1.045, 0, .2, .02, charcoal, g);
    const lemon = mat(0xd6ba35); sphere(length * .32, 1.11, .1, .055, lemon, g); sphere(length * .38, 1.11, .13, .05, lemon, g);
  }
  function bar(x: number, z: number, length: number) {
    box(x, .51, z, length, 1.02, .55, wood); box(x, 1.06, z, length + .12, .1, .7, stone);
    stool(x - .42, z + .57); stool(x + .42, z + .57);
    cyl(x + .65, 1.17, z, .1, .14, ivory); tropical(x + .65, 1.24, z, .3);
  }
  function water(x: number, z: number, w: number, d: number) {
    box(x, .21, z, w, .42, d, stone); box(x, .435, z, w - .16, .035, d - .16, mat(0x528681, .23, { metalness: .2 }));
    box(x - w * .12, .76, z - d * .3, w * .45, .66, .12, stone);
    box(x - w * .12, .69, z - d * .3 + .09, w * .32, .03, .13, metal);
    box(x - w * .12, .56, z - d * .3 + .15, w * .3, .28, .015, mat(0x9cc6bd, .12, { transparent: true, opacity: .65 }));
  }
  function pergola(x: number, z: number, w: number, d: number) {
    for (const dx of [-w / 2, w / 2]) for (const dz of [-d / 2, d / 2]) box(x + dx, 1.45, z + dz, .085, 2.9, .085, metal);
    for (const dz of [-d / 2, d / 2]) box(x, 2.9, z + dz, w + .18, .12, .1, metal);
    for (let i = 0; i < 19; i++) box(x - w / 2 + i * w / 18, 2.96, z, .055, .08, d + .15, wood);
  }
  function dining(x: number, z: number) {
    box(x, .87, z, 2.3, .1, 1.1, charcoal);
    for (const dx of [-.95, .95]) for (const dz of [-.4, .4]) box(x + dx, .44, z + dz, .055, .84, .055, metal);
    for (const dx of [-.8, 0, .8]) for (const dz of [-.85, .85]) {
      const g = new T.Group(); g.position.set(x + dx, 0, z + dz); if (dz < 0) g.rotation.y = Math.PI; root.add(g);
      box(0, .5, 0, .5, .08, .48, fabric, g);
      for (const a of [-.21, .21]) for (const b of [-.2, .2]) box(a, .25, b, .022, .48, .022, metal, g);
      for (let i = 0; i < 8; i++) box(-.23 + i * .066, .77, .23, .028, .5, .035, wood, g);
    }
    cyl(x, 1, z, .16, .16, ivory); tropical(x, 1.08, z, .3);
  }
  function umbrella(x: number, z: number) {
    cyl(x, .08, z, .28, .13, charcoal); cyl(x, 1.45, z, .025, 2.8, metal);
    const g = new T.ConeGeometry(1.75, .38, 8, 1, true); const m = mat(0xe3dac5, .9, { side: T.DoubleSide });
    mesh(g, m, x, 2.68, z);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; rod(new T.Vector3(x, 2.87, z), new T.Vector3(x + Math.sin(a) * 1.75, 2.49, z + Math.cos(a) * 1.75), .012, wood); }
  }
  function rail(x: number, z: number, length: number, angle = 0, solid = false) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = angle; root.add(g);
    box(0, 1.2, 0, length, .045, .045, metal, g);
    for (let i = 0; i <= Math.ceil(length / 1.5); i++) box(-length / 2 + i * length / Math.ceil(length / 1.5), .64, 0, .045, 1.24, .045, metal, g);
    if (solid) for (let y = .3; y < 1.2; y += .1) box(0, y, 0, length, .07, .025, charcoal, g);
    else if (spec.kind === 'balcony' || spec.kind === 'compact') {
      for (let x = -length / 2; x < length / 2; x += .19) box(x, .66, 0, .018, 1, .018, metal, g);
    } else {
      box(0, .14, 0, length, .035, .035, metal, g);
      const glass = mat(0xbfd2c9, .15, { transparent: true, opacity: .08, depthWrite: false });
      box(0, .65, 0, length - .08, .95, .012, glass, g);
    }
  }
  const { width: w, depth: d } = spec;
  box(0, -.18, 0, w + .12, .32, d + .12, ivory);
  box(0, -.025, 0, w, .05, d, gravel);
  const nx = Math.ceil(w / 1.15), nz = Math.ceil(d / 1.15);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) box(-w / 2 + (i + .5) * w / nx, .012, -d / 2 + (j + .5) * d / nz, w / nx - .012, .03, d / nz - .012, stone);
  // Two low boundary edges keep the model readable at every orbit angle.
  box(0, .69, -d / 2, w + .1, 1.4, .1, ivory);
  rail(w / 2, 0, d, Math.PI / 2, spec.kind === 'dining');
  rail(0, d / 2, w);
  skyline();
  if (spec.kind === 'curved') {
    planter(-3.55, 0, .75, 4.8); planter(-1.8, -2.55, 4.2, .65); planter(1, -2.5, .85, .8);
    tropical(-3.55, .5, -2, 1.25); tree(.9, -2.5, 2);
    curvedSeat(-.75, 0, 2.45); deck(-1.9, 2.62, 4.6, .72);
    rug(-.65, .75, 1); lowTable(-1, -.1, .48); lounge(.52, .65, -.65);
    bar(2.2, -2.35, 2.6); kitchen(3.7, -.2, 2.6, -Math.PI / 2); planter(3.7, 1.9, .7, 1.2);
  } else if (spec.kind === 'long') {
    planter(-4.6, 0, .7, 3.25); planter(-1, -1.62, 7.4, .65);
    curvedSeat(-2.7, 0, 1.65); deck(-3.2, .15, 3.3, 3.25); lowTable(-3, .2, .4);
    for (let i = 0; i < 3; i++) box(.6, .055, -.85 + i * .85, 5.3, .06, .7, ivory);
    box(-.2, .83, -1.6, 1.1, 1.65, .1, ivory); // perforated privacy screen
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) cyl(-.6 + i * .27, .3 + j * .3, -1.52, .065, .025, charcoal).rotation.x = Math.PI / 2;
    lounge(2.8, -.35, -.8); kitchen(4.55, .35, 1.9, -Math.PI / 2); tree(3.8, -1.62, 2);
  } else if (spec.kind === 'water') {
    planter(-3.8, -2, 1, 1.1); tree(-3.8, -2, 2);
    water(-1.9, -2.15, 2.75, 1.02); planter(.1, -2.3, .9, 1.3);
    deck(2.25, -.9, 3.8, 3.7); bench(2.2, -2.25, 3.3, 0, true); bench(3.75, -.95, 2.5, -Math.PI / 2, true);
    cyl(2.15, .5, -.5, .43, .08, ivory); cyl(2.15, .26, -.5, .15, .5, ivory); lounge(.9, .25, -.7);
    planter(3.8, 1.5, .8, 2); kitchen(-3.8, .8, 2.65, Math.PI / 2);
    tropical(3.8, .52, 1.5, 1.1);
  } else if (spec.kind === 'pergola') {
    deck(2.1, -2.15, 3.6, 2.8); pergola(2.1, -2.15, 3.5, 2.75);
    bench(2.1, -3.25, 3.2, 0, true); lowTable(2, -2, .42); lounge(1.3, -1.2, -.7);
    kitchen(-3.55, -.2, 3.7, Math.PI / 2); bar(-3.2, -2.25, 1.1); water(-1.6, -2.7, 1.6, .8);
    planter(-3.65, 2, .65, 2); planter(0, 3.15, 6.9, .65); tree(-3.6, 2.6, 2.2);
    box(2.7, 1.1, 1.6, 2.8, 2.2, .16, ivory); box(2.7, 1.1, 1.48, .83, 1.95, .04, metal);
    box(2.7, 1.15, 1.45, .7, 1.7, .03, mat(0x71817c, .3)); planter(1, 1.6, .7, .9);
    lounge(-.2, 1.2, .2); lounge(-1.7, .8, -.5); cyl(-1, .4, 1.1, .24, .06, ivory); cyl(-1, .2, 1.1, .08, .4, metal);
  } else if (spec.kind === 'dining') {
    rail(0, -d / 2 + .07, w, 0, true);
    deck(2, .05, 5.5, 3.35); dining(2, 0); umbrella(3.3, -.55);
    bench(-3.5, -1.1, 2.7, 0, true); planter(-4.7, .05, .75, 3.3, .55, true); planter(-1.55, -1.3, .75, .8, .6, true);
    tropical(-4.7, .55, -1, 1.4); tropical(4.6, .05, 1.3, .95);
  } else if (spec.kind === 'minimal') {
    planter(-3.8, -.5, .7, 3.4); tree(-3.8, -.5, 2.2); planter(-.7, -2.2, 5.8, .55);
    water(-1.5, -1.5, 2.35, 1.1); bench(1.8, -1.9, 3.3, 0, true);
    kitchen(3.7, .35, 2.35, -Math.PI / 2); lowTable(1, .2, .62); lounge(-.5, .6, .7); tropical(3.65, .52, -2.1, 1.25);
  } else if (spec.kind === 'balcony') {
    deck(-.2, -1.65, 3.1, 4.4); bench(-.25, -3.25, 2.8, 0, true);
    box(-.25, .2, -1.5, 2.2, .025, 2, cushion); cyl(-.25, .48, -1.5, .4, .055, stone); cyl(-.25, .25, -1.5, .1, .46, ivory);
    planter(1.45, 0, .65, 7.1); planter(0, 3.5, 3, .65); tropical(1.45, .52, -2, 1.15); tree(1.45, 2.7, 1.5);
    kitchen(-1.2, -3.1, .85, 0, false);
  } else {
    deck(-.25, -.2, 3.35, 3.75); planter(-1.85, -.3, .65, 3.8); planter(-.4, -2, 3.4, .65);
    bench(-.3, -1.45, 2.7, 0, true); bench(-1.4, -.5, 1.5, Math.PI / 2, true); kitchen(-1.35, 1.35, 1.1, Math.PI / 2, false);
    lounge(.45, .1, -.55); cyl(-.45, .39, .1, .25, .09, charcoal); cyl(-.45, .2, .1, .12, .36, charcoal);
    tropical(-1.85, .52, -1.6, 1.3); pergola(-.3, -.3, 3.4, 3.8);
    for (let i = 0; i < 3; i++) box(1.7, .04, -1.3 + i * 1.35, .86, .08, 1.15, ivory);
    box(2.2, .95, 0, .12, 1.9, 4.8, ivory); box(2.12, 1.15, .6, .04, .9, 1.3, charcoal);
  }

  // Bake opaque furniture and architecture by material: dozens of draws, not thousands.
  root.updateMatrixWorld(true);
  const buckets = new Map<T.Material, T.BufferGeometry[]>();
  root.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    const material = object.material as T.Material;
    const g = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    g.applyMatrix4(object.matrixWorld); const list = buckets.get(material) || []; list.push(g); buckets.set(material, list);
  });
  root.clear(); geometries.forEach(g => g.dispose()); geometries.clear();
  for (const [material, gs] of buckets) {
    const combined = mergeGeometries(gs, false); gs.forEach(g => g.dispose());
    if (!combined) throw new Error('Unable to assemble garden geometry');
    const m = mesh(combined, material, 0, 0, 0); m.name = 'architecture'; m.castShadow = !material.transparent;
  }
  const leafShape = new T.Shape(); leafShape.moveTo(0, 0); leafShape.bezierCurveTo(-.7, .4, -.45, .85, 0, 1); leafShape.bezierCurveTo(.45, .85, .7, .4, 0, 0);
  const leafGeo = new T.ShapeGeometry(leafShape, 4); geometries.add(leafGeo);
  const positions = leafGeo.getAttribute('position');
  for (let i = 0; i < positions.count; i++) positions.setZ(i, Math.sin(positions.getY(i) * Math.PI) * .2);
  leafGeo.computeVertexNormals(); const dummy = new T.Object3D();
  greens.forEach((material, color) => {
    material.side = T.DoubleSide; const subset = leaves.filter(l => l.color === color);
    const plants = new T.InstancedMesh(leafGeo, material, subset.length); plants.name = 'foliage';
    subset.forEach((l, i) => { dummy.position.copy(l.position); dummy.rotation.copy(l.rotation); dummy.scale.copy(l.scale); dummy.updateMatrix(); plants.setMatrixAt(i, dummy.matrix); });
    plants.castShadow = plants.receiveShadow = true; plants.computeBoundingSphere(); root.add(plants);
  });
  root.userData = { design: index, kind: spec.kind, illustrative: true };
  return { root, spec, dispose: () => { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); root.clear(); } };
}
