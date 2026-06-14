'use strict'

const https = require('https')

const RENDER_API_KEY = process.env.RENDER_API_KEY
if (!RENDER_API_KEY) {
  console.error('需要 RENDER_API_KEY 环境变量')
  process.exit(1)
}

const GITHUB_REPO = 'leninmd/love-menu'
const ENV_NAME = 'lovemenu'
const SERVICE_NAME = 'lovemenu-server'
const REGION = 'singapore'

// 需要在执行前设置的环境变量（敏感 + 需要手填的）
const REQUIRED_VARS = {
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
  JWT_SECRET: process.env.JWT_SECRET,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || '',
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || '',
  RP_ID: process.env.RP_ID || '',
  RP_ORIGIN: process.env.RP_ORIGIN || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '',
}

const missing = Object.entries(REQUIRED_VARS)
  .filter(
    ([k, v]) =>
      !v && ['DATABASE_URL', 'DATABASE_AUTH_TOKEN', 'JWT_SECRET', 'VAPID_PUBLIC_KEY'].includes(k),
  )
  .map(([k]) => k)
if (missing.length) {
  console.error('缺少必填环境变量:', missing.join(', '))
  process.exit(1)
}

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${RENDER_API_KEY}`,
      'Content-Type': 'application/json',
    }
    if (data) headers['Content-Length'] = Buffer.byteLength(data)
    const req = https.request(
      { hostname: 'api.render.com', method, path: `/v1${path}`, headers },
      (res) => {
        let chunks = ''
        res.on('data', (c) => (chunks += c))
        res.on('end', () => {
          let parsed = null
          try {
            parsed = chunks ? JSON.parse(chunks) : null
          } catch (_) {}
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed)
          else reject(new Error(`${method} ${path} -> ${res.statusCode}: ${chunks.slice(0, 300)}`))
        })
      },
    )
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function main() {
  console.log('[1/5] 创建 Environment:', ENV_NAME)
  const env = await apiCall('POST', '/environments', { name: ENV_NAME })
  const envId = env.id
  console.log('  -> envId:', envId)

  console.log('[2/5] 创建 Web Service:', SERVICE_NAME)
  const svc = await apiCall('POST', `/environments/${envId}/services`, {
    type: 'web_service',
    name: SERVICE_NAME,
    runtime: 'node',
    region,
    plan: 'free',
    repo: `https://github.com/${GITHUB_REPO}`,
    rootDir: 'server',
    buildCommand: 'npm install',
    startCommand: 'node src/index.js',
    autoDeploy: true,
    healthCheckPath: '/health',
  })
  const serviceId = svc.serviceDetails?.id || svc.id
  console.log('  -> serviceId:', serviceId)

  console.log('[3/5] 写入环境变量（14 项）')
  const envVars = Object.entries({
    NODE_ENV: 'production',
    ...REQUIRED_VARS,
    SMTP_HOST: 'smtp-relay.brevo.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    RP_NAME: '恋上菜单',
  }).map(([key, value]) => ({ key, value: value || '' }))
  await apiCall('PUT', `/services/${serviceId}/env-vars`, envVars)
  console.log('  -> 已写入', envVars.length, '项')

  console.log('[4/5] 触发首次部署')
  const deploy = await apiCall('POST', `/services/${serviceId}/deploys`, {})
  console.log('  -> deployId:', deploy.id)

  console.log('[5/5] 查询服务域名（等待 ~30s）')
  await new Promise((r) => setTimeout(r, 30000))
  const info = await apiCall('GET', `/services/${serviceId}`)
  const url = info.serviceDetails?.url || info.url || '(尚未分配)'
  console.log('\n========== 部署完成 ==========')
  console.log('后端域名:', url)
  console.log('健康检查:', `${url}/health`)
  console.log('================================')
  console.log('\n下一步：')
  console.log('  1. 访问', `${url}/health`, '确认返回 {"status":"ok"}')
  console.log('  2. 把此域名填入 Vercel 的 VITE_API_BASE')
  console.log('  3. 把 Vercel 域名回写 Render 的 CORS_ORIGIN')
}

main().catch((e) => {
  console.error('部署失败:', e.message)
  process.exit(1)
})
