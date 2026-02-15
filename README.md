# ZY Investment Admin System

## 项目简介
中国银河证券 - 证裕投资交易单元 Admin 管理系统

基于 Next.js 14 的现代化证券交易管理后台，支持多类型交易审核、用户管理、财务审核等功能。

## ✅ 实现状态

**核心业务逻辑已 100% 实现！**

- ✅ 订单全流程（提交→审核→成交→流水）
- ✅ 充值全流程（申请→审核→到账→流水）
- ✅ 提现全流程（申请→校验→审核→扣款→流水）
- ✅ 资金管理（冻结/解冻/增减）
- ✅ 持仓管理（买入/卖出）
- ✅ 流水管理（生成/查询/结清）
- ✅ 审计日志（所有关键操作）

**查看详细实现报告**: [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)

## 域名
- 管理系统: https://jxfdfsfresh.vip
- 客户端 Web: https://www.zhengyutouzi.com/

## 技术栈
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (主色银河蓝 #0052D9)
- Supabase (数据库)
- Vercel KV (缓存)
- lucide-react (图标)

## 设计风格
2026 现代化金融后台 - 极简高效、数据清晰、一键操作、响应式布局

## 权限体系
- **系统管理员**: 全部功能 + 管理员账号管理
- **普通管理员**: 全部业务功能（不可管理管理员）

## 目录结构
详见项目根目录结构说明

## 快速开始

**⚡ 5分钟快速启动**: [QUICK_START.md](./QUICK_START.md)

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（Supabase）
cp .env.example .env.local
# 编辑 .env.local 填入 Supabase 配置

# 3. 初始化数据库
# 在 Supabase SQL Editor 中执行:
# - supabase-schema.sql (建表)
# - test-data.sql (测试数据)

# 4. 启动开发服务器
npm run dev

# 5. 测试 API（可选）
node test-api.js
```

访问: http://localhost:3000

## 部署
```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 功能模块

### 核心业务（100%完成）
- ✅ **交易审核**：A股/港股/IPO/大宗/打板 - 完整流程
  - 订单提交、资金冻结、审核通过/驳回、持仓更新、资金结算、流水生成
- ✅ **用户管理**：列表/资金/持仓/订单/流水 - 完整CRUD
- ✅ **财务审核**：充值/提现 - 完整流程
  - 申请提交、余额校验、审核通过/驳回、资金变动、流水生成
- ✅ **系统配置**：参数/管理员/审计 - 完整功能
- ✅ **行情管理**：实时行情拉取 - 缓存机制

### 技术特性
- 🔒 **事务安全**：所有资金操作保证原子性
- 📝 **审计追踪**：所有关键操作自动记录
- 🚀 **即开即用**：配置完成即可运行
- 💾 **真实数据库**：Supabase完整集成
- ⚡ **高性能**：索引优化、查询优化

## 文档
- ⚡ [**快速启动**](./QUICK_START.md) - 5分钟快速上手
- ✅ [**实现报告**](./IMPLEMENTATION_COMPLETE.md) - 核心业务100%完成
- 📚 [**文档索引**](./DOCS_INDEX.md) - 所有文档导航
- 📊 [**前后对比**](./BEFORE_AFTER.md) - 实现前后对比
- ✨ [**实现亮点**](./HIGHLIGHTS.md) - 技术亮点总结
- 📁 [**文件变更**](./FILE_CHANGES.md) - 变更清单
- 🛡️ [**异常兜底**](./FALLBACK_FLOW.md) - 异常兜底流程
- 🚀 [**Vercel优化**](./VERCEL_OPTIMIZATION.md) - 免费部署优化
- 🔒 [**RLS权限**](./RLS_GUIDE.md) - 权限配置指南
- 📡 [API规范](./API_SPEC.md)
- 📊 [业务流程](./BUSINESS_FLOW.md)
- 📦 [数据库指南](./DATABASE_GUIDE.md)
- 🚀 [部署指南](./DEPLOYMENT.md)
- ✅ [部署清单](./DEPLOYMENT_CHECKLIST.md)
- 📝 [项目信息](./PROJECT_INFO.md)

## 📡 API 接口文档

### 基础信息
- **基础URL**: `http://localhost:3000` (开发环境)
- **生产环境**: `https://jxfdfsfresh.vip` (管理端), `https://www.zhengyutouzi.com/` (客户端)
- **认证方式**: Bearer Token

### 🔐 客户端API (用户端)

#### 认证相关
- **用户登录**: `POST /api/client/auth`
- **用户注册**: `POST /api/client/auth?action=register`
- **刷新Token**: `POST /api/client/auth?action=refresh`

#### 账户管理
- **获取账户信息**: `GET /api/client/account`
- **更新账户信息**: `PUT /api/client/account`
- **修改密码**: `POST /api/client/account?action=change_password`

#### 财务管理
- **获取资金信息**: `GET /api/client/finance`
- **充值申请**: `POST /api/client/finance?action=recharge`
- **提现申请**: `POST /api/client/finance?action=withdraw`
- **交易流水**: `GET /api/client/finance?action=flows`

#### 市场数据
- **股票行情**: `GET /api/client/market?symbol=600000`
- **股票搜索**: `GET /api/client/market/search?keyword=浦发银行`
- **市场异常**: `GET /api/client/market/anomalies`
- **股票列表**: `GET /api/client/market/stocks?market=a_share`

#### 交易相关
- **A股交易**: `POST /api/client/trade/a-share`
- **港股交易**: `POST /api/client/trade/hk-share`
- **大宗交易**: `POST /api/client/trade/block`
- **IPO申购**: `POST /api/client/trade/ipo`
- **一键打板**: `POST /api/client/trade/board`
- **条件单**: `POST /api/client/order/conditional`

#### 订单管理
- **订单列表**: `GET /api/client/order?type=all`
- **取消订单**: `POST /api/client/order?action=cancel`

#### 用户信息
- **用户信息**: `GET /api/client/user`
- **持仓信息**: `GET /api/client/user?action=positions`
- **站内信**: `GET /api/client/user/messages`
- **标记已读**: `POST /api/client/user/messages?action=mark_read`

### 🛠️ 管理端API

#### 统一管理API
- **审核中心**: `GET /api/admin/management?module=audit`
- **邀请码管理**: `GET /api/admin/management?module=invite`
- **用户管理**: `GET /api/admin/management?module=user`
- **站内信管理**: `GET /api/admin/management?module=message`
- **执行操作**: `POST /api/admin/management`

#### 交易审核API
- **获取交易列表**: `GET /api/admin/trade?type=a_share&status=pending`
- **审核交易**: `POST /api/admin/trade`

#### 权限检查
- **交易权限检查**: `checkTradePermission(permissions, tradeType)` (前端函数)
- **操作权限验证**: `validateAdminAction(permissions, action, resource)` (前端函数)

### 📋 调用示例

#### 客户端示例
```javascript
// 用户登录
const loginRes = await fetch('/api/client/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'test', password: '123456' })
});

// A股下单
const orderRes = await fetch('/api/client/trade/a-share', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    symbol: '600000',
    side: 'buy',
    quantity: 100,
    price: 10.50,
    order_type: 'limit'
  })
});
```

#### 管理端示例
```javascript
// 获取待审核用户
const auditRes = await fetch('/api/admin/management?module=audit&status=pending', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});

// 审核用户
const approveRes = await fetch('/api/admin/management', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'approve',
    module: 'audit',
    targetId: 'user_id',
    adminId: 'admin_id',
    adminName: '管理员姓名'
  })
});
```

### 🚀 快速测试

#### cURL 示例
```bash
# 客户端登录
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}' \
  http://localhost:3000/api/client/auth

# 管理端获取待审核用户
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "http://localhost:3000/api/admin/management?module=audit&status=pending"
```

### 📁 页面路由

#### 客户端页面
- **交易页面**: `/trade/a-share`, `/trade/hk-share`, `/trade/block`, `/trade/ipo`, `/trade/board`, `/trade/conditional`
- **账户页面**: `/account`, `/account/finance`, `/account/positions`, `/account/orders`, `/account/flows`
- **市场页面**: `/market`, `/market/search`, `/market/anomalies`
- **用户页面**: `/user/profile`, `/user/messages`, `/user/security`

#### 管理端页面
- **用户管理**: `/admin/user/list`, `/admin/user/detail/[id]`, `/admin/user/funds`, `/admin/user/positions`
- **交易审核**: `/admin/trade/a-share`, `/admin/trade/hk-share`, `/admin/trade/block`, `/admin/trade/ipo`, `/admin/trade/board`, `/admin/trade/conditional`, `/admin/trade/abnormal`
- **审核中心**: `/admin/user/status` (待审核用户列表)

### ⚠️ 注意事项
1. 所有API（除登录、注册外）都需要Bearer Token认证
2. 客户端和管理端使用不同的Token体系
3. 参数格式需符合API规范
4. 响应格式统一为 `{success, data, error, message}`

### 🔗 详细文档
- [API规范文档](./docs/design/API_SPEC.md)
- [业务流程文档](./docs/design/BUSINESS_FLOW.md)
- [数据库指南](./docs/design/DATABASE_GUIDE.md)

## License
MIT
