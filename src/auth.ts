import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import type { SessionUser } from "./types.js";

export function signSession(user: SessionUser) {
  return jwt.sign(user, config.SESSION_SECRET, { expiresIn: "30d" });
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    return reply.code(401).send({ error: "Missing bearer token" });
  }

  try {
    request.user = jwt.verify(token, config.SESSION_SECRET) as SessionUser;
  } catch {
    return reply.code(401).send({ error: "Invalid session" });
  }
}
