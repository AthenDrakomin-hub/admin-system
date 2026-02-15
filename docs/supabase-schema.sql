-- Supabase 数据库建表脚本（完整版）
-- 适用于银河证券-证裕交易单元管理系统
-- 注意：此版本已更新为完整版本，包含所有必要的表和功能

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建表（按依赖顺序，IF NOT EXISTS 可重复执行）
-- 机构表（新增）
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) UNIQUE,
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户表（已更新，添加机构关联字段）
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    real_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    balance_cny DECIMAL(15,2) DEFAULT 0.00,
    balance_hkd DECIMAL(15,2) DEFAULT 0.00,
    frozen_balance DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'disabled')),
    organization_id UUID REFERENCES organizations(id),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    reject_reason TEXT,
    invitation_code VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 订单表（已更新，支持更多交易类型）
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trade_type VARCHAR(30) NOT NULL CHECK (trade_type IN ('a_share', 'hk_share', 'ipo', 'block', 'board', 'conditional', 'abnormal')),
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity INTEGER NOT NULL,
    price DECIMAL(15,2),
    amount DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
    trade_data JSONB,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    is_abnormal BOOLEAN DEFAULT FALSE,
    abnormal_reason TEXT,
    manual_review_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 持仓表
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    quantity INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    avg_cost DECIMAL(15,2) DEFAULT 0.00,
    market_value DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- 交易流水表
CREATE TABLE IF NOT EXISTS transaction_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('recharge', 'withdraw', 'trade', 'fee', 'dividend')),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY' CHECK (currency IN ('CNY', 'HKD')),
    settled BOOLEAN DEFAULT FALSE,
    related_order_id UUID REFERENCES orders(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 充值申请表
CREATE TABLE IF NOT EXISTS recharge_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY' CHECK (currency IN ('CNY', 'HKD')),
    bank_account VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 提现申请表
CREATE TABLE IF NOT EXISTS withdraw_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY' CHECK (currency IN ('CNY', 'HKD')),
    bank_account VARCHAR(100) NOT NULL,
    flow_settled BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 审计日志表（已增强）
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type VARCHAR(50) NOT NULL,
    operator_id UUID,
    operator_name VARCHAR(100),
    target_type VARCHAR(50),
    target_id UUID,
    before_data JSONB,
    after_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    operation_result VARCHAR(20) CHECK (operation_result IN ('success', 'failure', 'partial')),
    error_message TEXT,
    execution_time_ms INTEGER,
    business_module VARCHAR(50),
    api_endpoint VARCHAR(255),
    http_method VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 新股申购表
CREATE TABLE IF NOT EXISTS ipo_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ipo_code VARCHAR(20) NOT NULL,
    ipo_name VARCHAR(100),
    apply_quantity INTEGER NOT NULL,
    apply_amount DECIMAL(15,2),
    qualification_status VARCHAR(20) DEFAULT 'pending' CHECK (qualification_status IN ('pending', 'qualified', 'unqualified')),
    lottery_status VARCHAR(20) DEFAULT 'pending' CHECK (lottery_status IN ('pending', 'won', 'lost')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 管理员表
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'auditor', 'finance_manager')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 全局配置表
CREATE TABLE IF NOT EXISTS global_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 管理端系统配置表（/api/admin/config 使用）
CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category, key)
);
CREATE INDEX IF NOT EXISTS idx_system_configs_category ON system_configs(category);

-- 邀请码表（新增）
CREATE TABLE IF NOT EXISTS invitation_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 系统消息表（新增）
CREATE TABLE IF NOT EXISTS system_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('system', 'audit_approved', 'audit_rejected', 'trade', 'finance')),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    sent_by UUID,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 消息模板表（新增）
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL UNIQUE CHECK (type IN ('audit_approved', 'audit_rejected', 'welcome', 'password_reset')),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    variables JSONB,
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_reviewed_at ON users(reviewed_at);

-- 订单表索引
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_trade_type ON orders(trade_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_is_abnormal ON orders(is_abnormal);
CREATE INDEX IF NOT EXISTS idx_orders_manual_review ON orders(manual_review_required);
CREATE INDEX IF NOT EXISTS idx_orders_type_status ON orders(trade_type, status);

-- 持仓表索引
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);

-- 流水表索引
CREATE INDEX IF NOT EXISTS idx_transaction_flows_user_id ON transaction_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_flows_type ON transaction_flows(type);
CREATE INDEX IF NOT EXISTS idx_transaction_flows_settled ON transaction_flows(settled);
CREATE INDEX IF NOT EXISTS idx_transaction_flows_created_at ON transaction_flows(created_at);

-- 充值提现索引
CREATE INDEX IF NOT EXISTS idx_recharge_requests_user_id ON recharge_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_recharge_requests_status ON recharge_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_user_id ON withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_status ON withdraw_requests(status);

-- 审计日志索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_operator_id ON audit_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_module ON audit_logs(business_module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_result ON audit_logs(operation_result);
CREATE INDEX IF NOT EXISTS idx_audit_logs_api_endpoint ON audit_logs(api_endpoint);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operator_time ON audit_logs(operator_id, created_at DESC);

-- 新股申购索引
CREATE INDEX IF NOT EXISTS idx_ipo_applications_user_id ON ipo_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_ipo_applications_ipo_code ON ipo_applications(ipo_code);

-- 管理员索引
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);

