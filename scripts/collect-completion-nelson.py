"""Finite Nelson Alexander official pages; status/price/date are visible HTML."""
from pathlib import Path
from urllib.robotparser import RobotFileParser
import requests,time,re,html,json,datetime,hashlib,zlib,sys
from types import SimpleNamespace
root=Path(__file__).resolve().parents[1];r=root/'data/design-review/rental-completion-2026-10-23';ua='EUCOVE-ReferenceCheck/1.0 (finite manual public listing verification)';rp=RobotFileParser();rp.parse((r/'nelsonalexander-robots.txt').read_text());rows=[]
def clean(s):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s))).strip()
for seed in json.loads((r/'nelson-seeds.json').read_text()):
 u=seed['url'];code=re.search(r'/property/(\d+)/',u)[1];ident='reference-'+str(70000000000+zlib.crc32(('nelsonalexander:'+code).encode()));folder=root/'data/viewing-source'/ident;folder.mkdir(parents=True,exist_ok=True);meta=folder/'candidate-metadata.json'
 cached=json.loads(meta.read_text()) if meta.exists() else None
 if cached and ('--reparse' not in sys.argv or not (folder/'source-page.html').exists()):rows.append(cached);continue
 m={'id':ident,'sourceCode':code,'kind':seed['kind'],'sourceName':'Nelson Alexander','sourceFormat':'nelsonalexander-official-html','sourceUrl':u,'city':'Melbourne','status':'excluded-source-check','displayEligible':False}
 try:
  assert rp.can_fetch(ua,u)
  if cached:response=SimpleNamespace(status_code=200,content=(folder/'source-page.html').read_bytes())
  else:response=requests.get(u,headers={'User-Agent':ua},timeout=(15,25));time.sleep(1.7)
  assert response.status_code==200,'HTTP '+str(response.status_code)
  (folder/'source-page.html').write_bytes(response.content);(folder/'robots.txt').write_bytes((r/'nelsonalexander-robots.txt').read_bytes());s=response.content.decode('utf8');m.update(checkedAt=cached['checkedAt'] if cached else datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),sourceSha256=hashlib.sha256(response.content).hexdigest())
  address=clean(re.search(r'<h1[^>]+class="address"[^>]*>(.*?)</h1>',s,re.S)[1]);a=re.fullmatch(r'(.+?),\s*(.+?)\s+VIC\s+(\d{4})',address);assert a
  pos=re.search(r'<meta name="geo.position" content="([-\d.]+),([-\d.]+)"',s);lat,lng=float(pos[1]),float(pos[2]);assert -38.6<lat<-37.1 and 144.2<lng<145.8
  price=clean(re.search(r'<h3[^>]+class="price"[^>]*>(.*?)</h3>',s,re.S)[1]);headline=clean(re.search(r'<h2[^>]+class="headline"[^>]*>(.*?)</h2>',s,re.S)[1]);desc=clean(re.search(r'<div[^>]+class="description"[^>]*>(.*?)</div>',s,re.S)[1]);m.update(priceText=price,headline=headline,descriptionText=desc[:7000]);specs={}
  for icon in ['bed','bath','car']:
   f=re.search(r'icon-'+icon+r'-secondary[^>]+>\s*<span>(\d+)</span>',s);specs[icon]=int(f[1]) if f else None
  if seed['kind']=='rent':
   index_bytes=(r/'nelsonalexander-sample.html').read_bytes()
   cards=re.split(r'<div class="property-card ',index_bytes.decode('utf8'))[1:]
   card=next((card for card in cards if '/property/'+code+'/' in card),None)
   assert card and 'leased-overlay' not in card and 'sold-overlay' not in card, 'Not in the official current rental pool'
   assert '<h2>Property Leased</h2>' not in s and '<strong>Leased</strong>' not in s, 'Detail explicitly leased'
   assert re.search(r'<h2>Available</h2>\s*<h3>',s), 'Detail has no active available-date section'
   m['activeIndexEvidence']={'sourceUrl':'https://www.nelsonalexander.com.au/rent/','sourceFile':'data/design-review/rental-completion-2026-10-23/nelsonalexander-sample.html','sourceSha256':hashlib.sha256(index_bytes).hexdigest(),'propertyId':code,'signal':'current-rental-card-without-leased-overlay'}
   assert not re.search('LEASED|UNDER APPLICATION|APPLICATION APPROVED',headline,re.I)
   amount=re.search(r'\$([\d,]+)(?:\.00)?\s*(?:pw|p/w|per week)',price,re.I);assert amount;amount=float(amount[1].replace(',',''))
   avail=re.search(r'<h2>Available</h2>\s*<h3>(.*?)</h3>',s,re.S);avail=clean(avail[1]) if avail else None;date=None
   if avail and re.search(r'\d{4}',avail):
    normalized=re.sub(r'(\d)(?:st|nd|rd|th)',r'\1',avail);date=datetime.datetime.strptime(normalized,'%A %d %B %Y').date().isoformat()
   assert not re.search(r'(rooming house|shared kitchen|room for rent|shared accommodation)',desc,re.I)
   m.update(askingWeeklyRent=amount,availableDate=date,availableDateSourceText=avail)
  else:
   assert '<h2>Property Sold</h2>' in s,'Current panel is not sold';d=re.search(r'\b(\d{2}/\d{2}/\d{4})\b',price);assert d;date=datetime.datetime.strptime(d[1],'%d/%m/%Y').date().isoformat();assert '2025-10-23'<=date<='2026-10-23'
   value=re.search(r'\$([\d,]+)',price);amount=float(value[1].replace(',','')) if value else None;assert amount or 'undisclosed' in price.lower();m.update(soldPrice=amount,soldDate=date,availableDate=None,availableDateSourceText=None,sourceEventText=price)
  photos=list(dict.fromkeys(html.unescape(x) for x in re.findall(r'https[^\s"<>]+',s) if 'images.listonce.com.au/custom/l/listings/' in x and '/'+code.zfill(8)+'_img_' in x))
  assert len(photos)>=3
  m.update(status='metadata-verified-awaiting-photo-review',address=a[1],suburb=a[2],postcode=a[3],beds=specs['bed'],baths=specs['bath'],cars=specs['car'],geo={'latitude':lat,'longitude':lng},candidates=photos[:10])
 except Exception as e:m.update(reason=type(e).__name__+': '+str(e))
 meta.write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf8');rows.append(m);print(ident,m.get('address',u),m['status'],m.get('reason',''),flush=True)
 (r/'nelson-inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
