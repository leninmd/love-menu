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

function createEmailSession(email) {
  const user = { id: nanoid(), email };
  return {
    user,
    token: signToken(user)
  };
}

module.exports = {
  signToken,
  authRequired,
  createEmailSession,
  verifyToken,
  extractToken
};
