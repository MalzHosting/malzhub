const {
  crypto, getRedis, method, body, send,
  currentUser, errorResponse
} = require("../lib/server");

const LESSONS = new Set(
  Array.from({ length: 20 }, (_, i) => `lesson-${String(i + 1).padStart(2, "0")}`)
);

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET", "POST"])) return;

  try {
    const redis = getRedis();
    const user = await currentUser(req, redis);

    if (!user) return send(res, 401, { error: "Silakan login terlebih dahulu." });

    const key = `mh:progress:${user.id}`;
    const raw = await redis.get(key);
    const progress = raw
      ? (typeof raw === "string" ? JSON.parse(raw) : raw)
      : { completedLessons: [], bookmarks: [], quizResults: [], ctfCompleted: [], xp: 0 };

    if (req.method === "GET") {
      return send(res, 200, { ok: true, progress });
    }

    const input = body(req);

    if (input.completedLesson !== undefined) {
      const id = input.completedLesson;

      if (typeof id !== "string" || !LESSONS.has(id)) {
        return send(res, 400, { error: "ID materi tidak valid." });
      }

      if (!progress.completedLessons.includes(id)) {
        progress.completedLessons.push(id);
      }
    }

    if (input.bookmarks !== undefined) {
      if (!Array.isArray(input.bookmarks) || input.bookmarks.length > 100) {
        return send(res, 400, { error: "Daftar bookmark tidak valid." });
      }

      if (!input.bookmarks.every(x => typeof x === "string" && x.length <= 100)) {
        return send(res, 400, { error: "Ada bookmark yang tidak valid." });
      }

      progress.bookmarks = [...new Set(input.bookmarks)];
    }

    // XP dihitung oleh server; klien tidak boleh mengirim nilai XP sendiri.
    progress.xp = progress.completedLessons.length * 10;
    progress.updatedAt = new Date().toISOString();

    await redis.set(key, JSON.stringify(progress));
    await redis.zadd("mh:leaderboard", {
      score: progress.xp,
      member: user.id
    });

    return send(res, 200, { ok: true, progress });
  } catch (err) {
    return errorResponse(res, err);
  }
};
