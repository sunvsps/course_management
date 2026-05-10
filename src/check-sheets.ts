import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { JWT } from "google-auth-library";

const spreadsheetId = required("GOOGLE_SPREADSHEET_ID");
const email = required("GOOGLE_SERVICE_ACCOUNT_EMAIL");
const privateKey = required("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");
const tabs = ["LineProfiles", "UserLineProfiles", "TeacherLogins", "Users", "Courses", "Enrollments", "Lessons", "Attendances"];

const client = new JWT({
  email,
  key: privateKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

const token = await client.getAccessToken();
if (!token.token) {
  throw new Error("Could not create Google access token");
}

console.log("Google Sheets check");
console.log({
  spreadsheetId,
  spreadsheetIdLength: spreadsheetId.length,
  spreadsheetIdFirstChar: spreadsheetId.charAt(0),
  serviceAccountEmail: email,
  hasPrivateKey: privateKey.includes("BEGIN PRIVATE KEY"),
  cwd: process.cwd(),
  dotEnvPath: path.join(process.cwd(), ".env"),
  dotEnvSpreadsheetId: readDotEnvSpreadsheetId()
});

await checkSpreadsheetMetadata(token.token);

for (const tab of tabs) {
  await checkTab(token.token, tab);
}

async function checkSpreadsheetMetadata(accessToken: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  const text = await response.text();
  if (!response.ok) {
    console.error("Spreadsheet metadata: FAILED");
    console.error(`Status ${response.status}: ${text}`);
    return;
  }

  const data = JSON.parse(text) as { sheets?: Array<{ properties?: { title?: string } }> };
  console.log("Spreadsheet metadata: OK");
  console.log("Tabs found:", data.sheets?.map((sheet) => sheet.properties?.title).join(", "));
}

async function checkTab(accessToken: string, tab: string) {
  const range = encodeURIComponent(`${tab}!A1:Z5`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`${tab}: FAILED`);
    console.error(`Status ${response.status}: ${text}`);
    return;
  }

  const data = JSON.parse(text) as { values?: string[][] };
  console.log(`${tab}: OK`);
  console.log("Headers:", data.values?.[0]?.join(", ") || "(empty)");
}

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing`);
  }
  return value;
}

function readDotEnvSpreadsheetId() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return "(no .env file found)";

  const line = fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((item) => item.startsWith("GOOGLE_SPREADSHEET_ID="));

  return line?.replace(/^GOOGLE_SPREADSHEET_ID=/, "") ?? "(not found in .env)";
}
