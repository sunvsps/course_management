import crypto from "node:crypto";
import { JWT } from "google-auth-library";
import { config } from "./config.js";
import { mockAttendances, mockCourses, mockEnrollments, mockLineProfiles, mockLessons, mockUsers } from "./mock-data.js";
const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
export async function loadSheetDatabase() {
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
export async function upsertLineProfile(profile) {
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
        const updated = {
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
    const created = {
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
async function readOptionalSheet(sheetName) {
    try {
        return await readSheet(sheetName);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("Status 400")) {
            return [];
        }
        throw error;
    }
}
async function readSheet(sheetName) {
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
    const payload = (await response.json());
    return rowsToObjects(payload.values ?? []);
}
async function updateSheetRow(sheetName, rowNumber, values) {
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
async function appendSheetRow(sheetName, values) {
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
function rowsToObjects(values) {
    const [headers, ...rows] = values;
    if (!headers)
        return [];
    return rows
        .filter((row) => row.some(Boolean))
        .map((row) => Object.fromEntries(headers.map((header, index) => [header.trim(), row[index]?.trim() ?? ""])));
}
function toLineProfile(row) {
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
function toUser(row) {
    return {
        userId: row.userId,
        lineProfileId: row.lineProfileId,
        lineUserId: row.lineUserId,
        displayName: row.displayName,
        pictureUrl: row.pictureUrl,
        role: normalizeRole(row.role)
    };
}
function toCourse(row) {
    return {
        courseId: row.courseId,
        name: row.name,
        courseType: normalizeCourseType(row.courseType),
        totalClasses: Number(row.totalClasses)
    };
}
function toEnrollment(row) {
    return {
        enrollmentId: row.enrollmentId,
        userId: row.userId,
        lineUserId: row.lineUserId,
        lineProfileId: row.lineProfileId,
        courseId: row.courseId,
        purchasedClasses: Number(row.purchasedClasses),
        remainingClasses: Number(row.remainingClasses),
        status: normalizeStatus(row.status)
    };
}
function lineProfileToValues(profile) {
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
function toLesson(row) {
    return {
        lessonId: row.lessonId,
        enrollmentId: row.enrollmentId,
        instructorName: row.instructorName,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        status: normalizeLessonStatus(row.status)
    };
}
function toAttendance(row) {
    return {
        attendanceId: row.attendanceId,
        enrollmentId: row.enrollmentId,
        instructorName: row.instructorName,
        checkedInAt: row.checkedInAt,
        classesUsed: Number(row.classesUsed),
        note: row.note
    };
}
function normalizeRole(role) {
    return role === "INSTRUCTOR" || role === "ADMIN" ? role : "STUDENT";
}
function normalizeCourseType(courseType) {
    const normalized = courseType.trim().toUpperCase();
    return normalized === "HOUR" || normalized === "HOURS" || normalized === "รายชม." ? "HOUR" : "CLASS";
}
function normalizeStatus(status) {
    if (status === "PAUSED" || status === "COMPLETED" || status === "CANCELLED")
        return status;
    return "ACTIVE";
}
function normalizeLessonStatus(status) {
    if (status === "CHECKED_IN" || status === "CANCELLED")
        return status;
    return "SCHEDULED";
}
function required(value, name) {
    if (!value)
        throw new Error(`${name} is required`);
    return value;
}
