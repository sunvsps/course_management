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

export async function createUserRow(input: UserRow) {
  const user: UserRow = {
    ...input,
    userId: input.userId || `user-${shortId()}`,
    role: input.role || "STUDENT"
  };

  if (config.MOCK_SHEET_ENABLED) {
    ensureMockUnique(mockUsers, "userId", user.userId);
    mockUsers.push(user);
    return user;
  }

  await ensureSheetUnique("Users", "userId", user.userId);
  await appendSheetObject("Users", userToSheetObject(user));
  return user;
}

export async function updateUserRow(userId: string, input: UserRow) {
  const user: UserRow = { ...input, userId };

  if (config.MOCK_SHEET_ENABLED) {
    updateMockRow(mockUsers, "userId", userId, user);
    return user;
  }

  await updateSheetObjectById("Users", "userId", userId, userToSheetObject(user));
  return user;
}

export async function deleteUserRow(userId: string) {
  if (config.MOCK_SHEET_ENABLED) {
    deleteMockRow(mockUsers, "userId", userId);
    return;
  }

  await deleteSheetObjectById("Users", "userId", userId);
}

export async function createCourseRow(input: CourseRow) {
  const course: CourseRow = {
    ...input,
    courseId: input.courseId || `course-${shortId()}`
  };

  if (config.MOCK_SHEET_ENABLED) {
    ensureMockUnique(mockCourses, "courseId", course.courseId);
    mockCourses.push(course);
    return course;
  }

  await ensureSheetUnique("Courses", "courseId", course.courseId);
  await appendSheetObject("Courses", courseToSheetObject(course));
  return course;
}

export async function updateCourseRow(courseId: string, input: CourseRow) {
  const course: CourseRow = { ...input, courseId };

  if (config.MOCK_SHEET_ENABLED) {
    updateMockRow(mockCourses, "courseId", courseId, course);
    return course;
  }

  await updateSheetObjectById("Courses", "courseId", courseId, courseToSheetObject(course));
  return course;
}

export async function deleteCourseRow(courseId: string) {
  if (config.MOCK_SHEET_ENABLED) {
    deleteMockRow(mockCourses, "courseId", courseId);
    return;
  }

  await deleteSheetObjectById("Courses", "courseId", courseId);
}

export async function createEnrollmentRow(input: EnrollmentRow) {
  const enrollment: EnrollmentRow = {
    ...input,
    enrollmentId: input.enrollmentId || `enroll-${shortId()}`,
    remainingClasses: Number.isFinite(input.remainingClasses) ? input.remainingClasses : input.purchasedClasses
  };

  if (config.MOCK_SHEET_ENABLED) {
    ensureMockUnique(mockEnrollments, "enrollmentId", enrollment.enrollmentId);
    mockEnrollments.push(enrollment);
    return enrollment;
  }

  const db = await loadSheetDatabase();
  await ensureSheetUnique("Enrollments", "enrollmentId", enrollment.enrollmentId);
  await appendSheetObject("Enrollments", enrollmentToSheetObject(enrollment, db));
  return enrollment;
}

export async function updateEnrollmentRow(enrollmentId: string, input: EnrollmentRow) {
  const enrollment: EnrollmentRow = { ...input, enrollmentId };

  if (config.MOCK_SHEET_ENABLED) {
    updateMockRow(mockEnrollments, "enrollmentId", enrollmentId, enrollment);
    return enrollment;
  }

  const db = await loadSheetDatabase();
  await updateSheetObjectById("Enrollments", "enrollmentId", enrollmentId, enrollmentToSheetObject(enrollment, db));
  return enrollment;
}

export async function deleteEnrollmentRow(enrollmentId: string) {
  if (config.MOCK_SHEET_ENABLED) {
    deleteMockRow(mockEnrollments, "enrollmentId", enrollmentId);
    return;
  }

  await deleteSheetObjectById("Enrollments", "enrollmentId", enrollmentId);
}

export async function createAttendanceRow(input: AttendanceRow) {
  const attendance: AttendanceRow = {
    ...input,
    attendanceId: input.attendanceId || `att-${shortId()}`
  };

  if (config.MOCK_SHEET_ENABLED) {
    ensureMockUnique(mockAttendances, "attendanceId", attendance.attendanceId);
    mockAttendances.push(attendance);
    return attendance;
  }

  const db = await loadSheetDatabase();
  await ensureSheetUnique("Attendances", "attendanceId", attendance.attendanceId);
  await appendSheetObject("Attendances", attendanceToSheetObject(attendance, db));
  return attendance;
}

