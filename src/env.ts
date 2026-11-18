import {defineEnvVars} from '@sveltejs/kit/env';
// Explicitly whitelist the browser-safe variables; secrets remain server-only.
const optional=(value:string|undefined)=>value||'';
export const variables=defineEnvVars({
 CRON_SECRET:{schema:optional},
 FARMONAUT_API_KEY:{schema:optional},
 FARMONAUT_TEST_MODE:{schema:optional},
 INVITATION_FROM:{schema:optional},
 MONGODB_DATABASE:{schema:optional},
 MONGODB_URI:{schema:optional},
 ORIGIN:{schema:optional},
 PUBLIC_GOOGLE_MAPS_API_KEY:{schema:optional,public:true},
 PUBLIC_SUPABASE_ANON_KEY:{schema:optional,public:true},
 PUBLIC_SUPABASE_PUBLISHABLE_KEY:{schema:optional,public:true},
 PUBLIC_SUPABASE_URL:{schema:optional,public:true},
 RESEND_API_KEY:{schema:optional},
 SATELLITE_JOB_SECRET:{schema:optional},
 SUPABASE_SECRET_KEY:{schema:optional},
 SUPABASE_SERVICE_ROLE_KEY:{schema:optional},
 SUPABASE_URL:{schema:optional},
 TALAZO_DEVICE_ID:{schema:optional},
 TALAZO_DEVICE_KEY:{schema:optional},
 TALAZO_INTERNAL_TOOLS:{schema:optional},
});
