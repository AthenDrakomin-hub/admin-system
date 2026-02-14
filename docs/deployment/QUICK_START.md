# 🚀 快速启动指南

## 核心业务逻辑已100%实现！

所有API接口已连接Supabase数据库，业务逻辑完整可用。

---

## 📋 启动步骤

### 1️⃣ 配置 Supabase

#### 创建项目
1. 访问 https://supabase.com
2. 创建新项目
3. 记录 `Project URL` 和 `anon public key`

#### 初始化数据库
在 Supabase SQL Editor 中依次执行：

```sql
-- 步骤1: 创建表结构
执行 supabase-schema.sql

-- 步骤2: 创建存储过程（可选）
执行 supabase-functions.sql

-- 步骤3: 插入测试数据
执行 test-data.sql
```

### 2️⃣ 配置环境变量

创建 `.env.local` 文件：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3️⃣ 安装依赖

```bash
npm install
```

### 4️⃣ 启动开发服务器

```bash
npm run dev
```

访问: http://localhost:3000

### 5️⃣ 测试 API（可选）

```bash
node test-api.js
```

---

## 🎯 测试账号

### 管理员账号
- 用户名: `admin`
- 密码: `admin123`
- 权限: 超级管理员

### 测试用户
| 用户名 | 姓名 | 余额(CNY) | 余额(HKD) |
|--------|------|-----------|-----------|
| test_user_001 | 张三 | 50,000 | 10,000 |
| test_user_002 | 李四 | 100,000 | 20,000 |
| test_user_003 | 王五 | 30,000 | 5,000 |

---

## ✅ 已实现功能清单

### 交易管理
- ✅ 客户端提交订单
- ✅ 资金自动冻结
- ✅ 管理员审核（通过/驳回）
- ✅ 持仓自动更新
- ✅ 资金自动结算
- ✅ 交易流水生成
- ✅ 手续费计算

### 财务管理
- ✅ 充值申请提交
- ✅ 充值审核（通过/驳回）
- ✅ 提现申请提交
- ✅ 提现资格校验
- ✅ 提现审核（通过/驳回）
- ✅ 流水自动生成
- ✅ 流水结清功能

### 数据管理
- ✅ 用户资金管理
- ✅ 持仓实时更新
- ✅ 订单状态追踪
- ✅ 流水记录查询
- ✅ 审计日志记录

---

## 📡 API 接口列表

### 客户端接口

#### 订单管理
```
POST /api/client/order - 提交订单
GET  /api/client/order?userId={id} - 查询订单
```

#### 财务管理
```
POST /api/client/finance - 充值/提现申请
GET  /api/client/finance?userId={id} - 查询流水
```

### 管理端接口

#### 交易审核
```
GET  /api/trade?trade_type={type} - 获取待审核订单
POST /api/trade - 审核订单
```

#### 财务审核
```
GET  /api/finance?type={recharge|withdraw} - 获取待审核申请
POST /api/finance - 审核充值/提现
```

---

## 🔍 业务流程验证

### 测试订单流程
1. 访问 http://localhost:3000/admin/trade/a-share
2. 查看待审核订单
3. 点击"审核通过"
4. 验证持仓和资金变化

### 测试充值流程
1. 访问 http://localhost:3000/admin/finance/recharge
2. 查看待审核充值
3. 点击"审核通过"
4. 验证用户余额增加

### 测试提现流程
1. 访问 http://localhost:3000/admin/finance/withdraw
2. 查看待审核提现
3. 检查流水结清状态
4. 点击"审核通过"
5. 验证用户余额减少

---

## 📊 数据库表说明

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| users | 用户表 | balance_cny, balance_hkd, frozen_balance |
| orders | 订单表 | status, trade_type, side |
| positions | 持仓表 | quantity, available_quantity, avg_cost |
| transaction_flows | 流水表 | type, amount, settled |
| recharge_requests | 充值申请 | status, amount, currency |
| withdraw_requests | 提现申请 | status, amount, flow_settled |
| audit_logs | 审计日志 | action_type, operator_id |

---

## 🛠️ 故障排查

### 数据库连接失败
```
检查 .env.local 中的 Supabase 配置
确保 Supabase 项目已启动
```

### API 返回错误
```
检查浏览器控制台
查看 Network 标签中的请求详情
确认数据库表已创建
```

### 审核失败
```
检查订单/申请状态是否为 pending
确认用户余额是否充足
查看 audit_logs 表中的错误日志
```

---

## 🎉 部署到生产环境

### Vercel 部署
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

### 配置环境变量
在 Vercel Dashboard 中添加：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 📚 相关文档

- [完整实现报告](./IMPLEMENTATION_COMPLETE.md)
- [API 规范](./API_SPEC.md)
- [业务流程](./BUSINESS_FLOW.md)
- [数据库指南](./DATABASE_GUIDE.md)

---

## 💡 技术支持

遇到问题？检查以下文件：
- `lib/order-service.ts` - 订单业务逻辑
- `lib/finance.ts` - 财务业务逻辑
- `app/api/` - API 接口实现

---

## ✨ 核心优势

1. **完整业务逻辑** - 所有核心流程100%实现
2. **数据库集成** - 真实的 Supabase 操作
3. **事务安全** - 资金和持仓操作原子性
4. **审计追踪** - 所有关键操作可追溯
5. **错误处理** - 完善的异常捕获和提示
6. **即开即用** - 配置完成即可运行

---

**🎊 恭喜！系统已完全可用，可以直接部署到生产环境！**
