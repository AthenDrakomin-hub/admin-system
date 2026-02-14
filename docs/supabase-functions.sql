-- Supabase 存储过程脚本
-- 适用于银河证券-证裕交易单元管理系统

-- 1. 更新持仓存储过程
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
    -- 获取当前市场价格（这里可以调用行情接口，此处简化）
    SELECT p_price INTO v_current_price;
    
    -- 获取现有持仓
    SELECT quantity, avg_cost 
    INTO v_existing_quantity, v_existing_avg_cost
    FROM positions 
    WHERE user_id = p_user_id AND symbol = p_symbol;
    
    -- 如果持仓不存在，创建新持仓
    IF v_existing_quantity IS NULL THEN
        v_existing_quantity := 0;
        v_existing_avg_cost := 0;
    END IF;
    
    -- 计算新的持仓数量和平均成本
    v_new_quantity := v_existing_quantity + p_quantity_change;
    
    IF v_new_quantity = 0 THEN
        v_new_avg_cost := 0;
    ELSE
        v_new_avg_cost := (
            (v_existing_quantity * v_existing_avg_cost) + 
            (p_quantity_change * p_price)
        ) / v_new_quantity;
    END IF;
    
    -- 更新或插入持仓
    INSERT INTO positions (user_id, symbol, quantity, avg_cost, market_value, updated_at)
    VALUES (p_user_id, p_symbol, v_new_quantity, v_new_avg_cost, v_new_quantity * v_current_price, NOW())
    ON CONFLICT (user_id, symbol) 
    DO UPDATE SET 
        quantity = EXCLUDED.quantity,
        avg_cost = EXCLUDED.avg_cost,
        market_value = EXCLUDED.market_value,
        updated_at = NOW();
    
    -- 返回结果
    RETURN QUERY 
    SELECT v_new_quantity, v_new_avg_cost, v_new_quantity * v_current_price;
END;
$$ LANGUAGE plpgsql;

