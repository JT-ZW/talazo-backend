import { createHash, timingSafeEqual } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { deviceId, deviceKey, mongoEnabled, readings } from '#lib/server/mongo.js';

const hash = (/** @type {string} */ value) => createHash('sha256').update(value).digest();

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  if (!mongoEnabled || !deviceId || !deviceKey) {
    return json({ error: 'Local ingestion is disabled' }, { status: 503 });
  }
  if (!timingSafeEqual(hash(request.headers.get('authorization') || ''), hash('Bearer ' + deviceKey))) {
    return json({ error: 'Invalid device credential' }, { status: 401 });
  }
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return json({ error: 'Expected application/json' }, { status: 415 });
  }
  let payload;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Missing payload' }, { status: 400 });
    const decoder = new TextDecoder();
    let body = '';
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4096) {
        void reader.cancel().catch(() => {});
        return json({ error: 'Payload exceeds 4096 bytes' }, { status: 413 });
      }
      body += decoder.decode(value, { stream: true });
    }
    payload = JSON.parse(body + decoder.decode());
  } catch {
    return json({ error: 'Malformed JSON' }, { status: 400 });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return json({ error: 'Expected a reading object' }, { status: 400 });
  }
  if (payload.deviceId !== deviceId) {
    return json({ error: 'Credential is not assigned to this device' }, { status: 403 });
  }
  const { moisture, temperature = null, ec = null } = payload;
  if (!Number.isFinite(moisture) || moisture < 0 || moisture > 100 ||
    (temperature !== null && (!Number.isFinite(temperature) || temperature < -55 || temperature > 125)) ||
    (ec !== null && (!Number.isFinite(ec) || ec < 0))) {
    return json({ error: 'Invalid moisture, temperature or EC value' }, { status: 400 });
  }
  try {
    const result = await readings().insertOne({
      deviceId, moisture, temperature, ec, receivedAt: new Date(),
      source: 'local-bench'
    });
    return json({ id: result.insertedId.toHexString() }, { status: 201 });
  } catch {
    return json({ error: 'Could not store reading' }, { status: 503 });
  }
}
