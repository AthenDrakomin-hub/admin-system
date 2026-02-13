import { kv } from '@vercel/kv';

export const cache = {
  get: async (key: string) => await kv.get(key),
  set: async (key: string, value: any, ex?: number) => await kv.set(key, value, { ex }),
  del: async (key: string) => await kv.del(key),
};
