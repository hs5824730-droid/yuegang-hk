"""Explicit private review queue; two polite reads, no retries, no approval inference."""
from pathlib import Path
from urllib.robotparser import RobotFileParser
from urllib.parse import urlsplit
from concurrent.futures import ThreadPoolExecutor,as_completed
from PIL import Image,ImageOps,ImageDraw,ImageFont
import json,time,threading,requests
root=Path(__file__).resolve().parents[1];r=root/'data/design-review/rental-completion-2026-10-23';ua='EUCOVE-ReferenceCheck/1.0 (finite manual public listing verification)';lock=threading.Lock();last=0
policies={}
for host,status in [('images2.barryplant.com.au',404),('images.listonce.com.au',200)]:
 rp=RobotFileParser();rp.parse((r/(host+'-robots.txt')).read_text());policies[host]=(status,rp)
queue=json.loads((r/'photo-queue.json').read_text());jobs=[];folders=[]
for item in queue:
 folder=root/'data/viewing-source'/item['id'];m=json.loads((folder/'candidate-metadata.json').read_text());assert m['status']=='metadata-verified-awaiting-photo-review';folders.append(folder);(folder/'candidates').mkdir(exist_ok=True)
 for n,u in enumerate(m['candidates'][:item['limit']],1):
  dest=folder/'candidates'/f'{n}.jpg'
  if dest.exists():Image.open(dest).verify();continue
  status,rp=policies[urlsplit(u).netloc];assert status==404 or status==200 and rp.can_fetch(ua,u)
  jobs.append((u,dest))
def fetch(job):
 global last
 u,dest=job
 with lock:time.sleep(max(0,1.7-(time.monotonic()-last)));last=time.monotonic()
 started=time.monotonic();temp=dest.with_suffix('.download');result={'url':u,'file':str(dest.relative_to(root))}
 try:
  size=0
  with requests.get(u,headers={'User-Agent':ua},timeout=(25,20),stream=True) as response:
   result['httpStatus']=response.status_code
   if response.status_code!=200:return result
   with temp.open('wb') as f:
    for chunk in response.iter_content(16384):
     size+=len(chunk)
     if time.monotonic()-started>75 or size>20_000_000:raise TimeoutError('Bounded image read')
     f.write(chunk)
  Image.open(temp).verify();temp.replace(dest);result['bytes']=size;result['status']='downloaded'
 except Exception as e:
  if temp.exists():temp.unlink()
  result['failure']=type(e).__name__
 return result
def sheet(folder):
 files=sorted((folder/'candidates').glob('*.jpg'),key=lambda p:int(p.stem));font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20);m=json.loads((folder/'candidate-metadata.json').read_text());canvas=Image.new('RGB',(1600,330*((len(files)+3)//4)),'#eee');draw=ImageDraw.Draw(canvas)
 if not files:return
 for at,p in enumerate(files):
  im=ImageOps.contain(Image.open(p).convert('RGB'),(380,285));x=at%4*400;y=at//4*330;draw.text((x+10,y+5),m['id']+' / '+p.stem,font=font,fill='#111');canvas.paste(im,(x+10+(380-im.width)//2,y+35+(285-im.height)//2))
 canvas.save(folder/'review-contact-sheet.jpg',quality=90)
results=[]
with ThreadPoolExecutor(max_workers=2) as pool:
 for f in as_completed([pool.submit(fetch,j) for j in jobs]):
  result=f.result();results.append(result);print(result['file'],result.get('status',result.get('failure',result.get('httpStatus'))),flush=True)
  (r/'photo-transfer-latest.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
  for folder in folders:sheet(folder)
for folder in folders:sheet(folder)
