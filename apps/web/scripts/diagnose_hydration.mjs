import { chromium } from '@playwright/test';
const gpu=process.argv.includes('--gpu');
const routes=process.argv.slice(2).filter(argument=>argument!=='--gpu');
const base=process.env.GRIDSEC_URL||'http://127.0.0.1:3001';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:gpu?['--use-gl=angle','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']:['--disable-webgl','--disable-webgl2','--no-sandbox']});
const page=await browser.newPage();
let errors=0;
page.on('pageerror',e=>{errors++;console.log('PAGEERROR',e.message,e.stack)});
page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log(m.type(),m.text())});
page.on('response',response=>{if(response.status()===404)console.log('MISSING',response.url())});
try{
 for(const route of routes.length?routes:['/simulation']){
  await page.goto(base+route);await page.waitForTimeout(gpu?6000:1500);
  console.log('ROUTE',route,'CANVASES',await page.locator('canvas').count(),'ERRORS',errors);
 }
}finally{await browser.close()}
process.exitCode=errors?1:0;
