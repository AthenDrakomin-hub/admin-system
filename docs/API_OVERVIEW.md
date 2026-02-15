# API 总览：以客户端为核心的管理颗粒度设计

系统以**客户端 API** 为业务核心，**管理端 API** 围绕客户端能力做审核、配置、风控与数据管理，实现「客户端能做什么 → 管理端对每一项做颗粒度管控」。

---

## 一、客户端 API（`/api/client/*`）

**用途**：客户端 App（如 zhengyutouzi.com）调用的接口，需 Bearer Token（用户 JWT），生产环境限制来源域名。

| 路径 | 方法 | 功能 |
|------|------|------|
| **认证与身份** | | |
| `/api/client/auth` | POST | 客户端用户登录 |
| `/api/client/auth` | GET | 获取当前登录用户信息 |
| `/api/client/user` | GET | 用户信息（代理到 `/api/user`，兼容旧版） |
| **账户与资金** | | |
| `/api/client/account` | GET | 账户综合信息（余额、汇总） |
| `/api/client/account` | GET | 持仓详情（如 `?symbol=000001`） |
| `/api/client/finance` | POST | 发起充值申请 / 提现申请 |
| **行情** | | |
| `/api/client/market` | GET | 行情：quote / search / kline / indices |
| **交易** | | |
| `/api/client/order` | DELETE | 撤单（如 `?orderId=xxx`） |
| `/api/client/trade/a-share` | GET/POST/DELETE | A 股下单、查询、撤单 |
| `/api/client/trade/hk-share` | GET/POST/DELETE | 港股下单、查询、撤单 |
| `/api/client/trade/block` | GET/POST | 大宗交易：创建、查询、历史 |
| `/api/client/trade/board` | GET/POST/DELETE | 一键打板：创建、查询、激活、删除 |
| `/api/client/trade/ipo` | GET/POST/DELETE | 新股申购：列表、申购、记录、取消 |
| `/api/client/order/conditional` | GET/POST/DELETE | 条件单：创建、查询、删除 |

**对应管理端管控**：上述每一类“客户端能做的事”，在管理端都有对应的审核/配置/风控接口（见下文）。

---

## 二、统一/共享 API（客户端与管理端共用或按 Token 区分）

| 路径 | 方法 | 功能 | 调用方 |
|------|------|------|--------|
| `/api/user` | GET | 用户列表、单用户详情、profile/balance/positions | 管理端用 list/详情；客户端用 profile/balance/positions（靠 Token 区分） |
| `/api/user` | POST | 创建/更新用户、资金调整、冻结/解冻 | 管理端 |
| `/api/user/status` | GET | 用户状态列表（含 auth_status） | 管理端 |
| `/api/user/messages` | GET | 用户消息列表（分页） | 管理端 |
| `/api/market` | GET | 统一行情（quote/search/kline/indices/批量） | 管理端后台、部分管理页 |
| `/api/market/stocks` | GET | 股票池列表 | 管理端 |
| `/api/market/anomalies` | GET/POST/DELETE | 异常标记 | 管理端 |
| `/api/market/search` | GET | 行情搜索 | 管理端 |
| `/api/auth` | POST | **管理端**登录（管理员账号） | 管理后台 |
| `/api/finance` | GET | 待审核充值/提现列表 | 管理端 |
| `/api/finance` | POST | 审核充值/提现（通过/驳回） | 管理端 |
| `/api/finance/reconciliation` | GET | 流水对账 | 管理端 |
| `/api/finance/reports` | GET | 财务报表 | 管理端 |
| `/api/trade/logs` | GET | 按订单 ID 查操作/审计日志 | 管理端 |
| `/api/reports/market` | GET | 行情报表 | 管理端 |
| `/api/reports/user` | GET | 用户报表 | 管理端 |
| `/api/system` | GET/POST | 系统参数（当前为占位） | 管理端 |
| `/api/system/logs` | GET | 运行日志 | 管理端 |
| `/api/system/backup` | GET/POST | 数据备份 | 管理端 |
| `/api/system/audit-advanced` | GET | 审计高级筛选 | 管理端 |
| `/api/dashboard/stats` | GET | 仪表盘统计 | 管理端 |
| `/api/cron` | GET/POST | 定时任务触发 | 内部/调度 |
| `/api/cron/scheduler` | GET | 调度器状态 | 管理端 |

