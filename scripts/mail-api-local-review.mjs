// Only the isolated fixture at 127.0.0.1:3093; never production or real credentials.
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:3093';
async function call(path,method='GET',body,cookie=''){
 const r=await fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})});
 return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
}
const login=await call('/api/admin/login','POST',{email:'chengyu@eucove.com',password:'LocalMailReview2026!'});assert.equal(login.status,200);
const list=await call('/api/admin/mail','GET',undefined,login.cookie);assert.equal(list.body.threads.length,1);assert.equal(list.body.threads[0].recipient,'江承裕');assert.equal(list.body.sendEnabled,false);
for(const path of ['/api/admin/leads','/api/admin/users','/api/admin/stats','/api/admin/reception'])assert.equal((await call(path,'GET',undefined,login.cookie)).status,403);
assert.equal((await call('/api/admin/mail/preview%3A2','GET',undefined,login.cookie)).status,404);
await call('/api/admin/mail/preview%3A1/draft','PUT',{content:'本机验收草稿：请提供房屋地址。'},login.cookie);
assert.equal((await call('/api/admin/mail/preview%3A1','GET',undefined,login.cookie)).body.draft,'本机验收草稿：请提供房屋地址。');
assert.equal((await call('/api/admin/mail/preview%3A1/reply','POST',{requestId:crypto.randomUUID(),version:1,content:'禁止真实发送测试'},login.cookie)).status,409);
assert.equal((await call('/api/admin/logout','POST',{},login.cookie)).status,200);
console.log('本机 HTTP 验收通过：员工仅能访问自己的邮件、草稿可恢复、发送关闭、正常退出。');
