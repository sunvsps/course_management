import crypto from "node:crypto";
import { JWT } from "google-auth-library";
import { config } from "./config.js";
import { mockAttendances, mockCourses, mockEnrollments, mockLineProfiles, mockLessons, mockUserLineProfiles, mockUsers } from "./mock-data.js";
const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
export async function loadSheetDatabase() {
    if (config.MOCK_SHEET_ENABLED) {
        return {
            lineProfiles: mockLineProfiles,
            userLineProfiles: mockUserLineProfiles,
            users: mockUsers,
            courses: mockCourses,
            enrollments: mockEnrollments,
            lessons: mockLessons,
            attendances: mockAttendances
        };
    }
    const [lineProfiles, userLineProfiles, users, courses, enrollments, lessons, attendances] = await Promise.all([
        readOptionalSheet("LineProfiles"),
        readOptionalSheet("UserLineProfiles"),
        readSheet("Users"),
        readSheet("Courses"),
        readSheet("Enrollments"),
        readSheet("Lessons"),
        readSheet("Attendances")
    ]);
    return {
        lineProfiles: lineProfiles.map(toLineProfile),
        userLineProfiles: userLineProfiles.map(toUserLineProfile),
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
            createdAt: existing.createdAt || now,
            updatedAt: now
        };
        // await updateSheetRow("LineProfiles", existingIndex + 2, lineProfileToValues(updated));
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
export async function createUserRow(input) {
    const now = new Date().toISOString();
    const user = {
        ...input,
        userId: input.userId || `user-${shortId()}`,
        role: input.role || "STUDENT",
        createdAt: input.createdAt || now,
        updatedAt: now
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
export async function updateUserRow(userId, input) {
    const now = new Date().toISOString();
    const existing = config.MOCK_SHEET_ENABLED
        ? mockUsers.find((item) => item.userId === userId)
        : (await loadSheetDatabase()).users.find((item) => item.userId === userId);
    const user = {
        ...input,
        userId,
        createdAt: existing?.createdAt || input.createdAt || now,
        updatedAt: now
    };
    if (config.MOCK_SHEET_ENABLED) {
        updateMockRow(mockUsers, "userId", userId, user);
        return user;
    }
    await updateSheetObjectById("Users", "userId", userId, userToSheetObject(user));
    return user;
}
export async function deleteUserRow(userId) {
    if (config.MOCK_SHEET_ENABLED) {
        deleteMockRow(mockUsers, "userId", userId);
        return;
    }
    await deleteSheetObjectById("Users", "userId", userId);
}
export async function createUserLineProfileRow(input) {
    const now = new Date().toISOString();
    const link = {
        ...input,
        userLineProfileId: input.userLineProfileId || `ulp-${shortId()}`,
        createdAt: input.createdAt || now,
        updatedAt: now
    };
    if (config.MOCK_SHEET_ENABLED) {
        ensureMockUnique(mockUserLineProfiles, "userLineProfileId", link.userLineProfileId);
        mockUserLineProfiles.push(link);
        return link;
    }
    await ensureSheetUnique("UserLineProfiles", "userLineProfileId", link.userLineProfileId);
    await appendSheetObject("UserLineProfiles", userLineProfileToSheetObject(link));
    return link;
}
export async function updateUserLineProfileRow(userLineProfileId, input) {
    const now = new Date().toISOString();
    const existing = config.MOCK_SHEET_ENABLED
        ? mockUserLineProfiles.find((item) => item.userLineProfileId === userLineProfileId)
        : (await loadSheetDatabase()).userLineProfiles.find((item) => item.userLineProfileId === userLineProfileId);
    const link = {
        ...input,
        userLineProfileId,
        createdAt: existing?.createdAt || input.createdAt || now,
        updatedAt: now
    };
    if (config.MOCK_SHEET_ENABLED) {
        updateMockRow(mockUserLineProfiles, "userLineProfileId", userLineProfileId, link);
        return link;
    }
    await updateSheetObjectById("UserLineProfiles", "userLineProfileId", userLineProfileId, userLineProfileToSheetObject(link));
    return link;
}
export async function deleteUserLineProfileRow(userLineProfileId) {
    if (config.MOCK_SHEET_ENABLED) {
        deleteMockRow(mockUserLineProfiles, "userLineProfileId", userLineProfileId);
        return;
    }
    await deleteSheetObjectById("UserLineProfiles", "userLineProfileId", userLineProfileId);
}
export async function createCourseRow(input) {
    const now = new Date().toISOString();
    const course = {
        ...input,
        courseId: input.courseId || `course-${shortId()}`,
        createdAt: input.createdAt || now,
        updatedAt: now
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
export async function updateCourseRow(courseId, input) {
    const now = new Date().toISOString();
    const existing = config.MOCK_SHEET_ENABLED
        ? mockCourses.find((item) => item.courseId === courseId)
        : (await loadSheetDatabase()).courses.find((item) => item.courseId === courseId);
    const course = {
        ...input,
        courseId,
        createdAt: existing?.createdAt || input.createdAt || now,
        updatedAt: now
    };
    if (config.MOCK_SHEET_ENABLED) {
        updateMockRow(mockCourses, "courseId", courseId, course);
        return course;
    }
    await updateSheetObjectById("Courses", "courseId", courseId, courseToSheetObject(course));
    return course;
}
export async function deleteCourseRow(courseId) {
    if (config.MOCK_SHEET_ENABLED) {
        deleteMockRow(mockCourses, "courseId", courseId);
        return;
    }
    await deleteSheetObjectById("Courses", "courseId", courseId);
}
export async function createEnrollmentRow(input) {
    const now = new Date().toISOString();
    const enrollment = {
        ...input,
        enrollmentId: input.enrollmentId || `enroll-${shortId()}`,
        remainingClasses: Number.isFinite(input.remainingClasses) ? input.remainingClasses : input.purchasedClasses,
        createdAt: input.createdAt || now,
        updatedAt: now
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
export async function updateEnrollmentRow(enrollmentId, input) {
    const now = new Date().toISOString();
    const existing = config.MOCK_SHEET_ENABLED
        ? mockEnrollments.find((item) => item.enrollmentId === enrollmentId)
        : (await loadSheetDatabase()).enrollments.find((item) => item.enrollmentId === enrollmentId);
    const enrollment = {
        ...input,
        enrollmentId,
        createdAt: existing?.createdAt || input.createdAt || now,
        updatedAt: now
    };
    if (config.MOCK_SHEET_ENABLED) {
        updateMockRow(mockEnrollments, "enrollmentId", enrollmentId, enrollment);
        return enrollment;
    }
    const db = await loadSheetDatabase();
    await updateSheetObjectById("Enrollments", "enrollmentId", enrollmentId, enrollmentToSheetObject(enrollment, db));
    return enrollment;
}
export async function deleteEnrollmentRow(enrollmentId) {
    if (config.MOCK_SHEET_ENABLED) {
        deleteMockRow(mockEnrollments, "enrollmentId", enrollmentId);
        return;
    }
    await deleteSheetObjectById("Enrollments", "enrollmentId", enrollmentId);
}
export async function createAttendanceRow(input) {
    const now = new Date().toISOString();
    const db = await loadSheetDatabase();
    const attendance = {
        ...input,
        attendanceId: input.attendanceId || `att-${shortId()}`,
        createdAt: input.createdAt || now,
        updatedAt: now
    };
    if (config.MOCK_SHEET_ENABLED) {
        ensureMockUnique(mockAttendances, "attendanceId", attendance.attendanceId);
        mockAttendances.push(attendance);
        await updateEnrollmentAfterAttendanceCreated(attendance, db, now);
        return attendance;
    }
    await ensureSheetUnique("Attendances", "attendanceId", attendance.attendanceId);
    await appendSheetObject("Attendances", attendanceToSheetObject(attendance, db));
    await updateEnrollmentAfterAttendanceCreated(attendance, db, now);
    return attendance;
}
export async function updateAttendanceRow(attendanceId, input) {
    const now = new Date().toISOString();
    const existing = config.MOCK_SHEET_ENABLED
        ? mockAttendances.find((item) => item.attendanceId === attendanceId)
        : (await loadSheetDatabase()).attendances.find((item) => item.attendanceId === attendanceId);
    const attendance = {
        ...input,
        attendanceId,
        createdAt: existing?.createdAt || input.createdAt || now,
        updatedAt: now
    };
    if (config.MOCK_SHEET_ENABLED) {
        updateMockRow(mockAttendances, "attendanceId", attendanceId, attendance);
        return attendance;
    }
    const db = await loadSheetDatabase();
    await updateSheetObjectById("Attendances", "attendanceId", attendanceId, attendanceToSheetObject(attendance, db));
    return attendance;
}
export async function deleteAttendanceRow(attendanceId) {
    if (config.MOCK_SHEET_ENABLED) {
        deleteMockRow(mockAttendances, "attendanceId", attendanceId);
        return;
    }
    await deleteSheetObjectById("Attendances", "attendanceId", attendanceId);
}
export async function recalculateEnrollmentRemaining(enrollmentId) {
    const db = await loadSheetDatabase();
    const enrollment = db.enrollments.find((item) => item.enrollmentId === enrollmentId);
    if (!enrollment)
        return;
    const course = db.courses.find((item) => item.courseId === enrollment.courseId);
    const purchasedClasses = resolvePurchasedClasses(enrollment.purchasedClasses, course?.totalClasses);
    const used = db.attendances
        .filter((attendance) => attendance.enrollmentId === enrollmentId)
        .reduce((sum, attendance) => sum + attendance.classesUsed, 0);
    const remainingClasses = Math.max(purchasedClasses - used, 0);
    const updated = {
        ...enrollment,
        remainingClasses,
        status: remainingClasses <= 0 ? "COMPLETED" : enrollment.status,
        updatedAt: new Date().toISOString()
    };
    if (config.MOCK_SHEET_ENABLED) {
        updateMockRow(mockEnrollments, "enrollmentId", enrollmentId, updated);
        return;
    }
    await updateSheetObjectById("Enrollments", "enrollmentId", enrollmentId, enrollmentToSheetObject(updated, db));
}
async function updateEnrollmentAfterAttendanceCreated(attendance, db, updatedAt) {
    const enrollment = db.enrollments.find((item) => item.enrollmentId === attendance.enrollmentId);
    if (!enrollment)
        return;
    const course = db.courses.find((item) => item.courseId === enrollment.courseId);
    const purchasedClasses = resolvePurchasedClasses(enrollment.purchasedClasses, course?.totalClasses);
    const usedClasses = db.attendances
        .filter((item) => item.enrollmentId === attendance.enrollmentId && item.attendanceId !== attendance.attendanceId)
        .reduce((sum, item) => sum + (Number.isFinite(item.classesUsed) ? item.classesUsed : 0), 0) + attendance.classesUsed;
    const remainingClasses = Math.max(purchasedClasses - usedClasses, 0);
    const updated = {
        ...enrollment,
        remainingClasses,
        status: remainingClasses <= 0 ? "COMPLETED" : enrollment.status,
        updatedAt
    };
    if (config.MOCK_SHEET_ENABLED) {
        updateMockRow(mockEnrollments, "enrollmentId", enrollment.enrollmentId, updated);
        return;
    }
    await updateSheetObjectById("Enrollments", "enrollmentId", enrollment.enrollmentId, enrollmentToSheetObject(updated, db));
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
    return rowsToObjects(await fetchSheetValues(sheetName));
}
async function fetchSheetValues(sheetName) {
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
    return payload.values ?? [];
}
async function readSheetWithRowNumbers(sheetName) {
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
async function appendSheetObject(sheetName, valuesByHeader) {
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
async function updateSheetObjectById(sheetName, idField, id, valuesByHeader) {
    const table = await readSheetWithRowNumbers(sheetName);
    ensureHeaders(sheetName, table.headers);
    const existing = table.rows.find((row) => row.values[idField] === id);
    if (!existing) {
        throw new Error(`${sheetName} row not found: ${id}`);
    }
    const merged = { ...existing.values, ...stringifySheetObject(valuesByHeader) };
    await updateSheetObjectRow(sheetName, existing.rowNumber, table.headers, merged);
}
async function updateSheetObjectRow(sheetName, rowNumber, headers, valuesByHeader) {
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
async function deleteSheetObjectById(sheetName, idField, id) {
    const table = await readSheetWithRowNumbers(sheetName);
    const existing = table.rows.find((row) => row.values[idField] === id);
    if (!existing) {
        throw new Error(`${sheetName} row not found: ${id}`);
    }
    await deleteSheetRow(sheetName, existing.rowNumber);
}
async function deleteSheetRow(sheetName, rowNumber) {
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
async function getSheetId(sheetName) {
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
    const payload = (await response.json());
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
function toUserLineProfile(row) {
    return {
        userLineProfileId: row.userLineProfileId,
        userId: row.userId,
        lineProfileId: row.lineProfileId,
        relationship: row.relationship,
        isPrimary: normalizeBoolean(row.isPrimary),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}
function toUser(row) {
    return {
        userId: row.userId,
        displayName: row.displayName,
        pictureUrl: row.pictureUrl,
        birthDate: row.birthDate,
        role: normalizeRole(row.role),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}
function toCourse(row) {
    return {
        courseId: row.courseId,
        name: row.name,
        courseType: normalizeCourseType(row.courseType),
        totalClasses: Number(row.totalClasses),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}
function toEnrollment(row) {
    return {
        enrollmentId: row.enrollmentId,
        userId: row.userId,
        courseId: row.courseId,
        instructorId: row.instructorId,
        purchasedClasses: Number(row.purchasedClasses),
        remainingClasses: Number(row.remainingClasses),
        status: normalizeStatus(row.status),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
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
        status: normalizeLessonStatus(row.status),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}
function toAttendance(row) {
    return {
        attendanceId: row.attendanceId,
        enrollmentId: row.enrollmentId,
        instructorName: row.instructorName,
        checkedInAt: row.checkedInAt,
        classesUsed: Number(row.classesUsed),
        score: optionalNumber(row.score),
        hyperactiveScore: optionalNumber(row.hyperactiveScore),
        distractionScore: optionalNumber(row.distractionScore),
        attentionSpanScore: optionalNumber(row.attentionSpanScore),
        selfControlScore: optionalNumber(row.selfControlScore),
        selfEsteemScore: optionalNumber(row.selfEsteemScore),
        timeManagementScore: optionalNumber(row.timeManagementScore),
        behaviorScore: optionalNumber(row.behaviorScore),
        note: row.note,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}
function userToSheetObject(user) {
    return {
        userId: user.userId,
        displayName: user.displayName,
        pictureUrl: user.pictureUrl ?? "",
        birthDate: user.birthDate ?? "",
        role: user.role,
        createdAt: user.createdAt ?? "",
        updatedAt: user.updatedAt ?? ""
    };
}
function userLineProfileToSheetObject(link) {
    return {
        userLineProfileId: link.userLineProfileId,
        userId: link.userId,
        lineProfileId: link.lineProfileId,
        relationship: link.relationship ?? "",
        isPrimary: link.isPrimary ? "TRUE" : "",
        createdAt: link.createdAt ?? "",
        updatedAt: link.updatedAt ?? ""
    };
}
function courseToSheetObject(course) {
    return {
        courseId: course.courseId,
        name: course.name,
        courseType: course.courseType,
        totalClasses: course.totalClasses,
        createdAt: course.createdAt ?? "",
        updatedAt: course.updatedAt ?? ""
    };
}
function enrollmentToSheetObject(enrollment, db) {
    const user = db.users.find((item) => item.userId === enrollment.userId);
    const course = db.courses.find((item) => item.courseId === enrollment.courseId);
    return {
        enrollmentId: enrollment.enrollmentId,
        userDisplayName: user?.displayName ?? "",
        userId: enrollment.userId ?? "",
        courseName: course?.name ?? "",
        courseId: enrollment.courseId,
        instructorId: enrollment.instructorId ?? "",
        purchasedClasses: enrollment.purchasedClasses,
        remainingClasses: enrollment.remainingClasses,
        status: enrollment.status,
        createdAt: enrollment.createdAt ?? "",
        updatedAt: enrollment.updatedAt ?? ""
    };
}
function attendanceToSheetObject(attendance, db) {
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
        hyperactiveScore: attendance.hyperactiveScore ?? "",
        distractionScore: attendance.distractionScore ?? "",
        attentionSpanScore: attendance.attentionSpanScore ?? "",
        selfControlScore: attendance.selfControlScore ?? "",
        selfEsteemScore: attendance.selfEsteemScore ?? "",
        timeManagementScore: attendance.timeManagementScore ?? "",
        behaviorScore: attendance.behaviorScore ?? "",
        note: attendance.note ?? "",
        createdAt: attendance.createdAt ?? "",
        updatedAt: attendance.updatedAt ?? ""
    };
}
async function ensureSheetUnique(sheetName, idField, id) {
    const table = await readSheetWithRowNumbers(sheetName);
    if (table.rows.some((row) => row.values[idField] === id)) {
        throw new Error(`${sheetName} already has ${idField}: ${id}`);
    }
}
function ensureMockUnique(rows, idField, id) {
    if (rows.some((row) => row[idField] === id)) {
        throw new Error(`Duplicate ${String(idField)}: ${String(id)}`);
    }
}
function updateMockRow(rows, idField, id, value) {
    const index = rows.findIndex((row) => row[idField] === id);
    if (index < 0) {
        throw new Error(`Row not found: ${String(id)}`);
    }
    rows[index] = value;
}
function deleteMockRow(rows, idField, id) {
    const index = rows.findIndex((row) => row[idField] === id);
    if (index < 0) {
        throw new Error(`Row not found: ${String(id)}`);
    }
    rows.splice(index, 1);
}
function ensureHeaders(sheetName, headers) {
    if (headers.length === 0) {
        throw new Error(`${sheetName} has no header row`);
    }
}
function objectToValues(headers, valuesByHeader) {
    return headers.map((header) => cellValue(valuesByHeader[header]));
}
function stringifySheetObject(valuesByHeader) {
    return Object.fromEntries(Object.entries(valuesByHeader).map(([key, value]) => [key, cellValue(value)]));
}
function cellValue(value) {
    if (value === undefined || value === null)
        return "";
    return String(value);
}
function columnName(columnNumber) {
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
function resolvePurchasedClasses(enrollmentPurchasedClasses, courseTotalClasses) {
    if (Number.isFinite(enrollmentPurchasedClasses) && enrollmentPurchasedClasses > 0) {
        return enrollmentPurchasedClasses;
    }
    return Number.isFinite(courseTotalClasses) ? courseTotalClasses ?? 0 : 0;
}
function normalizeRole(role) {
    return role === "INSTRUCTOR" || role === "ADMIN" ? role : "STUDENT";
}
function normalizeCourseType(courseType) {
    const normalized = courseType.trim().toUpperCase();
    return normalized === "HOUR" || normalized === "HOURS" || normalized === "รายชม." ? "HOUR" : "CLASS";
}
function normalizeBoolean(value) {
    return ["TRUE", "YES", "1", "Y"].includes(value.trim().toUpperCase());
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
function optionalNumber(value) {
    if (value === undefined || value.trim() === "")
        return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
}