说明：`/api/user`、`/api/market`、`/api/finance` 等通过 **Authorization** 区分是客户端用户还是管理员，实现“一套接口、两种身份”。

---

## 三、管理端 API（`/api/admin/*`）— 对客户端的颗粒度管理

**用途**：管理后台专用，需管理员 Bearer Token，并按角色做权限校验（见 `types/admin.ts` 的 `AdminPermissions`）。

### 3.1 用户维度 — 管“谁能用客户端”

| 管理 API | 功能 | 管控的客户端能力 |
|----------|------|------------------|
| `GET/POST /api/admin/users` | 用户列表、详情、创建、冻结/解冻、资金调整 | 谁可以登录、账户状态、余额与资金变动 |
| `GET/POST /api/admin/management?module=admin` | 管理员列表与操作 | 谁可以登录管理后台（与客户端用户分离） |
| `GET/POST /api/admin/invites` | 邀请码列表、生成、操作 | 谁可以注册成为客户端用户（注册入口） |

**颗粒度**：用户级（单用户冻结/解冻/调资金）、邀请码级（控制注册）。

---

### 3.2 交易维度 — 管“客户端每类交易是否放行”

客户端每一类交易都会产生“待审核”状态，管理端按类型审核：

| 管理 API | 功能 | 管控的客户端能力 |
|----------|------|------------------|
| `GET /api/admin/trade?type=a_share&status=pending` | 按类型查待审核、支持 status=all | 对应客户端 A 股订单的展示与审核 |
| `GET /api/admin/trade?type=hk_share` | 港股待审核列表 | 客户端港股订单 |
| `GET /api/admin/trade?type=block` | 大宗待审核 | 客户端大宗交易 |
| `GET /api/admin/trade?type=ipo` | IPO 待审核 | 客户端新股申购 |
| `GET /api/admin/trade?type=board` | 打板策略待审核 | 客户端一键打板 |
| `GET /api/admin/trade?type=conditional` | 条件单待审核 | 客户端条件单 |
| `GET /api/admin/trade?type=abnormal` | 异常订单 | 客户端异常订单处理 |
| `POST /api/admin/trade` | 审核操作（approve/reject/cancel） | 对上述任一类订单通过/驳回/撤销 |

**权限颗粒度**（在 `AdminPermissions` 中）：  
`canApproveTrades`（总开关）、`canApproveAShare`、`canApproveHKShare`、`canApproveBlockTrade`、`canApproveIPO`、`canApproveBoard`、`canApproveConditional`，可只开放某几种交易类型的审核。

---

### 3.3 财务维度 — 管“客户端充值/提现是否放行”

| 管理 API | 功能 | 管控的客户端能力 |
|----------|------|------------------|
| `/api/finance`（GET type=recharge/withdraw） | 待审核充值/提现列表 | 客户端发起的充值、提现申请 |
| `/api/finance`（POST） | 审核通过/驳回 | 是否到账、是否允许提现 |

**颗粒度**：按单笔充值/提现审核；权限由 `canApproveFinance` 控制。

---

### 3.4 消息与触达 — 管“客户端收到什么”

| 管理 API | 功能 | 管控的客户端能力 |
|----------|------|------------------|
| `GET/POST /api/admin/messages` | 站内信列表、发送、状态操作 | 客户端用户看到的站内消息内容与状态 |

**颗粒度**：消息级（发谁、发什么、已读/未读等）。

---

### 3.5 行情与市场 — 管“客户端能看到什么标的与风险”

