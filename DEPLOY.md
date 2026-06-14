# 恋上菜单 — 部署指南

本文档详细说明如何将恋上菜单从零部署到线上，全程零成本。

## 架构概览

```
前端 (Vercel)  ──HTTPS──▶  后端 (Railway)  ──▶  SQLite (Railway Volume)
  Vue 3 + Vite               Express + Node.js       /data/lovemenu.db
  PWA (Service Worker)       WebAuthn + Email OTP    /data/uploads/ (菜品图片)
                             Web Push (VAPID)
```

| 服务 | 平台 | 费用 |
|------|------|------|
| 后端 API | Railway | 免费（$5/月信用额度） |
| 前端托管 | Vercel | 免费 |
| 邮件验证码 | Brevo | 免费（300 封/天） |
| 推送通知 | Web Push | 免费 |
| 数据库 | SQLite (Railway Volume) | 免费（含 1GB） |

---

## 一、前置准备

### 1.1 GitHub 仓库

确保代码已推送到 GitHub。Railway 和 Vercel 都通过 GitHub 自动部署。

```bash
git add -A
git commit -m "准备部署"
git push origin main
```

### 1.2 生成 VAPID 密钥对（推送通知）

```bash
cd server
npx web-push generate-vapid-keys
```

输出示例：
```
Public Key:  BNq-...（约 87 字符）
Private Key: abc1...（约 43 字符）
```

**保存这两个值**，后面需要用到。

### 1.3 生成 JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

输出一个 64 字符的随机字符串。

### 1.4 注册 Brevo 账号（邮件服务）

1. 访问 https://www.brevo.com 注册免费账号
2. 进入 SMTP 设置页面，获取：
   - SMTP 主机：`smtp-relay.brevo.com`
   - SMTP 端口：`587`
   - SMTP 用户名：你的 Brevo 登录邮箱
   - SMTP 密码：SMTP Key（不是登录密码）
3. 在 Brevo 中验证你的发件人邮箱（如 `your-email@gmail.com`）

---

## 二、后端部署（Railway）

### 2.1 创建项目

1. 访问 https://railway.app，用 GitHub 账号登录
2. 点击 **New Project** → **Deploy from GitHub repo**
3. 选择你的 `love-menu` 仓库
4. Railway 会自动检测并开始配置

### 2.2 配置服务根目录

1. 在 Railway 面板中，点击你的服务
2. 进入 **Settings** → **Build**
3. 设置 **Root Directory** 为 `server`
4. 点击 **Deploy**

### 2.3 添加 Volume（数据持久化）

1. 进入 **Settings** → **Volumes**
2. 点击 **New Volume**
3. Mount Path 填写 `/data`
4. 大小选 1GB（免费额度内）
5. 点击 **Add**

> **重要**：没有 Volume，每次重新部署数据库会丢失。

### 2.4 配置环境变量

进入 **Variables** 页面，添加以下环境变量：

```
DATABASE_PATH=/data/lovemenu.db
JWT_SECRET=<步骤 1.3 生成的 64 字符密钥>

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<Brevo 登录邮箱>
SMTP_PASS=<Brevo SMTP Key>
SMTP_FROM=恋上菜单 <your-email@gmail.com>

VAPID_PUBLIC_KEY=<步骤 1.2 生成的公钥>
VAPID_PRIVATE_KEY=<步骤 1.2 生成的私钥>
VAPID_SUBJECT=mailto:your-email@gmail.com

RP_ID=<Railway 分配的域名，如 love-menu-production.up.railway.app>
RP_ORIGIN=https://<Railway 分配的域名>
RP_NAME=恋上菜单
```

> 获取 Railway 域名：Settings → Networking → Public Networking → Generate Domain

### 2.5 验证后端

部署完成后，访问：
- `https://<railway-domain>/health` → 应返回 `{"status":"ok"}`
- `https://<railway-domain>/v1/ready` → 应返回 `{"status":"ready"}`

---

## 三、前端部署（Vercel）

### 3.1 创建项目

1. 访问 https://vercel.com，用 GitHub 账号登录
2. 点击 **Add New** → **Project**
3. 选择你的 `love-menu` 仓库
4. **Framework Preset** 选择 `Vite`
5. **Root Directory** 设置为 `client`
6. 点击 **Deploy**

### 3.2 配置环境变量

在部署前或部署后（Settings → Environment Variables），添加：

```
VITE_API_BASE=https://<Railway 后端域名>
VITE_VAPID_PUBLIC_KEY=<步骤 1.2 生成的公钥，与后端相同>
```

### 3.3 更新后端 CORS

回到 Railway 后端，添加环境变量：

```
CORS_ORIGIN=https://<Vercel 前端域名>.vercel.app
```

添加后 Railway 会自动重新部署。

### 3.4 验证前端

访问 Vercel 分配的域名，应该能看到恋上菜单首页。

---

## 四、验收检查清单

部署完成后，逐项检查：

### 基础功能
- [ ] 后端 `/health` 返回 `{"status":"ok"}`
- [ ] 后端 `/v1/ready` 返回 `{"status":"ready"}`
- [ ] 前端首页可打开，显示恋上菜单界面

### 注册与登录
- [ ] 邮箱验证码登录：输入邮箱 → 收到验证码 → 输入验证码 → 登录成功
- [ ] 通行密钥注册（需 HTTPS）：输入邮箱 → 点击注册 → 设备指纹/面容验证 → 登录成功
- [ ] 通行密钥登录：再次打开应用 → 使用通行密钥一键登录
- [ ] 刷新页面后登录态保持（Token 持久化）

