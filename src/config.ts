import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0").transform((value) => value.trim() || "0.0.0.0"),
  APP_BASE_URL: z.string().url().default("http://localhost:3001"),
  SESSION_SECRET: z.string().min(24),
  LOCAL_DEMO_ENABLED: z.coerce.boolean().default(false),
  MOCK_SHEET_ENABLED: z.coerce.boolean().default(false),
  LINE_LOGIN_CHANNEL_ID: z.string().default(""),
  LIFF_ID: z.string().default(""),
  GOOGLE_SPREADSHEET_ID: z.string().default(""),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().default(""),
  GOOGLE_PRIVATE_KEY: z.string().default("")
});

export const config = envSchema.parse(process.env);
