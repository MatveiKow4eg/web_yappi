"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAdminToken = signAdminToken;
exports.verifyAdminToken = verifyAdminToken;
const jose_1 = require("jose");
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET environment variable is required and must be at least 32 characters long");
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
async function signAdminToken(payload) {
    return new jose_1.SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("8h")
        .sign(JWT_SECRET);
}
async function verifyAdminToken(token) {
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, JWT_SECRET);
        return payload;
    }
    catch {
        return null;
    }
}
