import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireAdmin, signSession } from "../auth.js";
import { config } from "../config.js";
import {
  createAttendanceRow,
  createCourseRow,
  createEnrollmentRow,
  createUserLineProfileRow,
  createUserRow,
  deleteAttendanceRow,
  deleteCourseRow,
  deleteEnrollmentRow,
  deleteUserLineProfileRow,
  deleteUserRow,
  loadSheetDatabase,
  updateAttendanceRow,
  updateCourseRow,
  updateEnrollmentRow,
  updateUserLineProfileRow,
  updateUserRow
} from "../sheets.js";
import type { AttendanceRow, CourseRow, EnrollmentRow, UserLineProfileRow, UserRow } from "../types.js";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const idParamSchema = z.object({
  id: z.string().min(1)
});

const userSchema = z.object({
  userId: z.string().trim().optional().default(""),
  displayName: z.string().trim().min(1),
  pictureUrl: z.string().trim().optional().default(""),
  birthDate: z.string().trim().optional().default(""),
  role: z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"]).default("STUDENT")
});

const userLineProfileSchema = z.object({
  userLineProfileId: z.string().trim().optional().default(""),
  userId: z.string().trim().min(1),
  lineProfileId: z.string().trim().min(1),
  relationship: z.string().trim().optional().default(""),
  isPrimary: z.preprocess(
    (value) => value === true || value === "true" || value === "TRUE" || value === "1",
    z.boolean().default(false)
  )
});

const courseSchema = z.object({
  courseId: z.string().trim().optional().default(""),
  name: z.string().trim().min(1),
  courseType: z.enum(["CLASS", "HOUR"]).default("CLASS"),
  totalClasses: z.coerce.number().min(0)
});

const enrollmentSchema = z.object({
  enrollmentId: z.string().trim().optional().default(""),
  userId: z.string().trim().min(1),
  courseId: z.string().trim().min(1),
  instructorId: z.string().trim().optional().default(""),
  purchasedClasses: z.preprocess(
    (value) => value === "" || value === null ? undefined : value,
    z.coerce.number().min(0).optional()
  ),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).default("ACTIVE")
});

const optionalScoreSchema = z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.number().min(0).max(5).optional()
);

const attendanceSchema = z.object({
  attendanceId: z.string().trim().optional().default(""),
  enrollmentId: z.string().trim().min(1),
  instructorName: z.string().trim().min(1),
  checkedInAt: z.string().trim().min(1),
  classesUsed: z.coerce.number().min(0),
  score: optionalScoreSchema,
  hyperactiveScore: optionalScoreSchema,
  distractionScore: optionalScoreSchema,
  attentionSpanScore: optionalScoreSchema,
  selfControlScore: optionalScoreSchema,
  selfEsteemScore: optionalScoreSchema,
  timeManagementScore: optionalScoreSchema,
  behaviorScore: optionalScoreSchema,
  note: z.string().trim().optional().default("")
});

