-- 完整的数据库设置脚本
-- 包含：数据修复 + 管理功能表 + 数据库迁移
-- 执行前请备份数据库！

-- ============================================
-- 第一部分：数据备份（建议手动执行）
-- ============================================
/*
-- 建议先手动备份关键表：
CREATE TABLE orders_backup_complete AS SELECT * FROM orders;
CREATE TABLE users_backup_complete AS SELECT * FROM users;
*/

-- ============================================
-- 第二部分：先添加必要的字段
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '开始添加必要的字段...';
END $$;

-- 1. 先添加orders表需要的字段（如果不存在）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_abnormal BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS abnormal_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manual_review_required BOOLEAN DEFAULT FALSE;
RAISE NOTICE '已添加orders表异常订单相关字段';

-- ============================================
-- 第三部分：修复orders表数据约束问题
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '开始修复orders表数据约束问题...';
END $$;

-- 1. 检查当前数据状态
DO $$
DECLARE
    invalid_count INTEGER;
    type_counts RECORD;
BEGIN
    -- 检查不符合新约束的数据
    SELECT COUNT(*) INTO invalid_count 
    FROM orders 
    WHERE trade_type NOT IN ('a_share', 'hk_share', 'ipo', 'block', 'board', 'conditional', 'abnormal');
    
    RAISE NOTICE '不符合新约束的记录数: %', invalid_count;
    
    -- 显示各种trade_type的数量
    RAISE NOTICE '当前trade_type分布:';
    FOR type_counts IN 
        SELECT trade_type, COUNT(*) as count 
        FROM orders 
        GROUP BY trade_type 
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  %: %', type_counts.trade_type, type_counts.count;
    END LOOP;
END $$;

-- 2. 先删除约束（如果存在）
DO $$
BEGIN
    -- 删除旧的check约束
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_trade_type_check;
    RAISE NOTICE '已删除orders_trade_type_check约束';
END $$;

-- 3. 修复数据：将旧格式更新为新格式
DO $$
DECLARE
    row_count_var INTEGER;
BEGIN
    -- 修复连字符格式
    UPDATE orders SET trade_type = 'a_share' WHERE trade_type = 'a-share';
    GET DIAGNOSTICS row_count_var = ROW_COUNT;
    RAISE NOTICE '更新 a-share → a_share: % 条记录', row_count_var;
    
    UPDATE orders SET trade_type = 'hk_share' WHERE trade_type = 'hk-share';
    GET DIAGNOSTICS row_count_var = ROW_COUNT;
    RAISE NOTICE '更新 hk-share → hk_share: % 条记录', row_count_var;
    
    -- 修复其他可能的旧格式
    UPDATE orders SET trade_type = 'block' WHERE trade_type = 'block-trade';
    GET DIAGNOSTICS row_count_var = ROW_COUNT;
    RAISE NOTICE '更新 block-trade → block: % 条记录', row_count_var;
    
    UPDATE orders SET trade_type = 'ipo' WHERE trade_type = 'ipo-application';
    GET DIAGNOSTICS row_count_var = ROW_COUNT;
    RAISE NOTICE '更新 ipo-application → ipo: % 条记录', row_count_var;
    
    UPDATE orders SET trade_type = 'board' WHERE trade_type = 'board-strategy';
    GET DIAGNOSTICS row_count_var = ROW_COUNT;
    RAISE NOTICE '更新 board-strategy → board: % 条记录', row_count_var;
    
    -- 将未知类型标记为abnormal（需要人工审核）
    UPDATE orders SET trade_type = 'abnormal', is_abnormal = TRUE 
    WHERE trade_type NOT IN ('a_share', 'hk_share', 'ipo', 'block', 'board', 'conditional', 'abnormal');
    GET DIAGNOSTICS row_count_var = ROW_COUNT;
    RAISE NOTICE '标记未知类型为abnormal: % 条记录', row_count_var;
    
    RAISE NOTICE '数据修复完成';
END $$;

-- 4. 重新应用约束
DO $$
BEGIN
    -- 确保没有重复的约束
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_trade_type_check;
    
    -- 添加新的check约束，包含所有交易类型
    ALTER TABLE orders 
    ADD CONSTRAINT orders_trade_type_check 
    CHECK (trade_type IN ('a_share', 'hk_share', 'ipo', 'block', 'board', 'conditional', 'abnormal'));
    
    RAISE NOTICE '已重新添加orders_trade_type_check约束';
END $$;

DO $$
BEGIN
    RAISE NOTICE 'orders表数据修复完成！';
END $$;

-- ============================================
-- 第三部分：创建管理功能表结构
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '开始创建管理功能表结构...';
END $$;

-- 1. 机构表（organizations）
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) UNIQUE, -- 机构代码
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 机构表索引
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- 2. 邀请码表（invitation_codes）
CREATE TABLE IF NOT EXISTS invitation_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID, -- 创建者（管理员ID）
    max_uses INTEGER DEFAULT 1, -- 最大使用次数
    used_count INTEGER DEFAULT 0, -- 已使用次数
    expires_at TIMESTAMPTZ, -- 过期时间
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 邀请码表索引
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_organization ON invitation_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_status ON invitation_codes(status);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_expires ON invitation_codes(expires_at);