export async function updateAttendanceRow(attendanceId: string, input: AttendanceRow) {
  const attendance: AttendanceRow = { ...input, attendanceId };

  if (config.MOCK_SHEET_ENABLED) {
    updateMockRow(mockAttendances, "attendanceId", attendanceId, attendance);
    return attendance;
  }

  const db = await loadSheetDatabase();
  await updateSheetObjectById("Attendances", "attendanceId", attendanceId, attendanceToSheetObject(attendance, db));
  return attendance;
}

export async function deleteAttendanceRow(attendanceId: string) {
  if (config.MOCK_SHEET_ENABLED) {
    deleteMockRow(mockAttendances, "attendanceId", attendanceId);
    return;
  }

  await deleteSheetObjectById("Attendances", "attendanceId", attendanceId);
}

export async function recalculateEnrollmentRemaining(enrollmentId: string) {
  const db = await loadSheetDatabase();
  const enrollment = db.enrollments.find((item) => item.enrollmentId === enrollmentId);
  if (!enrollment) return;

  const used = db.attendances
    .filter((attendance) => attendance.enrollmentId === enrollmentId)
    .reduce((sum, attendance) => sum + attendance.classesUsed, 0);
  const remainingClasses = Math.max(enrollment.purchasedClasses - used, 0);
  const updated = { ...enrollment, remainingClasses };

  if (config.MOCK_SHEET_ENABLED) {
    updateMockRow(mockEnrollments, "enrollmentId", enrollmentId, updated);
    return;
  }

  await updateSheetObjectById("Enrollments", "enrollmentId", enrollmentId, enrollmentToSheetObject(updated, db));
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
  return rowsToObjects(await fetchSheetValues(sheetName));
}

async function fetchSheetValues(sheetName: SheetName) {
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
  return payload.values ?? [];
}

async function readSheetWithRowNumbers(sheetName: SheetName) {
  const values = await fetchSheetValues(sheetName);
  const [rawHeaders, ...rows] = values;
  const headers = rawHeaders?.map((header) => header.trim()).filter(Boolean) ?? [];

  return {
    headers,
    rows: rows
      .map((row, index) => ({
        rowNumber: index + 2,
        values: Object.fromEntries(headers.map((header, columnIndex) => [header, row[columnIndex]?.trim() ?? ""]))
      }))
      .filter((row) => Object.values(row.values).some(Boolean))
  };
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

async function appendSheetObject(sheetName: SheetName, valuesByHeader: Record<string, string | number | undefined>) {
  const table = await readSheetWithRowNumbers(sheetName);
  ensureHeaders(sheetName, table.headers);
  const spreadsheetId = required(config.GOOGLE_SPREADSHEET_ID, "GOOGLE_SPREADSHEET_ID");
  const token = await getAccessToken();
  const endColumn = columnName(table.headers.length);
  const range = encodeURIComponent(`${sheetName}!A:${endColumn}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ values: [objectToValues(table.headers, valuesByHeader)] })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheet append failed for ${sheetName}. Status ${response.status}: ${detail}`);
  }
}

async function updateSheetObjectById(
  sheetName: SheetName,
  idField: string,
  id: string | undefined,
  valuesByHeader: Record<string, string | number | undefined>
) {
  const table = await readSheetWithRowNumbers(sheetName);
  ensureHeaders(sheetName, table.headers);
  const existing = table.rows.find((row) => row.values[idField] === id);

  if (!existing) {
    throw new Error(`${sheetName} row not found: ${id}`);
  }

  const merged = { ...existing.values, ...stringifySheetObject(valuesByHeader) };
  await updateSheetObjectRow(sheetName, existing.rowNumber, table.headers, merged);
}

async function updateSheetObjectRow(
  sheetName: SheetName,
  rowNumber: number,
  headers: string[],
  valuesByHeader: Record<string, string | number | undefined>
) {
  const spreadsheetId = required(config.GOOGLE_SPREADSHEET_ID, "GOOGLE_SPREADSHEET_ID");
  const token = await getAccessToken();
  const endColumn = columnName(headers.length);
  const range = encodeURIComponent(`${sheetName}!A${rowNumber}:${endColumn}${rowNumber}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ values: [objectToValues(headers, valuesByHeader)] })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheet update failed for ${sheetName}. Status ${response.status}: ${detail}`);
  }
}

async function deleteSheetObjectById(sheetName: SheetName, idField: string, id: string | undefined) {
  const table = await readSheetWithRowNumbers(sheetName);
  const existing = table.rows.find((row) => row.values[idField] === id);

  if (!existing) {
    throw new Error(`${sheetName} row not found: ${id}`);
  }

  await deleteSheetRow(sheetName, existing.rowNumber);
}

