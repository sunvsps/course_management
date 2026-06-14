import type {
  AttendanceRow,
  PrePostAssessmentRow,
  CourseRow,
  EnrollmentRow,
  LineProfileRow,
  TeacherLoginRow,
  UserLineProfileRow,
  UserRow
} from "./types.js";

const mockTimestamp = new Date().toISOString();

export const mockLineProfiles: LineProfileRow[] = [
  {
    lineProfileId: "line-profile-demo",
    lineUserId: "1234",
    displayName: "Demo Student",
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp
  }
];

export const mockUserLineProfiles: UserLineProfileRow[] = [
  {
    userLineProfileId: "ulp-demo",
    userId: "1234",
    lineProfileId: "line-profile-demo",
    relationship: "parent",
    isPrimary: true,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp
  }
];

export const mockUsers: UserRow[] = [
  {
    userId: "1234",
    displayName: "Demo Student",
    birthDate: "2018-01-15",
    role: "STUDENT",
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp
  },
  {
    userId: "teacher-earth",
    displayName: "ครูเอิร์ธ",
    role: "INSTRUCTOR",
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp
  }
];

export const mockTeacherLogins: TeacherLoginRow[] = [
  {
    teacherLoginId: "teacher-login-earth",
    userId: "teacher-earth",
    username: "teacher",
    password: "teacher123456",
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp
  }
];

export const mockCourses: CourseRow[] = [
  {
    courseId: "course-10",
    name: "Private Course 10 Classes",
    courseType: "CLASS",
    totalClasses: 10,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp
  },
  {
    courseId: "hour-10",
    name: "Private Course 10 Hours",
    courseType: "HOUR",
    totalClasses: 10,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp
  }
];

export const mockEnrollments: EnrollmentRow[] = [
  {
    enrollmentId: "enroll-demo",
    userId: "1234",
    courseId: "course-10",
    instructorId: "teacher-earth",
    purchasedClasses: 10,
    remainingClasses: 5,
    status: "ACTIVE",
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp
  }
];

export const mockAttendances: AttendanceRow[] = Array.from({ length: 5 }, (_, index) => ({
  attendanceId: `att-${index + 1}`,
  enrollmentId: "enroll-demo",
  instructorName: "ครูเอิร์ธ",
  checkedInAt: pastDate(5 - index),
  classesUsed: 1,
  hyperactiveScore: index % 2 === 0 ? 4 : undefined,
  distractionScore: index % 2 === 0 ? 3.5 : undefined,
  attentionSpanScore: index % 2 === 0 ? 4.5 : undefined,
  selfControlScore: index % 2 === 0 ? 4 : undefined,
  selfEsteemScore: index % 2 === 0 ? 5 : undefined,
  timeManagementScore: index % 2 === 0 ? 4 : undefined,
  behaviorScore: index % 2 === 0 ? 5 : undefined,
  note: `เรียนครั้งที่ ${index + 1}`,
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp
}));

export const mockPrePostAssessments: PrePostAssessmentRow[] = [
  {
    assessmentId: "assessment-pre-parent-demo",
    enrollmentId: "enroll-demo",
    assessmentType: "PRE",
    raterRole: "PARENT",
    userLineProfileId: "ulp-demo",
    continuousActivityScore: 4,
    listeningInstructionScore: 3.5,
    emotionalControlScore: 3,
    waitingSelfControlScore: 3,
    concentrationScore: 3.5,
    physicalBalanceScore: 3,
    planningProblemSolvingScore: 3.5,
    socialInteractionScore: 3,
    confidenceNewExperienceScore: 3.5,
    activityCooperationScore: 4,
    note: "ประเมินก่อนเริ่มคอร์ส",
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp
  },
  {
    assessmentId: "assessment-pre-teacher-demo",
    enrollmentId: "enroll-demo",
    assessmentType: "PRE",
    raterRole: "INSTRUCTOR",
    continuousActivityScore: 4,
    listeningInstructionScore: 4,
    emotionalControlScore: 3.5,
    waitingSelfControlScore: 3,
    concentrationScore: 4,
    physicalBalanceScore: 3.5,
    planningProblemSolvingScore: 3.5,
    socialInteractionScore: 3.5,
    confidenceNewExperienceScore: 4,
    activityCooperationScore: 4,
    note: "ประเมินโดยครูก่อนเริ่มคอร์ส",
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp
  }
];

function pastDate(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}
