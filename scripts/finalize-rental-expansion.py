"""Finalize only explicitly human-reviewed full-frame selections. Never infer approval."""
from pathlib import Path
from PIL import Image, ImageOps
import json,hashlib
root=Path(__file__).resolve().parents[1];review=root/'data/design-review/rental-expansion-2026-10-23'
labels={'exterior':('外观与入口','Exterior & entrance'),'living':('客厅','Living room'),'kitchen':('厨房','Kitchen'),'bedroom':('卧室','Bedroom'),'bathroom':('卫浴','Bathroom'),'balcony':('阳台','Balcony'),'courtyard':('庭院','Courtyard'),'dining':('餐厅','Dining'),'laundry':('洗衣房','Laundry'),'hall':('入口走廊','Entrance & hallway')}
selections=json.loads((review/'approved-room-selections.json').read_text(encoding='utf8'))
exclusions=json.loads((review/'photo-exclusions.json').read_text(encoding='utf8'))
assert not (set(selections)&set(exclusions)), 'Approval and exclusion registers conflict'
for ident,selection in selections.items():
 folder=root/'data/viewing-source'/ident;m=json.loads((folder/'candidate-metadata.json').read_text(encoding='utf8'))
 assert m['status']=='metadata-verified-awaiting-photo-review' and len(selection['rooms'])>=3
 assert hashlib.sha256((folder/'source-page.html').read_bytes()).hexdigest()==m['sourceSha256']
 rooms=[]
 for order,(num,label) in enumerate(selection['rooms'],1):
  raw=folder/'candidates'/f'{num}.jpg';im=Image.open(raw);assert min(im.size)>=300
  fn=f'room-{order}-{label}.jpg';thumb=f'room-{order}-{label}.thumb.jpg'
  full=ImageOps.exif_transpose(im).convert('RGB')
  if max(full.size)>1600:full=ImageOps.contain(full,(1600,1600),Image.Resampling.LANCZOS)
  full.save(folder/fn,quality=86,optimize=True,progressive=True)
  transform='Full-frame proportional downscale to maximum 1600px and JPEG compression only; no crop or watermark editing. Original bytes retained in candidates/.'
  small=ImageOps.exif_transpose(im).convert('RGB')
  if small.width>640 or small.height>480:small=ImageOps.contain(small,(640,480),Image.Resampling.LANCZOS)
  small.save(folder/thumb,quality=82)
  rooms.append({'id':label,'order':order,'label':dict(zip(['zh','en'],labels[label])),'file':fn,'thumbnailFile':thumb,'originalUrl':m['candidates'][num-1], 'sourceImageNumber':num,'watermarked':False,'watermarkReviewedAt':'2026-10-23','watermarkReview':'Human full-frame contact-sheet review; no visible watermark. No crop, inpainting or watermark removal.','recommended':True,'recommendation':'真实房间首帧；不虚构未展示空间。','videoFile':f'room-{order}.mp4','originalSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'fileSha256':hashlib.sha256((folder/fn).read_bytes()).hexdigest(),'assetTransform':transform})
 evidence={'officialPageReadable':True,'sourceUrl':m['sourceUrl'],'checkedAt':m['checkedAt'],'signal':'active-rental-page','sourceSha256':m['sourceSha256'],'sourceFormat':m['sourceFormat'],'text':f"For Rent; {m['priceText']}; Available Date: {m.get('availableDateSourceText') or 'not specified'}",'sourceFile':f'data/viewing-source/{ident}/source-page.html'}
 (folder/'availability-verification.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf8')
 price=m['askingWeeklyRent'];amount=f'{price:,.0f}'
 manifest={'version':1,'id':ident,'kind':'rent','usage':'internal-viewing-sample','publicReuseApproved':False,'displayEligible':True,'availabilityStatus':'available','availabilityCheckedAt':m['checkedAt'],'availabilityEvidence':{'sourceUrl':m['sourceUrl'],'checkedAt':m['checkedAt'],'signal':'active-rental-page','text':evidence['text'][:300],'evidenceFile':f'data/viewing-source/{ident}/availability-verification.json'},**{k:m[k] for k in ['address','suburb','city','postcode','beds','baths','cars','geo','sourceFormat','sourceCode','sourceSha256']},'priceDisplay':{'zh':f'A${amount} / 周','en':f'A${amount} / week'},'priceAmount':price,'priceBasis':'asking_weekly_rent','checkedAt':'2026-10-23','listingDate':None,'availableDate':m['availableDate'],'availableDateSourceText':m['availableDateSourceText'],'soldPrice':None,'soldDate':None,'sourceName':'LJ Hooker','sourceUrl':m['sourceUrl'],'coverRoom':selection.get('coverRoom',rooms[0]['id']),'robotsCheckedAt':'2026-10-23','rights':'Third-party copyrighted source photographs. Private internal sample only; no public reuse permission. No watermark editing.','rooms':rooms}
 (folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8');print(ident,m['address'],len(rooms))
