const {
  getRedis, method, send, currentUser, errorResponse
} = require("../../lib/server");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;
  try {
    const redis = getRedis();
    const user = await currentUser(req, redis);
    return send(res, 200, { ok: true, user });
  } catch (err) {
    return errorResponse(res, err);
  }
};
