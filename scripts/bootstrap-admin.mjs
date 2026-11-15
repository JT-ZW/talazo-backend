import pg from 'pg';
import {createClient} from '@supabase/supabase-js';
import fs from 'node:fs/promises';
const email=process.argv[2];
if(!email||!email.includes('@'))throw new Error('Pass the explicitly authorized administrator email.');
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,connectionTimeoutMillis:15000});
try{
 await db.connect();
 const existing=await db.query('select id from auth.users where lower(email)=lower($1)',[email]);
 const type=existing.rows.length?'magiclink':'invite';
 const generated=await client.auth.admin.generateLink({type,email});
 if(generated.error||!generated.data.properties?.hashed_token)throw new Error('Activation link generation failed');
 const id=generated.data.user.id;
 await db.query('begin');
 await db.query("insert into public.profiles(id,display_name) values($1,'Talazo administrator') on conflict(id) do nothing",[id]);
 await db.query('insert into public.platform_admins(user_id) values($1) on conflict do nothing',[id]);
 await db.query('commit');
 const origin=new URL(process.env.ORIGIN||'http://127.0.0.1:5174').origin;
 await fs.writeFile('.admin-access-link.txt',`${origin}/auth/confirm?token_hash=${encodeURIComponent(generated.data.properties.hashed_token)}&type=${type}\n`,{mode:0o600});
 console.log('Administrator prepared. Private single-use activation URL saved to .admin-access-link.txt (ignored by source control).');
}catch(e){await db.query('rollback').catch(()=>{});console.error('Administrator setup failed:',e.code||'identity or database error');process.exitCode=1;}finally{await db.end();}
