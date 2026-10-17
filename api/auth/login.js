const {
  getRedis, method, body, send,
  verifyPassword, createSession, validEmail, errorResponse
} = require("../../lib/server");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;

  const input = body(req);
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!validEmail(email) || !password || password.length > 128) {
    return send(res, 400, { error: "Email atau password tidak valid." });
  }

  try {
    const redis = getRedis();
    const userId = await redis.get(`mh:email:${email}`);

    if (!userId) {
      return send(res, 401, { error: "Email atau password salah." });
    }

    const raw = await redis.get(`mh:user:${userId}`);
    const user = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return send(res, 401, { error: "Email atau password salah." });
    }

    await createSession(redis, user.id, res);

    return send(res, 200, {
      ok: true,
      user: { id: user.id, email: user.email, username: user.username }
    });
  } catch (err) {
    return errorResponse(res, err);
  }
};
