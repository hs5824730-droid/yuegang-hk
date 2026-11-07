import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,unlinkSync,chmodSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const hash=text=>createHash('sha256').update(text).digest('hex');
export const signature=(secret,time,nonce,method,url,body='')=>createHmac('sha256',secret).update([time,nonce,method,url,hash(body)].join('\n')).digest('hex');
function run(command,args,input='',timeout=60000){return new Promise(resolve=>{
 let output='',error='',timedOut=false,settled=false;const child=spawn(command,args,{stdio:['pipe','pipe','pipe'],env:{...process.env,JAVA_TOOL_OPTIONS:''}});
 const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},timeout);
 child.stdout.on('data',chunk=>{if(output.length<1024*1024)output+=chunk;});child.stderr.on('data',chunk=>{if(error.length<65536)error+=chunk;});
 const done=(code,started=true)=>{if(settled)return;settled=true;clearTimeout(timer);resolve({code,output,error,timedOut,started});};
 child.on('error',()=>done(-1,false));child.on('close',code=>done(code));child.stdin.on('error',()=>{});child.stdin.end(input);
});}
function createJsonRpcClient(directory){
 let child=null,buffer='',sequence=0;const pending=new Map();
 const stop=()=>{if(child){child.kill('SIGTERM');child=null;}for(const entry of pending.values()){clearTimeout(entry.timer);entry.resolve({error:{message:'signal_client_stopped'}});}pending.clear();buffer='';};
 const start=()=>{
  if(child)return true;
  const args=['--enable-native-access=ALL-UNNAMED','-Xmx256m','-cp','/opt/signal-cli-0.14.9/lib/*','org.asamk.signal.Main','--data-dir',path.join(directory,'signal'),'--scrub-log','--output','json','jsonRpc','--receive-mode','manual','--ignore-attachments','--ignore-avatars','--ignore-stickers','--ignore-stories'];
  try{child=spawn('java',args,{stdio:['pipe','pipe','pipe'],env:{...process.env,JAVA_TOOL_OPTIONS:''}});}catch{return false;}
  child.stdout.on('data',chunk=>{buffer+=chunk;for(;;){const newline=buffer.indexOf('\n');if(newline<0)break;const line=buffer.slice(0,newline).trim();buffer=buffer.slice(newline+1);if(!line)continue;try{const value=JSON.parse(line),entry=pending.get(String(value.id));if(entry){pending.delete(String(value.id));clearTimeout(entry.timer);entry.resolve(value);}}catch{/* Never log Signal output or customer content. */}}});
  child.stderr.on('data',()=>{});
  child.on('error',()=>stop());child.on('close',()=>stop());return true;
 };
 const rpc=(method,params={})=>new Promise(resolve=>{
  if(!start()||!child?.stdin?.writable)return resolve({error:{message:'signal_client_unavailable'}});
  const id=String(++sequence),timer=setTimeout(()=>{pending.delete(id);resolve({error:{message:'signal_client_timeout'}});},60000);pending.set(id,{resolve,timer});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',method,params,id})+'\n',error=>{if(!error)return;const entry=pending.get(id);if(entry){pending.delete(id);clearTimeout(timer);entry.resolve({error:{message:'signal_client_write_failed'}});}});
 });
 const client=async(command,text='',timestamp=null)=>{
  let target;try{target=JSON.parse(readFileSync(path.join(directory,'signal/target-group.json'),'utf8'));}catch{return{code:-1,started:false};}
  if(target.name!=='做大做强'||target.groupIdVerified!==true||typeof target.groupId!=='string')return {code:-1,started:false};
  const value=command==='verify'?await rpc('listGroups'):await rpc('send',{groupId:target.groupId,message:text,...(timestamp?{editTimestamp:timestamp}:{})});
  if(value.error)return {code:-1,started:Boolean(child)};
  if(command==='verify'){const groups=Array.isArray(value.result)?value.result:value.result?.groups||[];return {verified:groups.some(g=>g.id===target.groupId&&g.name===target.name&&g.isMember===true&&g.isBlocked!==true&&g.isTerminated!==true),code:0};}
  return {code:0,timestamp:value.result?.timestamp||value.result?.results?.timestamp};
 };
 return {client,stop};
}
export async function createRelay(options){
 const directory=path.resolve(options.directory);mkdirSync(directory,{recursive:true,mode:0o700});chmodSync(directory,0o700);
 const db=new DatabaseSync(path.join(directory,'relay.sqlite'));db.exec(`PRAGMA journal_mode=WAL;PRAGMA synchronous=FULL;PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS nonces(nonce TEXT PRIMARY KEY,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS deliveries(id TEXT NOT NULL,revision INTEGER NOT NULL,hash TEXT NOT NULL,status TEXT NOT NULL,timestamp INTEGER,error TEXT NOT NULL DEFAULT '',PRIMARY KEY(id,revision));
 CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,timestamp INTEGER NOT NULL,revision INTEGER NOT NULL);
 UPDATE deliveries SET status='uncertain',error='process_restarted_during_send' WHERE status='running';`);
 let busy=false,verified=false;let attempts=[];
 const persistent=options.client?null:createJsonRpcClient(directory),client=options.client||persistent.client;
 const verify=async()=>{if(busy)return false;busy=true;try{const result=await client('verify');verified=result.verified===true;return verified;}finally{busy=false;}};
 const status=()=>({ok:true,clientVersion:'0.14.9',stateLoaded:verified,targetVerified:verified,sendEnabled:Boolean(options.enabled()),busy});
 const reply=(res,code,body,headers={})=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(body));};
 const server=createServer(async(req,res)=>{
  try{
   if(req.url==='/health'&&req.method==='GET')return reply(res,200,{ok:true});
   if(!['/v1/status','/v1/verify','/v1/messages'].includes(req.url))return reply(res,404,{error:'not_found'});
   if(Number(req.headers['content-length']||0)>16384)return reply(res,413,{error:'body_too_large'});
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16384)return reply(res,413,{error:'body_too_large'});}
   const time=String(req.headers['x-eucove-time']||''),nonce=String(req.headers['x-eucove-nonce']||''),received=String(req.headers['x-eucove-signature']||'');
   const expected=signature(options.secret,time,nonce,req.method,req.url,body);
   if(options.secret.length<32||!/^\d{13}$/.test(time)||Math.abs(Date.now()-Number(time))>90000||!uuid.test(nonce)||!/^[a-f0-9]{64}$/.test(received)||!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(received,'hex')))return reply(res,401,{error:'unauthorized'});
   db.prepare('DELETE FROM nonces WHERE expires<?').run(Date.now());
   const claimed=db.prepare('INSERT INTO nonces VALUES(?,?) ON CONFLICT DO NOTHING').run(nonce,Date.now()+180000);if(!claimed.changes)return reply(res,409,{error:'replayed_request'});
   if(req.url==='/v1/status'&&req.method==='GET')return reply(res,200,status());
   if(req.url==='/v1/verify'&&req.method==='POST'){if(busy)return reply(res,429,{error:'busy'},{'Retry-After':'5'});await verify();return reply(res,200,status());}
   if(req.url!=='/v1/messages'||req.method!=='POST')return reply(res,405,{error:'method_not_allowed'});
   const input=JSON.parse(body);
   if(!input||Object.keys(input).sort().join(',')!=='id,revision,text'||!uuid.test(input.id)||!Number.isSafeInteger(input.revision)||input.revision<0||input.revision>100000||typeof input.text!=='string'||!input.text.trim()||input.text.length>4000)return reply(res,400,{error:'invalid_message'});
   const prior=db.prepare('SELECT * FROM deliveries WHERE id=? AND revision=?').get(input.id,input.revision);
   if(prior){if(prior.hash!==hash(input.text))return reply(res,409,{error:'idempotency_conflict'});if(prior.status==='sent')return reply(res,200,{ok:true,timestamp:prior.timestamp});if(prior.status==='running')return reply(res,202,{ok:false,state:'running'});if(prior.status==='uncertain')return reply(res,409,{error:'delivery_uncertain'});}
   const blocked=db.prepare("SELECT status FROM deliveries WHERE id=? AND status IN ('uncertain','running') LIMIT 1").get(input.id);
   if(blocked)return reply(res,blocked.status==='uncertain'?409:202,blocked.status==='uncertain'?{error:'delivery_uncertain'}:{ok:false,state:'running'});
   const previous=db.prepare('SELECT * FROM messages WHERE id=?').get(input.id);
   if(previous&&previous.revision>=input.revision)return reply(res,200,{ok:true,timestamp:previous.timestamp,superseded:true});
   if(!options.enabled()||!verified)return reply(res,503,{error:'not_ready'});
   attempts=attempts.filter(t=>t>Date.now()-60000);if(busy||attempts.length>=20)return reply(res,429,{error:'busy'},{'Retry-After':'5'});
   busy=true;attempts.push(Date.now());db.prepare("INSERT INTO deliveries(id,revision,hash,status) VALUES(?,?,?,'running') ON CONFLICT(id,revision) DO UPDATE SET status='running'").run(input.id,input.revision,hash(input.text));
   try{
    const result=await client('send',input.text,previous?.timestamp||null);
    if(result.code===0&&Number.isSafeInteger(result.timestamp)){
     const original=previous?.timestamp||result.timestamp;
     db.exec('BEGIN IMMEDIATE');try{db.prepare("UPDATE deliveries SET status='sent',timestamp=? WHERE id=? AND revision=?").run(original,input.id,input.revision);db.prepare('INSERT INTO messages VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision').run(input.id,original,input.revision);db.exec('COMMIT');}catch{db.exec('ROLLBACK');throw Error('ledger_commit');}
     return reply(res,200,{ok:true,timestamp:original});
    }
    const state=result.started===false?'retryable':'uncertain';db.prepare('UPDATE deliveries SET status=?,error=? WHERE id=? AND revision=?').run(state,'signal_client_failed',input.id,input.revision);
    return reply(res,state==='uncertain'?409:503,{error:state==='uncertain'?'delivery_uncertain':'client_unavailable'});
   }catch{db.prepare("UPDATE deliveries SET status='uncertain',error='send_interrupted' WHERE id=? AND revision=? AND status='running'").run(input.id,input.revision);return reply(res,409,{error:'delivery_uncertain'});}finally{busy=false;}
  }catch{if(!res.headersSent)reply(res,400,{error:'request_failed'});}
 });
 server.requestTimeout=20000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
 return {server,verify,status,close:()=>{persistent?.stop();db.close();}};
}
async function main(){
 process.umask(0o077);
 const directory=process.env.RELAY_DATA||'/data';const secret=process.env.RELAY_HMAC_SECRET||'';if(secret.length<32)throw Error('missing_relay_auth');
 mkdirSync(path.join(directory,'signal'),{recursive:true,mode:0o700});
 const app=await createRelay({directory,secret,enabled:()=>process.env.RELAY_SEND_ENABLED==='true'});
 app.server.listen(Number(process.env.PORT||8080),'0.0.0.0');
 let importing=false,verifyAttempts=0;
 const load=async()=>{if(importing)return;importing=true;try{
  const state=path.join(directory,'signal/data/accounts.json'),archive=path.join(directory,'signal-device-migration.tar.gz');
  if(!existsSync(state)&&existsSync(archive)){
   const result=await run('python3',['/app/migration_bundle.py','restore','--archive',archive,'--sha256',process.env.STATE_ARCHIVE_SHA256||'','--destination',path.join(directory,'signal')]);if(result.code!==0)return;
  }
  if(existsSync(state)&&verifyAttempts++<3&&await app.verify()){if(existsSync(archive))unlinkSync(archive);clearInterval(timer);}
  if(verifyAttempts>=3)clearInterval(timer);
 }finally{importing=false;}};
 const timer=setInterval(()=>void load().catch(()=>{}),5000);await load();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error(JSON.stringify({event:'relay_start_failed'}));process.exitCode=1;});