export async function adminRoutes(app: FastifyInstance) {
  app.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);

    if (!config.ADMIN_USERNAME || !config.ADMIN_PASSWORD) {
      return reply.code(503).send({ error: "Admin login is not configured" });
    }

    if (body.username !== config.ADMIN_USERNAME || body.password !== config.ADMIN_PASSWORD) {
      return reply.code(401).send({ error: "Username or password is incorrect" });
    }

    const token = signSession({
      userId: "admin",
      displayName: body.username,
      role: "ADMIN"
    });

    return { token };
  });

  app.get("/dashboard", { preHandler: requireAdmin }, async () => {
    const db = await loadSheetDatabase();
    return enrichDatabase(db);
  });

  app.post("/users", { preHandler: requireAdmin }, async (request) => {
    const user = toUserRow(userSchema.parse(request.body));
    return { user: await createUserRow(user) };
  });

  app.put("/users/:id", { preHandler: requireAdmin }, async (request) => {
    const id = getId(request);
    const user = toUserRow(userSchema.parse(request.body), id);
    return { user: await updateUserRow(id, user) };
  });

  app.delete("/users/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const id = getId(request);
    const db = await loadSheetDatabase();
    if (db.userLineProfiles.some((link) => link.userId === id)) {
      return reply.code(400).send({ error: "Cannot delete user while user-line-profile links still reference it" });
    }
    if (db.enrollments.some((enrollment) => enrollment.userId === id || enrollment.instructorId === id)) {
      return reply.code(400).send({ error: "Cannot delete user while enrollments still reference this user" });
    }
    await deleteUserRow(id);
    return { ok: true };
  });

  app.post("/user-line-profiles", { preHandler: requireAdmin }, async (request) => {
    const link = toUserLineProfileRow(userLineProfileSchema.parse(request.body));
    return { userLineProfile: await createUserLineProfileRow(link) };
  });

  app.put("/user-line-profiles/:id", { preHandler: requireAdmin }, async (request) => {
    const id = getId(request);
    const link = toUserLineProfileRow(userLineProfileSchema.parse(request.body), id);
    return { userLineProfile: await updateUserLineProfileRow(id, link) };
  });

  app.delete("/user-line-profiles/:id", { preHandler: requireAdmin }, async (request) => {
    const id = getId(request);
    await deleteUserLineProfileRow(id);
    return { ok: true };
  });

  app.post("/courses", { preHandler: requireAdmin }, async (request) => {
    const course = toCourseRow(courseSchema.parse(request.body));
    return { course: await createCourseRow(course) };
  });

  app.put("/courses/:id", { preHandler: requireAdmin }, async (request) => {
    const id = getId(request);
    const course = toCourseRow(courseSchema.parse(request.body), id);
    return { course: await updateCourseRow(id, course) };
  });

  app.delete("/courses/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const id = getId(request);
    const db = await loadSheetDatabase();
    if (db.enrollments.some((enrollment) => enrollment.courseId === id)) {
      return reply.code(400).send({ error: "Cannot delete course while enrollments still reference this course" });
    }
    await deleteCourseRow(id);
    return { ok: true };
  });

  app.post("/enrollments", { preHandler: requireAdmin }, async (request) => {
    const enrollment = toEnrollmentRow(enrollmentSchema.parse(request.body));
    return { enrollment: await createEnrollmentRow(enrollment) };
  });

  app.put("/enrollments/:id", { preHandler: requireAdmin }, async (request) => {
    const id = getId(request);
    const enrollment = toEnrollmentRow(enrollmentSchema.parse(request.body), id);
    return { enrollment: await updateEnrollmentRow(id, enrollment) };
  });

  app.delete("/enrollments/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const id = getId(request);
    const db = await loadSheetDatabase();
    if (db.attendances.some((attendance) => attendance.enrollmentId === id)) {
      return reply.code(400).send({ error: "Cannot delete enrollment while attendances still reference it" });
    }
    await deleteEnrollmentRow(id);
    return { ok: true };
  });

  app.post("/attendances", { preHandler: requireAdmin }, async (request) => {
    const attendance = toAttendanceRow(attendanceSchema.parse(request.body));
    const created = await createAttendanceRow(attendance);
    return { attendance: created };
  });

  app.put("/attendances/:id", { preHandler: requireAdmin }, async (request) => {
    const id = getId(request);
    const attendance = toAttendanceRow(attendanceSchema.parse(request.body), id);
    const updated = await updateAttendanceRow(id, attendance);
    return { attendance: updated };
  });

  app.delete("/attendances/:id", { preHandler: requireAdmin }, async (request) => {
    const id = getId(request);
    await deleteAttendanceRow(id);
    return { ok: true };
  });
}

function getId(request: FastifyRequest) {
  return idParamSchema.parse(request.params).id;
}

function toUserRow(input: z.infer<typeof userSchema>, fixedUserId?: string): UserRow {
  return {
    userId: fixedUserId || input.userId || undefined,
    displayName: input.displayName,
    pictureUrl: input.pictureUrl || undefined,
    birthDate: input.birthDate || undefined,
    role: input.role
  };
}

function toUserLineProfileRow(
  input: z.infer<typeof userLineProfileSchema>,
  fixedUserLineProfileId?: string
): UserLineProfileRow {
  return {
    userLineProfileId: fixedUserLineProfileId || input.userLineProfileId || "",
    userId: input.userId,
    lineProfileId: input.lineProfileId,
    relationship: input.relationship || undefined,
    isPrimary: input.isPrimary
  };
}