-- 机构表索引
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- 邀请码表索引
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_organization ON invitation_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_status ON invitation_codes(status);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_expires ON invitation_codes(expires_at);

-- 系统消息表索引
CREATE INDEX IF NOT EXISTS idx_system_messages_user_id ON system_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_system_messages_type ON system_messages(type);
CREATE INDEX IF NOT EXISTS idx_system_messages_sent_at ON system_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_system_messages_read ON system_messages(read);

-- 消息模板表索引
CREATE INDEX IF NOT EXISTS idx_message_templates_type ON message_templates(type);

-- 插入默认系统管理员：用户名 admin，密码 admin123456（首次登录后请修改）
INSERT INTO admins (username, password_hash, role, status) 
VALUES ('admin', '$2b$10$cnZ4dnGlW.FdiM5JNDx9nO5ebbS8EcQGWWDWQ0j24GpBOsp7SGDum', 'super_admin', 'active')
ON CONFLICT (username) DO NOTHING;

-- 插入默认全局配置
INSERT INTO global_config (config_key, config_value, description) VALUES
('exchange_rate_cny_hkd', '0.88', 'CNY兑HKD汇率'),
('trade_fee_rate', '0.0003', '交易手续费率'),
('board_trade_limit', '1000000', '打板交易限额'),
('block_trade_threshold', '5000000', '大宗交易门槛'),
('withdraw_min_amount', '100', '最小提现金额'),
('withdraw_max_amount', '50000', '最大提现金额'),
('conditional_order_enabled', 'true', '是否启用条件单功能'),
('board_trading_enabled', 'true', '是否启用一键打板功能'),
('abnormal_order_threshold', '1000000', '异常订单金额阈值（CNY）'),
('data_retention_days', '1095', '数据保留天数（3年）')
ON CONFLICT (config_key) DO NOTHING;

-- 插入默认机构
INSERT INTO organizations (id, name, code, status) VALUES
('00000000-0000-0000-0000-000000000001', '默认机构', 'DEFAULT', 'active')
ON CONFLICT (id) DO NOTHING;

-- 插入默认消息模板
INSERT INTO message_templates (type, title, content, variables) VALUES
('audit_approved', '审核通过通知', '尊敬的{username}，您的账号审核已通过，现在可以正常使用系统功能。', '{"username": "用户姓名"}'),
('audit_rejected', '审核驳回通知', '尊敬的{username}，您的账号审核未通过，原因：{reason}。请修改后重新提交审核。', '{"username": "用户姓名", "reason": "驳回原因"}'),
('welcome', '欢迎使用系统', '尊敬的{username}，欢迎使用我们的交易系统！', '{"username": "用户姓名"}'),
('password_reset', '密码重置通知', '您的密码已重置，新密码为：{password}，请及时登录修改。', '{"password": "新密码"}')
ON CONFLICT (type) DO NOTHING;

-- 启用行级安全 (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE recharge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdraw_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- 创建审计日志触发器函数
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        action_type,
        operator_id,
        operator_name,
        target_type,
        target_id,
        before_data,
        after_data
    ) VALUES (
        TG_OP,
        current_setting('app.current_admin', TRUE)::UUID,
        current_setting('app.current_admin_name', TRUE),
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 为关键表创建审计触发器
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_orders_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_positions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON positions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_transaction_flows_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transaction_flows
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 注释
COMMENT ON TABLE users IS '用户表，存储用户基本信息及资金余额';
COMMENT ON TABLE orders IS '订单表，存储交易订单信息';
COMMENT ON TABLE positions IS '持仓表，存储用户持仓信息';
COMMENT ON TABLE transaction_flows IS '交易流水表，记录所有资金变动';
COMMENT ON TABLE recharge_requests IS '充值申请表，记录用户充值申请';
COMMENT ON TABLE withdraw_requests IS '提现申请表，记录用户提现申请';
COMMENT ON TABLE audit_logs IS '审计日志表，记录所有关键操作';
COMMENT ON TABLE ipo_applications IS '新股申购表，记录用户新股申购申请';
COMMENT ON TABLE admins IS '管理员表，存储后台管理员信息';
COMMENT ON TABLE global_config IS '全局配置表，存储系统配置参数';
COMMENT ON TABLE organizations IS '机构表，存储机构信息';
COMMENT ON TABLE invitation_codes IS '邀请码表，存储用户邀请码信息';
COMMENT ON TABLE system_messages IS '系统消息表，存储系统发送给用户的消息';
COMMENT ON TABLE message_templates IS '消息模板表，存储消息模板';

-- 完成消息
DO $$
BEGIN
    RAISE NOTICE '数据库建表脚本执行完成！';
    RAISE NOTICE '已创建15个表，包含所有必要的约束、索引、默认数据、RLS和审计触发器。';
    RAISE NOTICE '此版本为完整版，包含机构管理、邀请码、系统消息等新增功能。';
END $$;
