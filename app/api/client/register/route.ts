import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

/**
 * 客户端用户注册API
 * 
 * 功能：允许客户端用户使用邀请码注册账号
 * 流程：验证邀请码 → 检查用户名 → 创建用户(pending) → 更新邀请码 → 发送通知
 * 
 * 请求：POST /api/client/register
 * 响应：注册申请提交成功，状态为pending（需要管理员审核）
 */
export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const body = await req.json();
    const { 
      invite_code,      // 必填：邀请码
      username,         // 必填：用户名
      password,         // 必填：密码
      real_name,        // 必填：真实姓名
      phone,            // 必填：手机号
      email,            // 可选：邮箱
      id_card           // 可选：身份证
    } = body;
    
    // 验证必填字段
    if (!invite_code || !invite_code.trim()) {
      return clientError('邀请码不能为空', 400);
    }
    if (!username || !username.trim()) {
      return clientError('用户名不能为空', 400);
    }
    if (!password || !password.trim()) {
      return clientError('密码不能为空', 400);
    }
    if (!real_name || !real_name.trim()) {
      return clientError('真实姓名不能为空', 400);
    }
    if (!phone || !phone.trim()) {
      return clientError('手机号不能为空', 400);
    }
    
    // 密码强度验证（至少6位）
    if (password.length < 6) {
      return clientError('密码长度至少6位', 400);
    }
    
    // 手机号格式验证（简单验证）
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return clientError('手机号格式不正确', 400);
    }
    
    // 检查数据库连接
    if (!supabase) {
      return clientError('系统维护中，请稍后重试', 500);
    }
    
    // 1. 验证邀请码
    const { data: invite, error: inviteError } = await supabase
      .from('invitation_codes')
      .select('id, code, organization_id, status, max_uses, used_count, expires_at, created_by')
      .eq('code', invite_code.trim())
      .single();
    
    if (inviteError || !invite) {
      console.error('邀请码验证失败:', inviteError?.message || '邀请码不存在');
      return clientError('无效的邀请码', 400);
    }
    
    // 检查邀请码状态
    if (invite.status !== 'active') {
      return clientError('邀请码已禁用', 400);
    }
    
    // 检查邀请码有效期
    if (invite.expires_at) {
      const expiresDate = new Date(invite.expires_at);
      const now = new Date();
      if (expiresDate < now) {
        return clientError('邀请码已过期', 400);
      }
    }
    
    // 检查邀请码使用次数限制
    if (invite.max_uses && invite.used_count >= invite.max_uses) {
      return clientError('邀请码使用次数已达上限', 400);
    }
    
    // 2. 检查用户名是否已存在
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, username, status')
      .eq('username', username.trim())
      .maybeSingle();
    
    if (userCheckError) {
      console.error('检查用户名失败:', userCheckError.message);
      return clientError('系统错误，请稍后重试', 500);
    }
    
    if (existingUser) {
      if (existingUser.status === 'pending') {
        return clientError('该用户名已提交注册申请，请等待审核', 400);
      } else {
        return clientError('用户名已存在', 400);
      }
    }
    
    // 3. 加密密码
    const passwordHash = await bcrypt.hash(password, 10);
    
    // 4. 创建用户（状态为pending，需要审核）
    const newUser = {
      username: username.trim(),
      password_hash: passwordHash,
      real_name: real_name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : null,
      id_card: id_card ? id_card.trim() : null,
      organization_id: invite.organization_id,
      status: 'pending', // 需要管理员审核
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([newUser])
      .select('id, username, real_name, phone, status, created_at, organization_id')
      .single();
    
    if (userError) {
      console.error('用户创建失败:', userError.message);
      return clientError('用户创建失败: ' + userError.message, 500);
    }
    
    // 5. 更新邀请码使用计数
    const { error: updateInviteError } = await supabase
      .from('invitation_codes')
      .update({ 
        used_count: (invite.used_count || 0) + 1,
        last_used_at: new Date().toISOString(),
        last_used_by: user.id
      })
      .eq('id', invite.id);
    
    if (updateInviteError) {
      console.error('更新邀请码失败:', updateInviteError.message);
      // 不返回错误，继续执行，但记录日志
    }
    
    // 6. 发送注册成功通知（待审核）
    const { error: messageError } = await supabase
      .from('system_messages')
      .insert({
        user_id: user.id,
        type: 'registration_received',
        title: '注册申请已提交',
        content: `尊敬的${user.real_name}，您的注册申请已提交，请等待管理员审核。审核通过后即可登录系统。`,
        sent_by: invite.created_by || 'system',
        sent_at: new Date().toISOString(),
        read: false,
        created_at: new Date().toISOString()
      });
    
    if (messageError) {
      console.error('发送系统消息失败:', messageError.message);
      // 不返回错误，继续执行
    }
    
    // 7. 记录审计日志（可选）
    try {
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: null, // 客户端注册，无管理员
          admin_name: 'client_registration',
          action: 'user_register',
          target_type: 'user',
          target_id: user.id,
          description: `客户端用户注册: ${user.username}`,
          reason: `通过邀请码注册，邀请码: ${invite.code}`,
          created_at: new Date().toISOString()
        });
    } catch (auditError) {
      console.error('记录审计日志失败:', auditError);
      // 忽略审计日志错误
    }
    
    // 8. 返回成功响应
    return clientResponse({
      success: true,
      message: '注册申请已提交，请等待管理员审核',
      data: {
        user_id: user.id,
        username: user.username,
        real_name: user.real_name,
        phone: user.phone,
        status: user.status,
        organization_id: user.organization_id,
        created_at: user.created_at,
        next_step: '等待管理员审核，审核通过后会收到站内信通知'
      }
    });
    
  } catch (error: any) {
    // 全局异常处理
    console.error('客户端注册API异常:', error);
    
    // 根据错误类型返回不同的错误信息
    if (error.name === 'SyntaxError') {
      return clientError('请求数据格式错误', 400);
    }
    
    if (error.message && error.message.includes('JSON')) {
      return clientError('请求数据格式错误', 400);
    }
    
    return clientError('注册失败，请稍后重试: ' + error.message, 500);
  }
}

/**
 * 获取注册状态（可选功能）
 * GET /api/client/register?username=test_user
 * 用于检查用户名是否可用或注册状态
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    
    if (!username || !username.trim()) {
      return clientError('请提供用户名参数', 400);
    }
    
    if (!supabase) {
      return clientError('系统维护中', 500);
    }
    
    // 检查用户名是否已存在
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, status, created_at')
      .eq('username', username.trim())
      .maybeSingle();
    
    if (error) {
      console.error('查询用户失败:', error.message);
      return clientError('查询失败', 500);
    }
    
    if (user) {
      return clientResponse({
        available: false,
        username: user.username,
        status: user.status,
        registered_at: user.created_at,
        message: user.status === 'pending' 
          ? '该用户名已提交注册申请，请等待审核' 
          : '用户名已存在'
      });
    } else {
      return clientResponse({
        available: true,
        username: username.trim(),
        message: '用户名可用'
      });
    }
    
  } catch (error: any) {
    console.error('检查用户名API异常:', error);
    return clientError('检查失败: ' + error.message);
  }
}