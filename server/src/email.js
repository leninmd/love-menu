"use strict";

const nodemailer = require("nodemailer");
const { config } = require("./config");
const { now } = require("./utils");

const SEND_INTERVAL_MS = 60 * 1000;
const CODE_TTL_MS = 10 * 60 * 1000;
const DAILY_SEND_LIMIT = 5;
const DAILY_FAIL_LIMIT = 5;

const state = new Map();

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getDayKey(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRecord(email) {
  if (!state.has(email)) {
    state.set(email, {
      code: null,
      expiresAt: 0,
      lastSentAt: 0,
      dayKey: getDayKey(now()),
      dailySent: 0,
      dailyFails: 0
    });
  }
  const record = state.get(email);
  const currentDay = getDayKey(now());
  if (record.dayKey !== currentDay) {
    record.dayKey = currentDay;
    record.dailySent = 0;
    record.dailyFails = 0;
  }
  return record;
}

function ensureEmailValue(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    const error = new Error("invalid_email");
    error.status = 400;
    throw error;
  }
  return normalized;
}

let transporter;

function getTransporter() {
  if (!config.smtp.host || !config.smtp.port) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user
        ? {
            user: config.smtp.user,
            pass: config.smtp.pass
          }
        : undefined
    });
  }
  return transporter;
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function requestEmailCode(email) {
  const normalized = ensureEmailValue(email);
  const record = getRecord(normalized);
  const current = now();

  if (record.dailyFails >= DAILY_FAIL_LIMIT) {
    const error = new Error("email_locked");
    error.status = 429;
    throw error;
  }

  if (record.dailySent >= DAILY_SEND_LIMIT) {
    const error = new Error("daily_limit_reached");
    error.status = 429;
    throw error;
  }

  if (record.lastSentAt && current - record.lastSentAt < SEND_INTERVAL_MS) {
    const error = new Error("send_too_frequent");
    error.status = 429;
    throw error;
  }

  const code = config.email.testCode || generateCode();
  record.code = code;
  record.expiresAt = current + CODE_TTL_MS;
  record.lastSentAt = current;
  record.dailySent += 1;

  if (config.email.testCode) {
    return { status: "ok", expiresAt: record.expiresAt };
  }

  const smtp = getTransporter();
  if (!smtp) {
    const error = new Error("smtp_not_configured");
    error.status = 500;
    throw error;
  }

  try {
    await smtp.sendMail({
      from: config.smtp.from,
      to: normalized,
      subject: "恋上菜单验证码",
      text: `你的验证码是 ${code}，10 分钟内有效。`
    });
  } catch (error) {
    const sendError = new Error("send_failed");
    sendError.status = 500;
    throw sendError;
  }

  return { status: "ok", expiresAt: record.expiresAt };
}

function verifyEmailCode(email, code) {
  const normalized = ensureEmailValue(email);
  const record = getRecord(normalized);
  const current = now();

  if (record.dailyFails >= DAILY_FAIL_LIMIT) {
    const error = new Error("email_locked");
    error.status = 429;
    throw error;
  }

  if (!record.code || current > record.expiresAt) {
    record.code = null;
    record.expiresAt = 0;
    const error = new Error("code_expired");
    error.status = 400;
    throw error;
  }

  if (String(code).trim() !== record.code) {
    record.dailyFails += 1;
    const error = new Error("code_invalid");
    error.status = 400;
    throw error;
  }

  record.code = null;
  record.expiresAt = 0;
  return { status: "ok" };
}

module.exports = { requestEmailCode, verifyEmailCode };