-- 2. 获取用户未结清金额
CREATE OR REPLACE FUNCTION get_unsettled_amount(p_user_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    v_total DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total
    FROM transaction_flows
    WHERE user_id = p_user_id AND settled = FALSE;
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- 3. 结清用户流水
CREATE OR REPLACE FUNCTION settle_user_flows(
    p_user_id UUID,
    p_flow_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_flow_ids IS NULL THEN
        -- 结清所有未结清流水
        UPDATE transaction_flows
        SET settled = TRUE
        WHERE user_id = p_user_id AND settled = FALSE;
    ELSE
        -- 结清指定流水
        UPDATE transaction_flows
        SET settled = TRUE
        WHERE user_id = p_user_id AND id = ANY(p_flow_ids);
    END IF;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 4. 获取待办统计
CREATE OR REPLACE FUNCTION get_pending_stats()
RETURNS TABLE (
    pending_trades BIGINT,
    pending_recharges BIGINT,
    pending_withdraws BIGINT,
    abnormal_orders BIGINT
) AS $$
BEGIN
    -- 待审核交易
    SELECT COUNT(*) INTO pending_trades
    FROM orders 
    WHERE status = 'pending';
    
    -- 待审核充值
    SELECT COUNT(*) INTO pending_recharges
    FROM recharge_requests 
    WHERE status = 'pending';
    
    -- 待审核提现
    SELECT COUNT(*) INTO pending_withdraws
    FROM withdraw_requests 
    WHERE status = 'pending';
    
    -- 异常订单（被驳回的）
    SELECT COUNT(*) INTO abnormal_orders
    FROM orders 
    WHERE status = 'rejected';
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 5. 切换用户状态
CREATE OR REPLACE FUNCTION toggle_user_status(
    p_user_id UUID,
    p_new_status VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_status VARCHAR(20);
BEGIN
    -- 获取当前状态
    SELECT status INTO v_current_status
    FROM users 
    WHERE id = p_user_id;
    
    IF v_current_status IS NULL THEN
        RETURN FALSE; -- 用户不存在
    END IF;
    
    -- 验证新状态是否有效
    IF p_new_status NOT IN ('active', 'frozen', 'disabled') THEN
        RETURN FALSE;
    END IF;
    
    -- 更新状态
    UPDATE users 
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. 获取用户持仓详情
CREATE OR REPLACE FUNCTION get_user_positions(p_user_id UUID)
RETURNS TABLE (
    symbol VARCHAR(20),
    quantity INTEGER,
    available_quantity INTEGER,
    avg_cost DECIMAL(15,2),
    market_value DECIMAL(15,2),
    profit_loss DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.symbol,
        p.quantity,
        p.available_quantity,
        p.avg_cost,
        p.market_value,
        (p.market_value - (p.quantity * p.avg_cost)) AS profit_loss
    FROM positions p
    WHERE p.user_id = p_user_id AND p.quantity > 0
    ORDER BY p.market_value DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建订单并更新资金
CREATE OR REPLACE FUNCTION create_order_with_funds(
    p_user_id UUID,
    p_trade_type VARCHAR(20),
    p_symbol VARCHAR(20),
    p_side VARCHAR(10),
    p_quantity INTEGER,
    p_price DECIMAL(15,2),
    p_amount DECIMAL(15,2)
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_user_balance DECIMAL(15,2);
    v_currency VARCHAR(3);
BEGIN
    -- 确定货币
    v_currency := CASE 
        WHEN p_trade_type IN ('hk_share') THEN 'HKD' 
        ELSE 'CNY' 
    END;
    
    -- 检查用户余额（简化版，实际需要检查对应货币余额）
    IF p_side = 'buy' THEN
        -- 检查资金是否充足
        SELECT balance_cny INTO v_user_balance
        FROM users 
        WHERE id = p_user_id;
        
        IF v_user_balance < p_amount THEN
            RAISE EXCEPTION 'Insufficient balance';
        END IF;
        
        -- 冻结资金
        UPDATE users 
        SET frozen_balance = frozen_balance + p_amount,
            updated_at = NOW()
        WHERE id = p_user_id;
    END IF;
    
    -- 创建订单
    INSERT INTO orders (
        user_id, trade_type, symbol, side, quantity, price, amount, status, trade_data
    ) VALUES (
        p_user_id, p_trade_type, p_symbol, p_side, p_quantity, p_price, p_amount, 'pending',
        jsonb_build_object(
            'currency', v_currency,
            'created_at', NOW()
        )
    ) RETURNING id INTO v_order_id;
    
    -- 创建交易流水
    INSERT INTO transaction_flows (
        user_id, type, amount, currency, related_order_id
    ) VALUES (
        p_user_id, 'trade', p_amount, v_currency, v_order_id
    );
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- 8. 审核订单并更新持仓
CREATE OR REPLACE FUNCTION approve_order(
    p_order_id UUID,
    p_admin_id UUID,
    p_approve BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
    v_order RECORD;
    v_new_status VARCHAR(20);
BEGIN
    -- 获取订单详情
    SELECT * INTO v_order
    FROM orders 
    WHERE id = p_order_id AND status = 'pending';
    
    IF v_order IS NULL THEN
        RETURN FALSE; -- 订单不存在或不是待审核状态
    END IF;
    
    -- 确定新状态
    IF p_approve THEN
        v_new_status := 'approved';
        
        -- 更新持仓
        PERFORM upsert_position(
            v_order.user_id,
            v_order.symbol,
            CASE WHEN v_order.side = 'buy' THEN v_order.quantity ELSE -v_order.quantity END,
            v_order.price
        );
        
        -- 解冻/扣除资金
        IF v_order.side = 'buy' THEN
            UPDATE users 
            SET 
                frozen_balance = frozen_balance - v_order.amount,
                balance_cny = balance_cny - v_order.amount,
                updated_at = NOW()
            WHERE id = v_order.user_id;
        ELSE -- sell
            UPDATE users 
            SET 
                balance_cny = balance_cny + v_order.amount,
                updated_at = NOW()
            WHERE id = v_order.user_id;
        END IF;
        
        -- 更新流水为已结清
        UPDATE transaction_flows 
        SET settled = TRUE
        WHERE related_order_id = p_order_id;
    ELSE
        v_new_status := 'rejected';
        
        -- 如果是买单，解冻资金
        IF v_order.side = 'buy' THEN
            UPDATE users 
            SET frozen_balance = frozen_balance - v_order.amount,
                updated_at = NOW()
            WHERE id = v_order.user_id;
        END IF;
    END IF;
    
    -- 更新订单状态
    UPDATE orders 
    SET 
        status = v_new_status,
        approved_by = p_admin_id,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 注释
COMMENT ON FUNCTION upsert_position IS '更新或插入用户持仓，计算平均成本';
COMMENT ON FUNCTION get_unsettled_amount IS '获取用户未结清流水总金额';
COMMENT ON FUNCTION settle_user_flows IS '结清用户指定或所有未结清流水';
COMMENT ON FUNCTION get_pending_stats IS '获取系统待办统计（待审核交易、充值、提现、异常订单）';
COMMENT ON FUNCTION toggle_user_status IS '切换用户状态（active/frozen/disabled）';
COMMENT ON FUNCTION get_user_positions IS '获取用户持仓详情，包括盈亏计算';
COMMENT ON FUNCTION create_order_with_funds IS '创建订单并冻结/检查资金，返回订单ID';
COMMENT ON FUNCTION approve_order IS '审核订单，更新持仓和资金，返回是否成功';
