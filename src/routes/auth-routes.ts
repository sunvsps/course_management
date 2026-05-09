import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { signSession } from "../auth.js";
import { config } from "../config.js";
import { getLineProfile, verifyLineIdToken } from "../line.js";
import { loadSheetDatabase, upsertLineProfile } from "../sheets.js";

const liffLoginSchema = z.object({
  idToken: z.string().min(1).nullable().optional(),
  accessToken: z.string().min(1).nullable().optional()
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/demo", async (_request, reply) => {
    if (!config.LOCAL_DEMO_ENABLED) {
      return reply.code(404).send({ error: "Local demo is disabled" });
    }

    const token = signSession({
      userId: config.DEMO_USER_ID,
      displayName: config.DEMO_DISPLAY_NAME
    });

    return { token };
  });

  app.post("/liff", async (request) => {
    const body = liffLoginSchema.parse(request.body);

    if (!body.idToken && !body.accessToken) {
      throw new Error("LINE login requires idToken or accessToken");
    }

    const idProfile = body.idToken ? await verifyLineIdToken(body.idToken) : undefined;
    const accessProfile = body.accessToken ? await getLineProfile(body.accessToken) : undefined;
    const lineUserId = idProfile?.lineUserId ?? accessProfile?.userId;

    if (!lineUserId) {
      throw new Error("LINE profile does not include userId");
    }

    const profile = await upsertLineProfile({
      lineUserId,
      displayName: accessProfile?.displayName ?? idProfile?.displayName ?? "LINE User",
      pictureUrl: accessProfile?.pictureUrl ?? idProfile?.pictureUrl,
      statusMessage: accessProfile?.statusMessage,
      email: idProfile?.email
    });
    const db = await loadSheetDatabase();
    const linkedUserIds = db.userLineProfiles
      .filter((link) => link.lineProfileId === profile.lineProfileId)
      .map((link) => link.userId);
    const linkedUsers = db.users.filter((item) => item.userId && linkedUserIds.includes(item.userId));
    const user = linkedUsers.find((item) => item.role === "INSTRUCTOR")
      ?? linkedUsers.find((item) => item.role === "ADMIN")
      ?? linkedUsers.find((item) => item.role === "STUDENT");

    if (!user?.userId) {
      throw new Error("LINE profile is not linked to a student userId yet");
    }

    const role = user.role || "STUDENT";
    const isTeacher = role === "INSTRUCTOR" || role === "ADMIN";

    const token = signSession({
      userId: user.userId,
      displayName: user.displayName || profile.displayName,
      lineProfileId: profile.lineProfileId,
      role,
      instructorName: isTeacher ? user.displayName || profile.displayName : undefined
    });

    return {
      token,
      role,
      redirectPath: isTeacher ? "/teacher" : "/student"
    };
  });
}
