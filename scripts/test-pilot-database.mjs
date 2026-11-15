// Run only against a disposable, locally initialized PostgreSQL instance.
import pg from 'pg';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const config={host:'127.0.0.1',port:55439,user:'talazo_test',database:'postgres'};
const db=new pg.Client(config);await db.connect();
const ids={admin:'00000000-0000-0000-0000-000000000001',a:'00000000-0000-0000-0000-000000000002',b:'00000000-0000-0000-0000-000000000003'};
try{
 await db.query(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema extensions;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;
 grant execute on function auth.uid() to authenticated;
 create table public.platform_admins(user_id uuid primary key references auth.users(id));
 set check_function_bodies=off;`);
 await db.query(await fs.readFile('supabase/pilot/002_satellite.sql','utf8'));
 await db.query('insert into auth.users values($1,$2),($3,$4),($5,$6)',[ids.admin,'admin@test.invalid',ids.a,'a@test.invalid',ids.b,'b@test.invalid']);
 await db.query('insert into platform_admins values($1)',[ids.admin]);
 await db.query('select set_config($1,$2,false)',['request.jwt.claim.sub',ids.admin]);
 for(const [id,email] of [[ids.a,'a@test.invalid'],[ids.b,'b@test.invalid']])await db.query('select talazo_approve($1,$2,$3)',[id,email,email]);
 await db.query("select talazo_set_quota('2026-11-01',100000)");
 const attempts=await Promise.all([ids.a,ids.b].map(async id=>{
  const c=new pg.Client(config);await c.connect();
  try{await c.query('select set_config($1,$2,false)',['request.jwt.claim.sub',ids.admin]);await c.query("select talazo_allocate('2026-11-01',$1,70000)",[id]);return true;}catch{return false;}finally{await c.end();}
 }));
 assert.equal(attempts.filter(Boolean).length,1,'Only one concurrent 7ha allocation can fit a 10ha quota');
 const allocation=await db.query('select sum(sqm)::integer as total from talazo_allocations');assert.equal(allocation.rows[0].total,70000);
 await assert.rejects(db.query("select talazo_set_quota('2026-11-01',60000)"));
 await db.query('select set_config($1,$2,false)',['request.jwt.claim.sub',ids.a]);
 await assert.rejects(db.query("select talazo_allocate('2026-11-01',$1,100000)",[ids.a]));
 const farm=await db.query("select talazo_add_farm($1,'Farmer A farm','Goromonzi') as id",[ids.a]);
 await db.query('set role authenticated');
 const own=await db.query('select * from talazo_farms');assert.equal(own.rows.length,1);
 await db.query('select set_config($1,$2,false)',['request.jwt.claim.sub',ids.b]);
 assert.equal((await db.query('select * from talazo_farms')).rows.length,0,'Farmer B cannot read farmer A');
 await assert.rejects(db.query("insert into talazo_periods values('2026-12-01',999999,now())"));
 await db.query('reset role');
 await db.query('select set_config($1,$2,false)',['request.jwt.claim.sub',ids.admin]);
 await db.query("select talazo_account_status($1,'suspended')",[ids.a]);
 await db.query('set role authenticated');
 await db.query('select set_config($1,$2,false)',['request.jwt.claim.sub',ids.a]);
 assert.equal((await db.query('select * from talazo_farms')).rows.length,0,'Suspension applies to a still-valid identity');
 await assert.rejects(db.query("select talazo_add_farm($1,'Forbidden','')",[ids.a]));
 console.log('PASS: migration structure, concurrent quota allocation, quota reduction, admin checks, ownership isolation, direct-write denial and suspension.');
 console.log('Spatial function execution NOT tested: local PostgreSQL has no PostGIS. Function bodies deferred locally; hosted PostGIS checks remain required.');
}finally{await db.end();}
