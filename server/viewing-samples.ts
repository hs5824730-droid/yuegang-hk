import { Router } from 'express';
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { config } from './config.js';
import type { ViewingListing } from '../src/viewing-types.js';
import {publicViewingListing,publicViewingListings,publicViewingMedia} from './public-viewing.js';

const id = z.string().regex(/^reference-\d{5,12}$/);
const label = z.object({ zh: z.string().min(1).max(100), en: z.string().min(1).max(100) });
const filename = z.string().regex(/^room-[1-9]\d?-[a-z0-9-]+\.jpg$/);
const thumbnail = z.string().regex(/^room-[1-9]\d?-[a-z0-9-]+\.thumb\.jpg$/);
const roomSchema = z.object({ id: z.string().regex(/^[a-z0-9-]+$/), order: z.number().int().min(1).max(20), label,
  file: filename, thumbnailFile: thumbnail, originalUrl: z.url().startsWith('https://'), recommended: z.literal(true),
  recommendation: z.string().min(1), videoFile: z.string().regex(/^room-[1-9]\d?\.mp4$/),
  watermarked: z.boolean().default(true) });
export const viewingManifestSchema = z.object({
  version: z.literal(1), id, usage: z.literal('internal-viewing-sample'), publicReuseApproved: z.literal(false),
  kind: z.enum(['rent', 'sold']).default('rent'), displayEligible: z.boolean().default(true),
  availabilityStatus: z.enum(['available', 'leased', 'unknown']).default('unknown'),
  availabilityCheckedAt: z.iso.datetime({ offset: true }).nullable().default(null),
  availabilityEvidence: z.object({ sourceUrl: z.url().startsWith('https://'), checkedAt: z.iso.datetime({ offset: true }),
    signal: z.literal('active-rental-page'), text: z.string().min(1).max(300), evidenceFile: z.string().min(1) }).optional(),
  address: z.string().min(1), suburb: z.string().min(1), city: z.string().min(1), postcode: z.string(),
  beds: z.number().int().nonnegative().nullable(), baths: z.number().int().nonnegative().nullable(), cars: z.number().int().nonnegative().nullable(),
  priceDisplay: label, priceBasis: z.enum(['asking_weekly_rent', 'historical_asking_weekly_rent', 'sold_price', 'undisclosed']),
  checkedAt: z.iso.date(), listingDate: z.iso.date().nullable(), availableDate: z.iso.date().nullable(),
  soldPrice: z.number().positive().max(1e11).nullable().default(null), soldDate: z.iso.date().nullable().default(null),
  sourceName: z.string().min(1), sourceUrl: z.url().startsWith('https://'),
  geo: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
  coverRoom: z.string(), rooms: z.array(roomSchema).min(1).max(10),
}).superRefine((listing, ctx) => {
  if (listing.kind === 'rent' && listing.availabilityStatus === 'available' &&
    (!listing.availabilityCheckedAt || !listing.availabilityEvidence ||
      listing.availabilityEvidence.sourceUrl !== listing.sourceUrl || listing.availabilityEvidence.checkedAt !== listing.availabilityCheckedAt)) {
    ctx.addIssue({ code: 'custom', path: ['availabilityStatus'], message: 'Available rental requires dated evidence from its official source' });
  }
  if (listing.kind === 'sold') {
    const lower = new Date(listing.checkedAt); lower.setUTCFullYear(lower.getUTCFullYear() - 1);
    if (!listing.soldDate || listing.soldDate > listing.checkedAt || listing.soldDate < lower.toISOString().slice(0, 10)) ctx.addIssue({ code: 'custom', path: ['soldDate'], message: 'Sold reference must be within twelve months of verification' });
    if (listing.soldPrice === null ? listing.priceBasis !== 'undisclosed' : listing.priceBasis !== 'sold_price') ctx.addIssue({ code: 'custom', path: ['priceBasis'], message: 'Sold price must be disclosed or explicitly unknown' });
  } else if (listing.soldPrice !== null || listing.soldDate !== null || listing.priceBasis === 'sold_price') ctx.addIssue({ code: 'custom', path: ['kind'], message: 'Rental cannot carry sold values' });
  if (!listing.rooms.some(room => room.id === listing.coverRoom)) ctx.addIssue({ code: 'custom', path: ['coverRoom'], message: 'Cover room missing' });
  if (new Set(listing.rooms.map(room => room.id)).size !== listing.rooms.length) ctx.addIssue({ code: 'custom', path: ['rooms'], message: 'Duplicate room' });
  if (new Set(listing.rooms.map(room => room.order)).size !== listing.rooms.length) ctx.addIssue({ code: 'custom', path: ['rooms'], message: 'Duplicate order' });
});
export type ViewingManifest = z.infer<typeof viewingManifestSchema>;
const sourceRoot = path.resolve(config.viewingSourceDir);
const videoRoot = path.resolve(config.viewingVideoDir);

