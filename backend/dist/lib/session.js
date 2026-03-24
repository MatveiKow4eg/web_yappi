"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminSession = getAdminSession;
exports.requireAdminSession = requireAdminSession;
exports.ok = ok;
exports.err = err;
const auth_1 = require("./auth");
async function getAdminSession(req) {
    const token = req.cookies?.admin_token;
    if (!token)
        return null;
    return (0, auth_1.verifyAdminToken)(token);
}
function requireAdminSession(session, reply) {
    if (!session) {
        reply.code(401).send({ ok: false, error: "Unauthorized" });
        return false;
    }
    return true;
}
function ok(reply, data, status = 200) {
    return reply.code(status).send({ ok: true, data });
}
function err(reply, message, status = 400) {
    return reply.code(status).send({ ok: false, error: message });
}
