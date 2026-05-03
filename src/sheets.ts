import { JWT } from "google-auth-library";
import { config } from "./config.js";
import {
  mockAttendances,
  mockCourses,
  mockEnrollments,
  mockLessons,
  mockUsers
} from "./mock-data.js";
import type { AttendanceRow, CourseRow, EnrollmentRow, LessonRow, UserRow } from "./types.js";

const scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

type SheetName = "Users" | "Courses" | "Enrollments" | "Lessons" | "Attendances";

export type SheetDatabase = {
  users: UserRow[];
  courses: CourseRow[];
  enrollments: EnrollmentRow[];
  lessons: LessonRow[];
  attendances: AttendanceRow[];
};

export async function loadSheetDatabase(): Promise<SheetDatabase> {
  if (config.MOCK_SHEET_ENABLED) {
    return {
      users: mockUsers,
      courses: mockCourses,
      enrollments: mockEnrollments,
      lessons: mockLessons,
      attendances: mockAttendances
    };
  }

  const [users, courses, enrollments, lessons, attendances] = await Promise.all([
    readSheet("Users"),
    readSheet("Courses"),
    readSheet("Enrollments"),
    readSheet("Lessons"),
    readSheet("Attendances")
  ]);

  return {
    users: users.map(toUser),
    courses: courses.map(toCourse),
    enrollments: enrollments.map(toEnrollment),
    lessons: lessons.map(toLesson),
    attendances: attendances.map(toAttendance)
  };
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
    throw new Error(`Google Sheet read failed for ${sheetName}`);
  }

  const payload = (await response.json()) as { values?: string[][] };
  return rowsToObjects(payload.values ?? []);
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
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function toUser(row: Record<string, string>): UserRow {
  return {
    lineUserId: row.lineUserId,
    displayName: row.displayName,
    pictureUrl: row.pictureUrl,
    role: normalizeRole(row.role)
  };
}

function toCourse(row: Record<string, string>): CourseRow {
  return {
    courseId: row.courseId,
    name: row.name,
    totalClasses: Number(row.totalClasses)
  };
}

function toEnrollment(row: Record<string, string>): EnrollmentRow {
  return {
    enrollmentId: row.enrollmentId,
    lineUserId: row.lineUserId,
    courseId: row.courseId,
    purchasedClasses: Number(row.purchasedClasses),
    remainingClasses: Number(row.remainingClasses),
    status: normalizeStatus(row.status)
  };
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
    note: row.note
  };
}

function normalizeRole(role: string): UserRow["role"] {
  return role === "INSTRUCTOR" || role === "ADMIN" ? role : "STUDENT";
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
