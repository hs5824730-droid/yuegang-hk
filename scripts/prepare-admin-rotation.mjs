// Local preparation only. Never connects to a database or cloud. Input is not echoed or logged.
import {randomBytes,pbkdf2Sync} from 'node:crypto';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
const output=path.resolve(process.argv[2]||'data/deployment-private/admin-rotation-2026-10-26/prepared.json');
const privateRoot=path.resolve('data/deployment-private');
if(!output.startsWith(privateRoot+path.sep)||existsSync(output))throw Error('Use a new file inside data/deployment-private');
if(!process.stdin.isTTY)throw Error('A private terminal is required; no password in arguments or environment');
process.stdout.write('Enter pending website password (hidden; no cloud changes): ');
process.stdin.setRawMode(true);process.stdin.resume();let secret='';
process.stdin.on('data',chunk=>{
 for(const char of chunk.toString('utf8')){
  if(char==='\u0003'){process.stdin.setRawMode(false);process.exit(1)}
  if(char==='\r'||char==='\n'){
   process.stdin.setRawMode(false);process.stdin.pause();
   if(secret.length<12||secret.length>128)throw Error('Password must contain 12–128 characters');
   const salt=randomBytes(16),digest=pbkdf2Sync(secret,salt,100000,32,'sha256');secret='';
   const passwordHash=['pbkdf2-sha256','100000',salt.toString('hex'),digest.toString('hex')].join('$');
   mkdirSync(path.dirname(output),{recursive:true});
   writeFileSync(output,JSON.stringify({loginName:'jiangyuan',passwordHash,preparedAt:new Date().toISOString(),targetUserId:null,status:'pending-explicit-deployment'},null,2),{mode:0o600,flag:'wx'});
   process.stdout.write('\nPending hash prepared locally. No credentials activated.\n');process.exit(0);
  }
  if(char==='\u007f'||char==='\b')secret=secret.slice(0,-1);else secret+=char;
 }
});
