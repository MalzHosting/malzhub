const {
  crypto, getRedis, method, send,
  clearSession, currentUser, errorResponse
} = require("../../lib/server");

function readToken(req) {
  for (const item of (req.headers.cookie || "").split(";")) {
    const part = item.trim();
    if (part.startsWith("mh_session=")) return part.slice("mh_session=".length);
  }
  return "";
}

module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;

  try {
    const redis = getRedis();
    const token = readToken(req);

    if (/^[a-f0-9]{64}$/.test(token)) {
      const key = crypto.createHash("sha256").update(token).digest("hex");
      await redis.del(`mh:session:${key}`);
    }

    clearSession(res);
    return send(res, 200, { ok: true });
  } catch (err) {
    return errorResponse(res, err);
  }
};
