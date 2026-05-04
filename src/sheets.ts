import crypto from "node:crypto";
import { JWT } from "google-auth-library";
import { config } from "./config.js";
import {
  mockAttendances,
  mockCourses,
  mockEnrollments,
  mockLineProfiles,
  mockLessons,
  mockUsers
} from "./mock-data.js";
import type { AttendanceRow, CourseRow, EnrollmentRow, LessonRow, LineProfileRow, UserRow } from "./types.js";

const scopes = ["https://www.googleapis.com/auth/spreadsheets"];

type SheetName = "LineProfiles" | "Users" | "Courses" | "Enrollments" | "Lessons" | "Attendances";

export type SheetDatabase = {
  lineProfiles: LineProfileRow[];
  users: UserRow[];
  courses: CourseRow[];
  enrollments: EnrollmentRow[];
  lessons: LessonRow[];
  attendances: AttendanceRow[];
};

export async function loadSheetDatabase(): Promise<SheetDatabase> {
  if (config.MOCK_SHEET_ENABLED) {
    return {
      lineProfiles: mockLineProfiles,
      users: mockUsers,
      courses: mockCourses,
      enrollments: mockEnrollments,
      lessons: mockLessons,
      attendances: mockAttendances
    };
  }

  const [lineProfiles, users, courses, enrollments, lessons, attendances] = await Promise.all([
    readOptionalSheet("LineProfiles"),
    readSheet("Users"),
    readSheet("Courses"),
    readSheet("Enrollments"),
    readSheet("Lessons"),
    readSheet("Attendances")
  ]);

  return {
    lineProfiles: lineProfiles.map(toLineProfile),
    users: users.map(toUser),
    courses: courses.map(toCourse),
    enrollments: enrollments.map(toEnrollment),
    lessons: lessons.map(toLesson),
    attendances: attendances.map(toAttendance)
  };
}

export type IncomingLineProfile = {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  email?: string;
};

export async function upsertLineProfile(profile: IncomingLineProfile) {
  if (config.MOCK_SHEET_ENABLED) {
    return {
      lineProfileId: "line-profile-demo",
      ...profile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const rows = await readOptionalSheet("LineProfiles");
  const existingIndex = rows.findIndex((row) => row.lineUserId === profile.lineUserId);
  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    const existing = toLineProfile(rows[existingIndex]);
    const updated: LineProfileRow = {
      ...existing,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
      email: profile.email,
      updatedAt: now
    };
    await updateSheetRow("LineProfiles", existingIndex + 2, lineProfileToValues(updated));
    return updated;
  }

  const created: LineProfileRow = {
    lineProfileId: crypto.randomUUID(),
    lineUserId: profile.lineUserId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
    statusMessage: profile.statusMessage,
    email: profile.email,
    createdAt: now,
    updatedAt: now
  };
  await appendSheetRow("LineProfiles", lineProfileToValues(created));
  return created;
}

async function readOptionalSheet(sheetName: SheetName) {
  try {
    return await readSheet(sheetName);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Status 400")) {
      return [];
    }
    throw error;
  }
}

async function readSheet(sheetName: SheetName) {
  const spreadsheetId = required(config.GOOGLE_SPREADSHEET_ID, "GOOGLE_SPREADSHEET_ID");
  const token = await getAccessToken();
  const range = encodeURIComponent(`${sheetName}!A:Z`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheet read failed for ${sheetName}. Status ${response.status}: ${detail}`);
  }

  const payload = (await response.json()) as { values?: string[][] };
  return rowsToObjects(payload.values ?? []);
}

async function updateSheetRow(sheetName: SheetName, rowNumber: number, values: string[]) {
  const spreadsheetId = required(config.GOOGLE_SPREADSHEET_ID, "GOOGLE_SPREADSHEET_ID");
  const token = await getAccessToken();
  const range = encodeURIComponent(`${sheetName}!A${rowNumber}:H${rowNumber}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ values: [values] })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheet update failed for ${sheetName}. Status ${response.status}: ${detail}`);
  }
}

async function appendSheetRow(sheetName: SheetName, values: string[]) {
  const spreadsheetId = required(config.GOOGLE_SPREADSHEET_ID, "GOOGLE_SPREADSHEET_ID");
  const token = await getAccessToken();
  const range = encodeURIComponent(`${sheetName}!A:H`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ values: [values] })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheet append failed for ${sheetName}. Status ${response.status}: ${detail}`);
  }
}

