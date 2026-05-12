"use strict";

const webpush = require("web-push");
const { config } = require("./config");

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!config.vapid.publicKey || !config.vapid.privateKey) {
    return false;
  }
  webpush.setVapidDetails(
    config.vapid.subject,
    config.vapid.publicKey,
    config.vapid.privateKey
  );
  configured = true;
  return true;
}

function isReady() {
  return ensureConfigured();
}

async function sendPush(subscription, payload) {
  if (!ensureConfigured()) {
    const error = new Error("vapid_not_configured");
    error.status = 500;
    throw error;
  }
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}

module.exports = { sendPush, isReady };
