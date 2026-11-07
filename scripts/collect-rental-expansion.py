"""Finite official-page review queue. Stages private candidates; never approves rooms.
No credentials, hidden endpoints, source discovery crawl, cropping or AI editing.
"""
from pathlib import Path
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser
from PIL import Image, ImageOps, ImageDraw, ImageFont
import requests, json, re, html, time, datetime, hashlib, zlib, shutil, sys
from types import SimpleNamespace
from io import BytesIO

root = Path(__file__).resolve().parents[1]
review = root / 'data/design-review/rental-expansion-2026-10-23'
review.mkdir(parents=True, exist_ok=True)
session = requests.Session()
session.headers['User-Agent'] = 'EUCOVE-ReferenceCheck/1.0 (finite manual public listing verification)'
robots = {}
last_request = 0

def get(url):
    global last_request
    time.sleep(max(0, 1.6 - (time.monotonic() - last_request)))
    response = session.get(url, timeout=30)
    last_request = time.monotonic()
    return response

def permitted(url):
    host = urlsplit(url).netloc
    if host not in robots:
        response = get('https://' + host + '/robots.txt')
        (review / (host + '-robots.txt')).write_bytes(response.content)
        parser = RobotFileParser(); parser.parse(response.text.splitlines())
        robots[host] = (response.status_code, parser)
    status, parser = robots[host]
    return status == 404 or (status == 200 and parser.can_fetch(session.headers['User-Agent'], url))

