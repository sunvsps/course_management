import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { createPrePostAssessmentRow, loadSheetDatabase } from "../sheets.js";
import { getStudentDashboard } from "../student-service.js";

const optionalScoreSchema = z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.number().min(0).max(5).optional()
);

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

export async function studentRoutes(app: FastifyInstance) {
  app.get("/me/dashboard", { preHandler: requireAuth }, async (request, reply) => {
    try {
      return await getStudentDashboard(request.user!.userId, request.user!.lineProfileId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dashboard failed";
      return reply.code(404).send({ error: message });
    }
  });

  const createPrePostAssessment = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = prePostAssessmentSchema.parse(request.body);
    const db = await loadSheetDatabase();
    const enrollment = db.enrollments.find((item) => item.enrollmentId === body.enrollmentId);

    if (!enrollment?.userId || !canAccessStudent(db, enrollment.userId, request.user!.userId, request.user!.lineProfileId)) {
      return reply.code(403).send({ error: "This enrollment is not available for this student session" });
    }

    const userLineProfile = findUserLineProfile(db, enrollment.userId, request.user!.lineProfileId);
    const duplicate = db.prePostAssessments.find((item) => {
      return item.enrollmentId === body.enrollmentId
        && item.assessmentType === body.assessmentType
        && item.raterRole === "PARENT"
        && item.userLineProfileId === userLineProfile?.userLineProfileId;
    });

    if (duplicate) {
      return reply.code(409).send({ error: "Pre/Post assessment already submitted" });
    }

    const prePostAssessment = await createPrePostAssessmentRow({
      assessmentId: "",
      enrollmentId: body.enrollmentId,
      assessmentType: body.assessmentType,
      raterRole: "PARENT",
      userLineProfileId: userLineProfile?.userLineProfileId,
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

  app.post("/me/pre-post-assessments", { preHandler: requireAuth }, createPrePostAssessment);
  app.post("/me/assessments", { preHandler: requireAuth }, createPrePostAssessment);
}

function findUserLineProfile(
  db: Awaited<ReturnType<typeof loadSheetDatabase>>,
  studentUserId: string,
  lineProfileId?: string
) {
  if (!lineProfileId) return undefined;
  return db.userLineProfiles.find((link) => {
    return link.userId === studentUserId && link.lineProfileId === lineProfileId;
  });
}

function canAccessStudent(
  db: Awaited<ReturnType<typeof loadSheetDatabase>>,
  studentUserId: string,
  sessionUserId: string,
  lineProfileId?: string
) {
  if (studentUserId === sessionUserId) return true;
  if (!lineProfileId) return false;

  return db.userLineProfiles.some((link) => {
    return link.userId === studentUserId && link.lineProfileId === lineProfileId;
  });
}
