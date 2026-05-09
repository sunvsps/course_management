import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth.js";
import { getStudentDashboard } from "../student-service.js";

export async function studentRoutes(app: FastifyInstance) {
  app.get("/me/dashboard", { preHandler: requireAuth }, async (request, reply) => {
    try {
      return await getStudentDashboard(request.user!.userId, request.user!.lineProfileId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dashboard failed";
      return reply.code(404).send({ error: message });
    }
  });
}
