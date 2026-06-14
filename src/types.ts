export type SessionUser = {
  userId: string;
  displayName: string;
  lineProfileId?: string;
  role?: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  instructorName?: string;
};

export type LineProfileRow = {
  lineProfileId: string;
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
};

export type UserRow = {
  userId?: string;
  displayName: string;
  pictureUrl?: string;
  birthDate?: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  createdAt?: string;
  updatedAt?: string;
};

export type UserLineProfileRow = {
  userLineProfileId: string;
  userId: string;
  lineProfileId: string;
  relationship?: string;
  isPrimary?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TeacherLoginRow = {
  teacherLoginId: string;
  userId: string;
  username: string;
  password: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CourseRow = {
  courseId: string;
  name: string;
  courseType: "CLASS" | "HOUR";
  totalClasses: number;
  createdAt?: string;
  updatedAt?: string;
};

export type EnrollmentRow = {
  enrollmentId: string;
  userId?: string;
  courseId: string;
  instructorId?: string;
  purchasedClasses: number;
  remainingClasses: number;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  createdAt?: string;
  updatedAt?: string;
};

export type AttendanceRow = {
  attendanceId: string;
  userDisplayName?: string;
  courseName?: string;
  enrollmentId: string;
  instructorName: string;
  checkedInAt: string;
  classesUsed: number;
  hyperactiveScore?: number;
  distractionScore?: number;
  attentionSpanScore?: number;
  selfControlScore?: number;
  selfEsteemScore?: number;
  timeManagementScore?: number;
  behaviorScore?: number;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PrePostAssessmentRow = {
  assessmentId: string;
  enrollmentId: string;
  assessmentType: "PRE" | "POST";
  raterRole: "PARENT" | "INSTRUCTOR";
  userLineProfileId?: string;
  continuousActivityScore?: number;
  listeningInstructionScore?: number;
  emotionalControlScore?: number;
  waitingSelfControlScore?: number;
  concentrationScore?: number;
  physicalBalanceScore?: number;
  planningProblemSolvingScore?: number;
  socialInteractionScore?: number;
  confidenceNewExperienceScore?: number;
  activityCooperationScore?: number;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: SessionUser;
  }
}