| 管理 API | 功能 | 管控的客户端能力 |
|----------|------|------------------|
| 使用 `/api/market`、`/api/market/stocks`、`/api/market/anomalies` 等 | 管理端调用同一套行情与股票池、异常标记 | 客户端行情数据源、股票池、异常标记（可限制或标记风险） |
| `GET/POST /api/admin/config` | 系统配置、交易配置、限额配置 | 全局或按规则限制客户端交易参数、限额 |

**颗粒度**：配置级（全局/交易/限额）、标的级（股票池、异常标记）。权限：`canManageMarket`、`canConfigureSystem`。

---

### 3.6 风控 — 管“客户端行为是否被拦截”

| 管理 API | 功能 | 管控的客户端能力 |
|----------|------|------------------|
| `GET/POST/PUT/DELETE /api/admin/risk` | 风控规则 CRUD、预警列表、执行风控动作 | 下单限额、频率、黑名单等规则，影响客户端请求是否被拒绝 |

**颗粒度**：规则级（条件 + 动作）。权限：`canManageRiskRules`。

---

### 3.7 审核与审计 — 管“谁在什么时候对客户端做了什么”

| 管理 API | 功能 | 管控的客户端能力 |
|----------|------|------------------|
| `GET/POST /api/admin/audits` | 待审核列表、通过/驳回 | 与用户/交易/财务等审核流程统一入口 |
| `GET /api/admin/management?module=audit` | 审核中心聚合 | 同上 |
| `/api/system/audit-advanced`、审计日志 | 操作日志、高级筛选 | 对“管理端对客户端数据的操作”做审计 |

**颗粒度**：操作级（谁、何时、对哪条数据、通过/驳回）。

---

### 3.8 数据导出与批量 — 管“客户端数据的批量使用”

| 管理 API | 功能 | 管控的客户端能力 |
|----------|------|------------------|
| `GET /api/admin/export?resource=users|orders|finance|trades` | 导出用户/订单/财务/交易数据 | 客户端产生的用户与交易数据的导出范围与格式 |
| `POST /api/admin/batch` | 批量用户/订单/消息操作 | 对多条客户端数据做批量状态变更或操作 |

**颗粒度**：按资源类型 + 筛选条件导出；批量操作按接口约定。权限：`canExportData` 等。

---

### 3.9 监控与分析 — 管“看客户端整体表现”

| 管理 API | 功能 | 管控的客户端能力 |
|----------|------|------------------|
| `GET /api/admin/monitor/realtime` | 实时监控（订单、用户、行情等） | 监控客户端用户行为与系统负载 |
| `GET /api/admin/analytics?type=...` | 用户趋势、交易量、资金流、KPI | 对客户端产生的数据做统计分析 |

**颗粒度**：只读、统计维度，不直接改客户端数据；权限：`canViewReports` 等。

---

## 四、对应关系小结（客户端 → 管理端）

| 客户端能力 | 对应管理端 API | 管理颗粒度 |
|------------|----------------|------------|
| 登录/注册 | `/api/admin/users`、`/api/admin/invites` | 用户、邀请码 |
| 账户与资金 | `/api/admin/users`（资金调整）、`/api/finance`（充值提现审核） | 单用户、单笔申请 |
| A 股/港股/大宗/打板/IPO/条件单 | `/api/admin/trade`（按 type + 权限位） | 按交易类型审核、按角色分权 |
| 充值/提现 | `/api/finance` | 单笔审核 |
| 站内信 | `/api/admin/messages` | 消息级 |
| 行情与标的 | `/api/market/*` + `/api/admin/config` | 配置、股票池、异常 |
| 风控 | `/api/admin/risk` | 规则级 |
| 数据导出与批量 | `/api/admin/export`、`/api/admin/batch` | 资源类型、批量操作 |
| 监控与报表 | `/api/admin/monitor/realtime`、`/api/admin/analytics` | 只读统计 |

整体上，**客户端 API 定义“能做什么”**，**管理端 API 定义“对这些动作的审核、配置、风控与数据管理”**，实现以客户端为核心的管理颗粒度控制。
