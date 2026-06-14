"use strict";

const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

function resolveDatabasePath() {
  const configured = process.env.DATABASE_PATH;
  if (!configured) {
    throw new Error("DATABASE_PATH is required");
  }

  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

const config = {
  databasePath: resolveDatabasePath(),
  jwtSecret: process.env.JWT_SECRET || "",
  port: Number.parseInt(process.env.PORT || "3000", 10),
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number.parseInt(process.env.SMTP_PORT || "0", 10),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || ""
  },
  email: {
    testCode: process.env.EMAIL_TEST_CODE || ""
  },
  webauthn: {
    rpId: process.env.RP_ID || "localhost",
    rpOrigin: process.env.RP_ORIGIN || "http://localhost:5173",
    rpName: process.env.RP_NAME || "Love Menu"
  },
  corsOrigin: process.env.CORS_ORIGIN || "",
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    subject: process.env.VAPID_SUBJECT || "mailto:admin@example.com"
  }
};

if (!config.jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

module.exports = { config };
