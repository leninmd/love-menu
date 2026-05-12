"use strict";

const { now } = require("./utils");

function createRateLimiter(options) {
  const store = new Map();
  const windowMs = options.windowMs;
  const max = options.max;
  const keyFn = options.keyFn;

  return function rateLimit(req, res, next) {
    const key = keyFn(req);
    const current = now();
    const entry = store.get(key) || { count: 0, resetAt: current + windowMs };
    if (current > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = current + windowMs;
    }
    entry.count += 1;
    store.set(key, entry);
    if (entry.count > max) {
      return res.status(429).json({ error: "rate_limited" });
    }
    return next();
  };
}

module.exports = { createRateLimiter };
