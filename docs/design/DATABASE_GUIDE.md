# Supabase 数据库使用指南

## 快速开始

### 1. 执行建表 SQL

访问 Supabase Dashboard:
```
https://zlbemopcgjohrnyyiwvs.supabase.co
```

进入 SQL Editor，执行 `supabase-schema.sql` 文件内容。

### 2. 验证表结构

```sql
-- 查看所有表
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- 查看用户表
SELECT * FROM users LIMIT 1;
```

## 数据库表说明

### 核心表

| 表名 | 说明 | 主要字段 |
|------|------|---------|
| users | 用户表 | username, balance_cny, balance_hkd, status |
| orders | 订单表 | trade_type, symbol, side, quantity, status |
| positions | 持仓表 | user_id, symbol, quantity, avg_cost |
| transaction_flows | 交易流水 | type, amount, settled |
| recharge_requests | 充值申请 | amount, currency, status |
| withdraw_requests | 提现申请 | amount, bank_account, flow_settled |
| audit_logs | 审计日志 | action_type, operator_id, before_data |
| ipo_applications | 新股申购 | ipo_code, qualification_status, lottery_status |
| admins | 管理员 | username, role |
| global_config | 全局配置 | config_key, config_value |

## 常用查询

### 用户相关

```sql
-- 创建用户
INSERT INTO users (username, real_name, phone) 
VALUES ('test001', '测试用户', '13800138000');

-- 查询用户余额
SELECT username, balance_cny, balance_hkd FROM users;

-- 冻结用户
UPDATE users SET status = 'frozen' WHERE id = 'user_id';
```

### 订单相关

```sql
-- 查询待审核订单
SELECT * FROM orders WHERE status = 'pending';

-- 审核通过订单
UPDATE orders 
SET status = 'approved', approved_by = 'admin_id', approved_at = NOW()
WHERE id = 'order_id';
```

### 流水相关

```sql
-- 查询未结清流水
SELECT * FROM transaction_flows WHERE settled = false;

-- 结清流水
UPDATE transaction_flows SET settled = true WHERE id = 'flow_id';
```

### 充值提现

```sql
-- 查询待审核充值
SELECT * FROM recharge_requests WHERE status = 'pending';

-- 查询待审核提现
SELECT * FROM withdraw_requests WHERE status = 'pending';
```

## 索引说明

所有表都已创建必要索引：
- 用户名索引
- 状态索引
- 时间索引
- 外键索引

## 数据类型

- `UUID`: 主键
- `TEXT`: 字符串
- `DECIMAL(15,2)`: 金额（精确到分）
- `INTEGER`: 整数
- `BOOLEAN`: 布尔值
- `JSONB`: JSON 数据
- `TIMESTAMPTZ`: 带时区时间戳

## 约束说明

### CHECK 约束
- status 字段限制为特定值
- trade_type 限制为5种交易类型
- currency 限制为 CNY/HKD

### 外键约束
- ON DELETE CASCADE: 删除用户时级联删除相关数据

### 唯一约束
- username 唯一
- (user_id, symbol) 持仓唯一

## 默认数据

### 管理员账号
- 用户名: `admin`
- 密码: `admin123`
- 角色: `super_admin`

### 全局配置
- 汇率配置
- 手续费配置
- 打板限额
- 大宗门槛
- 提现规则

## 备份建议

```sql
-- 导出用户数据
COPY users TO '/tmp/users.csv' CSV HEADER;

-- 导出订单数据
COPY orders TO '/tmp/orders.csv' CSV HEADER;
```

## 性能优化

1. **定期清理**
   - 归档历史订单
   - 清理旧日志

2. **索引维护**
   - 定期 VACUUM
   - 重建索引

3. **查询优化**
   - 使用索引字段
   - 避免全表扫描
   - 分页查询

## 安全建议

1. **Row Level Security (RLS)**
   ```sql
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ```

2. **权限控制**
   - 限制匿名访问
   - 使用 service_role_key 进行管理操作

3. **数据加密**
   - 敏感字段加密存储
   - 使用 HTTPS 传输
