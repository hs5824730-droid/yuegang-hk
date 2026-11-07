// Explicitly run once for the authorized internal check. Always sends to the same public mailbox.
// No customer recipients, business database, scheduled worker, Telegram or Signal are used.
import {readFile,writeFile} from 'node:fs/promises';
import {ZohoMail,MailProviderError} from '../server/zoho-mail.js';
const file='data/deployment-private/zoho-mail-oauth-20261026.json';
const settings=JSON.parse(await readFile(file,'utf8'));
const test=settings.internalDeliveryTest;
if(!test?.receivedMessageId||test.to!=='contact@eucove.com'||test.from!=='contact@eucove.com')throw Error('Verified self-addressed test message required');
if(test.replyAttemptedAt)throw Error('Reply already attempted; inspect receipt instead of sending again');
const provider=new ZohoMail({ZOHO_ACCOUNT_ID:settings.accountId,ZOHO_CLIENT_ID:settings.clientId,ZOHO_CLIENT_SECRET:settings.clientSecret,ZOHO_REFRESH_TOKEN:settings.tokens.refresh_token});
await provider.verifyIdentity();
test.replyAttemptedAt=new Date().toISOString();test.replyStatus='sending';
await writeFile(file,JSON.stringify(settings,null,2));
try{
 const sent=await provider.reply(test.receivedMessageId,'contact@eucove.com','Re: '+test.subject,'Internal reply verification. Sent only to the EUCOVE contact mailbox using the same provider code as the team console.\n\ncontact\nEUCOVE');
 test.replyStatus=sent?.messageId?'accepted':'uncertain';test.replyMessageId=sent?.messageId||null;
 console.log(JSON.stringify({replyStatus:test.replyStatus,messageId:test.replyMessageId,recipient:'contact@eucove.com'}));
}catch(error){test.replyStatus=error instanceof MailProviderError&&error.definitive?'rejected':'uncertain';test.replyError=error instanceof MailProviderError?error.code:'network';console.log(JSON.stringify({replyStatus:test.replyStatus,error:test.replyError}));}
await writeFile(file,JSON.stringify(settings,null,2));
