"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminMeRoutes;
const session_1 = require("../../lib/session");
async function adminMeRoutes(app) {
    app.get("/me", async (req, reply) => {
        const session = await (0, session_1.getAdminSession)(req);
        if (!(0, session_1.requireAdminSession)(session, reply))
            return;
        return (0, session_1.ok)(reply, session);
    });
}
