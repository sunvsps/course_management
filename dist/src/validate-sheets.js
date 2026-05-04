import "dotenv/config";
import { loadSheetDatabase } from "./sheets.js";
const db = await loadSheetDatabase();
const issues = [];
for (const user of db.users) {
    if (!user.userId)
        issues.push(`Users: missing userId for ${user.displayName || user.lineProfileId || "(blank user)"}`);
    if (user.lineProfileId && !db.lineProfiles.some((profile) => profile.lineProfileId === user.lineProfileId)) {
        issues.push(`Users: userId ${user.userId || "(blank)"} references missing lineProfileId ${user.lineProfileId}`);
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
