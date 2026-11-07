import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
const base = process.env.GARDEN_REVIEW_URL || 'http://127.0.0.1:5173';
const artifactRoot = path.resolve('data/garden-3d-review');
fs.mkdirSync(artifactRoot, {recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:process.env.PW_CHANNEL || 'msedge',headless:process.env.PW_HEADLESS === 'true'});const results=[];
 try{
 for(const site of ['com','net'])for(const lang of ['zh','en'])for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<600,isMobile:width<600,deviceScaleFactor:width<600?2:1});
  const page=await context.newPage();const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  if(site==='com')await page.route('**/'+lang+'/home-services',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('<html ','<html data-site="com" ')});});
  await page.goto(base+'/'+lang+'/home-services',{waitUntil:'domcontentloaded'});
  await page.locator('#hs-garden').scrollIntoViewIfNeeded();
  assert.equal(await page.getByRole('button',{name:lang==='zh'?'3D 空间预览':'3D space preview',exact:true}).getAttribute('aria-pressed'),'true');
  await page.waitForFunction(()=>document.querySelector('.garden-model-views button')?.disabled===false,null,{timeout:60000});
  await page.getByRole('button',{name:lang==='zh'?'设计图':'Design images',exact:true}).click();
  assert.equal(await page.locator('.garden-model-canvas canvas').count(),0);
  await page.getByRole('button',{name:lang==='zh'?'3D 空间预览':'3D space preview',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.garden-model-views button')?.disabled===false,null,{timeout:60000});
  assert.equal(await page.locator('.garden-model-canvas canvas').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const initialCanvas=await page.locator('.garden-model-canvas canvas').elementHandle();
  const hashes=[];
  for(let i=0;i<9;i++){
   await page.locator('.hs-garden-thumbs button').nth(i).click();
   await page.waitForFunction(i=>document.querySelector('.garden-model-canvas canvas')?.dataset.design===String(i),i);
   assert.equal(await initialCanvas.evaluate(c=>c===document.querySelector('.garden-model-canvas canvas')),true);
   await page.locator('.garden-model-views button').nth(0).click();
   if(width===1440&&site==='net'&&lang==='zh')hashes.push(crypto.createHash('sha256').update(await page.locator('.garden-model-stage').screenshot()).digest('hex'));
  }
  if(hashes.length)assert.equal(new Set(hashes).size,8);
  await page.locator('.hs-garden-thumbs button').first().click();
  const capture=async()=>crypto.createHash('sha256').update(await page.locator('.garden-model-stage').screenshot()).digest('hex');
  const start=await capture();await page.locator('.garden-model-views button').nth(1).click();assert.notEqual(await capture(),start);
  await page.locator('.garden-model-views button').nth(2).click();const close=await capture();assert.notEqual(close,start);
  await page.getByRole('button',{name:lang==='zh'?'放大模型':'Zoom in',exact:true}).click();assert.notEqual(await capture(),close);
  await page.getByRole('button',{name:lang==='zh'?'复位视角':'Reset viewpoint',exact:true}).click();assert.equal(await capture(),close);
  await page.locator('.garden-model-views button').first().click();
  await page.getByRole('button',{name:lang==='zh'?'向左旋转':'Rotate left',exact:true}).click();assert.notEqual(await capture(),start);
  const canvas=page.locator('.garden-model-canvas canvas');
  if(width<600){assert.equal(await canvas.evaluate(c=>c.style.touchAction),'pan-y');await page.locator('.garden-model-drag').click();}
  const box=await canvas.boundingBox();const beforeDrag=await capture();
  if(width>=600){await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.72,box.y+box.height*.55,{steps:8});await page.mouse.up();}
  else{
   const cdp=await context.newCDPSession(page);
   const x=box.x+box.width*.4,y=box.y+box.height*.5;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+80,y:y+20,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await cdp.detach();
  }
  assert.notEqual(await capture(),beforeDrag);
  if(width<600){await page.locator('.garden-model-drag').click();assert.equal(await canvas.evaluate(c=>c.style.touchAction),'pan-y');}
  await page.locator('.garden-model-views button').first().click();
  await page.evaluate(()=>document.activeElement?.blur());
  if(lang==='zh'&&[390,1440].includes(width))await page.locator('#hs-garden').screenshot({path:artifactRoot+'/garden3d-'+site+'-'+width+'.png'});
  await page.getByRole('button',{name:lang==='zh'?'设计图':'Design images',exact:true}).click();assert.equal(await page.locator('.garden-model-canvas canvas').count(),0);
  await page.locator('.hs-garden-image').click();assert.equal(await page.locator('.hs-garden-dialog').evaluate(el=>el.open),true);await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);results.push({site,lang,width,designs:9,distinctLayouts:8,mouseOrTouch:'pass',zoomReset:'pass',photoFallback:'pass',overflow:false});
  await context.close();
 }
 fs.writeFileSync(path.join(artifactRoot,'checks.json'),JSON.stringify(results,null,2));console.log(`${results.length} garden 3D scenarios passed; artifacts: ${artifactRoot}`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
