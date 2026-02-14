// lib/kv.ts - Vercel KV缓存工具函数
import { kv } from '@vercel/kv';

// 缓存键前缀（避免和其他项目冲突）
const CACHE_PREFIX = 'zy_stock_';

/**
 * 设置缓存
 * @param key 股票代码（如600519、00700.HK）
 * @param data 行情数据
 * @param ttl 过期时间（秒），默认300秒（5分钟）
 */
export async function setStockCache(
  key: string,
  data: any,
  ttl: number = 300
) {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  try {
    await kv.set(cacheKey, data, { ex: ttl });
    return true;
  } catch (error: unknown) {
    // 类型收窄，安全访问error属性
    if (error instanceof Error) {
      console.error(`设置${key}缓存失败:`, error.message);
    } else {
      console.error(`设置${key}缓存失败:`, String(error));
    }
    return false;
  }
}

/**
 * 获取缓存
 * @param key 股票代码
 */
export async function getStockCache(key: string) {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  try {
    const data = await kv.get(cacheKey);
    return data;
  } catch (error: unknown) {
    // 类型收窄，安全访问error属性
    if (error instanceof Error) {
      console.error(`获取${key}缓存失败:`, error.message);
    } else {
      console.error(`获取${key}缓存失败:`, String(error));
    }
    return null;
  }
}

/**
 * 删除缓存（比如行情刷新后手动删除）
 * @param key 股票代码
 */
export async function deleteStockCache(key: string) {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  try {
    await kv.del(cacheKey);
    return true;
  } catch (error: unknown) {
    // 类型收窄，安全访问error属性
    if (error instanceof Error) {
      console.error(`删除${key}缓存失败:`, error.message);
    } else {
      console.error(`删除${key}缓存失败:`, String(error));
    }
    return false;
  }
}

/**
 * 批量删除缓存（比如刷新所有核心股后）
 * @param keys 股票代码数组
 */
export async function batchDeleteStockCache(keys: string[]) {
  const cacheKeys = keys.map(key => `${CACHE_PREFIX}${key}`);
  try {
    await kv.del(...cacheKeys);
    return true;
  } catch (error: unknown) {
    // 类型收窄，安全访问error属性
    if (error instanceof Error) {
      console.error('批量删除缓存失败:', error.message);
    } else {
      console.error('批量删除缓存失败:', String(error));
    }
    return false;
  }
}
