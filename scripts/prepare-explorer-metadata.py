"""Prepare audited metadata from locally saved public source HTML; no network calls."""
from pathlib import Path
from html.parser import HTMLParser
from datetime import datetime
import json
import re

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'data/viewing-source'
PICKS = {
    'reference-3591974': [(4, 'living', '客餐区', 'Living & dining'), (5, 'kitchen', '厨房', 'Kitchen'), (2, 'bedroom', '卧室', 'Bedroom'), (9, 'bathroom', '卫浴', 'Bathroom'), (1, 'exterior', '外观与入口', 'Exterior & entrance')],
    'reference-3572788': [(9, 'living', '客厅', 'Living room'), (3, 'bedroom', '卧室', 'Bedroom'), (7, 'bathroom', '卫浴', 'Bathroom'), (1, 'exterior', '外观', 'Exterior')],
    'reference-3577920': [(5, 'living', '客厅', 'Living room'), (10, 'kitchen', '厨房', 'Kitchen'), (2, 'bedroom', '卧室', 'Bedroom'), (8, 'bathroom', '卫浴', 'Bathroom'), (1, 'exterior', '外观', 'Exterior')],
    'reference-3559970': [(1, 'living', '客厅', 'Living room'), (3, 'kitchen', '厨房', 'Kitchen'), (4, 'bedroom', '卧室', 'Bedroom'), (6, 'bathroom', '卫浴', 'Bathroom')],
    'reference-3446481': [(1, 'living', '客厅', 'Living room'), (5, 'kitchen', '厨房', 'Kitchen'), (9, 'bedroom', '卧室', 'Bedroom'), (8, 'exterior', '建筑外观', 'Building exterior')],
    'reference-3538850': [(3, 'living', '客厅', 'Living room'), (6, 'kitchen', '厨房', 'Kitchen'), (10, 'outdoor', '户外起居区', 'Outdoor living'), (1, 'exterior', '外观', 'Exterior')],
    'reference-3563773': [(6, 'living', '客厅', 'Living room'), (7, 'kitchen', '厨房', 'Kitchen'), (10, 'dining', '餐区', 'Dining area'), (2, 'garden', '庭院', 'Garden'), (1, 'exterior', '外观', 'Exterior')],
    'reference-3423926': [(5, 'living', '客厅', 'Living room'), (8, 'bedroom', '卧室', 'Bedroom'), (2, 'exterior', '外观与入口', 'Exterior & entrance')],
    'reference-3561427': [(3, 'living', '客厅', 'Living room'), (5, 'bedroom', '卧室', 'Bedroom'), (6, 'bathroom', '卫浴', 'Bathroom'), (1, 'exterior', '外观', 'Exterior')],
}
class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__(); self.hidden = 0; self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'): self.hidden += 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style'): self.hidden = max(0, self.hidden - 1)
    def handle_data(self, data):
        if not self.hidden: self.parts.append(data)

