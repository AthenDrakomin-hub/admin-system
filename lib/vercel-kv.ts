let kv: any;

try {
  kv = require('@vercel/kv').kv;
} catch {
  kv = null;
}

export const cache = {
  get: async (key: string) => kv ? await kv.get(key) : null,
  set: async (key: string, value: any, ex?: number) => kv ? await kv.set(key, value, { ex }) : null,
  del: async (key: string) => kv ? await kv.del(key) : null,
};
