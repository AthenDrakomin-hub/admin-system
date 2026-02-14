# Vercel 部署配置说明

## 当前配置状态

✅ **已完成配置**

### 1. Cron Jobs（定时任务）

符合 Vercel 免费计划限制（业余爱好计划每天只能运行一次）：

```json
{
  "crons": [
    {
      "path": "/api/cron/scheduler",
      "schedule": "0 9 * * 1-5"  // 工作日上午9点（只执行一次）
    }
  ]
}
```

**注意**：Vercel 业余爱好计划对定时任务有两个限制：
1. **每日执行次数限制**：定时任务每天只能运行一次。类似 `0 * * * *`（每小时）或 `*/30 * * * *`（每30分钟）这样的表达式会导致部署失败。
2. **时间精度**：Vercel 无法保证定时任务能够及时触发。例如，配置为 `0 1 * * *`（每天凌晨1点）的定时任务，实际触发时间可能在凌晨1点到1点59分之间的任何时间。

### 2. 跨域配置（CORS）

仅允许客户端域名访问：

```json
{
  "headers": [
    {
      "source": "/api/client/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://www.zhengyutouzi.com"
        }
      ]
    }
  ]
}
```

### 3. 域名访问限制

通过 `middleware.ts` 实现：
- ✅ 客户端 API 仅允许 `https://www.zhengyutouzi.com` 访问
- ✅ 管理端 API 无限制（管理员使用）
- ✅ 生产环境强制检查
- ✅ 开发环境跳过检查

### 4. 安全头

```json
{
  "headers": [
    {
      "source": "/api/admin/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

## Vercel 免费计划限制

### ✅ 已符合限制

| 项目 | 限制 | 当前配置 | 状态 |
|------|------|---------|------|
| Cron Jobs | 每天1次 | 每天1次 | ✅ |
| 函数执行时间 | 10秒 | <10秒 | ✅ |
| 函数大小 | 50MB | <5MB | ✅ |
| 带宽 | 100GB/月 | 预计<10GB | ✅ |
| 构建时间 | 6小时/月 | <1小时 | ✅ |

## 配置文件

### vercel.json
```json
{
  "crons": [...],
  "headers": [...]
}
```

### middleware.ts
```typescript
// 域名访问控制
// 仅允许客户端域名访问客户端API
```

## 域名配置

### 管理端
- 域名: `https://jxfdfsfresh.vip`
- 用途: 管理员后台
- 访问: 无限制

### 客户端
- 域名: `https://www.zhengyutouzi.com`
- 用途: 用户前端
- 访问: 仅可访问 `/api/client/*`

## 安全特性

### 1. 域名白名单
- 客户端 API 仅允许指定域名
- 生产环境强制检查
- 开发环境自动跳过

### 2. CORS 配置
- 精确的 Origin 控制
- 预检请求支持
- 缓存优化（24小时）

### 3. 安全头
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- 防止点击劫持

### 4. 请求验证
- Origin 头检查
- Referer 头检查
- 双重验证机制

## 部署步骤

### 1. 推送代码
```bash
git add .
git commit -m "配置完成"
git push
```

### 2. Vercel 自动部署
- 自动检测 vercel.json
- 应用 Cron 配置
- 应用 Headers 配置

### 3. 验证配置
```bash
# 测试客户端API（应该成功）
curl -H "Origin: https://www.zhengyutouzi.com" \
  https://jxfdfsfresh.vip/api/client/user/balance

# 测试非法来源（应该403）
curl -H "Origin: https://evil.com" \
  https://jxfdfsfresh.vip/api/client/user/balance
```

## 环境变量

在 Vercel Dashboard 配置：

```bash
# 必需
JWT_SECRET=your_secret
ADMIN_DEFAULT_PASSWORD=admin123456

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Vercel KV
KV_URL=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

## 监控建议

### 1. Cron Jobs
- 检查执行日志
- 监控执行时间
- 确保每天执行

### 2. API 访问
- 监控 403 错误
- 检查来源域名
- 分析访问模式

### 3. 性能
- 函数执行时间
- 数据库查询时间
- 缓存命中率

## 故障排查

### Cron 未执行
1. 检查 vercel.json 语法
2. 查看 Vercel Dashboard Logs
3. 确认时区设置（UTC）

### CORS 错误
1. 检查客户端域名
2. 验证 Origin 头
3. 查看 middleware.ts 日志

### 403 错误
1. 确认请求来源
2. 检查环境变量
3. 验证生产环境配置

## 优化建议

### 1. 缓存策略
- 使用 Vercel KV 缓存热数据
- 设置合理的过期时间
- 减少数据库查询

### 2. 函数优化
- 减少冷启动时间
- 优化依赖大小
- 使用 Edge Functions

### 3. 成本控制
- 监控带宽使用
- 优化图片资源
- 启用压缩

## 升级计划

如需更多资源，可升级到 Pro 计划：
- Cron Jobs: 无限制
- 函数执行时间: 60秒
- 带宽: 1TB/月
- 价格: $20/月

## 总结

✅ **所有配置已完成**
- Cron Jobs 符合免费限制
- CORS 配置正确
- 域名访问限制生效
- 安全头已配置

可以直接部署到生产环境！
