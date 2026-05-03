export type SessionUser = {
  lineUserId: string;
  displayName: string;
};

export type UserRow = {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
};

export type CourseRow = {
  courseId: string;
  name: string;
  totalClasses: number;
};

export type EnrollmentRow = {
  enrollmentId: string;
  lineUserId: string;
  courseId: string;
  purchasedClasses: number;
  remainingClasses: number;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
};

export type LessonRow = {
  lessonId: string;
  enrollmentId: string;
  instructorName: string;
  startsAt: string;
  endsAt: string;
  status: "SCHEDULED" | "CHECKED_IN" | "CANCELLED";
};

export type AttendanceRow = {
  attendanceId: string;
  enrollmentId: string;
  instructorName: string;
  checkedInAt: string;
  classesUsed: number;
  note?: string;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: SessionUser;
  }
}
