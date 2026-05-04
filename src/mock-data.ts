import type { AttendanceRow, CourseRow, EnrollmentRow, LessonRow, LineProfileRow, UserRow } from "./types.js";

export const mockLineProfiles: LineProfileRow[] = [
  {
    lineProfileId: "line-profile-demo",
    lineUserId: "1234",
    displayName: "Demo Student",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const mockUsers: UserRow[] = [
  {
    userId: "1234",
    lineProfileId: "line-profile-demo",
    displayName: "Demo Student",
    role: "STUDENT"
  }
];

export const mockCourses: CourseRow[] = [
  {
    courseId: "course-10",
    name: "Private Course 10 Classes",
    courseType: "CLASS",
    totalClasses: 10
  },
  {
    courseId: "hour-10",
    name: "Private Course 10 Hours",
    courseType: "HOUR",
    totalClasses: 10
  }
];

export const mockEnrollments: EnrollmentRow[] = [
  {
    enrollmentId: "enroll-demo",
    userId: "1234",
    courseId: "course-10",
    purchasedClasses: 10,
    remainingClasses: 5,
    status: "ACTIVE"
  }
];

export const mockLessons: LessonRow[] = [
  {
    lessonId: "lesson-next",
    enrollmentId: "enroll-demo",
    instructorName: "Demo Teacher",
    startsAt: futureDate(1, 10),
    endsAt: futureDate(1, 11),
    status: "SCHEDULED"
  }
];

export const mockAttendances: AttendanceRow[] = Array.from({ length: 5 }, (_, index) => ({
  attendanceId: `att-${index + 1}`,
  enrollmentId: "enroll-demo",
  instructorName: "Demo Teacher",
  checkedInAt: pastDate(5 - index, 10, 5),
  classesUsed: 1,
  note: `เรียนครั้งที่ ${index + 1}`
}));

function futureDate(daysFromNow: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function pastDate(daysAgo: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}