### 店主功能
- [ ] 创建餐厅：输入名称 → 创建成功
- [ ] 添加分类：创建菜品分类
- [ ] 添加菜品：填写菜名、价格、来源平台 → 添加成功
- [ ] 上传菜品图片：选择图片 → 上传成功（压缩至 ≤300KB）
- [ ] 复制分享链接：点击"复制分享链接" → 链接已复制到剪贴板
- [ ] 设置食客等级：添加趣味称号和最低下单次数

### 顾客功能
- [ ] 打开分享链接：用另一个浏览器/设备打开分享链接 → 看到菜单
- [ ] 游客浏览：未登录也能看到菜品列表
- [ ] 加购触发登录：点击"加入购物车" → 弹出登录框
- [ ] 登录后加购：添加菜品到购物车 → 修改数量 → 提交订单
- [ ] 来源图标复制：点击菜品来源图标 → 菜名复制到剪贴板
- [ ] 菜品搜索：输入关键词 → 实时过滤菜品

### 订单流程
- [ ] 店主看到新订单：订单状态显示"已提交"
- [ ] 店主接单：点击"接单" → 状态变为"已接单"
- [ ] 店主完成：点击"完成" → 状态变为"已完成"
- [ ] 顾客看到状态变化：订单状态实时更新（SSE 推送 + 12 秒轮询）
- [ ] 订单评价：已完成订单 → 写评价（≤200 字） → 提交成功

### 推送通知
- [ ] 订阅推送：点击"开启推送" → 浏览器授权
- [ ] 收到通知：店主接单/完成时 → 顾客收到浏览器推送

### PWA
- [ ] 添加到主屏幕：手机浏览器 → 添加到主屏幕
- [ ] 离线访问：断网后刷新 → 静态页面仍可显示（API 请求超时后显示缓存数据）
- [ ] 应用图标：主屏幕显示恋上菜单图标

### 账户管理
- [ ] 登出：点击"登出" → 回到首页
- [ ] 注销账户：点击"注销账户" → 确认 → 数据删除、回到首页

---

## 五、常见问题排查

### 后端无法启动

| 问题 | 排查 |
|------|------|
| `DATABASE_PATH is required` | 检查环境变量是否设置 |
| `JWT_SECRET is required` | 检查环境变量是否设置 |
| 端口 3000 被占用 | Railway 自动分配端口，本地开发确保 3000 空闲 |

### 前端无法连接后端

| 问题 | 排查 |
|------|------|
| CORS 错误 | 后端 `CORS_ORIGIN` 是否设置为前端域名 |
| 404 / 网络错误 | `VITE_API_BASE` 是否正确指向 Railway 域名 |
| 登录后页面空白 | 检查后端日志，确认数据库迁移完成（`/v1/ready`） |

### 邮件验证码收不到

| 问题 | 排查 |
|------|------|
| 发送失败 | 检查 SMTP 配置，确认 Brevo 发件人邮箱已验证 |
| 进入垃圾箱 | 在邮箱中搜索发件人，添加到联系人 |
| 频率限制 | 同一邮箱 1 分钟 1 封，每日上限 5 封 |
| 错误锁定 | 连续 5 次错误验证码后当日锁定 |

### 通行密钥不可用

| 问题 | 排查 |
|------|------|
| 入口不显示 | 通行密钥需要 HTTPS（localhost 除外），确认 Railway 域名使用 HTTPS |
| 注册失败 | `RP_ORIGIN` 必须与实际访问的 URL 完全匹配（含 https://） |
| 登录提示找不到凭证 | 确认邮箱与注册时一致，通行密钥绑定在设备上 |

### 推送通知不工作

| 问题 | 排查 |
|------|------|
| 按钮不显示 | 浏览器需支持 Service Worker + PushManager |
| 订阅失败 | `VITE_VAPID_PUBLIC_KEY` 与后端 `VAPID_PUBLIC_KEY` 是否一致 |
| 收不到通知 | 确认后端 VAPID 密钥已配置，检查浏览器通知权限 |

---

## 六、后续维护

### 查看后端日志

Railway 面板 → Deployments → 选择部署 → Logs

日志格式为 JSON，关键字段：
- `level`: info/error
- `type`: request/handler
- `method`, `path`, `status`, `duration_ms`

### 数据备份

SQLite 数据存储在 Railway Volume 的 `/data/lovemenu.db`。备份方式：
1. Railway 面板支持 Volume 快照
2. 或通过 SSH/CLI 导出文件

### 更新部署

推送到 GitHub 后，Railway 和 Vercel 会自动重新部署。

### 添加自定义域名

- **Railway**：Settings → Networking → Custom Domain
- **Vercel**：Settings → Domains → Add

添加后需更新后端 `RP_ORIGIN`、`CORS_ORIGIN` 环境变量。

---

## 七、本地开发

```bash
# 终端 1：后端
cd server
cp .env.example .env
# 编辑 .env，设置 EMAIL_TEST_CODE=000000（免 SMTP）
npm install
npm run dev

# 终端 2：前端
cd client
cp .env.example .env
# .env 中 VITE_API_BASE=http://localhost:3000
npm install
npm run dev
```

本地开发无需配置 SMTP 和 VAPID，使用 `EMAIL_TEST_CODE=000000` 作为固定验证码即可。

验证：
```bash
cd server && npm run self-test    # 后端自检
cd client && npm run build         # 前端构建
cd server && npm run lint          # 后端 lint
cd client && npm run lint          # 前端 lint
```
