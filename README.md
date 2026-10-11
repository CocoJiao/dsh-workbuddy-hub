# dsh-workbuddy-hub

**WorkBuddy 转接中枢** —— 一个插件同时提供两件事：

1. **转接（provider）**：把 WorkBuddy 桌面端的模型接进 DeepSeek Harness，像官方 provider 一样出现在模型选择器里。
2. **记录（ledger）**：多账号台账悬浮球 —— 手机号（脱敏）、积分、**签到（含每日自动签到）**、**积分有效期**、**限流冷却 CD**、**一键切号**、**无感登录新账号**。

> **自包含**：不需要 WorkDaddy，不需要 `dsh-workbuddy-connect`。
> 账号凭据、手机号索引、积分缓存都存在插件自己的数据目录里（`~/.dsh/workbuddy-data/`）。

---

## 安装

```sh
dsh plugin --profile desktop add dsh-workbuddy-hub
# 装完重启一次 DSH
```

⚠️ **与 `dsh-workbuddy-connect` 互斥**：两者都注册 `workbuddy` 这个 provider id，
而 DSH 对重复 provider **all-or-nothing 拒绝**。装 hub 前请先卸载 connect：

```sh
dsh plugin --profile desktop remove dsh-workbuddy-connect
```

---

## 前置条件

| 依赖 | 必要性 | 说明 |
|---|---|---|
| **WorkBuddy 桌面端** | **必需** | **任意版本均可**（无版本门槛，见下）。必须**已登录至少一个账号** |
| Windows | 当前实现 | 凭据解密依赖 WorkBuddy 自带的 Electron 运行时 |
| WorkDaddy | **不需要** | 已完全自包含。仅"假退出登录"与"今日用量明细"会受影响 |

### WorkBuddy 版本要求：**没有**

| 检查项 | 结果 |
|---|---|
| 插件内版本硬编码 | **0 处** |
| 版本校验规则 | 任意数字版本（`5.5.x` / `5.6.x` / `5.7.x` / 未来版本均可） |
| 版本来源 | 运行时探测，非写死 |

**实测**：WorkBuddy `5.6.2` 与 `5.7.7` 均正常工作（跨 7 个版本）。

### 但有两个硬性前提

**1｜`.exe` 必须叫 `workbuddy.exe`**
（国际版为 `workbuddyai.exe`）。大小写不敏感，但文件名不能改。

**2｜WorkBuddy 的 Electron 二进制必须能被发现** —— 满足任一条即可：

| # | 途径 | 说明 |
|---|---|---|
| 1 | 环境变量 `WORKBUDDY_ELECTRON_BIN` | 最可靠，可覆盖任意安装位置 |
| 2 | 注册表卸载项 | 需有 `InstallLocation` 或 `DisplayIcon` |
| 3 | 默认路径 | `%LOCALAPPDATA%\Programs\WorkBuddy\WorkBuddy.exe` |

> 为什么必需：WorkBuddy 的 `accessToken` 是加密的，解密要把 `ELECTRON_RUN_AS_NODE=1`
> 传给 WorkBuddy 自己的 Electron 运行时才能取到密钥。
> **找不到二进制 = 凭据解不开 = 模型选择器里没有 WorkBuddy 分组。**

---

## 🔴 首次安装最常见的问题

**症状**：装好插件、重启 DSH 后，**模型选择器里完全没有 WorkBuddy 分组，也没有任何提示**。

**成因**：WorkBuddy 装在非默认位置，且没有可用的注册表记录 → 三条发现路径全部失效。

**解决**：设置用户环境变量后重启 DSH：

```powershell
# 把路径换成你自己机器上的 WorkBuddy.exe
[Environment]::SetEnvironmentVariable(
  'WORKBUDDY_ELECTRON_BIN',
  'D:\Your\Path\WorkBuddy\WorkBuddy.exe',
  'User')
```

### 自检（推荐先跑这个）

```sh
GET http://127.0.0.1:<DSH端口>/dsh-workbuddy-hub/selfcheck
```

它会主动检查环境变量、默认路径、常见安装位置、登录文件，并给出**可直接照做的建议**：

```json
{
  "ok": true,
  "selfCheck": {
    "platform": "win32",
    "workbuddy": {
      "envVar": "WORKBUDDY_ELECTRON_BIN",
      "envValue": "D:\\Your\\Path\\WorkBuddy\\WorkBuddy.exe",
      "envOk": true,
      "defaultPathOk": false,
      "foundElsewhere": ["D:\\Your\\Path\\WorkBuddy\\WorkBuddy.exe"],
      "advice": "ok"
    },
    "authFile":   { "exists": true, "encrypted": true },
    "ownedData":  { "accounts": 8 }
  }
}
```

`advice` 的四种取值：

| 情形 | 建议 |
|---|---|
| 没登录过 | 提示先去 WorkBuddy 桌面端登录一次（附期望路径） |
| 找不到程序 | 提示设置 `WORKBUDDY_ELECTRON_BIN`（并说明为何必需） |
| 装在非默认位置 | **直接给出探测到的完整路径** |
| 一切正常 | `ok` |

`/health` 也内嵌了同样的 `selfCheck`，方便一眼排查。

---

## 能做什么

### 转接：WorkBuddy 模型 → DSH

注册 `workbuddy` 与 `workbuddy-ai` 两个 provider，模型选择器里直接出现
Deepseek-V4.1-Flash、GLM、Kimi 等（实测 32 个）。
凭据复用 WorkBuddy 桌面端登录态，**账号在 App 里切换后自动跟随**。

### 记录：多账号台账（悬浮球）

点右下角悬浮球展开。抽屉头部按钮：`＋ 登录新账号 / 签到 / 网页版 / 刷新 / ★ Star / ×`

