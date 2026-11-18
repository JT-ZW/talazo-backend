// Isolated browser-only captures. Never uses the real administrator session.
// Requires local app + .env and installed Google Chrome. No mail or paid field writes.
import {chromium,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
const base=new URL(process.env.ORIGIN||'http://127.0.0.1:5174').origin;
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Browser QA is local-only.');
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});
const service=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
let id,browser;const errors=[];const checked=[];
await fs.mkdir('test-results/browser',{recursive:true});
try{
 await db.connect();const email=`talazo-browser-${randomUUID()}@example.invalid`,password=randomUUID()+'Aa9!';
 const created=await service.auth.admin.createUser({email,password,email_confirm:true});if(created.error)throw Error('Disposable browser identity failed');id=created.data.user.id;
 const approver=(await db.query('select user_id from platform_admins limit 1')).rows[0].user_id;
 await db.query("insert into talazo_accounts(user_id,email,name,approved_by) values($1,$2,'Browser review',$3)",[id,email,approver]);
 await db.query('insert into platform_admins(user_id) values($1)',[id]);
 browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
 page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/login');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Show password',exact:true}).click();await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('type','text');
 await page.getByRole('button',{name:'Hide password',exact:true}).click();await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('type','password');
 await page.getByRole('button',{name:/Sign in to Talazo/}).click();await page.waitForURL('**/admin/overview');

 await page.goto(base+'/portal/weather');await expect(page.locator('.forecast-day').first()).toBeVisible();await expect(page.getByRole('button',{name:'Daily',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Daily',exact:true}).click();await expect(page.getByText('This Farmonaut response supplies daily forecasts only.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Monthly',exact:true}).click();await expect(page.locator('.calendar-icon')).toHaveCount(7);await page.getByRole('button',{name:'Next month',exact:true}).click();await expect(page.locator('.calendar-icon')).toHaveCount(0);await page.getByRole('button',{name:'Forecast month',exact:true}).click();
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:'test-results/browser/weather-calendar-'+width+'.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/portal/satellite');await expect(page.locator('[aria-label="Geographic crop monitoring"]')).toBeVisible();await expect(page.getByRole('button',{name:'Fit field',exact:true})).toBeEnabled({timeout:45000});await expect.poll(()=>page.locator('.geo-map .gm-style img').evaluateAll(images=>images.filter(el=>el.complete&&el.naturalWidth>0).length),{timeout:30000}).toBeGreaterThan(2);await page.screenshot({path:'test-results/browser/map-primary-desktop.png',fullPage:true});await page.getByRole('button',{name:'Original satellite image',exact:true}).click();await expect(page.locator('.image-stage img')).toBeVisible({timeout:90000});await expect.poll(()=>page.locator('.image-stage img').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);await page.getByRole('button',{name:'Google Maps',exact:true}).click();await page.setViewportSize({width:390,height:1000});await page.screenshot({path:'test-results/browser/map-primary-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect(errors).toEqual([]);console.log(JSON.stringify({passed:true,dailyMissingState:true,monthlyActualDates:7,monthlyNavigation:true,mapPrimary:true,imageFallback:true,responsive:true,errors}));
}catch(e){console.error('Browser QA failed:',e.message);process.exitCode=1;}finally{
 await browser?.close();if(id){await db.query('delete from platform_admins where user_id=$1',[id]);await db.query('delete from talazo_accounts where user_id=$1',[id]);if((await service.auth.admin.deleteUser(id)).error)throw Error('Browser identity cleanup failed');}await db.end();
}
