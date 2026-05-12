# AGENTS

- Product/architecture baseline lives in `memory-bank/恋上菜单（Love Menu）项目综合文档.md`; use it when requirements or flows are unclear.
- Two runnable apps: `client/` (Vue 3 + Vite) and `server/` (Express). No root-level build/test scripts.
- Local dev (two terminals): `cd server && npm install && npm run dev`, then `cd client && npm install && npm run dev` (from `client/README.md`).
- Client env: create `client/.env` (or use `client/.env.example`) with `VITE_API_BASE=http://localhost:3000`.
- Server env: use `server/.env.example` (needs `DATABASE_PATH` and `JWT_SECRET`).
- Server quick check: `cd server && npm run self-test` (runs `src/self-test.js`).
- If you change top-level structure, update `memory-bank/architecture.md` “当前实际结构”.
- Deployment checklist lives in `DEPLOY.md`.
