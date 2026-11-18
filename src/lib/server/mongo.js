import { MongoClient } from 'mongodb';
import * as env from '$app/env/private';
import { dev } from '$app/env';

const mongoUri = env.MONGODB_URI || '';
export const mongoEnabled = dev && Boolean(mongoUri);
export const deviceId = env.TALAZO_DEVICE_ID;
export const deviceKey = env.TALAZO_DEVICE_KEY;

const client = mongoEnabled
  ? new MongoClient(mongoUri, { serverSelectionTimeoutMS: 2500, maxPoolSize: 5 })
  : null;

export function mongoDatabase() {
  if (!client) throw new Error('MongoDB bench mode is disabled');
  return client.db(env.MONGODB_DATABASE || 'talazo_local');
}

export function readings() {
  return mongoDatabase().collection('soil_readings');
}
