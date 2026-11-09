type Bi = { zh: string; en: string };

export interface ViewingRoom {
  id: string;
  order: number;
  label: Bi;
  photoUrl: string;
  thumbnailUrl: string;
  videoUrl: string | null;
  watermarked: boolean;
}
export interface ViewingListing {
  id: string;
  /** Format example only: no owner instruction (Form 3 / Form 5) behind it. Must be labelled publicly. */
  demo?: boolean;
  kind: 'rent' | 'sold' | 'sale';
  /** Missing/unknown is never an assertion that a rental is currently available. */
  availabilityStatus?: 'available' | 'leased' | 'unknown';
  availabilityCheckedAt?: string | null;
  address: string;
  suburb: string;
  city: string;
  postcode: string;
  beds: number | null;
  baths: number | null;
  cars: number | null;
  priceDisplay: Bi;
  priceBasis: string;
  checkedAt: string;
  listingDate: string | null;
  availableDate: string | null;
  soldPrice: number | null;
  soldDate: string | null;
  geo: { latitude: number; longitude: number } | null;
  /** Owner-supplied facts; no exact map pin is inferred from a suburb-only address. */
  features?: Bi[];
  /** true 表示这条盘我们有权公开发布（自家委托盘）；第三方摘录的仍是 false。 */
  publicReuseApproved: boolean;
  sourceName: string;
  sourceUrl: string;
  mapUrl: string;
  coverUrl: string;
  rooms: ViewingRoom[];
}