-- 3. 系统消息表（system_messages）
CREATE TABLE IF NOT EXISTS system_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('system', 'audit_approved', 'audit_rejected', 'trade', 'finance')),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    sent_by UUID, -- 发送者（管理员ID）
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 系统消息表索引
CREATE INDEX IF NOT EXISTS idx_system_messages_user_id ON system_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_system_messages_type ON system_messages(type);
CREATE INDEX IF NOT EXISTS idx_system_messages_sent_at ON system_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_system_messages_read ON system_messages(read);

-- 4. 消息模板表（message_templates）
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL UNIQUE CHECK (type IN ('audit_approved', 'audit_rejected', 'welcome', 'password_reset')),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    variables JSONB, -- 模板变量说明
    updated_by UUID, -- 最后更新者
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 消息模板表索引
CREATE INDEX IF NOT EXISTS idx_message_templates_type ON message_templates(type);

-- 5. 更新用户表（users）添加机构关联
-- 添加organization_id字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'organization_id') THEN
        ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE '已添加organization_id字段到users表';
    END IF;
END $$;

-- 添加审核相关字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'reviewed_by') THEN
        ALTER TABLE users ADD COLUMN reviewed_by UUID;
        RAISE NOTICE '已添加reviewed_by字段到users表';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'reviewed_at') THEN
        ALTER TABLE users ADD COLUMN reviewed_at TIMESTAMPTZ;
        RAISE NOTICE '已添加reviewed_at字段到users表';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'reject_reason') THEN
        ALTER TABLE users ADD COLUMN reject_reason TEXT;
        RAISE NOTICE '已添加reject_reason字段到users表';
    END IF;
    
    -- 添加邀请码字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'invitation_code') THEN
        ALTER TABLE users ADD COLUMN invitation_code VARCHAR(20);
        RAISE NOTICE '已添加invitation_code字段到users表';
    END IF;
END $$;

-- 更新用户状态约束（如果不存在）
DO $$ 
BEGIN
    -- 检查约束是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage 
                   WHERE table_name = 'users' AND constraint_name = 'users_status_check') THEN
        -- 添加新的状态约束
        ALTER TABLE users 
        ADD CONSTRAINT users_status_check 
        CHECK (status IN ('pending', 'active', 'rejected', 'disabled'));
        RAISE NOTICE '已添加users_status_check约束';
    END IF;
END $$;

-- 用户表索引优化
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_reviewed_at ON users(reviewed_at);

-- 6. 插入默认数据
-- 插入默认机构（如果不存在）
INSERT INTO organizations (id, name, code, status) VALUES
('00000000-0000-0000-0000-000000000001', '默认机构', 'DEFAULT', 'active')
ON CONFLICT (id) DO NOTHING;

-- 插入默认消息模板（如果不存在）
INSERT INTO message_templates (type, title, content, variables) VALUES
('audit_approved', '审核通过通知', '尊敬的{username}，您的账号审核已通过，现在可以正常使用系统功能。', '{"username": "用户姓名"}'),
('audit_rejected', '审核驳回通知', '尊敬的{username}，您的账号审核未通过，原因：{reason}。请修改后重新提交审核。', '{"username": "用户姓名", "reason": "驳回原因"}'),
('welcome', '欢迎使用系统', '尊敬的{username}，欢迎使用我们的交易系统！', '{"username": "用户姓名"}'),
('password_reset', '密码重置通知', '您的密码已重置，新密码为：{password}，请及时登录修改。', '{"password": "新密码"}')
ON CONFLICT (type) DO NOTHING;

-- 7. 创建视图
-- 用户审核视图
CREATE OR REPLACE VIEW user_audit_view AS
SELECT 
    u.id,
    u.username,
    u.real_name,
    u.phone,
    u.email,
    u.status,
    u.created_at as registered_at,
    u.reviewed_at,
    u.reject_reason,
    o.name as organization_name,
    a.username as reviewer_name
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
LEFT JOIN admins a ON u.reviewed_by = a.id
WHERE u.status IN ('pending', 'rejected');

-- 邀请码使用统计视图
CREATE OR REPLACE VIEW invitation_stats_view AS
SELECT 
    ic.code,
    o.name as organization_name,
    ic.max_uses,
    ic.used_count,
    ic.expires_at,
    ic.status,
    ic.created_at,
    COUNT(u.id) as registered_users
FROM invitation_codes ic
LEFT JOIN organizations o ON ic.organization_id = o.id
LEFT JOIN users u ON u.invitation_code = ic.code
GROUP BY ic.id, o.name;

DO $$
BEGIN
    RAISE NOTICE '管理功能表结构创建完成！';
END $$;

-- ============================================
-- 第四部分：数据库迁移（扩展orders表等）
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '开始执行数据库迁移...';
END $$;

-- 1. 扩展orders表支持新交易类型
-- 扩展trade_type枚举值
ALTER TABLE orders 
ALTER COLUMN trade_type TYPE VARCHAR(30);

-- 删除旧的check约束（如果存在，但前面已经处理过）
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_trade_type_check;

