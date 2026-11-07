"""Small official Barry Plant batches; stage metadata only, never approve photos."""
from pathlib import Path
from urllib.robotparser import RobotFileParser
import requests,time,json,re,html,datetime,hashlib,zlib,sys
from types import SimpleNamespace
root=Path(__file__).resolve().parents[1];review=root/'data/design-review/rental-completion-2026-10-23';review.mkdir(parents=True,exist_ok=True)
ua='EUCOVE-ReferenceCheck/1.0 (finite manual public listing verification)';parser=RobotFileParser();parser.parse((review/'barryplant-robots.txt').read_text());records=[]
def visible(s):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>','',s,flags=re.I))))
seeds=json.loads((review/'barry-seeds.json').read_text());assert len(seeds)<=20
for seed in seeds:
 url=seed['url'];ident='reference-'+str(80000000000+zlib.crc32(('barryplant:'+url.rstrip('/').split('-')[-1]).encode()));folder=root/'data/viewing-source'/ident;folder.mkdir(parents=True,exist_ok=True);meta=folder/'candidate-metadata.json'
 cached=json.loads(meta.read_text()) if meta.exists() else None
 if cached and ('--reparse' not in sys.argv or not (folder/'source-page.html').exists()):records.append(cached);continue
 row={'id':ident,'sourceUrl':url,'kind':seed['kind'],'city':'Melbourne','sourceName':'Barry Plant','sourceFormat':'barryplant-official-next-html','displayEligible':False,'status':'excluded-unverified'}
 try:
  assert parser.can_fetch(ua,url)
  if cached:x=SimpleNamespace(status_code=200,content=(folder/'source-page.html').read_bytes())
  else:x=requests.get(url,headers={'User-Agent':ua},timeout=(15,25));time.sleep(1.7)
  row['httpStatus']=x.status_code
  if x.status_code!=200:raise ValueError('HTTP '+str(x.status_code))
  (folder/'source-page.html').write_bytes(x.content);(folder/'robots.txt').write_bytes((review/'barryplant-robots.txt').read_bytes());s=x.content.decode('utf8');m=re.search(r'<script[^>]+id="__NEXT_DATA__"[^>]*>(.*?)</script>',s,re.S);p=json.loads(m[1])['props']['pageProps']['propertyData'];v=visible(s)
  row.update(sourceCode=str(p['id']),checkedAt=cached['checkedAt'] if cached else datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),sourceSha256=hashlib.sha256(x.content).hexdigest(),sourceStatus=p['status'],headline=p['headline'],descriptionText=visible(p['description'])[:7000])
  assert not p['hide_listing'] and p['address_display'] and not p['isMultiple']
  assert p['address_state']=='vic' and p['address_suburb'] not in ['Curlewis','Mildura','Warragul','Leongatha','Cowes']
  lng,lat=p['location']['coordinates'];assert -38.6<lat<-37.1 and 144.2<lng<145.8
  assert p['address_street_display'].strip() in v
  if seed['kind']=='rent':
   assert p['status']=='current' and p['listing_type']=='lease' and p['rent_period']=='weekly' and not p['underOffer'] and p['leased_date'] is None
   assert 'For Lease' in v and not re.search('LEASED|UNDER APPLICATION|APPLICATION APPROVED|DEPOSIT TAKEN',p['headline'],re.I)
   assert not re.search(r'(?:rooming house|room for rent|shared accommodation|studio rooms)',row['descriptionText'],re.I)
   amount=float(p['rent']);assert 100<=amount<=10000
   assert re.search(r'\$'+format(amount,',.0f')+r'(?:\.00)?\s*(?:per week|pw|p/w)',v,re.I), 'Visible weekly rent differs from source structured value'
   row.update(askingWeeklyRent=amount,priceText=p['price'],availableDate=p['dateAvailable'][:10] if p['dateAvailable'] else None,availableDateSourceText=p['dateAvailable'] or 'not specified')
  else:
   assert p['status']=='sold' and p['soldDetails_date'];sold_date=p['soldDetails_date'][:10];assert '2025-10-23'<=sold_date<='2026-10-23'
   amount=p['soldDetails_price'] if p['soldDetails_price_display'] else None
   if amount is not None:assert '$'+format(amount,',.0f') in v
   else:assert 'undisclosed' in v.lower()
   row.update(soldPrice=amount,soldDate=sold_date,priceText='$'+format(amount,',.0f') if amount is not None else 'Price undisclosed',availableDate=None,availableDateSourceText=None)
  row.update(status='metadata-verified-awaiting-photo-review',address=p['address_street_display'].strip(),suburb=p['address_suburb'],postcode=p['address_postcode'],beds=int(p['bedrooms']) if p['bedrooms'] is not None else None,baths=int(p['bathrooms']) if p['bathrooms'] is not None else None,cars=int(p['total_parking']) if p['total_parking'] is not None else None,geo={'latitude':lat,'longitude':lng},candidates=[im['image']['image'] for im in p['images'][:10]])
  assert len(row['candidates'])>=3
 except Exception as e:row.update(status='excluded-source-check',reason=type(e).__name__+': '+str(e))
 meta.write_text(json.dumps(row,ensure_ascii=False,indent=2),encoding='utf8');records.append(row);print(ident,row.get('address',url),row['status'],row.get('reason',''),flush=True)
 (review/'barry-inventory.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf8')
