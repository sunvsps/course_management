import { loadSheetDatabase } from "./sheets.js";
export async function getStudentDashboard(userId, lineProfileId) {
    const db = await loadSheetDatabase();
    const user = db.users.find((item) => item.userId === userId);
    if (!user) {
        throw new Error("Student not found");
    }
    const relatedStudents = findRelatedStudents(db, user, lineProfileId);
    const students = relatedStudents.map((student) => buildStudentDashboard(db, student));
    if (students.length > 1) {
        return {
            user: toPublicUser(user),
            students
        };
    }
    return buildStudentDashboard(db, user);
}
function buildStudentDashboard(db, user) {
    const enrollments = db.enrollments
        .filter((enrollment) => enrollment.userId === user.userId)
        .map((enrollment) => {
        const course = db.courses.find((item) => item.courseId === enrollment.courseId);
        const attendances = db.attendances
            .filter((attendance) => attendance.enrollmentId === enrollment.enrollmentId)
            .sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime());
        const prePostAssessments = db.prePostAssessments
            .filter((prePostAssessment) => prePostAssessment.enrollmentId === enrollment.enrollmentId)
            .sort((a, b) => prePostAssessmentTimestamp(b) - prePostAssessmentTimestamp(a));
        const purchasedClasses = resolvePurchasedClasses(enrollment.purchasedClasses, course?.totalClasses);
        const remainingClasses = resolveRemainingClasses(purchasedClasses, attendances);
        return {
            ...enrollment,
            purchasedClasses,
            remainingClasses,
            course,
            attendances,
            prePostAssessments,
            assessments: prePostAssessments,
            latestActivityAt: latestActivityAt(attendances)
        };
    })
        .sort((a, b) => {
        const statusDelta = statusRank(a.status) - statusRank(b.status);
        if (statusDelta !== 0)
            return statusDelta;
        return new Date(b.latestActivityAt).getTime() - new Date(a.latestActivityAt).getTime();
    });
    return {
        user: toPublicUser(user),
        enrollments
    };
}
function resolvePurchasedClasses(enrollmentPurchasedClasses, courseTotalClasses) {
    if (Number.isFinite(enrollmentPurchasedClasses) && enrollmentPurchasedClasses > 0) {
        return enrollmentPurchasedClasses;
    }
    return Number.isFinite(courseTotalClasses) ? courseTotalClasses ?? 0 : 0;
}
function resolveRemainingClasses(purchasedClasses, attendances) {
    const usedClasses = attendances.reduce((sum, attendance) => {
        return sum + (Number.isFinite(attendance.classesUsed) ? attendance.classesUsed : 0);
    }, 0);
    return Math.max(purchasedClasses - usedClasses, 0);
}
function findRelatedStudents(db, user, lineProfileId) {
    if (lineProfileId) {
        const linkedUserIds = new Set(db.userLineProfiles
            .filter((link) => link.lineProfileId === lineProfileId)
            .map((link) => link.userId));
        const relatedStudents = db.users
            .filter((item) => item.role === "STUDENT" && item.userId && linkedUserIds.has(item.userId))
            .sort((a, b) => a.displayName.localeCompare(b.displayName, "th"));
        return relatedStudents.length > 0 ? relatedStudents : [user];
    }
    return [user];
}
function toPublicUser(user) {
    return {
        userId: user.userId,
        displayName: user.displayName,
        pictureUrl: user.pictureUrl,
        birthDate: user.birthDate,
        role: user.role
    };
}
function statusRank(status) {
    if (status === "ACTIVE")
        return 0;
    if (status === "PAUSED")
        return 1;
    if (status === "COMPLETED")
        return 2;
    return 3;
}
function latestActivityAt(attendances) {
    const timestamps = [
        ...attendances.map((attendance) => new Date(attendance.checkedInAt).getTime())
    ].filter(Number.isFinite);
    return new Date(Math.max(...timestamps, 0)).toISOString();
}
function prePostAssessmentTimestamp(prePostAssessment) {
    const value = new Date(prePostAssessment.updatedAt || prePostAssessment.createdAt || 0).getTime();
    return Number.isFinite(value) ? value : 0;
}
