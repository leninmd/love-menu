"use strict";

const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const { config } = require("./config");

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: "7d"
  });
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return res.status(401).json({ error: "missing_token" });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

function extractToken(req) {
  const header = req.headers.authorization || "";
  const headerToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  const queryToken = String(req.query.token || "").trim();
  return headerToken || queryToken || "";
}

function createEmailSession(user) {
  return {
    user,
    token: signToken(user)
  };
}

async function findOrCreateUser(db, email) {
  const existing = await db.get(
    "SELECT id, email, nickname, avatar_url FROM users WHERE email = ?",
    [email]
  );
  if (existing) return existing;

  const id = nanoid();
  await db.run(
    "INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)",
    [id, email, Date.now()]
  );
  return { id, email, nickname: null, avatar_url: null };
}

module.exports = {
  signToken,
  authRequired,
  createEmailSession,
  findOrCreateUser,
  verifyToken,
  extractToken
};
