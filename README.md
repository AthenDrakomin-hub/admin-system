# ZY Investment Admin System

## 项目简介
中国银河证券 - 证裕投资交易单元 Admin 管理系统

基于 Next.js 14 的现代化证券交易管理后台，支持多类型交易审核、用户管理、财务审核等功能。

## ✅ 实现状态

**核心业务逻辑已 100% 实现！**

- ✅ 订单全流程（提交→审核→成交→流水）
- ✅ 充值全流程（申请→审核→到账→流水）
- ✅ 提现全流程（申请→校验→审核→扣款→流水）
- ✅ 资金管理（冻结/解冻/增减）
- ✅ 持仓管理（买入/卖出）
- ✅ 流水管理（生成/查询/结清）
- ✅ 审计日志（所有关键操作）

**查看详细实现报告**: [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)

## 域名
- 管理系统: https://jxfdfsfresh.vip
- 客户端 Web: https://www.zhengyutouzi.com/

## 技术栈
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (主色银河蓝 #0052D9)
- Supabase (数据库)
- Vercel KV (缓存)
- lucide-react (图标)

## 设计风格
2026 现代化金融后台 - 极简高效、数据清晰、一键操作、响应式布局

## 权限体系
- **系统管理员**: 全部功能 + 管理员账号管理
- **普通管理员**: 全部业务功能（不可管理管理员）

## 目录结构
详见项目根目录结构说明

## 快速开始

**⚡ 5分钟快速启动**: [QUICK_START.md](./QUICK_START.md)

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（Supabase）
cp .env.example .env.local
# 编辑 .env.local 填入 Supabase 配置

# 3. 初始化数据库
# 在 Supabase SQL Editor 中执行:
# - supabase-schema.sql (建表)
# - test-data.sql (测试数据)

# 4. 启动开发服务器
npm run dev

# 5. 测试 API（可选）
node test-api.js
```

访问: http://localhost:3000

## 部署
```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 功能模块

### 核心业务（100%完成）
- ✅ **交易审核**：A股/港股/IPO/大宗/打板 - 完整流程
  - 订单提交、资金冻结、审核通过/驳回、持仓更新、资金结算、流水生成
- ✅ **用户管理**：列表/资金/持仓/订单/流水 - 完整CRUD
- ✅ **财务审核**：充值/提现 - 完整流程
  - 申请提交、余额校验、审核通过/驳回、资金变动、流水生成
- ✅ **系统配置**：参数/管理员/审计 - 完整功能
- ✅ **行情管理**：实时行情拉取 - 缓存机制

### 技术特性
- 🔒 **事务安全**：所有资金操作保证原子性
- 📝 **审计追踪**：所有关键操作自动记录
- 🚀 **即开即用**：配置完成即可运行
- 💾 **真实数据库**：Supabase完整集成
- ⚡ **高性能**：索引优化、查询优化

## 文档
- ⚡ [**快速启动**](./QUICK_START.md) - 5分钟快速上手
- ✅ [**实现报告**](./IMPLEMENTATION_COMPLETE.md) - 核心业务100%完成
- 📚 [**文档索引**](./DOCS_INDEX.md) - 所有文档导航
- 📊 [**前后对比**](./BEFORE_AFTER.md) - 实现前后对比
- ✨ [**实现亮点**](./HIGHLIGHTS.md) - 技术亮点总结
- 📁 [**文件变更**](./FILE_CHANGES.md) - 变更清单
- 🛡️ [**异常兜底**](./FALLBACK_FLOW.md) - 异常兜底流程
- 🚀 [**Vercel优化**](./VERCEL_OPTIMIZATION.md) - 免费部署优化
- 🔒 [**RLS权限**](./RLS_GUIDE.md) - 权限配置指南
- 📡 [API规范](./API_SPEC.md)
- 📊 [业务流程](./BUSINESS_FLOW.md)
- 📦 [数据库指南](./DATABASE_GUIDE.md)
- 🚀 [部署指南](./DEPLOYMENT.md)
- ✅ [部署清单](./DEPLOYMENT_CHECKLIST.md)
- 📝 [项目信息](./PROJECT_INFO.md)

## License
MIT
