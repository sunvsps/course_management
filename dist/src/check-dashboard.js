import "dotenv/config";
import { loadSheetDatabase } from "./sheets.js";
import { getStudentDashboard } from "./student-service.js";
const db = await loadSheetDatabase();
const userId = process.argv[2] ?? process.env.DEMO_USER_ID ?? db.users[0]?.userId;
console.log("Dashboard check");
console.log({ userId });
const user = db.users.find((item) => item.userId === userId);
console.log("User:", user
    ? {
        userId: user.userId,
        displayName: user.displayName,
        pictureUrl: user.pictureUrl,
        role: user.role
    }
    : "(not found)");
if (!userId) {
    throw new Error("Missing userId. Pass one as an argument or set DEMO_USER_ID.");
}
const dashboard = await getStudentDashboard(userId);
const studentDashboards = "students" in dashboard ? dashboard.students : [dashboard];
const enrollments = studentDashboards.flatMap((studentDashboard) => studentDashboard.enrollments);
console.log("Dashboard summary:", {
    user: dashboard.user,
    students: studentDashboards.length,
    enrollments: enrollments.length,
    courses: enrollments.map((enrollment) => enrollment.course?.name),
    attendances: enrollments.reduce((sum, enrollment) => sum + enrollment.attendances.length, 0)
});
