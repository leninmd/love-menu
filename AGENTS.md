# AGENTS.md

This file provides guidance to the AI agent when working with code in this repository.

## 项目概述

恋上菜单（Love Menu）是一款面向情侣的 PWA 餐厅菜单/点餐应用。产品与架构的唯一事实来源是 `memory-bank/恋上菜单（Love Menu）项目综合文档.md`，需求或流程不清晰时以它为准。

## 代码风格

- 注释、文档、日志文案、用户可见字符串统一使用**中文**
- 变量名、函数名、类名、模块名等标识符统一使用**英文**
- 使用 ASCII 风格分块注释，让代码风格类似高质量开源库
- 遵循 KISS 原则；出现 3 个及以上分支判断时，优先重构设计而非堆叠 if/else

## 开发环境

两个独立应用，无根目录脚本，必须分别进入各自目录操作：

```bash
# 终端 1：后端（Express, CommonJS）
cd server && npm install && npm run dev

# 终端 2：前端（Vue 3 + Vite + TypeScript, ESM）
cd client && npm install && npm run dev
```

- 后端**无热重载**：`npm run dev` 实际执行 `node src/index.js`，修改后需手动重启
- 前端 `.env`：`VITE_API_BASE=http://localhost:3000`（参考 `client/.env.example`）
- 后端 `.env`：必须设置 `DATABASE_PATH` 和 `JWT_SECRET`（参考 `server/.env.example`）
- 本地开发可用 `EMAIL_TEST_CODE=000000` 绕过 SMTP 验证

## 验证与测试

```bash
# 后端自检（需确保端口 3000 未被占用）
cd server && npm run self-test

# Lint 检查
cd server && npm run lint
cd client && npm run lint

# 前端构建检查
cd client && npm run build
```

无单元测试框架。`self-test` 是唯一自动化测试入口。运行 `/verify` 可一键执行全部验证。

## 技术陷阱

- **sql.js 持久化模型**：SQLite 运行在 WASM 内存中，每次写入都会导出完整 DB 到磁盘。并发写入不安全，但对 2 用户场景足够
- **TailwindCSS 未接入**：尽管文档提及 Tailwind，实际使用原生 CSS + CSS 变量，不要使用 utility class
- **drizzle-orm 未使用**：`server/package.json` 中声明但未引入，数据库操作通过 `server/src/db.js` 的原生 SQL 封装
- **WebAuthn 限制**：Passkey 仅支持 HTTPS 或 `localhost`，开发环境使用 `RP_ID=localhost` + `RP_ORIGIN=http://localhost:5173`
- **CORS 未配置**：生产部署（Vercel + Railway）需要添加 CORS 中间件，当前代码未处理
- **图片上传未实现**：菜品创建接口目前固定 `image_url = null`，未接入 multipart 处理

## 架构文档同步

任何架构级变更（创建/删除/移动文件或目录、模块重组）时，必须同步更新 `memory-bank/architecture.md` 中的"当前实际结构"章节。

部署清单见 `DEPLOY.md`。
