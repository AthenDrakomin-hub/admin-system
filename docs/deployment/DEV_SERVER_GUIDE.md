# 🚀 开发服务器启动指南

## 📋 前置条件

### 1. 检查 Node.js 版本

```bash
node --version
# 需要 v18 或更高版本
```

### 2. 检查 npm 版本

```bash
npm --version
# 需要 v9 或更高版本
```

### 3. 检查依赖安装

```bash
npm list
# 如果缺少依赖，运行：
npm install
```

---

## 🚀 启动开发服务器

### 方式1：直接启动（推荐）

```bash
npm run dev
```

### 方式2：指定端口启动

```bash
npm run dev -- -p 3001
```

### 方式3：使用 next 命令

```bash
npx next dev
```

---

## ✅ 启动成功标志

启动成功后，你会看到：

```
> zy-invest-admin@1.0.0 dev
> next dev

  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.5s
```

---

## 🌐 访问应用

### 登录页面
```
http://localhost:3000/login
```

### 管理后台
```
http://localhost:3000/admin/dashboard
```

### 默认登录凭证
```
用户名: admin
密码: admin123456
```

---

## 📊 开发服务器功能

### 自动重新加载
- 修改文件后自动刷新
- 支持 Fast Refresh

### 热模块替换
- 保留应用状态
- 快速更新

### 错误提示
- 编译错误实时显示
- 运行时错误提示

---

## 🔧 常见问题

### 问题1：端口 3000 已被占用

**症状**：
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案**：
```bash
# 方案1：使用其他端口
npm run dev -- -p 3001

# 方案2：杀死占用端口的进程
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### 问题2：依赖缺失

**症状**：
```
Error: Cannot find module 'next'
```

**解决方案**：
```bash
npm install
```

### 问题3：环境变量未加载

**症状**：
```
Error: NEXT_PUBLIC_SUPABASE_URL is not defined
```

**解决方案**：
1. 检查 `.env.local` 文件是否存在
2. 重启开发服务器
3. 检查环境变量格式

### 问题4：构建失败

**症状**：
```
Error: Build failed
```

**解决方案**：
```bash
# 清除缓存
rm -rf .next

# 重新启动
npm run dev
```

---

## 📈 性能优化

### 启用 SWC 编译器
已在 `next.config.js` 中配置

### 启用 Turbopack（可选）
```bash
npm run dev -- --turbo
```

### 启用调试模式
```bash
DEBUG=* npm run dev
```

---

## 🧪 测试开发服务器

### 1. 检查首页

```bash
curl http://localhost:3000
```

### 2. 检查登录页

```bash
curl http://localhost:3000/login
```

### 3. 检查 API

```bash
curl http://localhost:3000/api/user/status
```

---

## 📝 开发工作流

### 1. 启动服务器
```bash
npm run dev
```

### 2. 打开浏览器
```
http://localhost:3000
```

### 3. 登录
```
用户名: admin
密码: admin123456
```

### 4. 开发功能
- 修改代码
- 自动刷新
- 查看效果

### 5. 运行测试
```bash
node test-all-pages.js
node test-api-all.js
```

---

## 🛑 停止开发服务器

### 方式1：按 Ctrl+C
```
^C
```

### 方式2：关闭终端窗口

---

## 📊 开发服务器信息

### 配置文件
- `next.config.js` - Next.js 配置
- `tsconfig.json` - TypeScript 配置
- `tailwind.config.js` - Tailwind CSS 配置
- `postcss.config.js` - PostCSS 配置

### 环境变量
- `.env.local` - 本地环境变量

### 依赖
- `package.json` - 项目依赖

---

## 🎯 快速命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 运行 linter
npm run lint

# 运行页面测试
node test-all-pages.js

# 运行 API 测试
node test-api-all.js
```

---

## 📞 获取帮助

### 查看日志
```bash
# 启用详细日志
DEBUG=* npm run dev
```

### 检查配置
```bash
# 查看 Next.js 配置
cat next.config.js

# 查看 TypeScript 配置
cat tsconfig.json
```

### 查看依赖
```bash
# 列出所有依赖
npm list

# 检查过期依赖
npm outdated
```

---

## ✅ 启动检查清单

- [ ] Node.js 版本 >= 18
- [ ] npm 版本 >= 9
- [ ] 依赖已安装 (`npm install`)
- [ ] 环境变量已配置 (`.env.local`)
- [ ] 端口 3000 未被占用
- [ ] 运行 `npm run dev`
- [ ] 访问 `http://localhost:3000`
- [ ] 登录成功
- [ ] 页面加载正常

---

**开发服务器状态**：✅ 准备就绪
**访问地址**：http://localhost:3000
**默认用户**：admin / admin123456
