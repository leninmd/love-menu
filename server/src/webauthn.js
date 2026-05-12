"use strict";

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require("@simplewebauthn/server");
const { config } = require("./config");
const { nanoid } = require("nanoid");
const { now } = require("./utils");

const registrationChallenges = new Map();
const authenticationChallenges = new Map();

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function getUserByEmail(db, email) {
  return db.get("SELECT id, email FROM users WHERE email = ?", [email]);
}

async function listCredentials(db, userId) {
  return db.all(
    "SELECT id, public_key, counter, device_name FROM credentials WHERE user_id = ?",
    [userId]
  );
}

async function createUser(db, email) {
  const user = { id: nanoid(), email: normalizeEmail(email) };
  await db.run(
    "INSERT INTO users (id, email, nickname, avatar_url, created_at) VALUES (?, ?, ?, ?, ?)",
    [user.id, user.email, null, null, now()]
  );
  return user;
}

async function registerStart(db, email, deviceName) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    const error = new Error("invalid_email");
    error.status = 400;
    throw error;
  }

  let user = await getUserByEmail(db, normalized);
  if (!user) {
    user = await createUser(db, normalized);
  }

  const existing = await listCredentials(db, user.id);
  const excludeCredentials = existing.map((credential) => ({
    id: Buffer.from(credential.id, "base64"),
    type: "public-key"
  }));

  const options = generateRegistrationOptions({
    rpName: config.webauthn.rpName,
    rpID: config.webauthn.rpId,
    userID: user.id,
    userName: user.email,
    attestationType: "none",
    excludeCredentials
  });

  registrationChallenges.set(user.id, options.challenge);
  return { options, userId: user.id };
}

async function registerFinish(db, userId, response, deviceName) {
  const expectedChallenge = registrationChallenges.get(userId);
  if (!expectedChallenge) {
    const error = new Error("challenge_missing");
    error.status = 400;
    throw error;
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.webauthn.rpOrigin,
    expectedRPID: config.webauthn.rpId
  });

  if (!verification.verified) {
    const error = new Error("registration_failed");
    error.status = 400;
    throw error;
  }

  const { credential } = verification.registrationInfo;
  await db.run(
    "INSERT INTO credentials (id, user_id, public_key, counter, device_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      Buffer.from(credential.id).toString("base64"),
      userId,
      Buffer.from(credential.publicKey).toString("base64"),
      credential.counter,
      deviceName || null,
      now()
    ]
  );

  registrationChallenges.delete(userId);
  const user = await db.get("SELECT id, email FROM users WHERE id = ?", [userId]);
  return { user };
}

async function loginStart(db, email) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    const error = new Error("invalid_email");
    error.status = 400;
    throw error;
  }

  const user = await getUserByEmail(db, normalized);
  if (!user) {
    const error = new Error("user_not_found");
    error.status = 404;
    throw error;
  }

  const credentials = await listCredentials(db, user.id);
  const allowCredentials = credentials.map((credential) => ({
    id: Buffer.from(credential.id, "base64"),
    type: "public-key"
  }));

  const options = generateAuthenticationOptions({
    rpID: config.webauthn.rpId,
    allowCredentials
  });

  authenticationChallenges.set(user.id, options.challenge);
  return { options, userId: user.id };
}

async function loginFinish(db, userId, response) {
  const expectedChallenge = authenticationChallenges.get(userId);
  if (!expectedChallenge) {
    const error = new Error("challenge_missing");
    error.status = 400;
    throw error;
  }

  const credentialId = Buffer.from(response.rawId, "base64").toString("base64");
  const record = await db.get(
    "SELECT id, public_key, counter FROM credentials WHERE id = ? AND user_id = ?",
    [credentialId, userId]
  );
  if (!record) {
    const error = new Error("credential_not_found");
    error.status = 404;
    throw error;
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.webauthn.rpOrigin,
    expectedRPID: config.webauthn.rpId,
    authenticator: {
      credentialID: Buffer.from(record.id, "base64"),
      credentialPublicKey: Buffer.from(record.public_key, "base64"),
      counter: record.counter
    }
  });

  if (!verification.verified) {
    const error = new Error("authentication_failed");
    error.status = 400;
    throw error;
  }

  await db.run("UPDATE credentials SET counter = ? WHERE id = ?", [
    verification.authenticationInfo.newCounter,
    record.id
  ]);
  authenticationChallenges.delete(userId);
  const user = await db.get("SELECT id, email FROM users WHERE id = ?", [userId]);
  return { user };
}

module.exports = { registerStart, registerFinish, loginStart, loginFinish };
