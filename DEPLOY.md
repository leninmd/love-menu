## 部署概览

后端推荐 Railway，前端推荐 Vercel。两者分离部署更稳且易回滚。

---

## 后端（Railway）

1. 在 Railway 新建 Project，连接 GitHub 仓库。
2. 设置服务根目录为 `server/`。
3. 环境变量（示例）：

```
DATABASE_PATH=/data/lovemenu.db
JWT_SECRET=<随机64位字符串>
SMTP_HOST=smtp.brevo.com
SMTP_PORT=587
SMTP_USER=<Brevo 账户邮箱>
SMTP_PASS=<Brevo SMTP Key>
SMTP_FROM=Love Menu <no-reply@example.com>
VAPID_PUBLIC_KEY=<web-push 生成>
VAPID_PRIVATE_KEY=<web-push 生成>
VAPID_SUBJECT=mailto:admin@example.com
RP_ID=<railway 分配域名或自定义域名>
RP_ORIGIN=https://<railway 域名>
RP_NAME=Love Menu
```

4. 挂载 Volume 到 `/data`，保证 SQLite 持久化。
5. 部署完成后访问 `/health` 与 `/v1/ready` 确认服务可用。

---

## 前端（Vercel）

1. 在 Vercel 新建项目，根目录选择 `client/`。
2. 环境变量：

```
VITE_API_BASE=https://<railway 域名>
VITE_VAPID_PUBLIC_KEY=<web-push 公钥>
```

3. 部署完成后访问页面，验证登录与菜单流程。

---

## 验收清单

- 后端 `/health` 与 `/v1/ready` 返回 `ok`。
- 前端首页可打开，登录正常。
- 顾客下单后店主可接单/完成，状态可见。
- Web Push 订阅后可收到接单/完成推送。
- PWA 安装提示可用，断网刷新仍能看到静态页面。