async function deleteSheetRow(sheetName: SheetName, rowNumber: number) {
  const spreadsheetId = required(config.GOOGLE_SPREADSHEET_ID, "GOOGLE_SPREADSHEET_ID");
  const token = await getAccessToken();
  const sheetId = await getSheetId(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: rowNumber - 1,
            endIndex: rowNumber
          }
        }
      }]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheet delete failed for ${sheetName}. Status ${response.status}: ${detail}`);
  }
}

async function getSheetId(sheetName: SheetName) {
  const spreadsheetId = required(config.GOOGLE_SPREADSHEET_ID, "GOOGLE_SPREADSHEET_ID");
  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheet metadata read failed. Status ${response.status}: ${detail}`);
  }

  const payload = (await response.json()) as {
    sheets?: Array<{ properties?: { title?: string; sheetId?: number } }>;
  };
  const sheet = payload.sheets?.find((item) => item.properties?.title === sheetName);

  if (sheet?.properties?.sheetId === undefined) {
    throw new Error(`Google Sheet tab not found: ${sheetName}`);
  }

  return sheet.properties.sheetId;
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

function userToSheetObject(user: UserRow) {
  return {
    userId: user.userId,
    lineProfileId: user.lineProfileId ?? "",
    displayName: user.displayName,
    pictureUrl: user.pictureUrl ?? "",
    birthDate: user.birthDate ?? "",
    role: user.role
  };
}

function courseToSheetObject(course: CourseRow) {
  return {
    courseId: course.courseId,
    name: course.name,
    courseType: course.courseType,
    totalClasses: course.totalClasses
  };
}

function enrollmentToSheetObject(enrollment: EnrollmentRow, db: SheetDatabase) {
  const user = db.users.find((item) => item.userId === enrollment.userId);
  const course = db.courses.find((item) => item.courseId === enrollment.courseId);

  return {
    enrollmentId: enrollment.enrollmentId,
    userDisplayName: user?.displayName ?? "",
    userId: enrollment.userId ?? "",
    courseName: course?.name ?? "",
    courseId: enrollment.courseId,
    purchasedClasses: enrollment.purchasedClasses,
    remainingClasses: enrollment.remainingClasses,
    status: enrollment.status
  };
}

function attendanceToSheetObject(attendance: AttendanceRow, db: SheetDatabase) {
  const enrollment = db.enrollments.find((item) => item.enrollmentId === attendance.enrollmentId);
  const user = db.users.find((item) => item.userId === enrollment?.userId);
  const course = db.courses.find((item) => item.courseId === enrollment?.courseId);

  return {
    attendanceId: attendance.attendanceId,
    userDisplayName: user?.displayName ?? "",
    courseName: course?.name ?? "",
    enrollmentId: attendance.enrollmentId,
    instructorName: attendance.instructorName,
    checkedInAt: attendance.checkedInAt,
    classesUsed: attendance.classesUsed,
    score: attendance.score ?? "",
    note: attendance.note ?? ""
  };
}

async function ensureSheetUnique(sheetName: SheetName, idField: string, id: string | undefined) {
  const table = await readSheetWithRowNumbers(sheetName);
  if (table.rows.some((row) => row.values[idField] === id)) {
    throw new Error(`${sheetName} already has ${idField}: ${id}`);
  }
}

function ensureMockUnique<T extends Record<string, unknown>>(rows: T[], idField: keyof T, id: unknown) {
  if (rows.some((row) => row[idField] === id)) {
    throw new Error(`Duplicate ${String(idField)}: ${String(id)}`);
  }
}

function updateMockRow<T extends Record<string, unknown>>(rows: T[], idField: keyof T, id: unknown, value: T) {
  const index = rows.findIndex((row) => row[idField] === id);
  if (index < 0) {
    throw new Error(`Row not found: ${String(id)}`);
  }
  rows[index] = value;
}

function deleteMockRow<T extends Record<string, unknown>>(rows: T[], idField: keyof T, id: unknown) {
  const index = rows.findIndex((row) => row[idField] === id);
  if (index < 0) {
    throw new Error(`Row not found: ${String(id)}`);
  }
  rows.splice(index, 1);
}

function ensureHeaders(sheetName: SheetName, headers: string[]) {
  if (headers.length === 0) {
    throw new Error(`${sheetName} has no header row`);
  }
}

function objectToValues(headers: string[], valuesByHeader: Record<string, string | number | undefined>) {
  return headers.map((header) => cellValue(valuesByHeader[header]));
}

function stringifySheetObject(valuesByHeader: Record<string, string | number | undefined>) {
  return Object.fromEntries(
    Object.entries(valuesByHeader).map(([key, value]) => [key, cellValue(value)])
  );
}

function cellValue(value: string | number | undefined) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function columnName(columnNumber: number) {
  let dividend = columnNumber;
  let column = "";

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    column = String.fromCharCode(65 + modulo) + column;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return column;
}

function shortId() {
  return crypto.randomUUID().slice(0, 8);
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
