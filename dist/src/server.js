import path from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { z } from "zod";
import { requireAuth, signSession } from "./auth.js";
import { config } from "./config.js";
import { verifyLineIdToken } from "./line.js";
import { getStudentDashboard } from "./student-service.js";
const app = Fastify({ logger: true });
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
    const body = z.object({ idToken: z.string().min(1) }).parse(request.body);
    const profile = await verifyLineIdToken(body.idToken);
    const token = signSession({
        lineUserId: profile.lineUserId,
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