-- 添加新的check约束，包含所有交易类型
ALTER TABLE orders 
ADD CONSTRAINT orders_trade_type_check 
CHECK (trade_type IN ('a_share', 'hk_share', 'ipo', 'block', 'board', 'conditional', 'abnormal'));

-- 注意：异常订单相关字段已经在第二部分添加
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_abnormal BOOLEAN DEFAULT FALSE;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS abnormal_reason TEXT;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS manual_review_required BOOLEAN DEFAULT FALSE;

-- 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_orders_is_abnormal ON orders(is_abnormal);
CREATE INDEX IF NOT EXISTS idx_orders_manual_review ON orders(manual_review_required);
CREATE INDEX IF NOT EXISTS idx_orders_type_status ON orders(trade_type, status);

-- 2. 创建缺失的交易类型专用表
-- 大宗交易订单表
CREATE TABLE IF NOT EXISTS block_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    symbol_name VARCHAR(100),
    block_size INTEGER NOT NULL CHECK (block_size > 0),
    block_price DECIMAL(15,2) NOT NULL CHECK (block_price > 0),
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (block_size * block_price) STORED,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
    trade_data JSONB,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    reject_reason TEXT,
    cancel_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 大宗交易订单索引
CREATE INDEX IF NOT EXISTS idx_block_orders_user_id ON block_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_block_orders_status ON block_orders(status);
CREATE INDEX IF NOT EXISTS idx_block_orders_created_at ON block_orders(created_at);

-- 条件单表
CREATE TABLE IF NOT EXISTS conditional_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    symbol_name VARCHAR(100),
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    condition_type VARCHAR(20) NOT NULL CHECK (condition_type IN ('price', 'time', 'volume', 'technical')),
    trigger_price DECIMAL(15,2),
    trigger_time TIMESTAMPTZ,
    trigger_volume INTEGER,
    technical_indicator JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'triggered', 'cancelled', 'expired')),
    parent_order_id UUID REFERENCES orders(id),
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 条件单索引
CREATE INDEX IF NOT EXISTS idx_conditional_orders_user_id ON conditional_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_conditional_orders_status ON conditional_orders(status);
CREATE INDEX IF NOT EXISTS idx_conditional_orders_condition_type ON conditional_orders(condition_type);
CREATE INDEX IF NOT EXISTS idx_conditional_orders_trigger_price ON conditional_orders(trigger_price);

-- 一键打板策略表
CREATE TABLE IF NOT EXISTS board_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    symbol_name VARCHAR(100),
    strategy_name VARCHAR(100) DEFAULT '一键打板',
    strategy_type VARCHAR(20) DEFAULT 'board' CHECK (strategy_type IN ('board', 'breakthrough', 'reversal')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_limit DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executing', 'completed', 'cancelled')),
    trade_data JSONB,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    reject_reason TEXT,
    execution_started_at TIMESTAMPTZ,
    execution_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 一键打板策略索引
CREATE INDEX IF NOT EXISTS idx_board_strategies_user_id ON board_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_board_strategies_status ON board_strategies(status);
CREATE INDEX IF NOT EXISTS idx_board_strategies_strategy_type ON board_strategies(strategy_type);

-- 3. 审计日志表增强
-- 添加审计日志增强字段
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS operation_result VARCHAR(20) CHECK (operation_result IN ('success', 'failure', 'partial'));
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS business_module VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS api_endpoint VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS http_method VARCHAR(10);

-- 添加审计日志索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_module ON audit_logs(business_module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_result ON audit_logs(operation_result);
CREATE INDEX IF NOT EXISTS idx_audit_logs_api_endpoint ON audit_logs(api_endpoint);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operator_time ON audit_logs(operator_id, created_at DESC);

-- 4. 更新全局配置
INSERT INTO global_config (config_key, config_value, description) VALUES
('conditional_order_enabled', 'true', '是否启用条件单功能'),
('board_trading_enabled', 'true', '是否启用一键打板功能'),
('abnormal_order_threshold', '1000000', '异常订单金额阈值（CNY）'),
('data_retention_days', '1095', '数据保留天数（3年）')
ON CONFLICT (config_key) DO UPDATE SET
config_value = EXCLUDED.config_value,
description = EXCLUDED.description;

DO $$
BEGIN
    RAISE NOTICE '数据库迁移完成！';
END $$;

-- ============================================
-- 第五部分：执行完成总结
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '完整的数据库设置执行完成！';
    RAISE NOTICE '已完成以下任务：';
    RAISE NOTICE '1. 修复orders表数据约束问题';
    RAISE NOTICE '2. 创建管理功能表结构';
    RAISE NOTICE '3. 执行数据库迁移';
    RAISE NOTICE '4. 插入默认数据';
    RAISE NOTICE '5. 创建优化索引和视图';
    RAISE NOTICE '';
    RAISE NOTICE '下一步：';
    RAISE NOTICE '1. 验证数据完整性';
    RAISE NOTICE '2. 测试API功能';
    RAISE NOTICE '3. 检查页面组件兼容性';
    RAISE NOTICE '============================================';
END $$;
