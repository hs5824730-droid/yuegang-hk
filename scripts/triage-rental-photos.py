"""Finite photo triage: two concurrent reads, globally spaced starts, no retry."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
from urllib.robotparser import RobotFileParser
from urllib.parse import urlsplit
from concurrent.futures import ThreadPoolExecutor,as_completed
import json,time,threading,requests,zlib,sys
root=Path(__file__).resolve().parents[1];review=root/'data/design-review/rental-expansion-2026-10-23';lock=threading.Lock();last=0
rp=RobotFileParser();rp.parse((review/'website-static.ljhooker.com-robots.txt').read_text().splitlines())
ua='EUCOVE-ReferenceCheck/1.0 (finite manual public listing verification)'
seeds=json.loads((review/'seeds.json').read_text());assert len(seeds)<=60
if '--all' not in sys.argv:seeds=seeds[24:]
limit=int(next((v.split('=')[1] for v in sys.argv if v.startswith('--limit=')),'3'))
ids=set(json.loads((review/'additional-photo-review.json').read_text())) if '--selected' in sys.argv else None
jobs=[];folders=[]
for seed in seeds:
 ident='reference-'+str(90000000000+zlib.crc32(('ljhooker:'+seed['url'].split('-')[-1]).encode()));folder=root/'data/viewing-source'/ident
 m=json.loads((folder/'candidate-metadata.json').read_text());
 if m['status']!='metadata-verified-awaiting-photo-review' or (ids is not None and ident not in ids):continue
 folders.append(folder);(folder/'candidates').mkdir(exist_ok=True)
 for i,u in enumerate(m['candidates'][:limit],1):
  dest=folder/'candidates'/f'{i}.jpg'
  if dest.exists():
   try:Image.open(dest).verify();continue
   except:raise ValueError('Invalid existing candidate '+str(dest))
  assert urlsplit(u).hostname=='website-static.ljhooker.com' and rp.can_fetch(ua,u)
  jobs.append((u,dest))
def get(job):
 global last
 u,dest=job
 with lock:
  time.sleep(max(0,1.7-(time.monotonic()-last)));last=time.monotonic()
 try:
  started=time.monotonic();temp=dest.with_suffix('.download');size=0
  with requests.get(u,headers={'User-Agent':ua},timeout=(15,15),stream=True) as r:
   if r.status_code!=200:return str(dest)+' HTTP '+str(r.status_code)
   with temp.open('wb') as output:
    for chunk in r.iter_content(16384):
     size+=len(chunk)
     if time.monotonic()-started>60 or size>20_000_000:raise TimeoutError('Bounded photo download exceeded')
     output.write(chunk)
  Image.open(temp).verify();temp.replace(dest)
  return str(dest.parent.parent.name)+' / '+dest.stem+' downloaded'
 except Exception as e:
  if dest.with_suffix('.download').exists():dest.with_suffix('.download').unlink()
  return str(dest)+' failed '+type(e).__name__
def sheet(folder):
 m=json.loads((folder/'candidate-metadata.json').read_text());files=sorted((folder/'candidates').glob('*.jpg'),key=lambda p:int(p.stem))
 if not files:return
 c=Image.new('RGB',(1600,330*((len(files)+3)//4)),'#eeeeee');d=ImageDraw.Draw(c);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
 for at,p in enumerate(files):
  im=ImageOps.contain(Image.open(p).convert('RGB'),(380,285));x=at%4*400;y=at//4*330;d.text((x+10,y+5),m['sourceCode']+' / '+p.stem,font=font,fill='#222');c.paste(im,(x+10+(380-im.width)//2,y+35+(285-im.height)//2))
 c.save(folder/'review-contact-sheet.jpg',quality=90)
with ThreadPoolExecutor(max_workers=2) as pool:
 futures=[pool.submit(get,j) for j in jobs]
 for f in as_completed(futures):
  print(f.result(),flush=True)
  for folder in folders:sheet(folder)
for folder in folders:sheet(folder)