function toCourseRow(input: z.infer<typeof courseSchema>, fixedCourseId?: string): CourseRow {
  return {
    courseId: fixedCourseId || input.courseId || "",
    name: input.name,
    courseType: input.courseType,
    totalClasses: input.totalClasses
  };
}

function toEnrollmentRow(input: z.infer<typeof enrollmentSchema>, fixedEnrollmentId?: string): EnrollmentRow {
  return {
    enrollmentId: fixedEnrollmentId || input.enrollmentId || "",
    userId: input.userId,
    courseId: input.courseId,
    instructorId: input.instructorId || undefined,
    purchasedClasses: input.purchasedClasses ?? 0,
    remainingClasses: 0,
    status: input.status
  };
}

function toAttendanceRow(input: z.infer<typeof attendanceSchema>, fixedAttendanceId?: string): AttendanceRow {
  return {
    attendanceId: fixedAttendanceId || input.attendanceId || "",
    enrollmentId: input.enrollmentId,
    instructorName: input.instructorName,
    checkedInAt: input.checkedInAt,
    classesUsed: input.classesUsed,
    score: input.score,
    hyperactiveScore: input.hyperactiveScore,
    distractionScore: input.distractionScore,
    attentionSpanScore: input.attentionSpanScore,
    selfControlScore: input.selfControlScore,
    selfEsteemScore: input.selfEsteemScore,
    timeManagementScore: input.timeManagementScore,
    behaviorScore: input.behaviorScore,
    note: input.note || undefined
  };
}

function enrichDatabase(db: Awaited<ReturnType<typeof loadSheetDatabase>>) {
  const usersById = new Map(db.users.map((user) => [user.userId, user]));
  const coursesById = new Map(db.courses.map((course) => [course.courseId, course]));
  const enrollmentsById = new Map(db.enrollments.map((enrollment) => [enrollment.enrollmentId, enrollment]));
  const enrichedEnrollments = db.enrollments.map((enrollment) => {
    const course = coursesById.get(enrollment.courseId);
    const purchasedClasses = resolvePurchasedClasses(enrollment.purchasedClasses, course?.totalClasses);
    const remainingClasses = resolveRemainingClasses(
      purchasedClasses,
      db.attendances.filter((attendance) => attendance.enrollmentId === enrollment.enrollmentId)
    );

    return {
      ...enrollment,
      purchasedClasses,
      remainingClasses,
      userDisplayName: usersById.get(enrollment.userId)?.displayName ?? "",
      courseName: course?.name ?? "",
      instructorId: enrollment.instructorId ?? "",
      instructorName: enrollment.instructorId ? usersById.get(enrollment.instructorId)?.displayName ?? "" : ""
    };
  });

  return {
    lineProfiles: db.lineProfiles
      .map((profile) => ({
        ...profile,
        linkedUsers: db.userLineProfiles
          .filter((link) => link.lineProfileId === profile.lineProfileId)
          .map((link) => usersById.get(link.userId)?.displayName || link.userId)
          .filter(Boolean)
      }))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()),
    userLineProfiles: db.userLineProfiles.map((link) => ({
      ...link,
      userDisplayName: usersById.get(link.userId)?.displayName ?? "",
      lineDisplayName: db.lineProfiles.find((profile) => profile.lineProfileId === link.lineProfileId)?.displayName ?? ""
    })),
    users: db.users,
    courses: db.courses,
    enrollments: enrichedEnrollments,
    attendances: db.attendances
      .map((attendance) => {
        const enrollment = enrollmentsById.get(attendance.enrollmentId);
        return {
          ...attendance,
          userId: enrollment?.userId ?? "",
          userDisplayName: enrollment?.userId ? usersById.get(enrollment.userId)?.displayName ?? "" : "",
          courseId: enrollment?.courseId ?? "",
          courseName: enrollment?.courseId ? coursesById.get(enrollment.courseId)?.name ?? "" : "",
          instructorId: enrollment?.instructorId ?? "",
          enrollmentInstructorName: enrollment?.instructorId ? usersById.get(enrollment.instructorId)?.displayName ?? "" : ""
        };
      })
      .sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime())
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
