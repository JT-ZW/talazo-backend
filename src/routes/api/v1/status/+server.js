import { json } from '@sveltejs/kit';
import { deviceId, deviceKey, mongoEnabled, mongoDatabase } from '$lib/server/mongo';

export async function GET() {
  let connected = false;
  if (mongoEnabled) {
    try {
      await mongoDatabase().command({ ping: 1 });
      connected = true;
    } catch {
      // Report the failed connection without exposing connection details.
    }
  }
  return json({
    mode: mongoEnabled ? 'local-bench' : 'sample',
    database_connected: connected,
    ingestion_enabled: connected && Boolean(deviceId && deviceKey),
    authentication_enabled: false
  });
}
