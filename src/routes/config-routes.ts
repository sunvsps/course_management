import type { FastifyInstance } from "fastify";
import { config } from "../config.js";

export async function configRoutes(app: FastifyInstance) {
  app.get("/api/config", async () => ({
    liffId: config.LIFF_ID,
    localDemoEnabled: config.LOCAL_DEMO_ENABLED,
    mockSheetEnabled: config.MOCK_SHEET_ENABLED
  }));
}
