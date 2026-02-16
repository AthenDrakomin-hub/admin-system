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
- **用户登录**: `POST /api/client/auth` - 使用用户名密码登录，返回JWT令牌
  - **请求参数**:
    ```json
    {
      "username": "string, 必填, 用户名",
      "password": "string, 必填, 密码"
    }
    ```
  - **响应成功**:
    ```json
    {
      "success": true,
      "data": {
        "token": "JWT令牌，有效期7天",
        "user": {
          "id": "用户ID",
          "username": "用户名"
        }
      }
    }
    ```
  - **错误响应**:
    - `400`: 缺少用户名或密码
    - `401`: 用户名或密码错误
    - `403`: 账户已被冻结
    - `500`: 服务器内部错误

- **获取用户信息**: `GET /api/client/auth` - 验证令牌并返回完整用户信息
  - **请求头**: `Authorization: Bearer <JWT令牌>`
  - **响应成功**:
    ```json
    {
      "success": true,
      "data": {
        "user": {
          "id": "用户ID",
          "username": "用户名",
          "phone": "手机号",
          "real_name": "真实姓名",
          "id_card": "身份证号",
          "status": "账户状态 (active/frozen/pending)",
          "created_at": "注册时间",
          "balance_cny": "人民币余额",
          "balance_hkd": "港币余额",
          "frozen_balance_cny": "冻结人民币",
          "frozen_balance_hkd": "冻结港币",
          "total_deposit": "累计充值",
          "total_withdraw": "累计提现",
          "trade_days": "交易天数"
        }
      }
    }
    ```
  - **错误响应**:
    - `401`: 未授权或令牌无效
    - `404`: 用户不存在
    - `500`: 服务器内部错误

#### 用户注册
- **客户端用户注册**: `POST /api/client/register` - 使用邀请码提交注册申请
  ```javascript
  // 请求示例
  {
    "invite_code": "ABC123DEF",      // 必填：邀请码
    "username": "new_user",          // 必填：用户名
    "password": "secure_password123", // 必填：密码
    "real_name": "张三",             // 必填：真实姓名
    "phone": "13800138000",          // 必填：手机号
    "email": "user@example.com",     // 可选：邮箱
    "id_card": "身份证号"            // 可选：身份证
  }
  
  // 响应示例（成功）
  {
    "success": true,
    "message": "注册申请已提交，请等待管理员审核",
    "data": {
      "user_id": "生成的用户ID",
      "username": "new_user",
      "real_name": "张三",
      "phone": "13800138000",
      "status": "pending",
      "organization_id": "机构ID",
      "created_at": "2024-01-01T00:00:00.000Z",
      "next_step": "等待管理员审核，审核通过后会收到站内信通知"
    }
  }
  ```

- **检查用户名可用性**: `GET /api/client/register?username=test_user` - 检查用户名是否可用

#### 用户审核流程
用户注册后的完整审核流程：

1. **注册提交**：客户端通过`POST /api/client/register`提交注册申请
2. **状态设置**：新用户状态自动设置为`pending`（待审核）
3. **管理员审核**：
   - 获取待审核用户：`GET /api/admin/audits?type=user&status=pending`
   - 审核通过：`POST /api/admin/audits` (action: 'approve')
   - 审核驳回：`POST /api/admin/audits` (action: 'reject')
4. **账号激活**：审核通过后，用户状态从`pending`变为`active`
5. **站内信通知**：审核通过/驳回时自动发送系统消息通知用户
6. **登录权限**：只有`active`状态的用户才能登录客户端

#### 邀请码系统（控制注册权限）
- **获取邀请码列表**: `GET /api/admin/invites` - 查看所有邀请码
- **生成邀请码**: `POST /api/admin/invites` - 批量生成邀请码
- **管理邀请码**: `POST /api/admin/invites` - 启用/禁用/延长有效期

