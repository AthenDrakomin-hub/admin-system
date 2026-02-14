-- Supabase 数据库建表脚本
-- 适用于银河证券-证裕交易单元管理系统

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    real_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    balance_cny DECIMAL(15,2) DEFAULT 0.00,
    balance_hkd DECIMAL(15,2) DEFAULT 0.00,
    frozen_balance DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'disabled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 订单表
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trade_type VARCHAR(20) NOT NULL CHECK (trade_type IN ('a_share', 'hk_share', 'ipo', 'block', 'board')),
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity INTEGER NOT NULL,
    price DECIMAL(15,2),
    amount DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
    trade_data JSONB,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 持仓表
CREATE TABLE positions (
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
CREATE TABLE transaction_flows (
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
CREATE TABLE recharge_requests (
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
CREATE TABLE withdraw_requests (
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

-- 审计日志表
CREATE TABLE audit_logs (
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 新股申购表
CREATE TABLE ipo_applications (
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
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'auditor')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 全局配置表
CREATE TABLE global_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能

-- 用户表索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 订单表索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_trade_type ON orders(trade_type);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 持仓表索引
CREATE INDEX idx_positions_user_id ON positions(user_id);
CREATE INDEX idx_positions_symbol ON positions(symbol);

-- 流水表索引
CREATE INDEX idx_transaction_flows_user_id ON transaction_flows(user_id);
CREATE INDEX idx_transaction_flows_type ON transaction_flows(type);
CREATE INDEX idx_transaction_flows_settled ON transaction_flows(settled);
CREATE INDEX idx_transaction_flows_created_at ON transaction_flows(created_at);

-- 充值提现索引
CREATE INDEX idx_recharge_requests_user_id ON recharge_requests(user_id);
CREATE INDEX idx_recharge_requests_status ON recharge_requests(status);
CREATE INDEX idx_withdraw_requests_user_id ON withdraw_requests(user_id);
CREATE INDEX idx_withdraw_requests_status ON withdraw_requests(status);

-- 审计日志索引
CREATE INDEX idx_audit_logs_operator_id ON audit_logs(operator_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- 新股申购索引
CREATE INDEX idx_ipo_applications_user_id ON ipo_applications(user_id);
CREATE INDEX idx_ipo_applications_ipo_code ON ipo_applications(ipo_code);

-- 管理员索引
CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_admins_role ON admins(role);

-- 插入默认管理员账号 (密码: admin123456)
INSERT INTO admins (username, password_hash, role) 
VALUES ('admin', '$2a$10$YourHashedPasswordHere', 'super_admin')
ON CONFLICT (username) DO NOTHING;

-- 插入默认全局配置
INSERT INTO global_config (config_key, config_value, description) VALUES
('exchange_rate_cny_hkd', '0.88', 'CNY兑HKD汇率'),
('trade_fee_rate', '0.0003', '交易手续费率'),
('board_trade_limit', '1000000', '打板交易限额'),
('block_trade_threshold', '5000000', '大宗交易门槛'),
('withdraw_min_amount', '100', '最小提现金额'),
('withdraw_max_amount', '50000', '最大提现金额')
ON CONFLICT (config_key) DO NOTHING;

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
