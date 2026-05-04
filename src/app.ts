import path from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { config } from "./config.js";
import { authRoutes } from "./routes/auth-routes.js";
import { configRoutes } from "./routes/config-routes.js";
import { healthRoutes } from "./routes/health-routes.js";
import { studentRoutes } from "./routes/student-routes.js";

export async function buildApp() {
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

  await app.register(healthRoutes);
  await app.register(configRoutes);
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(studentRoutes, { prefix: "/api" });

  return app;
}