#### 账户管理
- **获取账户综合信息**: `GET /api/client/account` - 返回用户信息、余额、持仓、流水等综合数据
  - **请求头**: `Authorization: Bearer <JWT令牌>`
  - **响应成功**:
    ```json
    {
      "success": true,
      "data": {
        "user": { "id", "username", "phone", "real_name", "id_card", "status", "created_at", "trade_days" },
        "balances": {
          "cny": { "available": "可用余额", "frozen": "冻结金额", "total": "总额" },
          "hkd": { "available": "可用余额", "frozen": "冻结金额", "total": "总额" },
          "total_deposit": "累计充值",
          "total_withdraw": "累计提现"
        },
        "positions": {
          "count": "持仓数量",
          "total_market_value": "总市值",
          "total_cost": "总成本",
          "total_profit_loss": "总盈亏",
          "total_profit_loss_rate": "总盈亏率",
          "items": ["持仓列表"]
        },
        "recent_activity": {
          "pending_orders": "待审核订单数",
          "recent_flows": ["最近流水"]
        },
        "summary": {
          "total_assets_cny": "人民币总资产",
          "total_assets_hkd": "港币总资产",
          "total_frozen_cny": "冻结人民币",
          "total_frozen_hkd": "冻结港币",
          "net_asset_value": "净资产值",
          "last_updated": "最后更新时间"
        }
      }
    }
    ```

- **获取持仓详情**: `POST /api/client/account` - 获取指定或全部持仓信息
  - **请求头**: `Authorization: Bearer <JWT令牌>`
  - **请求参数**:
    ```json
    {
      "symbol": "string, 可选, 股票代码 (如: 000001)"
    }
    ```
  - **响应成功**:
    ```json
    {
      "success": true,
      "data": {
        "positions": [
          {
            "id": "持仓ID",
            "symbol": "股票代码",
            "symbol_name": "股票名称",
            "quantity": "持仓数量",
            "available_quantity": "可用数量",
            "avg_cost": "平均成本",
            "market_value": "市值",
            "profit_loss": "盈亏",
            "profit_loss_rate": "盈亏率",
            "updated_at": "更新时间"
          }
        ]
      }
    }
    ```

#### 财务管理
- **充值/提现申请**: `POST /api/client/finance` - 提交充值或提现申请
  - **请求头**: `Authorization: Bearer <JWT令牌>`
  - **请求参数**:
    ```json
    {
      "userId": "string, 必填, 用户ID",
      "type": "string, 必填, 操作类型 (recharge/withdraw)",
      "amount": "number, 必填, 金额",
      "currency": "string, 可选, 货币类型 (CNY/HKD, 默认CNY)",
      "paymentMethod": "string, 可选, 支付方式",
      "bankInfo": {
        "bankName": "string, 提现必填, 银行名称",
        "bankAccount": "string, 提现必填, 银行账号",
        "accountHolder": "string, 提现必填, 账户持有人"
      }
    }
    ```
  - **响应成功**:
    ```json
    {
      "success": true,
      "data": {
        "requestId": "申请ID",
        "status": "pending",
        "unsettledAmount": "未结清金额（仅提现时返回）"
      }
    }
    ```
  - **错误响应**:
    - `400`: 缺少必要参数或余额不足
    - `401`: 未授权
    - `500`: 服务器内部错误

- **获取交易流水**: `GET /api/client/finance` - 查询用户资金流水记录
  - **请求头**: `Authorization: Bearer <JWT令牌>`
  - **查询参数**: `?userId=<用户ID>`
  - **响应成功**:
    ```json
    {
      "success": true,
      "data": {
        "flows": [
          {
            "id": "流水ID",
            "type": "流水类型 (deposit/withdraw/trade/adjust)",
            "amount": "金额",
            "currency": "货币",
            "balance_after": "操作后余额",
            "description": "描述",
            "created_at": "创建时间",
            "settled": "是否已结清"
          }
        ]
      }
    }
    ```

#### 市场数据
- **市场数据接口**: `GET /api/client/market` - 获取市场相关数据
  - **查询参数**: `?symbol=<股票代码>&type=<数据类型>`
  - **响应成功**:
    ```json
    {
      "success": true,
      "data": {
        "symbol": "股票代码",
        "name": "股票名称",
        "current_price": "当前价格",
        "change": "涨跌额",
        "change_percent": "涨跌幅",
        "volume": "成交量",
        "amount": "成交额",
        "high": "最高价",
        "low": "最低价",
        "open": "开盘价",
        "close": "收盘价",
        "timestamp": "数据时间"
      }
    }
    ```

- **股票搜索**: `GET /api/client/market/search` - 搜索股票信息
  - **查询参数**: `?keyword=<搜索关键词>`
  - **响应成功**:
    ```json
    {
      "success": true,
      "data": {
        "stocks": [
          {
            "symbol": "股票代码",
            "name": "股票名称",
            "market": "市场类型 (a_share/hk_share)",
            "current_price": "当前价格",
            "change_percent": "涨跌幅"
          }
        ],
        "total": "搜索结果总数"
      }
    }
    ```

