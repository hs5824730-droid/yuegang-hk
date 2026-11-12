import { publicViewingListing, publicViewingListings, publicViewingMedia } from '../server/public-viewing';
import type { AppEnv } from './env';
import { json,notFound } from './http';
export async function publishedViewings(request:Request,env:AppEnv,path:string){
 if(!['GET','HEAD'].includes(request.method))return notFound();
 if(path==='/api/viewing-samples'){
  const kind=new URL(request.url).searchParams.get('kind')||'rent';
  if(kind!=='rent'&&kind!=='sold'&&kind!=='sale'&&kind!=='leased')return json({error:'房源类型无效 / Invalid listing kind'},400);
  return json({listings:publicViewingListings(kind)});
 }
 const listing=path.match(/^\/api\/viewing-samples\/(reference-\d{5,12})$/);
 if(listing){const value=publicViewingListing(listing[1]);return value?json({listing:value}):notFound();}
 const media=publicViewingMedia(path);if(!media)return notFound();
 const etag='"'+media.sha256+'"';
 const headers=new Headers({'Content-Type':media.contentType,'Cache-Control':'public, max-age=86400, immutable','ETag':etag,'Accept-Ranges':'bytes'});
 if(request.headers.get('If-None-Match')===etag&&!request.headers.has('Range'))return new Response(null,{status:304,headers});
 let offset=0,length=media.bytes,status=200;
 const range=request.headers.get('Range');
 if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);let valid=Boolean(match&&(match[1]||match[2]));
  if(valid&&match){if(match[1]){offset=Number(match[1]);const end=match[2]?Math.min(Number(match[2]),media.bytes-1):media.bytes-1;length=end-offset+1;}else{length=Math.min(Number(match[2]),media.bytes);offset=media.bytes-length;}valid=Number.isSafeInteger(offset)&&Number.isSafeInteger(length)&&offset>=0&&offset<media.bytes&&length>0;}
  if(!valid){headers.set('Content-Range','bytes */'+media.bytes);return new Response(null,{status:416,headers});}
  status=206;headers.set('Content-Range',`bytes ${offset}-${offset+length-1}/${media.bytes}`);
 }
 headers.set('Content-Length',String(length));
 if(request.method==='HEAD')return await env.MEDIA.head(media.key)?new Response(null,{status,headers}):notFound();
 const object=await env.MEDIA.get(media.key,{range:{offset,length}});
 return object?new Response(object.body,{status,headers}):notFound();
}
