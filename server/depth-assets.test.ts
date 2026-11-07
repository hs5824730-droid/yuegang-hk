import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { depthSample } from '../src/components/depth-samples.js';

test('depth sample assets match their source photos and contain aligned, non-flat depth', () => {
  const manifest = JSON.parse(readFileSync('public/depth/manifest.json', 'utf8'));
  assert.equal(manifest.depthConvention, 'relative-inverse-depth-white-near');
  assert.equal(manifest.photos.length, depthSample.photos.length);
  for (const photo of depthSample.photos) {
    const record = manifest.photos.find((item: { id: string }) => item.id === photo.id);
    assert.ok(record, photo.id);
    assert.equal(record.image, photo.image); assert.equal(record.depth, photo.depth);
    assert.equal(record.width, photo.width); assert.equal(record.height, photo.height);
    assert.equal(createHash('sha256').update(readFileSync('public' + record.source)).digest('hex'), record.sourceSha256);
    for (const url of [photo.image, photo.depth, photo.thumbnail]) {
      assert.match(url, /^\/depth\/[a-z-]+\.(?:webp|depth\.png|thumb\.webp)$/);
      assert.ok(statSync('public' + url).size < 600000, url + ' exceeds the sample asset budget');
    }
    const png = readFileSync('public' + photo.depth);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.equal(png[24], 8); assert.equal(png[25], 0, 'Depth map must be 8-bit grayscale');
    assert.ok(Math.abs(width / height - photo.width / photo.height) < 0.01, 'Photo/depth aspect ratio must match');
    const chunks: Buffer[] = [];
    for (let offset = 8; offset < png.length;) {
      const size = png.readUInt32BE(offset);
      if (png.subarray(offset + 4, offset + 8).toString() === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + size));
      offset += size + 12;
    }
    const filtered = inflateSync(Buffer.concat(chunks));
    const pixels = Buffer.alloc(width * height);
    const paeth = (a: number, b: number, c: number) => {
      const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
      return da <= db && da <= dc ? a : db <= dc ? b : c;
    };
    for (let y = 0; y < height; y++) {
      const filter = filtered[y * (width + 1)];
      for (let x = 0; x < width; x++) {
        const i = y * width + x, left = x ? pixels[i - 1] : 0, up = y ? pixels[i - width] : 0, upperLeft = x && y ? pixels[i - width - 1] : 0;
        const predictor = [0, left, up, Math.floor((left + up) / 2), paeth(left, up, upperLeft)][filter];
        assert.notEqual(predictor, undefined);
        pixels[i] = (filtered[y * (width + 1) + x + 1] + predictor) & 255;
      }
    }
    assert.ok(new Set(pixels).size > 64, 'Depth should contain a real range of values');
  }
});

test('depth sample public directory contains rendered assets, never inference weights or runtimes', () => {
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else { assert.doesNotMatch(file, /\.(onnx|safetensors|bin|wasm|pt|pth)$/i); assert.ok(statSync(file).size < 1000000); }
    }
  };
  visit('public/depth');
});