export async function readViewingManifest(listingId: string): Promise<ViewingManifest | null> {
  if (config.production || !id.safeParse(listingId).success) return null;
  try {
    const file = await safeFile(sourceRoot, listingId, 'manifest.json');
    if (!file) return null;
    const manifest = viewingManifestSchema.parse(JSON.parse(await readFile(file, 'utf8')));
    return manifest.id === listingId && manifest.displayEligible && manifest.rooms.some(room => !room.watermarked) ? manifest : null;
  } catch { return null; }
}
async function safeFile(root: string, listingId: string, file: string) {
  try {
    const actualRoot = await realpath(root);
    const actual = await realpath(path.join(root, listingId, file));
    const relative = path.relative(actualRoot, actual);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !(await stat(actual)).isFile()) return null;
    return actual;
  } catch { return null; }
}
async function output(manifest: ViewingManifest): Promise<ViewingListing> {
  const rooms = await Promise.all(manifest.rooms.filter(room => !room.watermarked).map(async room => ({ id: room.id, order: room.order, label: room.label, watermarked: false,
    photoUrl: `/api/viewing-samples/${manifest.id}/photo/${room.file}`,
    thumbnailUrl: `/api/viewing-samples/${manifest.id}/photo/${room.thumbnailFile}`,
    videoUrl: await safeFile(videoRoot, manifest.id, room.videoFile) ? `/api/viewing-samples/${manifest.id}/video/${room.videoFile}` : null })));
  return { id: manifest.id, kind: manifest.kind, address: manifest.address, suburb: manifest.suburb, city: manifest.city, postcode: manifest.postcode,
    availabilityStatus: manifest.availabilityStatus, availabilityCheckedAt: manifest.availabilityCheckedAt,
    beds: manifest.beds, baths: manifest.baths, cars: manifest.cars, priceDisplay: manifest.priceDisplay, priceBasis: manifest.priceBasis,
    checkedAt: manifest.checkedAt, listingDate: manifest.listingDate, availableDate: manifest.availableDate,
    soldPrice: manifest.soldPrice, soldDate: manifest.soldDate, geo: manifest.geo, publicReuseApproved: false,
    sourceName: manifest.sourceName, sourceUrl: manifest.sourceUrl,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${manifest.geo.latitude},${manifest.geo.longitude}`,
    coverUrl: (rooms.find(room => room.id === manifest.coverRoom) || rooms[0]).photoUrl, rooms };
}

export function viewingSamplesRouter() {
  const router = Router();
  router.use((req, res, next) => {
    if (!config.production) {next();return;}
    if(!['GET','HEAD'].includes(req.method)){res.sendStatus(404);return;}
    const route=req.path.replace(/\/$/,'')||'/';
    if(route==='/'){const kind=req.query.kind||'rent';if(kind!=='rent'&&kind!=='sold'&&kind!=='sale'){res.sendStatus(400);return;}res.json({listings:publicViewingListings(kind as 'rent'|'sold'|'sale')});return;}
    const detail=route.match(/^\/(reference-\d{5,12})$/);
    if(detail){const listing=publicViewingListing(detail[1]);if(listing)res.json({listing});else res.sendStatus(404);return;}
    const media=publicViewingMedia('/api/viewing-samples'+route);
    if(!media){res.sendStatus(404);return;}
    res.set('Cache-Control','public, max-age=86400, immutable');res.type(media.contentType);
    res.sendFile(media.sha256+'.webp',{root:path.resolve('data/viewing-publication/2026-10-23/media'),dotfiles:'deny',acceptRanges:true},error=>{if(error&&!res.headersSent)res.sendStatus((error as {status?:number}).status===416?416:404);});
  });
  router.get('/', async (req, res) => {
    const kind = req.query.kind ?? 'rent';
    if (kind !== 'rent' && kind !== 'sold' && kind !== 'sale') { res.status(400).json({ error: '房源类型无效 / Invalid listing kind' }); return; }
    const directories = await readdir(sourceRoot, { withFileTypes: true }).catch(() => []);
    const manifests = await Promise.all(directories.filter(entry => entry.isDirectory()).map(entry => readViewingManifest(entry.name)));
    const listings = await Promise.all(manifests.filter((manifest): manifest is ViewingManifest => Boolean(manifest) && manifest!.kind === kind).map(output));
    res.json({ internalSample: true, publicReuseApproved: false, listings });
  });
  router.get('/:id', async (req, res) => {
    const manifest = await readViewingManifest(req.params.id);
    if (!manifest) { res.sendStatus(404); return; }
    res.json({ internalSample: true, publicReuseApproved: false, listing: await output(manifest) });
  });
  router.get('/:id/:kind/:file', async (req, res) => {
    const manifest = await readViewingManifest(req.params.id);
    const { kind, file } = req.params;
    const allowed = kind === 'photo' ? manifest?.rooms.some(room => !room.watermarked && (room.file === file || room.thumbnailFile === file))
      : kind === 'video' && manifest?.rooms.some(room => !room.watermarked && room.videoFile === file);
    if (!manifest || !allowed) { res.sendStatus(404); return; }
    const filename = await safeFile(kind === 'photo' ? sourceRoot : videoRoot, manifest.id, file);
    if (!filename) { res.sendStatus(404); return; }
    res.set('Cache-Control', 'private, no-store');
    res.sendFile(filename, { acceptRanges: true, dotfiles: 'deny' }, error => {
      if (error && !res.headersSent) res.sendStatus((error as { status?: number }).status === 416 ? 416 : 404);
    });
  });
  return router;
}
