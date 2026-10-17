const crypto = require("node:crypto");
const { Redis } = require("@upstash/redis");

const SESSION_SECONDS = 60 * 60 * 24 * 7;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    const err = new Error("Redis belum dikonfigurasi di environment.");
    err.status = 503;
    throw err;
  }

  return new Redis({ url, token });
}

function send(res, status, data) {
  return res.status(status).json(data);
}

function method(req, res, allowed) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", allowed.join(", "));
    return res.status(204).end();
  }

  if (!allowed.includes(req.method)) {
    res.setHeader("Allow", allowed.join(", "));
    send(res, 405, { error: "Method tidak didukung." });
    return false;
  }

  return true;
}

function body(req) {
  if (req.body && typeof req.body === "object") return req.body;

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {}
  }

  return {};
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (typeof stored !== "string") return false;

  const parts = stored.split(":");
  if (parts.length !== 2) return false;

  try {
    const candidate = Buffer.from(hashPassword(password, parts[0]).split(":")[1], "hex");
    const original = Buffer.from(parts[1], "hex");

    return candidate.length === original.length &&
      crypto.timingSafeEqual(candidate, original);
  } catch {
    return false;
  }
}

function cookieOptions(maxAge) {
  return [
    `mh_session=`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`
  ].join("; ");
}

async function createSession(redis, userId, res) {
  const token = crypto.randomBytes(32).toString("hex");
  const key = crypto.createHash("sha256").update(token).digest("hex");

  await redis.set(
    `mh:session:${key}`,
    JSON.stringify({ userId, createdAt: Date.now() }),
    { ex: SESSION_SECONDS }
  );

  res.setHeader("Set-Cookie", [
    `mh_session=${token}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESSION_SECONDS}`
  ].join("; "));

  return token;
}

function getCookie(req, name) {
  const raw = req.headers.cookie || "";

  for (const item of raw.split(";")) {
    const part = item.trim();
    const index = part.indexOf("=");

    if (index < 0) continue;

    if (part.slice(0, index) === name) {
      return part.slice(index + 1);
    }
  }

  return "";
}

async function currentUser(req, redis) {
  const token = getCookie(req, "mh_session");

  if (!/^[a-f0-9]{64}$/.test(token)) return null;

  const key = crypto.createHash("sha256").update(token).digest("hex");
  const raw = await redis.get(`mh:session:${key}`);

  if (!raw) return null;

  const session = typeof raw === "string" ? JSON.parse(raw) : raw;
  const user = await redis.get(`mh:user:${session.userId}`);

  if (!user) return null;

  const result = typeof user === "string" ? JSON.parse(user) : user;

  return {
    id: result.id,
    username: result.username,
    email: result.email
  };
}

function clearSession(res) {
  res.setHeader("Set-Cookie", cookieOptions(0));
}

function validEmail(email) {
  return typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function errorResponse(res, err) {
  if (err.status) {
    return send(res, err.status, { error: err.message });
  }

  console.error("MalzHub API error:", err.message || err);
  return send(res, 500, { error: "Terjadi kesalahan server." });
}

module.exports = {
  crypto,
  getRedis,
  send,
  method,
  body,
  hashPassword,
  verifyPassword,
  createSession,
  currentUser,
  clearSession,
  validEmail,
  errorResponse
};