def clean(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', ' ', value))).strip()

def one(pattern, source, default=None):
    found = re.search(pattern, source, re.I | re.S)
    return clean(found[1]) if found else default

def collect(seed):
    url, city = seed['url'], seed['city']
    code = url.rstrip('/').split('-')[-1].lower()
    ident = 'reference-' + str(90000000000 + zlib.crc32(('ljhooker:' + code).encode()))
    folder = root / 'data/viewing-source' / ident
    folder.mkdir(parents=True, exist_ok=True)
    metadata_path = folder / 'candidate-metadata.json'
    cached = json.loads(metadata_path.read_text(encoding='utf8')) if metadata_path.exists() else None
    if cached and '--reparse' not in sys.argv: return cached
    if cached:
        response = SimpleNamespace(status_code=200, content=(folder/'source-page.html').read_bytes())
    else:
        if not permitted(url): return {'url': url, 'status': 'excluded-robots-unavailable-or-disallowed'}
        response = get(url)
    if response.status_code != 200:
        return {'url': url, 'status': 'excluded-http-' + str(response.status_code)}
    source = response.content.decode('utf8', errors='replace')
    (folder / 'source-page.html').write_bytes(response.content)
    if not (folder/'robots.txt').exists(): shutil.copy2(review / (urlsplit(url).netloc + '-robots.txt'), folder / 'robots.txt')
    address = one(r'<h2[^>]+class="property-overview__address"[^>]*>(.*?)</h2>', source)
    price = one(r'<p[^>]+id="property-information"[^>]*>(.*?)</p>', source, '')
    visible = clean(re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>', '', source, flags=re.I))
    record = {'id': ident, 'sourceCode': code, 'sourceUrl': url, 'city': city, 'sourceFormat': 'ljhooker-official-html',
              'checkedAt': cached['checkedAt'] if cached else datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
              'sourceSha256': hashlib.sha256(response.content).hexdigest(), 'priceText': price,
              'status': 'excluded-not-explicitly-available', 'displayEligible': False}
    # The CURRENT overview and panel must establish rent status. Descriptions and
    # search snippets often still say available after the property is leased.
    amount = re.search(r'\$?([\d,]+(?:\.\d+)?)\s*/?\s*(?:pw|wk|per\s+week|a\s+week)', price, re.I)
    current_for_rent = bool(re.search(r'<h[2-6][^>]*>\s*For Rent\s*</h[2-6]>', source, re.I))
    position = re.search(r'const position\s*=\s*\{\s*lat:\s*([-\d.]+)\s*,\s*lng:\s*([-\d.]+)', source)
    if address and amount and current_for_rent and not re.search(r'LEASED|UNDER\s+APPLICATION', price, re.I) and position:
        street, suburb = address.rsplit(',', 1)
        specs = {}
        for label in ['bed', 'bath', 'car']:
            value = one(r'img-icon--' + label + r'[^>]*>.*?property-overview__bbc__label"[^>]*>(.*?)</span>', source)
            specs[label] = int(value) if value and value.isdigit() else None
        available = one(r'Available Date</[^>]+>\s*<[^>]+>(.*?)</', source)
        if not available:
            available = one(r'Available Date\s+(.{1,45}?)(?:\s+(?:Property|Cute|Charming|Modern|Features|Spacious)|$)', visible)
        exact_date = None
        if available and re.fullmatch(r'\d{1,2}/\d{1,2}/\d{4}', available):
            exact_date = datetime.datetime.strptime(available, '%d/%m/%Y').date().isoformat()
        images = list(dict.fromkeys(html.unescape(u) for u in re.findall(r'<img[^>]+(?:src|data-src)="([^"]+)"', source)
                                    if 'website-static.ljhooker.com/images/' in u))
        record.update(status='metadata-verified-awaiting-photo-review', address=street.strip(), suburb=suburb.strip(),
                      postcode='', beds=specs['bed'], baths=specs['bath'], cars=specs['car'],
                      askingWeeklyRent=float(amount[1].replace(',', '')), availableDate=exact_date,
                      availableDateSourceText=available, geo={'latitude': float(position[1]), 'longitude': float(position[2])},
                      candidates=images[:10])
        boxes = {'Melbourne':(-38.5,-37.1,144.2,145.8),'Sydney':(-34.4,-33.2,150.2,151.6),
                 'Perth':(-32.7,-31.3,115.3,116.5),'Brisbane':(-28.1,-26.7,152.4,153.7),
                 'Adelaide':(-35.5,-34.2,138.1,139.2),'Canberra':(-35.7,-35.0,148.8,149.5)}
        lo,hi,left,right=boxes[city]
        if not (lo <= float(position[1]) <= hi and left <= float(position[2]) <= right):
            record['status']='excluded-source-coordinate-outside-city'
        if len(images)<3: record['status']='excluded-insufficient-photos'
    metadata_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf8')
    return record

def stage_images(record):
    if record['status'] != 'metadata-verified-awaiting-photo-review': return
    folder = root / 'data/viewing-source' / record['id']; candidates=folder/'candidates';candidates.mkdir(exist_ok=True)
    for index,url in enumerate(record['candidates'],1):
        dest=candidates/f'{index}.jpg'
        if dest.exists():continue
        if not permitted(url): record['photoFailure']='robots unavailable/disallowed';break
        r=get(url)
        if r.status_code!=200:record['photoFailure']='HTTP '+str(r.status_code);break
        Image.open(BytesIO(r.content)).verify()
        temp=dest.with_suffix('.download');temp.write_bytes(r.content);temp.replace(dest)
    files=sorted(candidates.glob('*.jpg'),key=lambda p:int(p.stem))
    if len(files)>=3:
        canvas=Image.new('RGB',(1600,((len(files)+3)//4)*330),'#eeeeee');draw=ImageDraw.Draw(canvas);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
        for at,p in enumerate(files):
            im=Image.open(p).convert('RGB');im=ImageOps.contain(im,(380,285),Image.Resampling.LANCZOS)
            x=(at%4)*400;y=(at//4)*330;draw.text((x+10,y+5),record['sourceCode']+' / '+p.stem,font=font,fill='#222222');canvas.paste(im,(x+10+(380-im.width)//2,y+35+(285-im.height)//2))
        canvas.save(folder/'review-contact-sheet.jpg',quality=90)
        record['readyForHumanReview']=True
    (folder/'candidate-metadata.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf8')

seeds=json.loads((review/'seeds.json').read_text(encoding='utf8'))
if len(seeds)>60:raise ValueError('Finite review cap exceeded')
records=[]
for seed in seeds:
    try:
        r=collect(seed)
        if '--images' in sys.argv:stage_images(r)
        records.append(r)
        print(r.get('id',''),r.get('address',seed['url']),r['status'],'photos-ready' if r.get('readyForHumanReview') else '',flush=True)
    except Exception as e:
        records.append({'url':seed['url'],'status':'excluded-read-error','reason':str(e)});print('Excluded:',seed['url'],type(e).__name__,flush=True)
    (review/'candidate-inventory.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf8')
