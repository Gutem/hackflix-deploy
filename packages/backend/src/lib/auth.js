/**
 * Password hashing and JWT utilities.
 * @module packages/backend/src/lib/auth
 */

import { createHmac, randomBytes, pbkdf2Sync, timingSafeEqual } from "crypto";

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const JWT_EXPIRES_IN = 24 * 60 * 60;

function base64url(data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf-8");
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(str) {
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) padded += "=";
  return Buffer.from(padded, "base64").toString("utf-8");
}

/**
 * Hash a password using PBKDF2.
 * @param {string} password
 * @returns {string} Format: iterations$salt$hash
 */
export function hashPassword(password) {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512").toString("hex");
  return `${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

/**
 * Verify a password against a stored hash.
 * Uses timing-safe comparison to prevent timing attacks.
 * @param {string} password
 * @param {string} storedHash - Format: iterations$salt$hash
 * @returns {boolean}
 */
export function verifyPassword(password, storedHash) {
  const [iterations, salt, hash] = storedHash.split("$");
  const computed = pbkdf2Sync(password, salt, parseInt(iterations, 10), KEY_LENGTH, "sha512").toString("hex");
  
  const computedBuf = Buffer.from(computed, "hex");
  const hashBuf = Buffer.from(hash, "hex");
  
  if (computedBuf.length !== hashBuf.length) return false;
  return timingSafeEqual(computedBuf, hashBuf);
}

/**
 * Sign a JWT token (HS256).
 * @param {Object} payload
 * @param {string} payload.sub - User ID
 * @param {string} payload.username
 * @param {string} payload.tier
 * @param {string[]} payload.contentIds
 * @param {string} secret
 * @param {Object} [options]
 * @param {number} [options.expiresIn] - Seconds (default: 86400)
 * @returns {string}
 */
export function jwtSign(payload, secret, options = {}) {
  const expiresIn = options.expiresIn ?? JWT_EXPIRES_IN;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const claims = { ...payload, iat: now, exp: now + expiresIn };
  const encodedPayload = base64url(JSON.stringify(claims));
  const hmac = createHmac("sha256", secret);
  hmac.update(`${header}.${encodedPayload}`);
  const signature = base64url(hmac.digest());
  return `${header}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode a JWT token.
 * @param {string} token
 * @param {string} secret
 * @returns {Object|null}
 */
export function jwtVerify(token, secret) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(`${header}.${payload}`);
    const expectedSig = base64url(hmac.digest());
    const sigBuf = Buffer.from(signature.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const expectedBuf = Buffer.from(expectedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
    const decoded = JSON.parse(base64urlDecode(payload));
    if (decoded.exp && Math.floor(Date.now() / 1000) > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}
