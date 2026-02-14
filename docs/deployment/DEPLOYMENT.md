# Vercel 部署指南

## 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

### 必需的环境变量

```bash
# JWT Secret（必需）
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Admin Default Password（必需）
ADMIN_DEFAULT_PASSWORD=admin123456
NEXT_PUBLIC_ADMIN_DEFAULT_PASSWORD=admin123456
```

### 可选的环境变量（暂时不需要）

```bash
# Supabase（数据库功能需要时配置）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Vercel KV（缓存功能需要时配置）
KV_URL=your_kv_url
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_rest_api_read_only_token
```

## 部署步骤

1. 在 Vercel Dashboard 中找到项目 `admin-system`
2. 进入 Settings → Environment Variables
3. 添加上述必需的环境变量
4. 重新部署项目

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建测试
npm run build
```

## 默认登录信息

- 用户名: `admin`
- 密码: `admin123`（或环境变量中配置的密码）
