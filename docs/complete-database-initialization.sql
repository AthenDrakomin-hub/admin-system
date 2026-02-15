-- 完整的数据库初始化脚本（简化版）
-- 整合了所有必要的数据库对象
-- 执行此脚本将创建完整的数据库结构

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建表（按依赖顺序）
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    real_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    balance_cny DECIMAL(15,2) DEFAULT 0.00,
    balance_hkd DECIMAL(15,2) DEFAULT 0.00,
    frozen_balance DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending',
    organization_id UUID REFERENCES organizations(id),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    reject_reason TEXT,
    invitation_code VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trade_type VARCHAR(30) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(15,2),
    amount DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'pending',
    trade_data JSONB,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE transaction_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY',
    settled BOOLEAN DEFAULT FALSE,
    related_order_id UUID REFERENCES orders(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recharge_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY',
    bank_account VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE withdraw_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY',
    bank_account VARCHAR(100) NOT NULL,
    flow_settled BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE ipo_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ipo_code VARCHAR(20) NOT NULL,
    ipo_name VARCHAR(100),
    apply_quantity INTEGER NOT NULL,
    apply_amount DECIMAL(15,2),
    qualification_status VARCHAR(20) DEFAULT 'pending',
    lottery_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    status VARCHAR(20) DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE global_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invitation_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    sent_by UUID,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加约束
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('pending', 'active', 'rejected', 'disabled'));
ALTER TABLE orders ADD CONSTRAINT orders_trade_type_check CHECK (trade_type IN ('a_share', 'hk_share', 'ipo', 'block', 'board', 'conditional', 'abnormal'));
ALTER TABLE orders ADD CONSTRAINT orders_side_check CHECK (side IN ('buy', 'sell'));
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled'));
ALTER TABLE transaction_flows ADD CONSTRAINT transaction_flows_type_check CHECK (type IN ('recharge', 'withdraw', 'trade', 'fee', 'dividend'));
ALTER TABLE transaction_flows ADD CONSTRAINT transaction_flows_currency_check CHECK (currency IN ('CNY', 'HKD'));
ALTER TABLE recharge_requests ADD CONSTRAINT recharge_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE withdraw_requests ADD CONSTRAINT withdraw_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE ipo_applications ADD CONSTRAINT ipo_applications_qualification_status_check CHECK (qualification_status IN ('pending', 'qualified', 'unqualified'));
ALTER TABLE ipo_applications ADD CONSTRAINT ipo_applications_lottery_status_check CHECK (lottery_status IN ('pending', 'won', 'lost'));
ALTER TABLE admins ADD CONSTRAINT admins_role_check CHECK (role IN ('admin', 'super_admin', 'auditor'));
ALTER TABLE admins ADD CONSTRAINT admins_status_check CHECK (status IN ('active', 'disabled'));
ALTER TABLE organizations ADD CONSTRAINT organizations_status_check CHECK (status IN ('active', 'disabled'));
ALTER TABLE invitation_codes ADD CONSTRAINT invitation_codes_status_check CHECK (status IN ('active', 'disabled', 'expired'));
ALTER TABLE system_messages ADD CONSTRAINT system_messages_type_check CHECK (type IN ('system', 'audit_approved', 'audit_rejected', 'trade', 'finance'));

