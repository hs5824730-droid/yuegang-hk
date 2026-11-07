// Upload only hashed, processed images from the explicit approved publication manifest.
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='data/viewing-publication/2026-10-23';
const assets=JSON.parse(readFileSync(base+'/upload-allowlist.json','utf8'));
const receipt=base+'/r2-upload-receipts.json';
const done=existsSync(receipt)?JSON.parse(readFileSync(receipt,'utf8')):[];
const known=new Set(done.filter(item=>item.ok).map(item=>item.key));let next=0,failed=0;
const command=args=>new Promise(resolve=>{const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);child.once('error',()=>resolve({ok:false,output:'spawn failed'}));child.once('close',code=>resolve({ok:code===0,output}));});
async function worker(){while(next<assets.length){const asset=assets[next++];if(known.has(asset.key))continue;
 if(!/^viewing-public\/2026-10-23\/[a-f0-9]{64}\.webp$/.test(asset.key)||createHash('sha256').update(readFileSync(asset.file)).digest('hex')!==asset.sha256)throw new Error('Publication image integrity check failed');
 const result=await command(['r2','object','put','eucove-media/'+asset.key,'--file',asset.file,'--content-type','image/webp','--remote','--env-file','.dev.vars.example']);
 if(result.ok){known.add(asset.key);done.push({key:asset.key,sha256:asset.sha256,bytes:asset.bytes,ok:true,uploadedAt:new Date().toISOString()});writeFileSync(receipt,JSON.stringify(done,null,2)+'\n');if(known.size%16===0||known.size===assets.length)console.log(`Uploaded publication images ${known.size}/${assets.length}`);}
 else{failed++;console.error('Upload failed for approved image '+asset.sha256+'; '+result.output.replace(/https?:\/\/\S+/g,'[URL omitted]').slice(-600));}
}}
await Promise.all(Array.from({length:4},()=>worker()));
console.log(JSON.stringify({required:assets.length,uploaded:known.size,failed}));if(known.size!==assets.length)process.exitCode=1;
