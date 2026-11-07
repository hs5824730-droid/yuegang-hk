/** Only explicit source status can establish availability. Missing data is never leased. */
export function viewingStatus(listing:{kind:'rent'|'sold'|'sale';availabilityStatus?:unknown}):'available'|'leased'|'unknown'|'sold'|'sale'{
 if(listing.kind==='sold')return 'sold';
 if(listing.kind==='sale')return 'sale';
 return listing.availabilityStatus==='available'?'available':listing.availabilityStatus==='leased'?'leased':'unknown';
}
