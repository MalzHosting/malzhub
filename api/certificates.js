const {
  crypto, getRedis, method, body, send,
  currentUser, errorResponse
} = require("../lib/server");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET", "POST"])) return;

  try {
    const redis = getRedis();

    if (req.method === "GET") {
      const id = typeof req.query.id === "string" ? req.query.id : "";

      if (!/^[a-f0-9-]{36}$/.test(id)) {
        return send(res, 400, { error: "ID sertifikat tidak valid." });
      }

      const raw = await redis.get(`mh:certificate:${id}`);

      if (!raw) {
        return send(res, 404, { valid: false, error: "Sertifikat tidak ditemukan." });
      }

      const certificate = typeof raw === "string" ? JSON.parse(raw) : raw;

      return send(res, 200, {
        valid: true,
        certificate: {
          id: certificate.id,
          username: certificate.username,
          issuedAt: certificate.issuedAt,
          course: certificate.course
        }
      });
    }

    const user = await currentUser(req, redis);
    if (!user) return send(res, 401, { error: "Silakan login terlebih dahulu." });

    const rawProgress = await redis.get(`mh:progress:${user.id}`);
    const progress = rawProgress
      ? (typeof rawProgress === "string" ? JSON.parse(rawProgress) : rawProgress)
      : { completedLessons: [] };

    if (!Array.isArray(progress.completedLessons) ||
        progress.completedLessons.length < 20) {
      return send(res, 403, {
        error: "Selesaikan seluruh 20 materi sebelum meminta sertifikat."
      });
    }

    const id = crypto.randomUUID();
    const certificate = {
      id,
      userId: user.id,
      username: user.username,
      course: "MalzHub Cyber Labs Academy",
      issuedAt: new Date().toISOString()
    };

    await redis.set(`mh:certificate:${id}`, JSON.stringify(certificate));

    return send(res, 201, {
      ok: true,
      certificate
    });
  } catch (err) {
    return errorResponse(res, err);
  }
};
