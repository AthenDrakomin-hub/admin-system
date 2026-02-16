'use server';

import { createAdminClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { CreateUserRequest, CreateUserResponse } from '@/types/admin';

// 新建用户Server Action（核心）
export async function createUser(
  formData: CreateUserRequest
): Promise<CreateUserResponse> {
  try {
    // 使用管理员客户端（需要管理员权限）
    // 注意：这里假设调用者已经是管理员
    const adminClient = await createAdminClient('system'); // 使用系统账户或从会话获取

    // 1. 检查用户名是否已存在
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('username', formData.username)
      .single();

    if (existingUser) {
      return { success: false, error: '用户名已存在' };
    }

    // 2. 密码哈希（和客户端登录算法一致）
    const hashedPassword = await bcrypt.hash(formData.password, 10);

    // 3. 插入数据库（默认status: active）
    const { data: newUser, error } = await adminClient
      .from('users')
      .insert({
        username: formData.username,
        password_hash: hashedPassword,
        real_name: formData.real_name,
        phone: formData.phone,
        email: formData.email || null,
        status: formData.status || 'active', // 关键：默认active
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, username')
      .single();

    if (error) {
      console.error('创建用户失败:', error);
      return { success: false, error: '服务器内部错误' };
    }

    // 4. 重新验证用户列表路径，更新缓存
    revalidatePath('/admin/user/list');

    return {
      success: true,
      data: { id: newUser.id, username: newUser.username },
    };
  } catch (error) {
    console.error('创建用户异常:', error);
    return { success: false, error: (error as Error).message || '创建失败' };
  }
}