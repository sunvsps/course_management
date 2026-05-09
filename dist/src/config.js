import dotenv from "dotenv";
import { z } from "zod";
dotenv.config({ path: process.env.APP_ENV ? `.env.${process.env.APP_ENV}` : ".env" });
const envBoolean = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized))
        return true;
    if (["false", "0", "no", "off", ""].includes(normalized))
        return false;
    return value;
}, z.boolean());
const envSchema = z.object({
    PORT: z.coerce.number().default(3001),
    HOST: z.string().default("0.0.0.0").transform((value) => value.trim() || "0.0.0.0"),
    APP_BASE_URL: z.string().url().default("http://localhost:3001"),
    SESSION_SECRET: z.string().min(24),
    ADMIN_USERNAME: z.string().default(""),
    ADMIN_PASSWORD: z.string().default(""),
    TEACHER_USERNAME: z.string().default(""),
    TEACHER_PASSWORD: z.string().default(""),
    TEACHER_USER_ID: z.string().default(""),
    TEACHER_DISPLAY_NAME: z.string().default(""),
    LOCAL_DEMO_ENABLED: envBoolean.default(false),
    MOCK_SHEET_ENABLED: envBoolean.default(false),
    DEMO_USER_ID: z.string().default(""),
    DEMO_DISPLAY_NAME: z.string().default("Demo Student"),
    LINE_LOGIN_CHANNEL_ID: z.string().default(""),
    LIFF_ID: z.string().default(""),
    GOOGLE_SPREADSHEET_ID: z.string().default(""),
    GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().default(""),
    GOOGLE_PRIVATE_KEY: z.string().default("")
});
export const config = envSchema.parse(process.env);
