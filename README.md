# ZY Investment Admin System

## 项目简介
基于 Next.js 14 的证券交易管理后台系统，支持多类型交易审核、用户管理、财务审核等功能。

## 技术栈
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (数据库)
- Vercel KV (缓存)

## 目录结构
详见项目根目录结构说明

## 快速开始
```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local

# 启动开发服务器
npm run dev
```

## 部署
```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 功能模块
- 交易审核：A股/港股/IPO/大宗/打板
- 用户管理：列表/资金/持仓/订单/流水
- 财务审核：充值/提现
- 系统配置：参数/管理员/审计
- 行情管理：实时行情拉取

## License
MIT
