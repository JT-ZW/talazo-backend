import { MongoClient } from 'mongodb';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

export const mongoEnabled = dev && Boolean(env.MONGODB_URI);
export const deviceId = env.TALAZO_DEVICE_ID;
export const deviceKey = env.TALAZO_DEVICE_KEY;

const client = mongoEnabled
  ? new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 2500, maxPoolSize: 5 })
  : null;

export function mongoDatabase() {
  if (!client) throw new Error('MongoDB bench mode is disabled');
  return client.db(env.MONGODB_DATABASE || 'talazo_local');
}

export function readings() {
  return mongoDatabase().collection('soil_readings');
}
