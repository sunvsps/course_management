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
export async function requireAdmin(request, reply) {
    await requireAuth(request, reply);
    if (reply.sent)
        return;
    if (request.user?.role !== "ADMIN") {
        return reply.code(403).send({ error: "Admin access required" });
    }
}
export async function requireInstructor(request, reply) {
    await requireAuth(request, reply);
    if (reply.sent)
        return;
    if (request.user?.role !== "INSTRUCTOR" && request.user?.role !== "ADMIN") {
        return reply.code(403).send({ error: "Instructor access required" });
    }
}
