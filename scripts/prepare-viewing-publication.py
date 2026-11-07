"""Build an explicit 48-listing publication; never copies source HTML/manifests or unselected photos."""
from pathlib import Path
from PIL import Image
import json,hashlib,datetime

root=Path(__file__).resolve().parents[1]
batch=root/'data/viewing-publication/2026-10-23'
media_dir=batch/'media'
media_dir.mkdir(parents=True,exist_ok=True)
review=root/'data/design-review/rental-completion-2026-10-23'
rent=json.loads((review/'actual-api-rent.json').read_text(encoding='utf-8'))['listings']
rent=[listing for listing in rent if listing.get('availabilityStatus')=='available']
sold=json.loads((review/'actual-api-sold.json').read_text(encoding='utf-8'))['listings']
assert len(rent)==36 and len(sold)==12
keys=['id','kind','address','suburb','city','postcode','availabilityStatus','availabilityCheckedAt','beds','baths','cars','priceDisplay','priceBasis','checkedAt','listingDate','availableDate','soldPrice','soldDate','geo','sourceName','sourceUrl','mapUrl']
listings=[];assets={};audit=[]
for original in rent+sold:
    listing={key:original.get(key) for key in keys}
    manifest_path=root/'data/viewing-source'/listing['id']/'manifest.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    assert manifest['publicReuseApproved'] is False
    if listing['kind']=='rent':assert listing['availabilityStatus']=='available' and manifest['availabilityEvidence']['signal']=='active-rental-page'
    source_rooms={room['id']:room for room in manifest['rooms']}
    rooms=[];room_audit=[]
    for old_room in original['rooms']:
        source=source_rooms[old_room['id']]
        assert source.get('watermarked') is False and source.get('watermarkReviewedAt')
        room={'id':old_room['id'],'order':old_room['order'],'label':old_room['label'],'watermarked':False,'videoUrl':None}
        for field,file_key in [('photoUrl','file'),('thumbnailUrl','thumbnailFile')]:
            source_file=manifest_path.parent/source[file_key]
            source_bytes=source_file.read_bytes()
            source_hash=hashlib.sha256(source_bytes).hexdigest()
            if field=='photoUrl' and source.get('fileSha256'):assert source_hash==source['fileSha256']
            image=Image.open(source_file).convert('RGB')
            image.thumbnail((1600,1600) if field=='photoUrl' else (480,480),Image.Resampling.LANCZOS)
            import io
            buffer=io.BytesIO();image.save(buffer,'WEBP',quality=84 if field=='photoUrl' else 78,method=6)
            web=buffer.getvalue();digest=hashlib.sha256(web).hexdigest();filename=digest+'.webp'
            output=media_dir/filename
            if not output.exists():output.write_bytes(web)
            api_path=f"/api/viewing-samples/{listing['id']}/photo/{filename}"
            room[field]=api_path
            assets[api_path]={'key':'viewing-public/2026-10-23/'+filename,'sha256':digest,'bytes':len(web),'contentType':'image/webp'}
            room_audit.append({'roomId':room['id'],'role':field,'sourceFile':str(source_file.relative_to(root)),'sourceSha256':source_hash,'sourceImageUrl':source['originalUrl'],'publishedPath':api_path,'publishedSha256':digest,'width':image.width,'height':image.height,'bytes':len(web)})
        rooms.append(room)
    listing['rooms']=rooms
    listing['coverUrl']=next((r['photoUrl'] for r in rooms if r['id']==manifest['coverRoom']),rooms[0]['photoUrl'])
    # Preserve source permission status. A site-owner publication instruction is not an author license.
    listing['publicReuseApproved']=False
    listings.append(listing)
    audit.append({'id':listing['id'],'sourceUrl':manifest['sourceUrl'],'manifestSha256':hashlib.sha256(manifest_path.read_bytes()).hexdigest(),'originalSourceRightsNote':manifest.get('rights'),'sourcePublicReuseApproved':False,'publicationAuthority':'Explicit site-owner instruction to publish this existing selected set, 2026-10-23; NOT a license granted by the source/photographer.','rooms':room_audit})
assert sum(len(l['rooms']) for l in listings if l['kind']=='rent')==131
assert sum(len(l['rooms']) for l in listings if l['kind']=='sold')==51
public={'version':1,'release':'2026-10-23-selected-market-records','listings':listings,'media':assets}
(root/'server/public-viewing-release.json').write_text(json.dumps(public,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
(batch/'source-and-publication-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
uploads={a['key']:{**a,'file':str(media_dir/(a['sha256']+'.webp'))} for a in assets.values()}
(batch/'upload-allowlist.json').write_text(json.dumps(list(uploads.values()),indent=2)+'\n',encoding='utf-8')
summary={'preparedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'rent':36,'sold':12,'rooms':182,'allowedMediaPaths':len(assets),'uniqueMediaObjects':len(uploads),'uploadBytes':sum(a['bytes'] for a in uploads.values()),'sourceManifestsChanged':False,'sourceAuthorPermissionNotClaimed':True,'videos':0,'rawArchivesIncluded':False}
(batch/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False))
