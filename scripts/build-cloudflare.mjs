import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,renameSync,copyFileSync,cpSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {callbackOnlyComBundle} from './com-contact-callback.mjs';
import {ownerListingsComBundle} from './com-owner-listings.mjs';
import {saleListingComBundle} from './com-sale-listing.mjs';
import {homeServicesComBundle} from './com-home-services.mjs';
import {leadSalutationComBundle} from './com-lead-salutation.mjs';
import {leadEmailComBundle} from './com-lead-email.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const site=process.argv[2];
if(!['com','net'].includes(site))throw Error('Usage: node scripts/build-cloudflare.mjs com|net');
function run(entry,args){
 const result=spawnSync(process.execPath,[path.join(root,entry),...args],{cwd:root,stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
run('node_modules/typescript/bin/tsc',['--noEmit']);
const output=path.join(root,site==='com'?'dist':'dist-net');
run('node_modules/vite/bin/vite.js',['build','--outDir',output]);

if(site==='com'){
 // The current React bundle supplies the console and standalone customer forms.
 renameSync(path.join(output,'index.html'),path.join(output,'admin-shell.html'));
 writeFileSync(path.join(output,'admin-shell.html'),readFileSync(path.join(output,'admin-shell.html'),'utf8').replace('<html lang="zh-CN">','<html lang="zh-CN" data-site="com">'));
 const baseline=path.join(root,'site/com');
 const manifest=JSON.parse(readFileSync(path.join(baseline,'manifest.json'),'utf8'));
 for(const [file,expected] of Object.entries(manifest.files)){
  const content=readFileSync(path.join(baseline,file));
  const actual=createHash('sha256').update(content).digest('hex');
  if(actual!==expected)throw Error('Original com baseline changed without updating its manifest: '+file);
  const destination=path.join(output,file);
  if(file!=='index.html'&&existsSync(destination)&&!readFileSync(destination).equals(content))throw Error('Asset filename collision: '+file);
 }
 cpSync(path.join(baseline,'assets'),path.join(output,'assets'),{recursive:true});
 // Keep the audited baseline intact; the shipped copy removes automatic external hand-offs.
 const originalContactBundle=path.join(output,'assets/index-Db9ODUdG.js');
 const callbackBundle=leadEmailComBundle(leadSalutationComBundle(homeServicesComBundle(saleListingComBundle(ownerListingsComBundle(callbackOnlyComBundle(readFileSync(originalContactBundle,'utf8')))))));
 const callbackFilename='index-com-callback-'+createHash('sha256').update(callbackBundle).digest('hex').slice(0,12)+'.js';
 writeFileSync(path.join(output,'assets',callbackFilename),callbackBundle);
 copyFileSync(path.join(baseline,'index.html'),path.join(output,'index.html'));
 const originalHtml=readFileSync(path.join(output,'index.html'),'utf8');
 if(originalHtml.split('/assets/index-Db9ODUdG.js').length!==2)throw Error('Original com entry changed; review callback entry');
 writeFileSync(path.join(output,'index.html'),originalHtml.replace('/assets/index-Db9ODUdG.js','/assets/'+callbackFilename).replace('/eucove-contact-email.js','/eucove-contact-email.js?v=advisory-tiles-20261104'));
 copyFileSync(path.join(root,'scripts/com-contact-email.js'),path.join(output,'eucove-contact-email.js'));
 // Shared additions (seven navigation items, four contact methods) also style the frozen pages.
 const shippedHtml=readFileSync(path.join(output,'index.html'),'utf8');
 if(shippedHtml.split('</head>').length!==2)throw Error('Original com entry changed; review shared stylesheet');
 writeFileSync(path.join(output,'index.html'),shippedHtml.replace('</head>','<link rel="stylesheet" href="/eucove-additions.css?v=20261102b"></head>'));
 copyFileSync(path.join(root,'src/site-additions.css'),path.join(output,'eucove-additions.css'));
}
const config=site==='com'?'wrangler.jsonc':'wrangler.net.jsonc';
run('node_modules/wrangler/bin/wrangler.js',['deploy','--dry-run','--config',config,'--outdir',path.join(root,'.worker-build',site),'--env-file',path.join(root,'.dev.vars.example')]);
console.log('Cloudflare '+site+' build and packaging verified; no deployment performed.');
