import "dotenv/config";
import { loadSheetDatabase } from "./sheets.js";
import { getStudentDashboard } from "./student-service.js";

const db = await loadSheetDatabase();
const lineUserId = process.argv[2] ?? db.lineProfiles[0]?.lineUserId ?? "demo-student";

console.log("Dashboard check");
console.log({ lineUserId });

const lineProfile = db.lineProfiles.find((profile) => profile.lineUserId === lineUserId);
console.log("LineProfile:", lineProfile ?? "(not found)");

const user = db.users.find((item) =>
  item.lineUserId === lineUserId || Boolean(lineProfile && item.lineProfileId === lineProfile.lineProfileId)
);
console.log("User:", user ?? "(not found)");

const dashboard = await getStudentDashboard(lineUserId);
console.log("Dashboard summary:", {
  user: dashboard.user,
  enrollments: dashboard.enrollments.length,
  courses: dashboard.enrollments.map((enrollment) => enrollment.course?.name),
  lessons: dashboard.enrollments.reduce((sum, enrollment) => sum + enrollment.lessons.length, 0),
  attendances: dashboard.enrollments.reduce((sum, enrollment) => sum + enrollment.attendances.length, 0)
});