references = {r['id']: r for r in json.loads((ROOT / 'data/market-reference.json').read_text(encoding='utf-8'))['records']}
sources = {r[0]: {'city': r[1], 'sourceUrl': r[2]} for r in json.loads((BASE / 'explorer-selection.json').read_text(encoding='utf-8'))}
for listing_id, picks in PICKS.items():
    folder = BASE / listing_id
    html = (folder / 'source-page.html').read_text(encoding='utf-8')
    ld = json.loads(re.search(r'<script[^>]+type="application/ld\+json"[^>]*>([\s\S]*?)</script>', html).group(1))
    parser = VisibleText(); parser.feed(html)
    visible = re.sub(r'\s+', ' ', ' '.join(parser.parts))
    if listing_id in sources:
        evidence = re.search(r'Sold(?: for (\$[\d,]+))? on (\d{1,2} [A-Za-z]+ 20\d{2})', visible)
        if not evidence: raise ValueError('No publicly visible sold event: ' + listing_id)
        price = int(evidence.group(1).replace('$', '').replace(',', '')) if evidence.group(1) else None
        try: sold_date = datetime.strptime(evidence.group(2), '%d %b %Y').date().isoformat()
        except ValueError: sold_date = datetime.strptime(evidence.group(2), '%d %B %Y').date().isoformat()
        if not '2025-10-23' <= sold_date <= '2026-10-23': raise ValueError('Sold date outside verification window')
        if f'"soldDate":"{sold_date}"' not in html: raise ValueError('Visible and embedded dates disagree')
        if price is not None and f'"soldPrice":{price}' not in html: raise ValueError('Visible and embedded prices disagree')
        source = sources[listing_id]
        source_name = {'Melbourne': 'Ray White Brunswick', 'Sydney': 'Ray White Double Bay', 'Perth': 'Ray White South Perth', 'Brisbane': 'Ray White Aspley'}[source['city']]
        record = {**source, 'sourceName': source_name, 'kind': 'sold', 'soldPrice': price, 'soldDate': sold_date,
                  'priceBasis': 'sold_price' if price is not None else 'undisclosed',
                  'priceDisplay': {'zh': f'A${price:,}' if price is not None else '价格未披露', 'en': f'A${price:,}' if price is not None else 'Price undisclosed'},
                  'sourceEventText': evidence.group(0), 'availableDate': None}
    else:
        record = dict(references[listing_id]); record.update(soldPrice=None, soldDate=None)
        if f"${record['priceAmount']:,} per week" not in visible: raise ValueError('Source asking rent mismatch')
        record['availableDate'] = next((e.get('startDate', '')[:10] for e in ld.get('event', []) if e.get('name') == 'Available'), None)
    address = ld['address']
    record.update(address=address['streetAddress'], suburb=address['addressLocality'], postcode=address['postalCode'])
    for source_key, key in [('bedrooms', 'beds'), ('bathrooms', 'baths'), ('carSpaces', 'cars')]:
        match = re.search(r'"' + source_key + r'":(\d+)', html); record[key] = int(match.group(1)) if match else None
    urls = json.loads((folder / 'candidates.json').read_text(encoding='utf-8'))
    rooms = []
    for order, (number, room_id, zh, en) in enumerate(picks, 1):
        original_url = urls[number - 1]
        if original_url not in html: raise ValueError('Photo not in source HTML')
        rooms.append({'id': room_id, 'order': order, 'label': {'zh': zh, 'en': en}, 'file': f'room-{order}-{room_id}.jpg',
                      'thumbnailFile': f'room-{order}-{room_id}.thumb.jpg', 'originalUrl': original_url, 'sourceImageNumber': number,
                      'watermarked': False, 'watermarkReviewedAt': '2026-10-23', 'watermarkReview': 'Human full-frame review of the public listing candidate: no visible agency watermark. No removal, inpainting or cropping.',
                      'recommended': True, 'recommendation': '已人工核对用途与无水印。仅作小幅运动首帧，保留原门窗、墙体和可见设施，不虚构未展示空间。',
                      'videoFile': f'room-{order}.mp4', 'videoPath': f'data/viewing-video/{listing_id}/room-{order}.mp4'})
    manifest = {**record, 'version': 1, 'id': listing_id, 'checkedAt': '2026-10-23', 'listingDate': None,
                'usage': 'internal-viewing-sample', 'publicReuseApproved': False, 'displayEligible': True,
                'geo': {'latitude': ld['geo']['latitude'], 'longitude': ld['geo']['longitude']},
                'coverRoom': 'exterior' if any(r['id'] == 'exterior' for r in rooms) else 'living',
                'robotsCheckedAt': '2026-10-23', 'robotsPolicy': 'Public pages allowed by User-agent:*; no /api scraping. Explicit finite selection; sequential media requests at least 1.5s apart.',
                'rights': 'Third-party copyrighted source photographs. Internal sample only, no public reuse permission. No watermark removal or cropping.', 'rooms': rooms}
    (folder / 'prepared-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(listing_id, record['address'], record['kind'], len(rooms))
