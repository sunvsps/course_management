import { loadSheetDatabase } from "./sheets.js";

export async function getStudentDashboard(userId: string) {
  const db = await loadSheetDatabase();
  const user = db.users.find((item) => item.userId === userId);

  if (!user) {
    throw new Error("Student not found");
  }

  const enrollments = db.enrollments
    .filter((enrollment) => enrollment.userId === user.userId)
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
        attendances,
        latestActivityAt: latestActivityAt(lessons, attendances)
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
      role: user.role
    },
    enrollments
  };
}

function statusRank(status: string) {
  if (status === "ACTIVE") return 0;
  if (status === "PAUSED") return 1;
  if (status === "COMPLETED") return 2;
  return 3;
}

function latestActivityAt(
  lessons: Array<{ startsAt: string }>,
  attendances: Array<{ checkedInAt: string }>
) {
  const timestamps = [
    ...lessons.map((lesson) => new Date(lesson.startsAt).getTime()),
    ...attendances.map((attendance) => new Date(attendance.checkedInAt).getTime())
  ].filter(Number.isFinite);

  return new Date(Math.max(...timestamps, 0)).toISOString();
}
