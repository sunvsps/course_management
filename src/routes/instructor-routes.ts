import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireInstructor, signSession } from "../auth.js";
import { createPrePostAssessmentRow, createAttendanceRow, loadSheetDatabase } from "../sheets.js";
import { getTeacherDashboard } from "../teacher-service.js";

const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1),
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

const prePostAssessmentSchema = z.object({
  enrollmentId: z.string().trim().min(1),
  assessmentType: z.enum(["PRE", "POST"]),
  continuousActivityScore: optionalScoreSchema,
  listeningInstructionScore: optionalScoreSchema,
  emotionalControlScore: optionalScoreSchema,
  waitingSelfControlScore: optionalScoreSchema,
  concentrationScore: optionalScoreSchema,
  physicalBalanceScore: optionalScoreSchema,
  planningProblemSolvingScore: optionalScoreSchema,
  socialInteractionScore: optionalScoreSchema,
  confidenceNewExperienceScore: optionalScoreSchema,
  activityCooperationScore: optionalScoreSchema,
  note: z.string().trim().optional().default("")
});

export async function instructorRoutes(app: FastifyInstance) {
  app.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const db = await loadSheetDatabase();
    const teacherLogin = db.teacherLogins.find((item) => {
      return item.username.trim().toLowerCase() === body.username && item.password === body.password;
    });

    if (teacherLogin) {
      const user = db.users.find((item) => item.userId === teacherLogin.userId);
      if (!user?.userId || (user.role !== "INSTRUCTOR" && user.role !== "ADMIN")) {
        return reply.code(403).send({ error: "Teacher login is not linked to an instructor user" });
      }

      const token = signSession({
        userId: user.userId,
        displayName: user.displayName,
        instructorName: user.displayName,
        role: "INSTRUCTOR"
      });

      return { token };
    }

    return reply.code(401).send({ error: "Username or password is incorrect" });
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

  const createPrePostAssessment = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = prePostAssessmentSchema.parse(request.body);
    const instructorId = request.user!.userId;
    const instructorName = request.user!.instructorName || request.user!.displayName;
    const db = await loadSheetDatabase();
    const enrollment = db.enrollments.find((item) => item.enrollmentId === body.enrollmentId);

    if (!enrollment || enrollment.instructorId !== instructorId) {
      return reply.code(403).send({ error: "This enrollment is not assigned to this teacher" });
    }

    const duplicate = db.prePostAssessments.find((item) => {
      return item.enrollmentId === body.enrollmentId
        && item.assessmentType === body.assessmentType
        && item.raterRole === "INSTRUCTOR"
        && !item.userLineProfileId;
    });

    if (duplicate) {
      return reply.code(409).send({ error: "Pre/Post assessment already submitted" });
    }

    const prePostAssessment = await createPrePostAssessmentRow({
      assessmentId: "",
      enrollmentId: body.enrollmentId,
      assessmentType: body.assessmentType,
      raterRole: "INSTRUCTOR",
      continuousActivityScore: body.continuousActivityScore,
      listeningInstructionScore: body.listeningInstructionScore,
      emotionalControlScore: body.emotionalControlScore,
      waitingSelfControlScore: body.waitingSelfControlScore,
      concentrationScore: body.concentrationScore,
      physicalBalanceScore: body.physicalBalanceScore,
      planningProblemSolvingScore: body.planningProblemSolvingScore,
      socialInteractionScore: body.socialInteractionScore,
      confidenceNewExperienceScore: body.confidenceNewExperienceScore,
      activityCooperationScore: body.activityCooperationScore,
      note: body.note || undefined
    });

    return { prePostAssessment, assessment: prePostAssessment };
  };

  app.post("/pre-post-assessments", { preHandler: requireInstructor }, createPrePostAssessment);
  app.post("/assessments", { preHandler: requireInstructor }, createPrePostAssessment);
}
