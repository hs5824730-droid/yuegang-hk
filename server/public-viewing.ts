import raw from './public-viewing-release.json';
import ownerListings from './owner-listings.json';
import type { ViewingListing } from '../src/viewing-types.js';
export interface PublishedMedia { key:string;sha256:string;bytes:number;contentType:string; }
interface Publication {version:number;release:string;listings:ViewingListing[];media:Record<string,PublishedMedia>;}
const publication=raw as Publication;
const listings:ViewingListing[]=[...ownerListings as ViewingListing[],...publication.listings];
export const publicViewingListings=(kind:'rent'|'sold'|'sale')=>listings.filter(item=>item.kind===kind&&(kind!=='rent'||item.availabilityStatus==='available'));
export const publicViewingListing=(id:string)=>listings.find(item=>item.id===id&&(item.kind==='sold'||item.kind==='sale'||item.availabilityStatus==='available'))||null;
export const publicViewingMedia=(path:string)=>Object.hasOwn(publication.media,path)?publication.media[path]:null;
export const publicViewingRelease=publication.release;
