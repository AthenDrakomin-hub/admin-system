-- ============================================
-- RLS权限修复脚本
-- 解决"表格组织权限被拒绝"问题
-- ============================================

-- 1. 首先创建set_config函数（如果不存在）
CREATE OR REPLACE FUNCTION set_config(setting_name text, setting_value text)
RETURNS void AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 为用户表(users)创建RLS策略

-- 删除现有策略（如果存在）
DROP POLICY IF EXISTS users_select_admin ON users;
DROP POLICY IF EXISTS users_insert_admin ON users;
DROP POLICY IF EXISTS users_update_admin ON users;
DROP POLICY IF EXISTS users_delete_admin ON users;
DROP POLICY IF EXISTS users_select_client ON users;

-- 管理员：完整CRUD权限
CREATE POLICY users_select_admin ON users FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

CREATE POLICY users_insert_admin ON users FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

CREATE POLICY users_update_admin ON users FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

CREATE POLICY users_delete_admin ON users FOR DELETE
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

-- 客户端：仅能查看自己的记录
CREATE POLICY users_select_client ON users FOR SELECT
  USING (id = current_setting('app.current_user_id', true)::UUID);

-- 3. 为管理员表(admins)创建RLS策略

-- 删除现有策略
DROP POLICY IF EXISTS admins_select_super ON admins;
DROP POLICY IF EXISTS admins_insert_super ON admins;
DROP POLICY IF EXISTS admins_update_super ON admins;
DROP POLICY IF EXISTS admins_delete_super ON admins;

-- 仅超级管理员可以管理管理员账号
CREATE POLICY admins_select_super ON admins FOR SELECT
  USING ((SELECT role FROM admins WHERE username = current_setting('app.current_admin', true)) = 'super_admin');

CREATE POLICY admins_insert_super ON admins FOR INSERT
  WITH CHECK ((SELECT role FROM admins WHERE username = current_setting('app.current_admin', true)) = 'super_admin');

CREATE POLICY admins_update_super ON admins FOR UPDATE
  USING ((SELECT role FROM admins WHERE username = current_setting('app.current_admin', true)) = 'super_admin')
  WITH CHECK ((SELECT role FROM admins WHERE username = current_setting('app.current_admin', true)) = 'super_admin');

CREATE POLICY admins_delete_super ON admins FOR DELETE
  USING ((SELECT role FROM admins WHERE username = current_setting('app.current_admin', true)) = 'super_admin');

-- 4. 为订单表(orders)创建RLS策略

-- 删除现有策略
DROP POLICY IF EXISTS orders_select_admin ON orders;
DROP POLICY IF EXISTS orders_insert_admin ON orders;
DROP POLICY IF EXISTS orders_update_admin ON orders;
DROP POLICY IF EXISTS orders_delete_admin ON orders;
DROP POLICY IF EXISTS orders_select_client ON orders;
DROP POLICY IF EXISTS orders_insert_client ON orders;

-- 管理员：完整CRUD
CREATE POLICY orders_select_admin ON orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

CREATE POLICY orders_insert_admin ON orders FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

CREATE POLICY orders_update_admin ON orders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

CREATE POLICY orders_delete_admin ON orders FOR DELETE
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

-- 客户端：查+新增自己的订单
CREATE POLICY orders_select_client ON orders FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::UUID);

CREATE POLICY orders_insert_client ON orders FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::UUID);

-- 5. 为机构表(organizations)创建RLS策略

-- 删除现有策略
DROP POLICY IF EXISTS organizations_select_admin ON organizations;
DROP POLICY IF EXISTS organizations_insert_admin ON organizations;
DROP POLICY IF EXISTS organizations_update_admin ON organizations;
DROP POLICY IF EXISTS organizations_delete_admin ON organizations;

-- 管理员：完整CRUD
CREATE POLICY organizations_select_admin ON organizations FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

CREATE POLICY organizations_insert_admin ON organizations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

CREATE POLICY organizations_update_admin ON organizations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

CREATE POLICY organizations_delete_admin ON organizations FOR DELETE
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

-- 6. 为审计日志表(audit_logs)创建RLS策略

-- 删除现有策略
DROP POLICY IF EXISTS audit_select_super ON audit_logs;
DROP POLICY IF EXISTS audit_insert_admin ON audit_logs;
DROP POLICY IF EXISTS audit_no_update ON audit_logs;
DROP POLICY IF EXISTS audit_no_delete ON audit_logs;

-- 仅超级管理员可查询
CREATE POLICY audit_select_super ON audit_logs FOR SELECT
  USING ((SELECT role FROM admins WHERE username = current_setting('app.current_admin', true)) = 'super_admin');

-- 所有管理员可新增
CREATE POLICY audit_insert_admin ON audit_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

-- 禁止修改/删除审计日志
CREATE POLICY audit_no_update ON audit_logs FOR UPDATE USING (false);
CREATE POLICY audit_no_delete ON audit_logs FOR DELETE USING (false);

-- 7. 为其他关键表创建基本RLS策略

-- 持仓表(positions)
DROP POLICY IF EXISTS positions_select_admin ON positions;
DROP POLICY IF EXISTS positions_select_client ON positions;

CREATE POLICY positions_select_admin ON positions FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

CREATE POLICY positions_select_client ON positions FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::UUID);

-- 交易流水表(transaction_flows)
DROP POLICY IF EXISTS transaction_flows_select_admin ON transaction_flows;
DROP POLICY IF EXISTS transaction_flows_select_client ON transaction_flows;

CREATE POLICY transaction_flows_select_admin ON transaction_flows FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

CREATE POLICY transaction_flows_select_client ON transaction_flows FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::UUID);

-- 充值申请表(recharge_requests)
DROP POLICY IF EXISTS recharge_requests_select_admin ON recharge_requests;
DROP POLICY IF EXISTS recharge_requests_select_client ON recharge_requests;

CREATE POLICY recharge_requests_select_admin ON recharge_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

CREATE POLICY recharge_requests_select_client ON recharge_requests FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::UUID);

-- 提现申请表(withdraw_requests)
DROP POLICY IF EXISTS withdraw_requests_select_admin ON withdraw_requests;
DROP POLICY IF EXISTS withdraw_requests_select_client ON withdraw_requests;

CREATE POLICY withdraw_requests_select_admin ON withdraw_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

CREATE POLICY withdraw_requests_select_client ON withdraw_requests FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::UUID);

-- 8. 输出完成信息
DO $$
BEGIN
  RAISE NOTICE 'RLS权限策略已成功创建！';
  RAISE NOTICE '已为以下表创建策略：';
  RAISE NOTICE '- users (用户表)';
  RAISE NOTICE '- admins (管理员表)';
  RAISE NOTICE '- orders (订单表)';
  RAISE NOTICE '- organizations (机构表)';
  RAISE NOTICE '- audit_logs (审计日志表)';
  RAISE NOTICE '- positions (持仓表)';
  RAISE NOTICE '- transaction_flows (交易流水表)';
  RAISE NOTICE '- recharge_requests (充值申请表)';
  RAISE NOTICE '- withdraw_requests (提现申请表)';
  RAISE NOTICE '';
  RAISE NOTICE '使用方法：';
  RAISE NOTICE '1. 在Supabase SQL Editor中执行此脚本';
  RAISE NOTICE '2. 确保API使用createAdminClient函数创建Supabase客户端';
  RAISE NOTICE '3. 系统管理员现在可以正常创建用户了';
END $$;