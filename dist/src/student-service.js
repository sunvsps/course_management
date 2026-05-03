import { loadSheetDatabase } from "./sheets.js";
export async function getStudentDashboard(lineUserId) {
    const db = await loadSheetDatabase();
    const user = db.users.find((item) => item.lineUserId === lineUserId);
    if (!user) {
        throw new Error("Student not found");
    }
    const enrollments = db.enrollments
        .filter((enrollment) => enrollment.lineUserId === lineUserId)
        .map((enrollment) => {
        const course = db.courses.find((item) => item.courseId === enrollment.courseId);
        const lessons = db.lessons
            .filter((lesson) => lesson.enrollmentId === enrollment.enrollmentId && lesson.status === "SCHEDULED")
            .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
        const attendances = db.attendances
            .filter((attendance) => attendance.enrollmentId === enrollment.enrollmentId)
            .sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime());
        return {
            ...enrollment,
            course,
            lessons,
            attendances
        };
    });
    return { user, enrollments };
}
