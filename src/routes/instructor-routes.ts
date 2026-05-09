import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireInstructor, signSession } from "../auth.js";
import { config } from "../config.js";
import { createAttendanceRow, loadSheetDatabase } from "../sheets.js";
import { getTeacherDashboard } from "../teacher-service.js";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const optionalScoreSchema = z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.number().min(0).max(5).optional()
);

const attendanceSchema = z.object({
  enrollmentId: z.string().trim().min(1),
  checkedInAt: z.string().trim().min(1),
  classesUsed: z.coerce.number().min(0),
  hyperactiveScore: optionalScoreSchema,
  distractionScore: optionalScoreSchema,
  attentionSpanScore: optionalScoreSchema,
  selfControlScore: optionalScoreSchema,
  selfEsteemScore: optionalScoreSchema,
  timeManagementScore: optionalScoreSchema,
  behaviorScore: optionalScoreSchema,
  note: z.string().trim().optional().default("")
});

export async function instructorRoutes(app: FastifyInstance) {
  app.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);

    if (!config.TEACHER_USERNAME || !config.TEACHER_PASSWORD) {
      return reply.code(503).send({ error: "Teacher login is not configured" });
    }

    if (body.username !== config.TEACHER_USERNAME || body.password !== config.TEACHER_PASSWORD) {
      return reply.code(401).send({ error: "Username or password is incorrect" });
    }

    const instructorName = config.TEACHER_DISPLAY_NAME || body.username;
    const instructorId = config.TEACHER_USER_ID || body.username;
    const token = signSession({
      userId: instructorId,
      displayName: instructorName,
      instructorName,
      role: "INSTRUCTOR"
    });

    return { token };
  });

  app.get("/dashboard", { preHandler: requireInstructor }, async (request) => {
    return getTeacherDashboard(request.user!.userId);
  });

  app.post("/attendances", { preHandler: requireInstructor }, async (request, reply) => {
    const body = attendanceSchema.parse(request.body);
    const instructorId = request.user!.userId;
    const instructorName = request.user!.instructorName || request.user!.displayName;
    const db = await loadSheetDatabase();
    const enrollment = db.enrollments.find((item) => item.enrollmentId === body.enrollmentId);

    if (!enrollment || enrollment.instructorId !== instructorId) {
      return reply.code(403).send({ error: "This enrollment is not assigned to this teacher" });
    }

    const attendance = await createAttendanceRow({
      attendanceId: "",
      enrollmentId: body.enrollmentId,
      instructorName,
      checkedInAt: body.checkedInAt,
      classesUsed: body.classesUsed,
      hyperactiveScore: body.hyperactiveScore,
      distractionScore: body.distractionScore,
      attentionSpanScore: body.attentionSpanScore,
      selfControlScore: body.selfControlScore,
      selfEsteemScore: body.selfEsteemScore,
      timeManagementScore: body.timeManagementScore,
      behaviorScore: body.behaviorScore,
      note: body.note || undefined
    });

    return { attendance };
  });
}
