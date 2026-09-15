/**
 * Auth API handlers — login, verify, profile.
 * @module packages/backend/src/routes/api/auth
 */

import { jwtSign } from "../../lib/auth.js";
import { json, buildUserResponse, parseBody } from "../../lib/response.js";

/** @param {Request} req @param {import('../../services/user-store.js').UserStore} userStore @param {string} jwtSecret */
export async function handleLogin(req, userStore, jwtSecret) {
  const body = await parseBody(req);
  const { username, password } = body;

  if (!username || !password) {
    return json({ error: "Username and password required" }, 400);
  }

  if (username.length > 100 || password.length > 1000) {
    return json({ error: "Input too long" }, 400);
  }

  const user = userStore.findByUsername(username, password);
  if (!user) {
    return json({ error: "Invalid credentials" }, 401);
  }

  const token = jwtSign({
    sub: user.id,
    username: user.username,
    email: user.email,
    tier: user.tier,
    contentIds: user.contentIds,
  }, jwtSecret);

  const response = new Response(JSON.stringify({ token, user: buildUserResponse(user, true) }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `hackflix_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}` + (process.env.NODE_ENV === "production" ? "; Secure" : ""),
    },
  });
  return response;
}

/** @param {Object} user */
export function handleVerify(user) {
  return json(buildUserResponse(user));
}

/** @param {Object} user */
export function handleGetMe(user) {
  return json(buildUserResponse(user));
}

/**
 * Logout — clears the JWT HttpOnly cookie.
 * Sets cookie with Max-Age=0 to expire immediately.
 * @returns {Response}
 */
export function handleLogout() {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "hackflix_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" + (process.env.NODE_ENV === "production" ? "; Secure" : ""),
    },
  });
}
