import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env as privateEnv } from '$env/dynamic/private';
import { env } from '$env/dynamic/public';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const path = event.route.id ?? '';
  // Enhanced form requests can ask for JSON, so enforce Origin independently
  // of content negotiation. Worker endpoints use their own secret checks.
  const accountAction = ['/login','/activate','/auth/confirm'].includes(event.url.pathname)
    || /^\/(portal|admin)\//.test(event.url.pathname);
  if (accountAction && !['GET','HEAD','OPTIONS'].includes(event.request.method)
    && event.request.headers.get('origin') !== event.url.origin) error(403, 'Same-origin request required.');
  const internal = path === '/internal' || path.startsWith('/internal/');
  if (internal || path === '/api/v1/status') {
    const local = dev && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(event.getClientAddress());
    if (!local || (internal && privateEnv.TALAZO_INTERNAL_TOOLS !== 'true')) error(404, 'Page not found');
  }
  const response = await resolve(event);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
