# 核心业务功能实现文档

## 1. 半自动化撮合 ✅

### 实现位置
- `lib/matching.ts` - 撮合引擎

### 核心功能
- **价格优先、时间优先**自动匹配买卖单
- 买单按价格降序、时间升序排序
- 卖单按价格升序、时间升序排序
- 买价 ≥ 卖价时自动匹配
- 中间价成交

### 管理员操作
- 查看匹配结果
- 确认成交 / 驳回
- 强制成交功能

---

## 2. 上帝视角用户管理 ✅

### 实现位置
- `app/admin/user/list/` - 用户列表
- `app/admin/user/funds/` - 资金上下分
- `app/admin/user/orders/` - 订单管控
- `app/admin/user/positions/` - 持仓管理
- `app/admin/user/flows/` - 流水管控

### 核心功能
- **创建/编辑/冻结用户**
- **资金直接上下分**（人民币/港币）
- **查看/修改所有订单**
- **查看/修改持仓**
- **强制成交/驳回/修改订单**
- 所有操作记录审计日志

---

## 3. 充值+提现审核闭环 ✅

### 充值流程
1. 用户提交充值申请
2. 管理员审核
3. 审核通过 → 到账
4. 审核拒绝 → 通知用户

### 提现流程
1. 检查流水是否结清
2. 未结清 → 禁止提现
3. 已结清 → 提交申请
4. 管理员收到通知
5. 审核通过/驳回
6. 记录审计日志

### 实现位置
- `app/admin/finance/recharge/` - 充值审核
- `app/admin/finance/withdraw/` - 提现审核
- `types/payment.ts` - 充值提现类型
- `checkWithdrawEligibility()` - 提现资格检查

---

## 4. 账户流水管控 ✅

### 流水类型
- **交易流水**：买卖成交记录
- **资金流水**：充值/提现/调整
- **手续费流水**：佣金/印花税等

### 结清规则
- 所有流水必须标记 `settled` 状态
- 未结清流水禁止提现
- 计算未结清金额

### 实现位置
- `app/admin/user/flows/` - 流水管控页面
- `types/account.ts` - 流水类型定义
- `TransactionFlow` 接口

---

## 5. 统一待办工作台 ✅

### 实现位置
- `app/admin/dashboard/` - 工作台首页

### 展示内容
- **待审核交易**：实时统计
- **待审核提现**：实时统计
- **待审核充值**：实时统计
- **异常订单**：风险提示
- **今日数据**：成交笔数、金额、活跃用户
- **最近操作**：操作记录

### 特点
- 登录后首页
- 一键跳转处理
- 实时数据更新

---

## 6. 全局参数配置中心 ✅

### 实现位置
- `app/admin/system/params/` - 参数配置页面
- `types/config.ts` - 配置类型定义

### 配置项
- **汇率**：HKD/CNY 实时汇率
- **手续费**：佣金率、印花税、过户费
- **打板限额**：每日限额、审核阈值
- **大宗门槛**：最低金额、最大折扣
- **提现规则**：最低/最高金额、每日限额
- **交易时间**：开盘/收盘时间
- **IPO配置**：申购限额、资格天数

---

## 7. 全操作审计日志 ✅

### 实现位置
- `app/admin/system/audit/` - 审计日志页面
- `lib/audit.ts` - 审计日志工具

### 必须记录的操作
- ✅ 改资金（上下分）
- ✅ 改订单（修改/强制成交）
- ✅ 审核提现
- ✅ 冻结用户
- ✅ 配置变更

### 记录内容
- 操作人ID和姓名
- 操作时间
- 操作类型
- 目标类型和ID
- 修改前数据
- 修改后数据
- 操作原因
- IP地址

### 审计日志类型
```typescript
interface AuditLog {
  action_type: 'fund_adjust' | 'order_modify' | 'withdraw_approve' | 'user_freeze' | 'config_change';
  operator_id: string;
  operator_name: string;
  target_type: 'user' | 'order' | 'withdraw' | 'config';
  target_id: string;
  before_data?: any;
  after_data?: any;
  reason?: string;
}
```

---

## 数据库表设计

### users 表
```sql
- id, username, real_name, phone, id_card
- status (active/frozen/suspended)
- balance_cny, balance_hkd
- frozen_balance_cny, frozen_balance_hkd
- trade_days, created_at
```

### orders 表
```sql
- id, user_id, trade_type, symbol
- side, price, quantity, status
- approved_by, approved_at
```

### transaction_flows 表
```sql
- id, user_id, type, amount
- balance_after, settled
- order_id, description
```

### recharge_requests 表
```sql
- id, user_id, amount, currency
- payment_method, status
- reviewer_id, review_time
```

### withdraw_requests 表
```sql
- id, user_id, amount, currency
- bank_account, flow_settled
- unsettled_amount, status
```

### audit_logs 表
```sql
- id, action, action_type
- operator_id, operator_name
- target_type, target_id
- before_data, after_data, reason
```

### global_config 表
```sql
- config_key, config_value
- config_type, updated_at
```

---

## API 接口设计

### 用户管理
- `POST /api/user/create` - 创建用户
- `PUT /api/user/update` - 编辑用户
- `POST /api/user/freeze` - 冻结用户
- `POST /api/user/fund-adjust` - 资金上下分

### 订单管理
- `GET /api/order/list` - 订单列表
- `POST /api/order/approve` - 审核订单
- `POST /api/order/force-execute` - 强制成交
- `PUT /api/order/modify` - 修改订单

### 充值提现
- `GET /api/finance/recharge/list` - 充值列表
- `POST /api/finance/recharge/approve` - 审核充值
- `GET /api/finance/withdraw/list` - 提现列表
- `POST /api/finance/withdraw/approve` - 审核提现

### 配置管理
- `GET /api/config` - 获取配置
- `PUT /api/config` - 更新配置

### 审计日志
- `GET /api/audit/logs` - 查询日志
- `POST /api/audit/export` - 导出日志
