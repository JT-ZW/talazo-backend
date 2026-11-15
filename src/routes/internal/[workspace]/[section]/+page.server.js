import { deviceId, mongoEnabled, readings } from '$lib/server/mongo';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, getClientAddress }) {
  if (params.workspace !== 'farmer' || params.section !== 'monitoring' || !mongoEnabled ||
      !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(getClientAddress())) {
    return { bench: null };
  }
  try {
    const recent = await readings().find({ deviceId, source: 'local-bench' })
      .sort({ receivedAt: -1, _id: -1 }).limit(20).toArray();
    return { bench: { connected: true, rows: recent.map(row => ({
      id: row._id.toHexString(), deviceId: String(row.deviceId),
      moisture: Number(row.moisture), temperature: row.temperature ?? null,
      ec: row.ec ?? null, receivedAt: row.receivedAt.toISOString()
    })) } };
  } catch {
    return { bench: { connected: false, rows: [] } };
  }
}
