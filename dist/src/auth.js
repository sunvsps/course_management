import jwt from "jsonwebtoken";
import { config } from "./config.js";
export function signSession(user) {
    return jwt.sign(user, config.SESSION_SECRET, { expiresIn: "30d" });
}
export async function requireAuth(request, reply) {
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
    if (!token) {
        return reply.code(401).send({ error: "Missing bearer token" });
    }
    try {
        request.user = jwt.verify(token, config.SESSION_SECRET);
    }
    catch {
        return reply.code(401).send({ error: "Invalid session" });
    }
}
