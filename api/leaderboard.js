const { getRedis, method, send, errorResponse } = require("../lib/server");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;

  try {
    const redis = getRedis();
    const rows = await redis.zrange("mh:leaderboard", 0, 19, {
      rev: true,
      withScores: true
    });

    const list = [];

    if (Array.isArray(rows)) {
      for (const row of rows) {
        const id = typeof row === "object" ? row.member : null;
        if (!id) continue;

        const raw = await redis.get(`mh:user:${id}`);
        if (!raw) continue;

        const user = typeof raw === "string" ? JSON.parse(raw) : raw;

        list.push({
          username: user.username,
          xp: Number(row.score || 0)
        });
      }
    }

    return send(res, 200, { ok: true, leaderboard: list });
  } catch (err) {
    return errorResponse(res, err);
  }
};
