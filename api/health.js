const { getRedis, method, send, errorResponse } = require("../lib/server");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;

  try {
    const redis = getRedis();
    await redis.ping();

    return send(res, 200, {
      ok: true,
      service: "MalzHub Cyber Labs API",
      redis: "connected"
    });
  } catch (err) {
    if (err.status === 503) {
      return send(res, 503, {
        ok: false,
        redis: "not_configured",
        message: "Tambahkan kredensial Upstash di environment Vercel."
      });
    }

    return errorResponse(res, err);
  }
};
