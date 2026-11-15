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
 for(const section of ['overview','users','quota','requests','operations','crops']){await page.goto(base+'/admin/'+section);await expect(page.locator('main h1')).toBeVisible();checked.push('admin/'+section);}
 await page.screenshot({path:'test-results/browser/admin-desktop.png',fullPage:true});
 for(const section of ['overview','satellite','health','pests','weeds','nutrients','irrigation','yield','soil','weather','analysis','account']){
  await page.goto(base+'/portal/'+section);await expect(page.locator('main h1')).toBeVisible();checked.push('portal/'+section);
  if(section==='overview'){
   const img=page.locator('.image-stage img').first();await expect(img).toBeVisible({timeout:90000});await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
   await page.screenshot({path:'test-results/browser/dashboard-desktop.png',fullPage:true});
   const plus=page.getByRole('button',{name:'Zoom in',exact:true});await plus.click();await expect(page.locator('.field-raster').first()).toHaveAttribute('style',/1.25/);await page.getByRole('button',{name:'Fit field',exact:true}).click();
  }
 }
 await page.goto(base+'/portal/farms');
 await expect(page.getByRole('button',{name:'Street',exact:true})).toBeEnabled({timeout:45000});
 await page.getByRole('button',{name:'Open calendar: Actual planting date',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Actual planting date'})).toBeVisible();
 await page.screenshot({path:'test-results/browser/calendar-desktop.png'});
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Actual planting date'})).toHaveCount(0);
 await page.getByRole('button',{name:'Open calendar: Actual planting date',exact:true}).click();await page.getByRole('button',{name:'Today',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Actual planting date',exact:true})).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
 await page.locator('.boundary-map').scrollIntoViewIfNeeded();
 await page.waitForTimeout(2500);
 for(const mode of ['Street','Terrain','Hybrid','Satellite']){await page.getByRole('button',{name:mode,exact:true}).click();await expect(page.getByRole('button',{name:mode,exact:true})).toHaveAttribute('aria-pressed','true');}
 await page.getByText('Enter boundary corner coordinates',{exact:true}).click();
 await page.getByLabel('One latitude, longitude pair per line').fill('-17.8000, 31.0500\n-17.8010, 31.0500\n-17.8010, 31.0510\n-17.8000, 31.0510');
 await page.getByRole('button',{name:'Use these coordinates',exact:true}).click();await expect(page.locator('.map-area')).toContainText('ha selected');
 await expect(page.getByRole('button',{name:'Add more corners',exact:true})).toBeEnabled();
 await page.screenshot({path:'test-results/browser/field-map-desktop.png'});
 await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(page.locator('.map-area')).toContainText('Mark your field');
 await page.locator('.boundary-map').scrollIntoViewIfNeeded();
 const box=await page.locator('.boundary-map').boundingBox();if(!box)throw Error('Map bounds unavailable');
 console.log('Map viewport:',JSON.stringify(box));
 for(const [x,y] of [[.35,.4],[.6,.4],[.6,.7],[.35,.7]]){await page.mouse.click(box.x+box.width*x,box.y+box.height*y);await page.waitForTimeout(700);}
 console.log('Map drawing status:',await page.locator('.map-tools p').textContent());
 await page.screenshot({path:'test-results/browser/map-drawing.png'});
 await expect(page.getByRole('button',{name:'Finish boundary',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Finish boundary',exact:true}).click();
 await expect(page.getByRole('button',{name:'Add more corners',exact:true})).toBeEnabled();
 checked.push('map modes, coordinate import, area preview, map drawing/finish; nothing saved');
 for(const [label,width,height] of [['tablet',1024,1000],['mobile',390,844]]){
  await page.setViewportSize({width,height});await page.goto(base+'/portal/overview');await expect(page.locator('.image-stage img').first()).toBeVisible({timeout:90000});
  const overflow=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));expect(overflow.content).toBeLessThanOrEqual(overflow.viewport+1);
  await page.screenshot({path:`test-results/browser/dashboard-${label}.png`,fullPage:true});
  if(label==='mobile'){
   await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Close navigation',exact:true}).click();
   await expect(page.locator('.p-sidebar')).toBeHidden();
   await page.getByRole('button',{name:'Menu',exact:true}).click();await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
   await page.getByRole('link',{name:'Pests & diseases',exact:true}).first().click();await page.waitForURL('**/portal/pests');
   await expect(page.locator('.image-stage img').first()).toBeVisible({timeout:90000});
   await expect.poll(()=>page.locator('.image-stage img').first().evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
   await page.screenshot({path:'test-results/browser/pests-mobile.png',fullPage:true});
  }
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/portal/account');await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL('**/login');
 expect(errors).toEqual([]);console.log(JSON.stringify({passed:true,pages:checked,pageErrors:errors.length,captures:'test-results/browser',disposableIdentity:true}));
}catch(e){console.error('Browser QA failed:',e.message);process.exitCode=1;}finally{
 await browser?.close();if(id){await db.query('delete from platform_admins where user_id=$1',[id]);await db.query('delete from talazo_accounts where user_id=$1',[id]);if((await service.auth.admin.deleteUser(id)).error)throw Error('Browser identity cleanup failed');}await db.end();
}
