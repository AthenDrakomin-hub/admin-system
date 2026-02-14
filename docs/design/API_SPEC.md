# 客户端 ↔ 管理端 API 对接规范

## 域名配置

- **管理端**: https://jxfdfsfresh.vip
- **客户端**: https://www.zhengyutouzi.com

## 认证机制

### 客户端认证
```
Authorization: Bearer <user_token>
```

### 管理端认证
```
Authorization: Bearer <admin_token>
```

## 通用响应格式

```typescript
{
  "success": boolean,
  "data": any,
  "error": string,
  "timestamp": string
}
```

---

## 客户端 API（供客户端调用）

### 1. 用户认证

#### 登录
```
POST /api/client/auth/login
```

**请求**:
```json
{
  "username": "user001",
  "password": "password123"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "username": "user001",
      "real_name": "张三"
    }
  }
}
```

---

### 2. 账户信息

#### 获取账户余额
```
GET /api/client/user/balance
```

**响应**:
```json
{
  "success": true,
  "data": {
    "balance_cny": 100000.00,
    "balance_hkd": 10000.00,
    "frozen_balance_cny": 0,
    "frozen_balance_hkd": 0
  }
}
```

#### 获取持仓
```
GET /api/client/user/positions
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "symbol": "600000",
      "symbol_name": "浦发银行",
      "quantity": 1000,
      "available_quantity": 1000,
      "avg_cost": 10.50,
      "market_value": 10500.00,
      "profit_loss": 500.00
    }
  ]
}
```

---

### 3. 订单操作

#### 提交订单
```
POST /api/client/order/create
```

**请求**:
```json
{
  "trade_type": "a-share",
  "symbol": "600000",
  "side": "buy",
  "price": 10.50,
  "quantity": 1000
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "status": "pending"
  }
}
```

#### 查询订单
```
GET /api/client/order/list?status=pending
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "symbol": "600000",
      "side": "buy",
      "price": 10.50,
      "quantity": 1000,
      "status": "pending",
      "created_at": "2024-01-20T10:00:00Z"
    }
  ]
}
```

#### 撤销订单
```
POST /api/client/order/cancel
```

**请求**:
```json
{
  "order_id": "uuid"
}
```

---

### 4. 充值提现

#### 申请充值
```
POST /api/client/finance/recharge
```

**请求**:
```json
{
  "amount": 10000,
  "currency": "CNY",
  "payment_method": "bank",
  "payment_proof": "https://..."
}
```

#### 申请提现
```
POST /api/client/finance/withdraw
```

**请求**:
```json
{
  "amount": 5000,
  "currency": "CNY",
  "bank_name": "中国银行",
  "bank_account": "6217********1234",
  "account_holder": "张三"
}
```

#### 查询流水
```
GET /api/client/finance/flows?page=1&limit=20
```

**响应**:
```json
{
  "success": true,
  "data": {
    "flows": [
      {
        "type": "deposit",
        "amount": 10000,
        "balance_after": 110000,
        "description": "充值",
        "created_at": "2024-01-20T10:00:00Z"
      }
    ],
    "total": 100,
    "page": 1
  }
}
```

---

### 5. 行情数据

#### 获取实时行情
```
GET /api/client/market/quote?symbol=600000
```

**响应**:
```json
{
  "success": true,
  "data": {
    "symbol": "600000",
    "name": "浦发银行",
    "price": 10.50,
    "change": 0.50,
    "change_percent": 5.00,
    "volume": 1000000
  }
}
```

---

## 管理端 API（供管理端调用）

### 1. 管理员认证

#### 登录
```
POST /api/auth
```

**请求**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

---

### 2. 订单管理

#### 获取待审核订单
```
GET /api/admin/orders/pending?trade_type=a-share
```

#### 审核订单
```
POST /api/admin/orders/approve
```

**请求**:
```json
{
  "order_id": "uuid",
  "action": "approve",
  "reason": ""
}
```

#### 强制成交
```
POST /api/admin/orders/force-execute
```

---

### 3. 用户管理

#### 获取用户列表
```
GET /api/admin/users?page=1&limit=20
```

#### 资金调整
```
POST /api/admin/users/adjust-balance
```

**请求**:
```json
{
  "user_id": "uuid",
  "type": "deposit",
  "currency": "CNY",
  "amount": 10000,
  "reason": "补偿用户"
}
```

#### 冻结用户
```
POST /api/admin/users/freeze
```

**请求**:
```json
{
  "user_id": "uuid",
  "reason": "违规操作"
}
```

---

### 4. 充值提现审核

#### 获取待审核充值
```
GET /api/admin/finance/recharge/pending
```

#### 审核充值
```
POST /api/admin/finance/recharge/approve
```

**请求**:
```json
{
  "request_id": "uuid",
  "action": "approve",
  "reason": ""
}
```

#### 获取待审核提现
```
GET /api/admin/finance/withdraw/pending
```

#### 审核提现
```
POST /api/admin/finance/withdraw/approve
```

---

### 5. 统计数据

#### 获取工作台统计
```
GET /api/admin/dashboard/stats
```

**响应**:
```json
{
  "success": true,
  "data": {
    "pendingTrades": 5,
    "pendingRecharges": 3,
    "pendingWithdraws": 2,
    "todayTrades": 100,
    "todayAmount": 1000000
  }
}
```

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

## 状态码

### 订单状态
- `pending` - 待审核
- `approved` - 已审核
- `rejected` - 已驳回
- `completed` - 已完成
- `cancelled` - 已撤销

### 用户状态
- `active` - 正常
- `frozen` - 冻结
- `suspended` - 暂停

## 跨域配置

管理端已配置 CORS：
```javascript
Access-Control-Allow-Origin: https://www.zhengyutouzi.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

## 请求示例

### JavaScript/TypeScript

```typescript
// 客户端调用
const response = await fetch('https://jxfdfsfresh.vip/api/client/order/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    trade_type: 'a-share',
    symbol: '600000',
    side: 'buy',
    price: 10.50,
    quantity: 1000
  })
});

const data = await response.json();
```

### cURL

```bash
# 提交订单
curl -X POST https://jxfdfsfresh.vip/api/client/order/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "trade_type": "a-share",
    "symbol": "600000",
    "side": "buy",
    "price": 10.50,
    "quantity": 1000
  }'
```

## 测试环境

- 管理端: https://jxfdfsfresh.vip
- 客户端: https://www.zhengyutouzi.com

## 注意事项

1. **认证**: 所有请求必须携带有效 token
2. **HTTPS**: 生产环境必须使用 HTTPS
3. **限流**: 建议实现请求限流（每分钟60次）
4. **超时**: 请求超时时间建议30秒
5. **重试**: 失败请求建议重试3次
6. **日志**: 记录所有 API 调用日志

## 联调步骤

1. 客户端配置管理端域名
2. 测试认证接口
3. 测试订单接口
4. 测试充值提现接口
5. 压力测试
6. 上线部署
