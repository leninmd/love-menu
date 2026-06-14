---
name: verify
description: 验证代码变更：运行后端自检测试和前端构建检查。在提交代码前或需要确认变更是否引入问题时使用。
---

运行以下验证步骤，依次执行，遇到失败立即停止并报告：

## 步骤 1：后端自检

```bash
cd server && npm run self-test
```

- 此命令会启动 Express 服务在 `127.0.0.1:3000`，执行完整的端到端流程（健康检查 → 登录 → 菜单 → 购物车 → 下单 → 完成）
- 需要确保端口 3000 未被占用，否则会超时失败
- 成功标志：输出 `self-test:ok`
- 失败时报告具体是哪一步出错

## 步骤 2：Lint 检查

```bash
cd server && npm run lint
cd client && npm run lint
```

- 检查代码质量和潜在问题
- 警告（warning）不阻塞，错误（error）视为失败

## 步骤 3：前端构建

```bash
cd client && npm run build
```

- 此命令执行 Vite 生产构建，输出到 `client/dist/`
- 成功标志：构建完成无错误
- 失败时报告 TypeScript 或构建错误

## 输出格式

所有步骤都通过后，简要报告"验证通过"。如有失败，详细列出错误信息和可能的修复方向。
