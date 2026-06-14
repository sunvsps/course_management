import { loadSheetDatabase } from "./sheets.js";
import type { SheetDatabase } from "./sheets.js";
import type { EnrollmentRow, UserRow } from "./types.js";

export async function getTeacherDashboard(instructorId: string) {
  const db = await loadSheetDatabase();

  if (!instructorId) {
    throw new Error("Instructor ID is required");
  }

  const teacherEnrollments = db.enrollments.filter((enrollment) => {
    return enrollment.instructorId === instructorId;
  });
  const userIds = new Set(teacherEnrollments.map((enrollment) => enrollment.userId).filter(Boolean));
  const instructor = db.users.find((user) => user.userId === instructorId);
  const students = db.users
    .filter((user) => user.role === "STUDENT" && user.userId && userIds.has(user.userId))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "th"))
    .map((student) => buildTeacherStudentDashboard(db, student, teacherEnrollments));

  return {
    user: {
      userId: instructorId,
      displayName: instructor?.displayName ?? instructorId,
      role: "INSTRUCTOR"
    },
    students
  };
}

function buildTeacherStudentDashboard(
  db: SheetDatabase,
  user: UserRow,
  teacherEnrollments: EnrollmentRow[]
) {
  const enrollments = teacherEnrollments
    .filter((enrollment) => enrollment.userId === user.userId)
    .map((enrollment) => {
      const course = db.courses.find((item) => item.courseId === enrollment.courseId);
      const attendances = db.attendances
        .filter((attendance) => attendance.enrollmentId === enrollment.enrollmentId)
        .sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime());
      const allAttendancesForEnrollment = db.attendances
        .filter((attendance) => attendance.enrollmentId === enrollment.enrollmentId);
      const prePostAssessments = db.prePostAssessments
        .filter((prePostAssessment) => prePostAssessment.enrollmentId === enrollment.enrollmentId)
        .sort((a, b) => prePostAssessmentTimestamp(b) - prePostAssessmentTimestamp(a));
      const purchasedClasses = resolvePurchasedClasses(enrollment.purchasedClasses, course?.totalClasses);
      const remainingClasses = resolveRemainingClasses(purchasedClasses, allAttendancesForEnrollment);

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
      if (statusDelta !== 0) return statusDelta;
      return new Date(b.latestActivityAt).getTime() - new Date(a.latestActivityAt).getTime();
    });

  return {
    user: {
      userId: user.userId,
      displayName: user.displayName,
      pictureUrl: user.pictureUrl,
      birthDate: user.birthDate,
      role: user.role
    },
    enrollments
  };
}

function resolvePurchasedClasses(enrollmentPurchasedClasses: number, courseTotalClasses?: number) {
  if (Number.isFinite(enrollmentPurchasedClasses) && enrollmentPurchasedClasses > 0) {
    return enrollmentPurchasedClasses;
  }

  return Number.isFinite(courseTotalClasses) ? courseTotalClasses ?? 0 : 0;
}

function resolveRemainingClasses(
  purchasedClasses: number,
  attendances: Array<{ classesUsed: number }>
) {
  const usedClasses = attendances.reduce((sum, attendance) => {
    return sum + (Number.isFinite(attendance.classesUsed) ? attendance.classesUsed : 0);
  }, 0);

  return Math.max(purchasedClasses - usedClasses, 0);
}

function statusRank(status: string) {
  if (status === "ACTIVE") return 0;
  if (status === "PAUSED") return 1;
  if (status === "COMPLETED") return 2;
  return 3;
}

function latestActivityAt(attendances: Array<{ checkedInAt: string }>) {
  const timestamps = [
    ...attendances.map((attendance) => new Date(attendance.checkedInAt).getTime())
  ].filter(Number.isFinite);

  return new Date(Math.max(...timestamps, 0)).toISOString();
}

function prePostAssessmentTimestamp(prePostAssessment: { updatedAt?: string; createdAt?: string }) {
  const value = new Date(prePostAssessment.updatedAt || prePostAssessment.createdAt || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}
