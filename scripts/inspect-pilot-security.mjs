import pg from 'pg';
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,connectionTimeoutMillis:15000});
try{
 await db.connect();
 const extensions=await db.query("select extname,n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace where extname='postgis'");
 const policies=await db.query("select tablename,policyname,cmd,qual,with_check from pg_policies where schemaname='public' and (tablename like 'talazo_%' or tablename in ('platform_admins','profiles'))");
 const grants=await db.query("select table_name,grantee,string_agg(privilege_type,', ' order by privilege_type) privileges from information_schema.role_table_grants where table_schema='public' and (table_name like 'talazo_%' or table_name='platform_admins') and grantee in ('anon','authenticated') group by 1,2 order by 1,2");
 const tables=await db.query("select c.relname,c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and (c.relname like 'talazo_%' or c.relname='platform_admins')");
 console.log(JSON.stringify({connected:true,extensions:extensions.rows,tables:tables.rows,grants:grants.rows,policies:policies.rows},null,2));
}catch(e){console.log(JSON.stringify({connected:false,code:e.code||'connection_failed'}));process.exitCode=1;}finally{await db.end();}
