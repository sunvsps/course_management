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
    const linkedUserId = db.userLineProfiles.find((link) => link.lineProfileId === profile.lineProfileId)?.userId;
    const user = db.users.find((item) => item.userId === linkedUserId)
      ?? db.users.find((item) => item.lineProfileId === profile.lineProfileId);

    if (!user?.userId) {
      throw new Error("LINE profile is not linked to a student userId yet");
    }

    const token = signSession({
      userId: user.userId,
      displayName: user.displayName || profile.displayName,
      lineProfileId: profile.lineProfileId
    });

    return { token };
  });
}
