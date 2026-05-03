import path from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { z } from "zod";
import { requireAuth, signSession } from "./auth.js";
import { config } from "./config.js";
import { getLineProfile, verifyLineIdToken } from "./line.js";
import { upsertLineProfile } from "./sheets.js";
import { getStudentDashboard } from "./student-service.js";
const app = Fastify({ logger: true });
app.log.info({
    host: config.HOST,
    port: config.PORT,
    localDemoEnabled: config.LOCAL_DEMO_ENABLED,
    mockSheetEnabled: config.MOCK_SHEET_ENABLED,
    hasSpreadsheetId: Boolean(config.GOOGLE_SPREADSHEET_ID),
    hasServiceAccountEmail: Boolean(config.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    hasPrivateKey: Boolean(config.GOOGLE_PRIVATE_KEY)
}, "Loaded app configuration");
await app.register(fastifyStatic, {
    root: path.join(process.cwd(), "public"),
    prefix: "/"
});
app.get("/health", async () => ({ ok: true }));
app.get("/api/config", async () => ({
    liffId: config.LIFF_ID,
    localDemoEnabled: config.LOCAL_DEMO_ENABLED,
    mockSheetEnabled: config.MOCK_SHEET_ENABLED
}));
app.post("/api/auth/demo", async (_request, reply) => {
    if (!config.LOCAL_DEMO_ENABLED) {
        return reply.code(404).send({ error: "Local demo is disabled" });
    }
    const token = signSession({
        lineUserId: "demo-student",
        displayName: "Demo Student"
    });
    return { token };
});
app.post("/api/auth/liff", async (request) => {
    const body = z.object({
        idToken: z.string().min(1).nullable().optional(),
        accessToken: z.string().min(1).nullable().optional()
    }).parse(request.body);
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
    const token = signSession({
        lineUserId: profile.lineUserId,
        lineProfileId: profile.lineProfileId,
        displayName: profile.displayName
    });
    return { token };
});
app.get("/api/me/dashboard", { preHandler: requireAuth }, async (request, reply) => {
    try {
        return await getStudentDashboard(request.user.lineUserId);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Dashboard failed";
        return reply.code(404).send({ error: message });
    }
});
await app.listen({ port: config.PORT, host: config.HOST });
