# 数据源接入指南

## 当前状态

❌ **数据源未接入** - 项目可以运行但无法持久化数据

## 方案选择

### 方案1：Supabase（推荐）✅

**优势：**
- 免费额度充足
- PostgreSQL 数据库
- 自动生成 REST API
- 实时订阅功能
- 内置认证系统

**步骤：**

1. **注册 Supabase**
   - 访问：https://supabase.com
   - 创建新项目

2. **创建数据库表**
   ```sql
   -- 用户表
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     username TEXT UNIQUE NOT NULL,
     real_name TEXT,
     phone TEXT,
     id_card TEXT,
     status TEXT DEFAULT 'active',
     balance_cny DECIMAL(15,2) DEFAULT 0,
     balance_hkd DECIMAL(15,2) DEFAULT 0,
     frozen_balance_cny DECIMAL(15,2) DEFAULT 0,
     frozen_balance_hkd DECIMAL(15,2) DEFAULT 0,
     trade_days INTEGER DEFAULT 0,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- 订单表
   CREATE TABLE orders (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES users(id),
     trade_type TEXT NOT NULL,
     symbol TEXT NOT NULL,
     symbol_name TEXT,
     side TEXT NOT NULL,
     price DECIMAL(10,4),
     quantity INTEGER,
     status TEXT DEFAULT 'pending',
     trade_data JSONB,
     approved_by TEXT,
     approved_at TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- 流水表
   CREATE TABLE transaction_flows (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES users(id),
     type TEXT NOT NULL,
     amount DECIMAL(15,2),
     balance_after DECIMAL(15,2),
     order_id UUID,
     description TEXT,
     settled BOOLEAN DEFAULT false,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- 充值表
   CREATE TABLE recharge_requests (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES users(id),
     amount DECIMAL(15,2),
     currency TEXT DEFAULT 'CNY',
     payment_method TEXT,
     status TEXT DEFAULT 'pending',
     reviewer_id TEXT,
     review_time TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- 提现表
   CREATE TABLE withdraw_requests (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES users(id),
     amount DECIMAL(15,2),
     currency TEXT DEFAULT 'CNY',
     bank_name TEXT,
     bank_account TEXT,
     account_holder TEXT,
     status TEXT DEFAULT 'pending',
     flow_settled BOOLEAN DEFAULT false,
     unsettled_amount DECIMAL(15,2) DEFAULT 0,
     reviewer_id TEXT,
     review_time TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- 审计日志表
   CREATE TABLE audit_logs (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     action TEXT NOT NULL,
     action_type TEXT NOT NULL,
     operator_id TEXT NOT NULL,
     operator_name TEXT NOT NULL,
     target_type TEXT NOT NULL,
     target_id TEXT NOT NULL,
     before_data JSONB,
     after_data JSONB,
     reason TEXT,
     ip_address TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- 全局配置表
   CREATE TABLE global_config (
     config_key TEXT PRIMARY KEY,
     config_value JSONB NOT NULL,
     config_type TEXT,
     updated_at TIMESTAMP DEFAULT NOW()
   );

   -- 管理员表
   CREATE TABLE admins (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     username TEXT UNIQUE NOT NULL,
     password_hash TEXT NOT NULL,
     role TEXT DEFAULT 'admin',
     created_at TIMESTAMP DEFAULT NOW(),
     last_login TIMESTAMP
   );
   ```

3. **配置环境变量**
   ```bash
   # 在 Vercel 或 .env.local 中配置
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **启用代码**
   - 取消 `.env.local` 中 Supabase 配置的注释
   - 重启开发服务器

---

### 方案2：Vercel KV（缓存）

**用途：**
- 行情数据缓存
- 会话管理
- 临时数据存储

**步骤：**

1. **在 Vercel 项目中启用 KV**
   - 进入项目设置
   - Storage → Create Database → KV
   - 自动生成环境变量

2. **配置环境变量**
   ```bash
   KV_URL=your_kv_url
   KV_REST_API_URL=your_kv_rest_api_url
   KV_REST_API_TOKEN=your_kv_rest_api_token
   KV_REST_API_READ_ONLY_TOKEN=your_kv_rest_api_read_only_token
   ```

---

### 方案3：Mock 数据（开发测试）

如果暂时不想接入真实数据库，可以使用 Mock 数据：

**创建 Mock 数据服务：**

```typescript
// lib/mock-data.ts
export const mockUsers = [
  {
    id: '1',
    username: 'test_user',
    real_name: '测试用户',
    balance_cny: 100000,
    balance_hkd: 10000,
    status: 'active',
  },
];

export const mockOrders = [];
export const mockFlows = [];
```

---

## 快速接入步骤

### 最快方案（5分钟）

1. **注册 Supabase**
   ```
   https://supabase.com → Sign Up → New Project
   ```

2. **执行 SQL**
   - 复制上面的 SQL 脚本
   - 在 Supabase SQL Editor 中执行

3. **复制环境变量**
   - Project Settings → API
   - 复制 URL 和 anon key

4. **配置 Vercel**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   ```

5. **重新部署**
   ```bash
   git push
   ```

---

## 验证接入

### 测试连接

```typescript
// 在任意 API 路由中测试
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (!supabase) {
    return Response.json({ error: 'Database not configured' });
  }
  
  const { data, error } = await supabase.from('users').select('count');
  
  return Response.json({ connected: !error, data });
}
```

---

## 注意事项

1. **安全性**
   - 不要将真实环境变量提交到 Git
   - 使用 Supabase Row Level Security (RLS)
   - 定期更换密钥

2. **性能**
   - 使用 Vercel KV 缓存热数据
   - 数据库查询添加索引
   - 分页查询大数据量

3. **备份**
   - Supabase 自动备份
   - 定期导出重要数据
   - 测试恢复流程

---

## 当前项目状态

✅ 代码已支持数据源接入  
✅ 所有接口已预留  
✅ 可选初始化不会报错  
❌ 需要配置环境变量才能使用  

**下一步：选择方案并配置环境变量**
