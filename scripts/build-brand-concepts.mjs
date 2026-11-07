import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../public/brand-concepts/', import.meta.url));
const core = await readFile(path.join(root, '_src/brand-core.js'), 'utf8');
const page = await readFile(path.join(root, '_src/page.html'), 'utf8');
const scope = {};
vm.runInNewContext(core, scope);
const B = scope.BRAND;
await writeFile(path.join(root, 'index.html'), page.replace('/*__CORE__*/', core));
let total = 0;
for (const key of Object.keys(B.concepts)) {
  const name = B.concepts[key].en.toLowerCase();
  const dir = path.join(root, name);
  await mkdir(dir, { recursive: true });
  const files = {
    [`${name}-logo.svg`]: B.logo(key, 'light'),
    [`${name}-logo-dark.svg`]: B.logo(key, 'dark'),
    [`${name}-logo-white.svg`]: B.logo(key, 'mono-white'),
    [`${name}-logo-ink.svg`]: B.logo(key, 'mono-ink'),
    [`${name}-mark.svg`]: B.mark(key),
    [`${name}-app-icon.svg`]: B.appIcon(key),
    [`${name}-favicon.svg`]: B.favicon(key),
    [`${name}-mark-small.svg`]: B.smallMark(key),
    ...Object.fromEntries(B.icons.map(i => [`icon-${i.key}.svg`, B.icon(i, B.concepts[key].deep)])),
  };
  for (const [name, svg] of Object.entries(files)) {
    await writeFile(path.join(dir, name), '<?xml version="1.0" encoding="UTF-8"?>\n' + svg);
    total++;
  }
}
console.log(`Built self-contained brand preview and ${total} SVG assets.`);