-- 创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_trade_type ON orders(trade_type);
CREATE INDEX idx_positions_user_id ON positions(user_id);
CREATE INDEX idx_positions_symbol ON positions(symbol);
CREATE INDEX idx_transaction_flows_user_id ON transaction_flows(user_id);
CREATE INDEX idx_transaction_flows_settled ON transaction_flows(settled);
CREATE INDEX idx_recharge_requests_user_id ON recharge_requests(user_id);
CREATE INDEX idx_withdraw_requests_user_id ON withdraw_requests(user_id);
CREATE INDEX idx_audit_logs_operator_id ON audit_logs(operator_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_ipo_applications_user_id ON ipo_applications(user_id);
CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX idx_system_messages_user_id ON system_messages(user_id);

-- 插入默认数据
INSERT INTO organizations (id, name, code, status) VALUES
('00000000-0000-0000-0000-000000000001', '默认机构', 'DEFAULT', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO admins (username, password_hash, role) 
VALUES ('admin', '$2a$10$YourHashedPasswordHere', 'super_admin')
ON CONFLICT (username) DO NOTHING;

INSERT INTO global_config (config_key, config_value, description) VALUES
('exchange_rate_cny_hkd', '0.88', 'CNY兑HKD汇率'),
('trade_fee_rate', '0.0003', '交易手续费率'),
('board_trade_limit', '1000000', '打板交易限额'),
('block_trade_threshold', '5000000', '大宗交易门槛'),
('withdraw_min_amount', '100', '最小提现金额'),
('withdraw_max_amount', '50000', '最大提现金额')
ON CONFLICT (config_key) DO NOTHING;

-- 启用行级安全
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
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;

-- 创建审计触发器函数
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

-- 创建审计触发器
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_orders_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 核心业务函数
CREATE OR REPLACE FUNCTION upsert_position(
    p_user_id UUID,
    p_symbol VARCHAR(20),
    p_quantity_change INTEGER,
    p_price DECIMAL(15,2)
)
RETURNS TABLE (
    new_quantity INTEGER,
    new_avg_cost DECIMAL(15,2),
    new_market_value DECIMAL(15,2)
) AS $$
DECLARE
    v_existing_quantity INTEGER;
    v_existing_avg_cost DECIMAL(15,2);
    v_new_quantity INTEGER;
    v_new_avg_cost DECIMAL(15,2);
    v_current_price DECIMAL(15,2);
BEGIN
    SELECT p_price INTO v_current_price;
    SELECT quantity, avg_cost INTO v_existing_quantity, v_existing_avg_cost
    FROM positions WHERE user_id = p_user_id AND symbol = p_symbol;
    
    IF v_existing_quantity IS NULL THEN
        v_existing_quantity := 0;
        v_existing_avg_cost := 0;
    END IF;
    
    v_new_quantity := v_existing_quantity + p_quantity_change;
    
    IF v_new_quantity = 0 THEN
        v_new_avg_cost := 0;
    ELSE
        v_new_avg_cost := (
            (v_existing_quantity * v_existing_avg_cost) + 
            (p_quantity_change * p_price)
        ) / v_new_quantity;
    END IF;
    
    INSERT INTO positions (user_id, symbol, quantity, avg_cost, market_value, updated_at)
    VALUES (p_user_id, p_symbol, v_new_quantity, v_new_avg_cost, v_new_quantity * v_current_price, NOW())
    ON CONFLICT (user_id, symbol) 
    DO UPDATE SET 
        quantity = EXCLUDED.quantity,
        avg_cost = EXCLUDED.avg_cost,
        market_value = EXCLUDED.market_value,
        updated_at = NOW();
    
    RETURN QUERY SELECT v_new_quantity, v_new_avg_cost, v_new_quantity * v_current_price;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_pending_stats()
RETURNS TABLE (
    pending_trades BIGINT,
    pending_recharges BIGINT,
    pending_withdraws BIGINT,
    abnormal_orders BIGINT
) AS $$
BEGIN
    SELECT COUNT(*) INTO pending_trades FROM orders WHERE status = 'pending';
    SELECT COUNT(*) INTO pending_recharges FROM recharge_requests WHERE status = 'pending';
    SELECT COUNT(*) INTO pending_withdraws FROM withdraw_requests WHERE status = 'pending';
    SELECT COUNT(*) INTO abnormal_orders FROM orders WHERE status = 'rejected';
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 完成消息
DO $$
BEGIN
    RAISE NOTICE '数据库初始化完成！';
    RAISE NOTICE '已创建13个表，所有约束、索引、默认数据、RLS、触发器和核心函数。';
END $$;
