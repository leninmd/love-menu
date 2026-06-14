# 恋上菜单 — Render 一键部署脚本

本脚本通过 Render Deploy API 完成全部配置，需要先在网页端完成注册并获取 API Key。

## 用法

```bash
# 1. 在 server 目录执行（需提前把 RENDER_API_KEY 设好）
RENDER_API_KEY=rn_v1_***  node scripts/render-deploy.js
```

## 流程

1. 创建 Environment（`lovemenu`）
2. 在 Environment 中创建 Web Service（关联 GitHub `leninmd/love-menu`）
3. 读取 `render.yaml` 中的 envVars 并通过 Env Vars API 写入（含 Turso 凭据）
4. 触发部署
5. 输出后端域名（用于后续 Vercel 的 `VITE_API_BASE` 和 CORS 回写）