- **市场异常检测**: `GET /api/client/market/anomalies` - 获取市场异常数据
  - **查询参数**: `?date=<日期>&type=<异常类型>`
  - **响应成功**:
    ```json
    {
      "success": true,
      "data": {
        "anomalies": [
          {
            "symbol": "股票代码",
            "name": "股票名称",
            "anomaly_type": "异常类型",
            "description": "异常描述",
            "detected_at": "检测时间",
            "severity": "严重程度"
          }
        ]
      }
    }
    ```

- **股票列表**: `GET /api/client/market/stocks` - 获取股票列表
  - **查询参数**: `?market=<市场类型>&page=<页码>&limit=<每页数量>`
  - **响应成功**:
    ```json
    {
      "success": true,
      "data": {
        "stocks": ["股票列表"],
        "pagination": {
          "page": "当前页码",
          "limit": "每页数量",
          "total": "总数",
          "pages": "总页数"
        }
      }
    }
    ```

#### 交易相关
- **A股交易**: `POST /api/client/trade/a-share` - 提交A股交易订单
  - **请求头**: `Authorization: Bearer <JWT令牌>`
  - **请求参数**:
    ```json
    {
      "symbol": "string, 必填, 股票代码",
      "side": "string, 必填, 买卖方向 (buy/sell)",
      "quantity": "number, 必填, 数量",
      "price": "number, 可选, 价格 (市价单可不填)",
      "order_type": "string, 必填, 订单类型 (market/limit)",
      "condition": "string, 可选, 条件 (如: 开盘价)"
    }
    ```
  - **响应成功**:
    ```json
    {
      "success": true,
      "data": {
        "order_id": "订单ID",
        "status": "pending",
        "symbol": "股票代码",
        "side": "买卖方向",
        "quantity": "数量",
        "estimated_amount": "预计金额",
        "message": "订单已提交，等待审核"
      }
    }
    ```

- **港股交易**: `POST /api/client/trade/hk-share` - 提交港股交易订单
  - 参数和响应格式与A股交易类似，货币单位为HKD

- **大宗交易**: `POST /api/client/trade/block` - 提交大宗交易订单
  - 参数和响应格式与A股交易类似，有额外的批量交易参数

- **IPO申购**: `POST /api/client/trade/ipo` - 提交IPO申购申请
  - **请求参数**:
    ```json
    {
      "symbol": "新股代码",
      "quantity": "申购数量",
      "price": "申购价格",
      "fund_source": "资金来源"
    }
    ```

- **一键打板**: `POST /api/client/trade/board` - 提交打板交易订单
  - 参数和响应格式与A股交易类似，适用于快速打板交易

#### 订单管理
- **订单管理**: `GET /api/client/order` - 获取订单列表
  - **请求头**: `Authorization: Bearer <JWT令牌>`
  - **查询参数**: `?type=<订单类型>&status=<状态>&page=<页码>`
  - **响应成功**:
    ```json
    {
      "success": true,
      "data": {
        "orders": [
          {
            "id": "订单ID",
            "symbol": "股票代码",
            "symbol_name": "股票名称",
            "side": "买卖方向",
            "quantity": "数量",
            "price": "价格",
            "order_type": "订单类型",
            "status": "状态",
            "created_at": "创建时间",
            "updated_at": "更新时间"
          }
        ],
        "pagination": {
          "page": "当前页码",
          "limit": "每页数量",
          "total": "总数",
          "pages": "总页数"
        }
      }
    }
    ```

- **条件单管理**: `POST /api/client/order/conditional` - 提交条件单
  - **请求参数**:
    ```json
    {
      "symbol": "股票代码",
      "side": "买卖方向",
      "quantity": "数量",
      "condition_type": "条件类型 (price/volume/time)",
      "condition_value": "条件值",
      "order_type": "订单类型",
      "price": "价格",
      "expires_at": "过期时间"
    }
    ```

#### 用户信息
- **用户信息管理**: `GET /api/client/user` - 获取用户相关信息
  - **请求头**: `Authorization: Bearer <JWT令牌>`
  - **响应成功**:
    ```json
    {
      "success": true,
      "data": {
        "user": {
          "id": "用户ID",
          "username": "用户名",
          "profile": "用户资料",
          "preferences": "用户偏好",
          "settings": "用户设置"
        }
      }
    }
    ```

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
