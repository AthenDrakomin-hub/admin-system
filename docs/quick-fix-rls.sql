-- ============================================
-- RLS快速修复脚本
-- 解决"组织权限被拒绝"问题
-- ============================================

-- 1. 确保set_config函数存在（简化版）
CREATE OR REPLACE FUNCTION set_config(setting_name text, setting_value text)
RETURNS void AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 确保RLS已启用
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- 3. 创建最基本的RLS策略（先允许所有管理员操作）

-- users表策略
DROP POLICY IF EXISTS users_admin_all ON users;
CREATE POLICY users_admin_all ON users FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

-- organizations表策略  
DROP POLICY IF EXISTS organizations_admin_all ON organizations;
CREATE POLICY organizations_admin_all ON organizations FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE username = current_setting('app.current_admin', true)));

-- 4. 确保有默认机构数据
INSERT INTO organizations (id, name, code, status) VALUES
  ('00000000-0000-0000-0000-000000000001', '默认机构', 'DEFAULT', 'active')
ON CONFLICT (id) DO NOTHING;

-- 5. 测试数据：确保有超级管理员
INSERT INTO admins (username, password_hash, role, status) 
VALUES ('admin', '$2b$10$jz7w9.tQjrtYwGssZkWYzO6EsehZGRcF9X5WQeUS7/RQn5EkeO/02', 'super_admin', 'active')
ON CONFLICT (username) DO NOTHING;

-- 6. 输出完成信息
DO $$
BEGIN
  RAISE NOTICE '✅ RLS快速修复完成！';
  RAISE NOTICE '✅ set_config函数已创建/更新';
  RAISE NOTICE '✅ users、organizations、admins表已启用RLS';
  RAISE NOTICE '✅ 创建了基本RLS策略（允许所有管理员操作）';
  RAISE NOTICE '✅ 确保有默认机构数据';
  RAISE NOTICE '✅ 确保有超级管理员账号';
  RAISE NOTICE '';
  RAISE NOTICE '📋 下一步：';
  RAISE NOTICE '1. 重新尝试在新建用户页面创建用户';
  RAISE NOTICE '2. 如果仍然失败，请检查API是否使用createAdminClient函数';
  RAISE NOTICE '3. 查看具体错误信息';
END $$;