import { z } from 'zod';

const bi = z.object({ zh: z.string().min(1), en: z.string().min(1) });
const date = z.iso.date();
export const marketRecordSchema = z.object({
  id: z.string().min(1), city: z.string().min(1),
  kind: z.enum(['sale', 'rent', 'leased', 'sold']),
  address: z.string().min(1), suburb: z.string().optional(), postcode: z.string().optional(),
  propertyType: z.string().optional(),
  beds: z.number().int().min(0).max(8).nullish(), baths: z.number().int().min(0).max(6).nullish(),
  cars: z.number().int().nonnegative().nullish(),
  priceDisplay: bi, priceAmount: z.number().positive().nullish(), priceMax: z.number().positive().nullish(),
  priceBasis: z.enum(['achieved_sale', 'asking_sale', 'sale_guide', 'asking_weekly_rent', 'historical_asking_weekly_rent', 'undisclosed']),
  eventDate: date.nullish(), dateLabel: bi.optional(), sourceName: z.string().min(1),
  sourceUrl: z.url().refine(url => new URL(url).protocol === 'https:', 'Source must use HTTPS'),
  checkedAt: date, summary: bi.optional(), imageUrl: z.null().optional(),
}).superRefine((r, ctx) => {
  const allowed = {
    rent: ['asking_weekly_rent', 'undisclosed'], leased: ['historical_asking_weekly_rent', 'undisclosed'],
    sale: ['asking_sale', 'sale_guide', 'undisclosed'], sold: ['achieved_sale', 'undisclosed'],
  };
  const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  if (!allowed[r.kind].includes(r.priceBasis)) issue('priceBasis', 'Price basis does not match record kind');
  if ((r.priceBasis === 'undisclosed') !== (r.priceAmount == null)) issue('priceAmount', 'Disclosed prices require an amount; undisclosed prices must not contain one');
  if (r.priceMax != null && (r.priceAmount == null || r.priceMax < r.priceAmount)) issue('priceMax', 'Price range must be ordered');
  if (r.eventDate && r.eventDate > r.checkedAt) issue('eventDate', 'Historical event cannot be later than the source check');
});

export const marketFileSchema = z.object({
  checkedAt: date, usage: z.literal('internal-market-reference'), publicReuseApproved: z.boolean(),
  records: z.array(marketRecordSchema),
}).superRefine((file, ctx) => {
  const ids = new Set<string>();
  file.records.forEach((record, i) => {
    if (ids.has(record.id)) ctx.addIssue({ code: 'custom', path: ['records', i, 'id'], message: 'Duplicate record id' });
    ids.add(record.id);
    if (record.checkedAt > file.checkedAt) ctx.addIssue({ code: 'custom', path: ['records', i, 'checkedAt'], message: 'Record check is later than file check' });
  });
});
export type MarketRecord = z.infer<typeof marketRecordSchema>;
export type MarketFile = z.infer<typeof marketFileSchema>;