async function getAccessToken() {
  const email = required(config.GOOGLE_SERVICE_ACCOUNT_EMAIL, "GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = required(config.GOOGLE_PRIVATE_KEY, "GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");
  const client = new JWT({ email, key: privateKey, scopes });
  const token = await client.getAccessToken();

  if (!token.token) {
    throw new Error("Google access token is empty");
  }

  return token.token;
}

function rowsToObjects(values: string[][]) {
  const [headers, ...rows] = values;
  if (!headers) return [];

  return rows
    .filter((row) => row.some(Boolean))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header.trim(), row[index]?.trim() ?? ""])));
}

function toLineProfile(row: Record<string, string>): LineProfileRow {
  return {
    lineProfileId: row.lineProfileId,
    lineUserId: row.lineUserId,
    displayName: row.displayName,
    pictureUrl: row.pictureUrl,
    statusMessage: row.statusMessage,
    email: row.email,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toUser(row: Record<string, string>): UserRow {
  return {
    userId: row.userId,
    lineProfileId: row.lineProfileId,
    displayName: row.displayName,
    pictureUrl: row.pictureUrl,
    birthDate: row.birthDate,
    role: normalizeRole(row.role)
  };
}

function toCourse(row: Record<string, string>): CourseRow {
  return {
    courseId: row.courseId,
    name: row.name,
    courseType: normalizeCourseType(row.courseType),
    totalClasses: Number(row.totalClasses)
  };
}

function toEnrollment(row: Record<string, string>): EnrollmentRow {
  return {
    enrollmentId: row.enrollmentId,
    userId: row.userId,
    courseId: row.courseId,
    purchasedClasses: Number(row.purchasedClasses),
    remainingClasses: Number(row.remainingClasses),
    status: normalizeStatus(row.status)
  };
}

function lineProfileToValues(profile: LineProfileRow) {
  return [
    profile.lineProfileId,
    profile.lineUserId,
    profile.displayName,
    profile.pictureUrl ?? "",
    profile.statusMessage ?? "",
    profile.email ?? "",
    profile.createdAt,
    profile.updatedAt
  ];
}

function toLesson(row: Record<string, string>): LessonRow {
  return {
    lessonId: row.lessonId,
    enrollmentId: row.enrollmentId,
    instructorName: row.instructorName,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: normalizeLessonStatus(row.status)
  };
}

function toAttendance(row: Record<string, string>): AttendanceRow {
  return {
    attendanceId: row.attendanceId,
    enrollmentId: row.enrollmentId,
    instructorName: row.instructorName,
    checkedInAt: row.checkedInAt,
    classesUsed: Number(row.classesUsed),
    score: optionalNumber(row.score),
    note: row.note
  };
}

function normalizeRole(role: string): UserRow["role"] {
  return role === "INSTRUCTOR" || role === "ADMIN" ? role : "STUDENT";
}

function normalizeCourseType(courseType: string): CourseRow["courseType"] {
  const normalized = courseType.trim().toUpperCase();
  return normalized === "HOUR" || normalized === "HOURS" || normalized === "รายชม." ? "HOUR" : "CLASS";
}

function normalizeStatus(status: string): EnrollmentRow["status"] {
  if (status === "PAUSED" || status === "COMPLETED" || status === "CANCELLED") return status;
  return "ACTIVE";
}

function normalizeLessonStatus(status: string): LessonRow["status"] {
  if (status === "CHECKED_IN" || status === "CANCELLED") return status;
  return "SCHEDULED";
}

function required(value: string, name: string) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function optionalNumber(value: string | undefined) {
  if (value === undefined || value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
