-- ============================================
-- RLS权限问题诊断脚本
-- 诊断"组织权限被拒绝"问题
-- ============================================

-- 1. 检查set_config函数是否存在
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'set_config' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE NOTICE '✅ set_config函数已存在';
  ELSE
    RAISE NOTICE '❌ set_config函数不存在，需要创建';
    RAISE NOTICE '执行以下命令创建：';
    RAISE NOTICE 'CREATE OR REPLACE FUNCTION set_config(setting_name text, setting_value text)';
    RAISE NOTICE 'RETURNS void AS $$';
    RAISE NOTICE 'BEGIN';
    RAISE NOTICE '  PERFORM set_config(setting_name, setting_value, false);';
    RAISE NOTICE 'END;';
    RAISE NOTICE '$$ LANGUAGE plpgsql SECURITY DEFINER;';
  END IF;
END $$;

-- 2. 检查各表RLS是否启用
DO $$
DECLARE
  table_record RECORD;
BEGIN
  RAISE NOTICE '=== 检查表RLS状态 ===';
  
  FOR table_record IN 
    SELECT schemaname, tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('users', 'admins', 'organizations', 'orders', 'audit_logs')
  LOOP
    IF table_record.rowsecurity THEN
      RAISE NOTICE '✅ 表 % 已启用RLS', table_record.tablename;
    ELSE
      RAISE NOTICE '❌ 表 % 未启用RLS', table_record.tablename;
    END IF;
  END LOOP;
END $$;

-- 3. 检查各表的RLS策略
DO $$
DECLARE
  policy_record RECORD;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '=== 检查RLS策略 ===';
  
  FOR policy_record IN 
    SELECT schemaname, tablename, policyname, permissive, roles, cmd
    FROM pg_policies 
    WHERE schemaname = 'public'
    ORDER BY tablename, cmd
  LOOP
    RAISE NOTICE '表: %, 策略: %, 操作: %, 角色: %', 
      policy_record.tablename, 
      policy_record.policyname,
      policy_record.cmd,
      policy_record.roles;
  END LOOP;
  
  -- 统计各表策略数量
  RAISE NOTICE '=== 各表策略数量统计 ===';
  FOR policy_record IN 
    SELECT tablename, COUNT(*) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    GROUP BY tablename
    ORDER BY tablename
  LOOP
    RAISE NOTICE '表 %: % 个策略', policy_record.tablename, policy_record.policy_count;
  END LOOP;
END $$;

-- 4. 检查users表的具体策略
DO $$
BEGIN
  RAISE NOTICE '=== users表详细策略 ===';
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND cmd = 'INSERT'
  ) THEN
    RAISE NOTICE '✅ users表有INSERT策略';
    
    -- 显示INSERT策略详情
    FOR policy_record IN 
      SELECT policyname, qual, with_check
      FROM pg_policies 
      WHERE tablename = 'users' AND cmd = 'INSERT'
    LOOP
      RAISE NOTICE '策略名: %, 条件: %, WITH CHECK: %', 
        policy_record.policyname,
        policy_record.qual,
        policy_record.with_check;
    END LOOP;
  ELSE
    RAISE NOTICE '❌ users表没有INSERT策略';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND cmd = 'SELECT'
  ) THEN
    RAISE NOTICE '✅ users表有SELECT策略';
  ELSE
    RAISE NOTICE '❌ users表没有SELECT策略';
  END IF;
END $$;

-- 5. 检查organizations表策略
DO $$
BEGIN
  RAISE NOTICE '=== organizations表详细策略 ===';
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' AND cmd = 'INSERT'
  ) THEN
    RAISE NOTICE '✅ organizations表有INSERT策略';
  ELSE
    RAISE NOTICE '❌ organizations表没有INSERT策略';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' AND cmd = 'SELECT'
  ) THEN
    RAISE NOTICE '✅ organizations表有SELECT策略';
  ELSE
    RAISE NOTICE '❌ organizations表没有SELECT策略';
  END IF;
END $$;

-- 6. 测试set_config函数
DO $$
BEGIN
  RAISE NOTICE '=== 测试set_config函数 ===';
  
  BEGIN
    -- 尝试设置上下文
    PERFORM set_config('app.current_admin', 'admin');
    RAISE NOTICE '✅ set_config函数可以正常执行';
    
    -- 检查设置的值
    RAISE NOTICE '当前设置的值: %', current_setting('app.current_admin', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ set_config函数执行失败: %', SQLERRM;
  END;
END $$;

-- 7. 检查外键约束
DO $$
BEGIN
  RAISE NOTICE '=== 检查外键约束 ===';
  
  -- 检查users表的organization_id外键
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'users' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.column_name = 'organization_id'
  ) THEN
    RAISE NOTICE '✅ users表有organization_id外键约束';
    
    -- 显示外键详情
    FOR fk_record IN 
      SELECT tc.constraint_name, ccu.table_name AS referenced_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'users' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.column_name = 'organization_id'
    LOOP
      RAISE NOTICE '外键名: %, 引用表: %', fk_record.constraint_name, fk_record.referenced_table;
    END LOOP;
  ELSE
    RAISE NOTICE '❌ users表没有organization_id外键约束';
  END IF;
END $$;

-- 8. 检查默认机构数据
DO $$
DECLARE
  org_count INTEGER;
BEGIN
  RAISE NOTICE '=== 检查机构数据 ===';
  
  SELECT COUNT(*) INTO org_count FROM organizations;
  
  IF org_count > 0 THEN
    RAISE NOTICE '✅ organizations表中有 % 条记录', org_count;
    
    -- 显示机构列表
    FOR org_record IN 
      SELECT id, name, code, status 
      FROM organizations 
      LIMIT 5
    LOOP
      RAISE NOTICE '机构: ID=%, 名称=%, 代码=%, 状态=%', 
        org_record.id, org_record.name, org_record.code, org_record.status;
    END LOOP;
  ELSE
    RAISE NOTICE '❌ organizations表中没有数据';
    RAISE NOTICE '建议插入默认机构：';
    RAISE NOTICE 'INSERT INTO organizations (id, name, code, status) VALUES';
    RAISE NOTICE '  (''00000000-0000-0000-0000-000000000001'', ''默认机构'', ''DEFAULT'', ''active'')';
    RAISE NOTICE '  ON CONFLICT (id) DO NOTHING;';
  END IF;
END $$;

-- 9. 建议的修复步骤
DO $$
BEGIN
  RAISE NOTICE '=== 建议修复步骤 ===';
  RAISE NOTICE '1. 如果set_config函数不存在，先创建它';
  RAISE NOTICE '2. 如果表未启用RLS，执行: ALTER TABLE 表名 ENABLE ROW LEVEL SECURITY;';
  RAISE NOTICE '3. 如果缺少策略，执行fix-rls-permissions.sql脚本';
  RAISE NOTICE '4. 如果organizations表为空，插入默认机构数据';
  RAISE NOTICE '5. 测试创建用户时，如果不指定organization_id，使用NULL值';
  RAISE NOTICE '';
  RAISE NOTICE '注意：创建用户时organization_id字段可以为NULL';
END $$;