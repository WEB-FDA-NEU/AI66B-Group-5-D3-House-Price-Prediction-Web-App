import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({channel:'chrome',headless:true});
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page = await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await mkdir('docs/model-upgrade',{recursive:true});
const results=[];
for(const file of ['index.html','about-model.html','premium.html','predict.html','data-sources.html','explore.html']) {
  await page.goto('http://127.0.0.1:8000/'+file); await page.waitForTimeout(1100); if (['about-model.html','premium.html'].includes(file)) await page.locator('.model-card').first().waitFor();
  results.push({file,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),h1:await page.locator('h1').textContent()});
  await page.screenshot({path:'docs/model-upgrade/'+file.replace('.html','')+'-desktop.png',fullPage:true});
}
await page.goto('http://127.0.0.1:8000/predict.html');
await page.locator('#model_id option').nth(2).waitFor({state:'attached'});
await page.selectOption('#district','Bình Thạnh');await page.selectOption('#property_type','Nhà phố');
await page.locator('button[type=submit]').click(); await page.waitForURL('**/predict-result.html');
await page.locator('#result').waitFor({state:'visible'});
results.push({guestPrediction:await page.locator('#estimated-price').textContent()});
await page.screenshot({path:'docs/model-upgrade/result-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});
for(const file of ['index.html','about-model.html','premium.html','predict.html','data-sources.html','predict-result.html','explore.html']){
  await page.goto('http://127.0.0.1:8000/'+file);await page.waitForTimeout(700); if (['about-model.html','premium.html'].includes(file)) await page.locator('.model-card').first().waitFor();
  results.push({file,mobileOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  await page.screenshot({path:'docs/model-upgrade/'+file.replace('.html','')+'-mobile.png',fullPage:true});
}
await writeFile('docs/model-upgrade/browser-smoke.json',JSON.stringify({results,errors},null,2));
console.log(JSON.stringify({results,errors},null,2));await browser.close();
if(errors.length||results.some(r=>r.overflow||r.mobileOverflow))process.exitCode=1;
