# 恋上菜单（Love Menu）前后端联调说明

## 运行前准备

1. 启动后端服务（另一个终端）：

```bash
cd server
npm install
npm run dev
```

2. 启动前端服务：

```bash
cd client
npm install
npm run dev
```

## 环境变量

在 `client/` 下创建 `.env`（或使用 `.env.example`）：

```
VITE_API_BASE=http://localhost:3000
```

## 通行密钥（WebAuthn）

- 本地需要 HTTPS 或 `localhost`，并配置服务端 `RP_ORIGIN` 与 `RP_ID`。
- 若未支持通行密钥，可继续使用邮箱验证码登录。

### 手动验收步骤（通行密钥）

1. 确保服务端 `.env` 设置：`RP_ID=localhost`，`RP_ORIGIN=http://localhost:5173`。
2. 访问前端首页，输入邮箱与设备名称，点击「注册通行密钥」。
3. 浏览器弹出系统验证后完成注册，页面应自动登录。
4. 退出后再次打开页面，点击「通行密钥登录」应能完成登录。

## 推送订阅（Web Push）

1. 服务端 `.env` 配置 `VAPID_PUBLIC_KEY` 与 `VAPID_PRIVATE_KEY`（可用 `npx web-push generate-vapid-keys` 生成）。
2. 前端 `.env` 设置 `VITE_VAPID_PUBLIC_KEY` 为对应公钥。
3. 登录后点击右上角「开启推送」完成订阅，店主接单/完成订单时会向顾客推送通知。

## PWA 部署与验收

- 前端使用 `vite-plugin-pwa` 生成 `manifest` 和 `sw.js`。
- 构建后在浏览器 DevTools -> Application -> Service Workers 检查注册状态。
- 首次加载后断网刷新，静态页面应可打开（API 会提示网络错误）。

## 联调流程（最小链路）

1. 打开前端首页，点击「打开已有菜单」进入顾客端。
2. 页面会自动调用邮箱登录与种子数据接口，生成演示餐厅。
3. 在顾客端：
   - 浏览菜单 → 加入购物车 → 提交订单。
4. 点击顶部「店主模式」进入店主端：
   - 查看订单 → 接单 → 完成。
5. 回到顾客端，观察订单状态变化（轮询刷新）。

## 注意事项

- 未配置 SMTP 时，可在服务端设置 `EMAIL_TEST_CODE` 作为固定验证码，便于本地联调。
- 订单刷新默认每 12 秒轮询一次。
- 菜品来源图标点击后会复制菜名到剪贴板。
