import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const PORT=4193, BASE=`http://127.0.0.1:${PORT}`;
const server=spawn('python',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:process.cwd(),stdio:'ignore'});
for(let i=0;i<40;i++){try{const r=await fetch(`${BASE}/GENERATEUR_PARTIES_BRILLANTES.html`);if(r.ok)break;}catch(e){}await new Promise(r=>setTimeout(r,250));}
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
page.on('console',m=>console.log('CONSOLE:',m.type(),m.text().slice(0,300)));
page.on('pageerror',e=>console.log('PAGEERROR:',e.message.slice(0,300)));
await page.route('**/training_games/tactical-training-puzzles.json',route=>route.fulfill({status:503,body:'nope'}));
await page.goto(`${BASE}/GENERATEUR_PARTIES_BRILLANTES.html`);
await page.waitForTimeout(3000);
console.log('error hidden =',await page.getAttribute('#custom-bank-error','hidden'));
console.log('status text =',await page.locator('#custom-problem-status').textContent());
await browser.close();server.kill();
