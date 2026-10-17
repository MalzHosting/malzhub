const {
  crypto, getRedis, method, body, send,
  hashPassword, createSession, validEmail, errorResponse
} = require("../../lib/server");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;

  const input = body(req);
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const username = typeof input.username === "string" ? input.username.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!validEmail(email)) {
    return send(res, 400, { error: "Format email tidak valid." });
  }

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return send(res, 400, {
      error: "Username harus 3-24 karakter: huruf, angka, atau underscore."
    });
  }

  if (password.length < 10 || password.length > 128) {
    return send(res, 400, { error: "Password harus 10-128 karakter." });
  }

  try {
    const redis = getRedis();
    const userId = crypto.randomUUID();
    const emailKey = `mh:email:${email}`;
    const usernameKey = `mh:username:${username.toLowerCase()}`;

    const emailReserved = await redis.set(emailKey, userId, { nx: true });

    if (emailReserved !== "OK") {
      return send(res, 409, { error: "Email sudah terdaftar." });
    }

    const usernameReserved = await redis.set(usernameKey, userId, { nx: true });

    if (usernameReserved !== "OK") {
      await redis.del(emailKey);
      return send(res, 409, { error: "Username sudah digunakan." });
    }

    const user = {
      id: userId,
      email,
      username,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString()
    };

    try {
      await redis.set(`mh:user:${userId}`, JSON.stringify(user));
      await redis.set(`mh:progress:${userId}`, JSON.stringify({
        completedLessons: [],
        bookmarks: [],
        quizResults: [],
        ctfCompleted: [],
        xp: 0
      }));

      await createSession(redis, userId, res);
    } catch (err) {
      await redis.del(emailKey, usernameKey, `mh:user:${userId}`, `mh:progress:${userId}`);
      throw err;
    }

    return send(res, 201, {
      ok: true,
      user: { id: user.id, email: user.email, username: user.username }
    });
  } catch (err) {
    return errorResponse(res, err);
  }
};
