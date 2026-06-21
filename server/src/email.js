'use strict'

const https = require('https')
const { config } = require('./config')
const { now } = require('./utils')

const SEND_INTERVAL_MS = 60 * 1000
const CODE_TTL_MS = 10 * 60 * 1000
const DAILY_SEND_LIMIT = 5
const DAILY_FAIL_LIMIT = 5

const state = new Map()

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function getDayKey(timestamp) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getRecord(email) {
  if (!state.has(email)) {
    state.set(email, {
      code: null,
      expiresAt: 0,
      lastSentAt: 0,
      dayKey: getDayKey(now()),
      dailySent: 0,
      dailyFails: 0,
    })
  }
  const record = state.get(email)
  const currentDay = getDayKey(now())
  if (record.dayKey !== currentDay) {
    record.dayKey = currentDay
    record.dailySent = 0
    record.dailyFails = 0
  }
  return record
}

function ensureEmailValue(email) {
  const normalized = normalizeEmail(email)
  if (!normalized || !normalized.includes('@')) {
    const error = new Error('invalid_email')
    error.status = 400
    throw error
  }
  return normalized
}

// ============================================================
//  Brevo Transactional HTTP API
// ============================================================

function parseSender(fromStr) {
  const match = fromStr.match(/^(.+?)\s*<(.+?)>$/)
  if (match) return { name: match[1].trim(), email: match[2].trim() }
  return { email: fromStr.trim() }
}

function sendViaBrevoApi(to, subject, text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      sender: parseSender(config.smtp.from),
      to: [{ email: to }],
      subject,
      textContent: text,
    })
    const req = https.request(
      {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'api-key': config.smtp.pass,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 15000,
      },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data)
          } else {
            reject(new Error(`brevo_${res.statusCode}:${data.slice(0, 200)}`))
          }
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('brevo_timeout'))
    })
    req.write(body)
    req.end()
  })
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function requestEmailCode(email) {
  const normalized = ensureEmailValue(email)
  const record = getRecord(normalized)
  const current = now()

  if (record.dailyFails >= DAILY_FAIL_LIMIT) {
    const error = new Error('email_locked')
    error.status = 429
    throw error
  }

  if (record.dailySent >= DAILY_SEND_LIMIT) {
    const error = new Error('daily_limit_reached')
    error.status = 429
    throw error
  }

  if (record.lastSentAt && current - record.lastSentAt < SEND_INTERVAL_MS) {
    const error = new Error('send_too_frequent')
    error.status = 429
    throw error
  }

  const code = config.email.testCode || generateCode()
  record.code = code
  record.expiresAt = current + CODE_TTL_MS
  record.lastSentAt = current
  record.dailySent += 1

  if (config.email.testCode) {
    return { status: 'ok', expiresAt: record.expiresAt }
  }

  if (!config.smtp.pass || !config.smtp.from) {
    const error = new Error('smtp_not_configured')
    error.status = 500
    throw error
  }

  try {
    await sendViaBrevoApi(normalized, '恋上菜单验证码', `你的验证码是 ${code}，10 分钟内有效。`)
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', type: 'brevo_api', message: error.message }))
    const sendError = new Error('send_failed')
    sendError.status = 500
    throw sendError
  }

  return { status: 'ok', expiresAt: record.expiresAt }
}

function verifyEmailCode(email, code) {
  const normalized = ensureEmailValue(email)
  const record = getRecord(normalized)
  const current = now()

  if (record.dailyFails >= DAILY_FAIL_LIMIT) {
    const error = new Error('email_locked')
    error.status = 429
    throw error
  }

  if (!record.code || current > record.expiresAt) {
    record.code = null
    record.expiresAt = 0
    const error = new Error('code_expired')
    error.status = 400
    throw error
  }

  if (String(code).trim() !== record.code) {
    record.dailyFails += 1
    const error = new Error('code_invalid')
    error.status = 400
    throw error
  }

  record.code = null
  record.expiresAt = 0
  return { status: 'ok' }
}

module.exports = { requestEmailCode, verifyEmailCode }