| 信息 | 说明 |
|---|---|
| 手机号 / 昵称 | **一律脱敏**（`156****912*` / `好…来`）—— 后四位只露 3 位 |
| **实时额度**（上游权威） | 每账号的真实总额度与剩余，来源 `POST /v2/billing/meter/get-user-resource` |
| **套餐数 + 即将到期** | 有套餐 3 天内到期会标 ⚠（建议优先用快作废的） |
| 剩余积分 + **有效期分段** | 3 天内到期的会标 ⚠ |
| **签到状态** | 含每日自动签到结果 |
| **限流冷却 CD** | 自建台账（`~/.dsh/workbuddy-rate-limit-ledger.json`） |
| 今日用量 | 带 `synced` 标志，**区分「0」与「未采集」** |

**轮换顺序**：可用 → 积分最早过期（先花快作废的）→ 今日用得少 → 余额多。

### 实时额度（替换掉拿不到的「今日用量」）

原有的「今日用量 / 今日请求数」在 WorkDaddy 卸载后**无法统计**：
原数据源（它的 `credit-usage.db`）已删除，且**上游没有任何用量查询端点**（实测 8 个候选路径全 404）。

但上游提供了**逐套餐的额度接口**，信息反而更准确：

```
POST {billingBase}/v2/billing/meter/get-user-resource
     body: { ProductCode: "p_tcaca", Status: [0,3], ... }
返回: CapacitySize / CapacityUsed / CapacityRemain  总额度 / 已用 / 剩余
      CycleStartTime / CycleEndTime                  周期（= 积分有效期）
      DeductionEndTime                               扣费截止（过期时间戳）
      PackageName / SubProductName                   套餐名
```

因此 UI 用 **「实时额度 + 套餐数 + 即将到期数」** 替换了那两个指标。
**这与切号无关**：它逐账号解密凭据后直接查上游，不需要该账号是当前登录账号。

### 签到（含每日自动签到）

- **手动**：抽屉里点「签到」，对所有已备份账号逐一签到
- **自动**：**启动后跑一次 + 每 60 分钟一次**，逐账号容错、跳过今日已签
- 原理：逐个解密该账号自己的凭据调官方接口，**不切换当前登录账号**

台账写在 `~/.dsh/workbuddy-checkin-ledger.json`。

### 操作：一键切号

悬浮球里点「切到此账号」→ 优先走本地 API（若有），不可用时**自动回落内置切号逻辑**
（复制账号备份到官方登录位，原子替换）→ 再把凭据镜像给 DSH，切完立刻生效。
响应里的 `via` 字段标明实际走了哪条路径。

### 登录新账号（无感登录）

抽屉点「＋ 登录新账号」→ 打开浏览器扫码 → 自动入库。
**不退出当前账号**，新账号直接进插件自己的账号库。

### 网页版看板

`GET /dsh-workbuddy-hub/board`（点「网页版」按钮用系统浏览器打开）——
完整宽屏表格 + 冷却队列 + 倒计时 + 登录入口 + 30 秒自动刷新。

### 隐私

手机号与昵称**在任何输出面都不完整显示**：悬浮球抽屉、网页版看板、`/state` API 响应。
（`/state` 是 HTTP 路由，本机任意进程都能读，所以 API 层也必须脱敏。）

---

## 架构

```
dsh-workbuddy-hub
├── lib/vendor/            ← 内置 dsh-workbuddy-connect（MIT，见 LICENSE.connect.txt）
│   ├── connect-index.js       provider 注册 / 凭据解密 / 目录刷新
│   └── connect-heartbeat.js   环回端点 + WorkBuddy Electron 密钥提取
├── lib/index.js           ← 宿主：台账路由 + 切号 + 签到 + 登录 + 自检
└── lib/client.js          ← 客户端：悬浮球 + 抽屉（原生 DOM，不用 iframe）

~/.dsh/workbuddy-data/     ← 插件自持数据（首次自动迁移）
├── accounts/<uid>.info        账号凭据
├── accounts-index.json        手机号 / 昵称 / uin 索引
└── credit-cache.json          积分缓存（含有效期分段）
```

**为什么内置 vendor 而不是重写**：凭据解密必须用 `ELECTRON_RUN_AS_NODE=1` 跑 WorkBuddy
自己的二进制取 `atRestSecretKey`。这段逻辑重写风险极高、且要跟进 DSH 内核与 pi-ai 的 API 变更，
因此内置上游 MIT 代码并保留其版权声明。

---

## 数据流

```
WorkBuddy App ──登录态──> 加密 auth 文件
                              │
                    lib/vendor 解密（Electron 密钥）
                              │
                              ▼
                   workbuddy provider ──> DSH 模型选择器

~/.dsh/workbuddy-data/accounts/*.info ──> 台账 / 切号 / 签到
                              │
                              ▼
                   悬浮球 / 网页版看板
```

---

## 故障排查

| 症状 | 处理 |
|---|---|
| 模型选择器没有 WorkBuddy 组 | **先跑 `/selfcheck` 看 advice**；或查 `/health` 的 `provider.ok` |
| 悬浮球看不到账号 | `GET /selfcheck` 看 `ownedData.accounts`；为 0 就用「登录新账号」加一个 |
| 切号后 DSH 没变 | 看返回的 `credentialMirror` 字段（`hardlink-alive` 表示正常） |
| 签到失败 | `GET /dsh-workbuddy-hub/checkin/state` 看台账里的 `message` |
| 与 connect 冲突 | 两个都注册 `workbuddy`，卸载其一 |

---

## License

MIT。

`lib/vendor/` 内含 `dsh-workbuddy-connect`（MIT, Copyright (c) 2026 Corrine Hu）的
未修改副本（仅调整了相对 import 路径），其许可证见 `lib/vendor/LICENSE.connect.txt`。
