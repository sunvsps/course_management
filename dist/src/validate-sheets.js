import "dotenv/config";
import { loadSheetDatabase } from "./sheets.js";
const db = await loadSheetDatabase();
const issues = [];
for (const user of db.users) {
    if (!user.userId)
        issues.push(`Users: missing userId for ${user.displayName || "(blank user)"}`);
}
for (const link of db.userLineProfiles) {
    if (!link.userLineProfileId)
        issues.push(`UserLineProfiles: missing userLineProfileId`);
    if (!db.users.some((user) => user.userId === link.userId)) {
        issues.push(`UserLineProfiles: ${link.userLineProfileId} references missing userId ${link.userId}`);
    }
    if (!db.lineProfiles.some((profile) => profile.lineProfileId === link.lineProfileId)) {
        issues.push(`UserLineProfiles: ${link.userLineProfileId} references missing lineProfileId ${link.lineProfileId}`);
    }
}
for (const teacherLogin of db.teacherLogins) {
    if (!teacherLogin.teacherLoginId)
        issues.push(`TeacherLogins: missing teacherLoginId`);
    if (!teacherLogin.username)
        issues.push(`TeacherLogins: ${teacherLogin.teacherLoginId} is missing username`);
    if (!teacherLogin.password)
        issues.push(`TeacherLogins: ${teacherLogin.teacherLoginId} is missing password`);
    const user = db.users.find((item) => item.userId === teacherLogin.userId);
    if (!user) {
        issues.push(`TeacherLogins: ${teacherLogin.teacherLoginId} references missing userId ${teacherLogin.userId}`);
    }
    else if (user.role !== "INSTRUCTOR" && user.role !== "ADMIN") {
        issues.push(`TeacherLogins: ${teacherLogin.teacherLoginId} references non-teacher userId ${teacherLogin.userId}`);
    }
}
for (const course of db.courses) {
    if (!course.courseId)
        issues.push(`Courses: missing courseId for ${course.name || "(blank course)"}`);
    if (!["CLASS", "HOUR"].includes(course.courseType)) {
        issues.push(`Courses: courseId ${course.courseId} has invalid courseType ${course.courseType}`);
    }
    if (!Number.isFinite(course.totalClasses)) {
        issues.push(`Courses: courseId ${course.courseId} has invalid totalClasses`);
    }
}
for (const enrollment of db.enrollments) {
    if (!enrollment.userId)
        issues.push(`Enrollments: ${enrollment.enrollmentId} is missing userId`);
    if (enrollment.userId && !db.users.some((user) => user.userId === enrollment.userId)) {
        issues.push(`Enrollments: ${enrollment.enrollmentId} references missing userId ${enrollment.userId}`);
    }
    if (!db.courses.some((course) => course.courseId === enrollment.courseId)) {
        issues.push(`Enrollments: ${enrollment.enrollmentId} references missing courseId ${enrollment.courseId}`);
    }
}
for (const lesson of db.lessons) {
    if (!db.enrollments.some((enrollment) => enrollment.enrollmentId === lesson.enrollmentId)) {
        issues.push(`Lessons: ${lesson.lessonId} references missing enrollmentId ${lesson.enrollmentId}`);
    }
}
for (const attendance of db.attendances) {
    if (!db.enrollments.some((enrollment) => enrollment.enrollmentId === attendance.enrollmentId)) {
        issues.push(`Attendances: ${attendance.attendanceId} references missing enrollmentId ${attendance.enrollmentId}`);
    }
}
console.log("Google Sheet relation check");
console.log({
    lineProfiles: db.lineProfiles.length,
    userLineProfiles: db.userLineProfiles.length,
    teacherLogins: db.teacherLogins.length,
    users: db.users.length,
    courses: db.courses.length,
    enrollments: db.enrollments.length,
    lessons: db.lessons.length,
    attendances: db.attendances.length
});
if (issues.length === 0) {
    console.log("OK: no relation issues found");
}
else {
    console.log("Issues:");
    for (const issue of issues) {
        console.log(`- ${issue}`);
    }
    process.exitCode = 1;
}
