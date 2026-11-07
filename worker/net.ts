/** Independent net frontend. The existing com service remains the sole business backend. */
import {pixelFrameRequest,pixelFrameHtml,pixelFrameHeaders,pixelNoscript} from '../server/meta-pixel';
import {languageFromPath,registrationPageTitle} from '../src/language-path';
import {documentMetadata} from '../src/language-seo';
import {languageRedirect,languageHead,languageResource,privateLanguagePath,publicDocumentStatus} from '../server/language-shell';
import {notFound,secure,json} from './http';
export type NetEnv = NetBindings;
export async function netRoute(request:Request,env:NetEnv):Promise<Response> {
 const url=new URL(request.url),path=url.pathname;
 if(url.hostname==='www.eucove.net')return Response.redirect('https://eucove.net'+path+url.search,308);
 if(privateLanguagePath(path))return notFound();
 if(path==='/api'||path.startsWith('/api/')||path.startsWith('/uploads/')){
  if(!['GET','HEAD','OPTIONS'].includes(request.method)&&request.headers.get('Origin')!==new URL(env.APP_URL).origin)return json({error:'请求来源不受信任 / Untrusted request origin'},403);
  const backend=new URL(path+url.search,'https://eucove.com');const forwarded=new Request(backend,request);
  forwarded.headers.delete('Cloudflare-Workers-Version-Overrides');
  if(request.headers.has('Origin'))forwarded.headers.set('Origin','https://eucove.com');
  forwarded.headers.delete('Referer');
  const response=await env.BACKEND.fetch(forwarded);
  const headers=new Headers(response.headers);for(const key of [...headers.keys()])if(key.toLowerCase().startsWith('access-control-'))headers.delete(key);
  return new Response(response.body,{status:response.status,headers});
 }
 if(!['GET','HEAD'].includes(request.method))return notFound();
 if(pixelFrameRequest(url)){const html=pixelFrameHtml(url,request.headers);return html?new Response(html,{headers:pixelFrameHeaders(url)}):notFound();}
 const resource=languageResource(url);if(resource)return new Response(resource.body,{headers:{'Content-Type':resource.type}});
 const redirect=languageRedirect(url);if(redirect)return new Response(null,{status:308,headers:{Location:redirect}});
 const response=await env.ASSETS.fetch(request);
 if(response.status!==200||!response.headers.get('Content-Type')?.includes('text/html'))return response;
 const meta=documentMetadata(url),lang=languageFromPath(path),fallback=pixelNoscript(url,request.headers);
 const rewriter=new HTMLRewriter().on('html',{element(e){if(lang)e.setAttribute('lang',lang==='zh'?'zh-CN':'en')}}).on('head',{element(e){if(meta)e.append(languageHead(url),{html:true});else e.append('<meta data-language-seo name="robots" content="noindex,nofollow">',{html:true})}}).on('title',{element(e){if(meta)e.setInnerContent(meta.title);else {const title=registrationPageTitle(path,lang||'zh');if(title)e.setInnerContent(title)}}}).on('meta[name="description"]',{element(e){if(meta)e.setAttribute('content',meta.description)}}).on('body',{element(e){if(fallback)e.append(fallback,{html:true})}});
 const transformed=rewriter.transform(response),headers=new Headers(response.headers);headers.delete('ETag');headers.delete('Content-Length');headers.set('Cache-Control','private, no-store, no-transform');headers.set('Vary','DNT, Sec-GPC');
 return new Response(transformed.body,{status:publicDocumentStatus(url),headers});
}
export default {
 async fetch(request:Request,env:NetEnv) {
  try {return secure(await netRoute(request,env),request)}
  catch {return secure(json({error:'暂时无法处理 / Please try again'},503),request)}
 }
};
