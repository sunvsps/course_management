import { escapeHtml, formatDate, formatNumber } from "./format.js";

const tokenKey = "adminSessionToken";
const attendancePageSize = 10;
const navItems = [
  { id: "portal", label: "Portal" },
  { id: "attendances", label: "Attendances" },
  { id: "lineProfiles", label: "LineProfiles" },
  { id: "userLineProfiles", label: "UserLineProfiles" },
  { id: "teacherLogins", label: "TeacherLogins" },
  { id: "courses", label: "Courses" },
  { id: "enrollments", label: "Enrollments" },
  { id: "users", label: "Users" }
];

const scoreFields = [
   ["hyperactiveScore", "Hyperactive | อยู่ไม่นิ่ง", "นิ่งมาก", "อยู่ไม่นิ่งมาก", "observe"],
  ["distractionScore", "Distraction | วอกแวกง่าย", "จดจ่อดี", "วอกแวกมาก", "observe"],
  ["attentionSpanScore", "Attention | สมาธิในการเรียน", "น้อย", "ดีมาก", "skill"],
  ["selfControlScore", "Self Control | ควบคุมตัวเอง", "ต้องช่วยมาก", "ทำได้ดี", "skill"],
  ["selfEsteemScore", "Self Esteem | ความมั่นใจ", "ไม่มั่นใจ", "มั่นใจมาก", "skill"],
  ["timeManagementScore", "Time Managment | จัดการเวลา", "ต้องช่วยมาก", "ทำได้ดี", "skill"],
  ["behaviorScore", "Behavior | พฤติกรรมโดยรวม", "ต้องดูแลมาก", "ดีมาก", "skill"]
];

const state = {
  token: localStorage.getItem(tokenKey),
  view: "portal",
  editing: null,
  data: null,
  attendancePage: 1,
  attendanceDateSort: "desc",
  filters: {
    lineProfiles: { search: "" },
    userLineProfiles: { userId: "", lineProfileId: "" },
    teacherLogins: { userId: "", search: "" },
    users: { role: "", search: "" },
    courses: { courseType: "", search: "" },
    enrollments: { instructorId: "", userId: "", courseId: "", status: "" },
    attendances: { instructorId: "", userId: "", courseId: "" }
  }
};

const loginView = document.getElementById("adminLogin");
const appView = document.getElementById("adminApp");
const loginForm = document.getElementById("adminLoginForm");
const logoutButton = document.getElementById("adminLogoutButton");
const nav = document.getElementById("adminNav");
const content = document.getElementById("adminContent");

loginForm.onsubmit = async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(loginForm).entries());

  try {
    const data = await adminApi("/login", { method: "POST", body, auth: false });
    state.token = data.token;
    localStorage.setItem(tokenKey, data.token);
    await bootAdmin();
  } catch (error) {
    showToast(error.message);
  }
};

logoutButton.onclick = () => {
  localStorage.removeItem(tokenKey);
  state.token = null;
  state.data = null;
  showLogin();
};

if (state.token) {
  bootAdmin();
} else {
  showLogin();
}

async function bootAdmin() {
  try {
    await loadDashboard();
    showApp();
  } catch (error) {
    localStorage.removeItem(tokenKey);
    state.token = null;
    showLogin();
    showToast(error.message);
  }
}

async function loadDashboard() {
  state.data = await adminApi("/dashboard");
}

function showLogin() {
  loginView.classList.remove("hidden");
  appView.classList.add("hidden");
}

function showApp() {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  renderNav();
  renderCurrentView();
}

function renderNav() {
  nav.innerHTML = navItems.map((item) => `
    <button class="adminNavButton ${state.view === item.id ? "active" : ""}" type="button" data-view="${item.id}">
      ${escapeHtml(item.label)}
    </button>
  `).join("");

  nav.querySelectorAll("[data-view]").forEach((button) => {
    button.onclick = () => {
      state.view = button.dataset.view;
      state.editing = null;
      renderNav();
      renderCurrentView();
    };
  });
}

function renderCurrentView() {
  if (state.view === "attendances") return renderAttendances();
  if (state.view === "lineProfiles") return renderLineProfiles();
  if (state.view === "userLineProfiles") return renderUserLineProfiles();
  if (state.view === "teacherLogins") return renderTeacherLogins();
  if (state.view === "courses") return renderCourses();
  if (state.view === "enrollments") return renderEnrollments();
  if (state.view === "users") return renderUsers();
  return renderPortal();
}

function renderPortal() {
  const data = state.data;
  const activeEnrollments = data.enrollments.filter((item) => item.status === "ACTIVE").length;
  const latestAttendances = sortAttendancesByDate(data.attendances).slice(0, 5);

  content.innerHTML = `
    <section class="adminStats">
      ${statCard("ผู้เรียน", data.users.filter((user) => user.role === "STUDENT").length)}
      ${statCard("LINE Profiles", data.lineProfiles.length)}
      ${statCard("คอร์ส", data.courses.length)}
      ${statCard("กำลังเรียน", activeEnrollments)}
    </section>
    <section class="adminPanel">
      <div class="adminPanelHeader">
        <div>
          <p class="eyebrow">Check-in</p>
        </div>
      </div>
      </div>
    </section>
    <section class="adminPanel">
      <div class="adminPanelHeader">
        <div>
          <p class="eyebrow">Latest</p>
          <h2>ประวัติการเข้าเรียนล่าสุด</h2>
        </div>
      </div>
      ${latestAttendances.length ? attendanceTable(latestAttendances, false) : emptyAdmin("ยังไม่มีประวัติ")}
    </section>
  `;

  bindAttendanceDateSort();
  content.querySelectorAll("[data-view-shortcut]").forEach((button) => {
    button.onclick = () => {
      state.view = button.dataset.viewShortcut;
      state.editing = null;
      renderNav();
      renderCurrentView();
    };
  });
}

function renderLineProfiles() {
  const lineProfiles = filteredLineProfiles();

  content.innerHTML = `
    ${panelHeader("LineProfiles", "ข้อมูลโปรไฟล์จาก LINE Login")}
    <section class="adminPanel">
      ${filterBar("lineProfiles", [
        filterInput("search", "ค้นหา", state.filters.lineProfiles.search, "ชื่อ, LINE user ID, email")
      ])}
      ${lineProfileTable(lineProfiles)}
    </section>
  `;

  bindFilters("lineProfiles");
}

function renderUserLineProfiles() {
  const editing = state.editing?.type === "userLineProfile"
    ? state.data.userLineProfiles.find((link) => link.userLineProfileId === state.editing.id)
    : null;
  const links = filteredUserLineProfiles();

  content.innerHTML = `
    ${panelHeader("UserLineProfiles", "ผูก LINE profile กับนักเรียนหรือผู้ใช้งาน")}
    <section class="adminPanel">
      <form class="adminForm adminFormGrid" data-form="user-line-profiles">
        <label>User${select("userId", allUserOptions(), editing?.userId ?? "")}</label>
        <label>Line Profile${select("lineProfileId", lineProfileOptions(), editing?.lineProfileId ?? "")}</label>
        <label>Relationship<input name="relationship" value="${escapeHtml(editing?.relationship ?? "")}" placeholder="father, mother, parent" /></label>
        <label>Primary${select("isPrimary", [["true", "Yes"]], editing?.isPrimary ? "true" : "false")}</label>
        <div class="adminFormActions">
          <button type="submit">${editing ? "บันทึกการแก้ไข" : "เพิ่ม Link"}</button>
          ${editing ? `<button class="secondary" type="button" data-cancel-edit>ยกเลิก</button>` : ""}
        </div>
      </form>
    </section>
    <section class="adminPanel">
      ${filterBar("userLineProfiles", [
        filterSelect("userId", "User", [["", "ทุก user"], ...allUserOptions()], state.filters.userLineProfiles.userId),
        filterSelect("lineProfileId", "Line Profile", [["", "ทุก LINE profile"], ...lineProfileOptions()], state.filters.userLineProfiles.lineProfileId)
      ])}
      ${userLineProfileTable(links)}
    </section>
  `;

  bindCrudForm("userLineProfile", "/user-line-profiles", editing?.userLineProfileId);
  bindFilters("userLineProfiles");
  bindTableActions("userLineProfile", "/user-line-profiles");
}

function renderTeacherLogins() {
  const editing = state.editing?.type === "teacherLogin"
    ? state.data.teacherLogins.find((teacherLogin) => teacherLogin.teacherLoginId === state.editing.id)
    : null;
  const teacherLogins = filteredTeacherLogins();

  content.innerHTML = `
    ${panelHeader("TeacherLogins", "บัญชี username/password สำหรับครูหลายคน")}
    <section class="adminPanel">
      <form class="adminForm adminFormGrid" data-form="teacher-logins">
        <label>Login ID<input name="teacherLoginId" value="${escapeHtml(editing?.teacherLoginId ?? "")}" readonly/></label>
        <label>Teacher${select("userId", instructorOptions(), editing?.userId ?? "")}</label>
        <label>Username<input name="username" value="${escapeHtml(editing?.username ?? "")}" required /></label>
        <label>Password<input name="password" value="${escapeHtml(editing?.password ?? "")}" required /></label>
        <div class="adminFormActions">
          <button type="submit">${editing ? "บันทึกการแก้ไข" : "เพิ่ม Teacher Login"}</button>
          ${editing ? `<button class="secondary" type="button" data-cancel-edit>ยกเลิก</button>` : ""}
        </div>
      </form>
    </section>
    <section class="adminPanel">
      ${filterBar("teacherLogins", [
        filterSelect("userId", "Teacher", [["", "ทุกครู"], ...instructorOptions()], state.filters.teacherLogins.userId),
        filterInput("search", "ค้นหา", state.filters.teacherLogins.search, "username หรือชื่อครู")
      ])}
      ${teacherLoginTable(teacherLogins)}
    </section>
  `;

  bindCrudForm("teacherLogin", "/teacher-logins", editing?.teacherLoginId);
  bindFilters("teacherLogins");
  bindTableActions("teacherLogin", "/teacher-logins");
}

function renderUsers() {
  const editing = state.editing?.type === "user"
    ? state.data.users.find((user) => user.userId === state.editing.id)
    : null;
  const users = filteredUsers();

  content.innerHTML = `
    ${panelHeader("Users", "เพิ่ม แก้ไข ลบ ผู้เรียน/ผู้สอน/admin")}
    <section class="adminPanel">
      <form class="adminForm adminFormGrid" data-form="users">
        <label>User ID<input name="userId" value="${escapeHtml(editing?.userId ?? "")}" readonly/></label>
        <label>ชื่อ<input name="displayName" value="${escapeHtml(editing?.displayName ?? "")}" required /></label>
        <label>วันเกิด<input name="birthDate" type="date" value="${escapeHtml(editing?.birthDate ?? "")}" /></label>
        <label>Role${select("role", [["STUDENT", "STUDENT"], ["INSTRUCTOR", "INSTRUCTOR"], ["ADMIN", "ADMIN"]], editing?.role ?? "STUDENT")}</label>
        <label>รูปภาพ URL<input name="pictureUrl" value="${escapeHtml(editing?.pictureUrl ?? "")}" placeholder="ถ้ามี" /></label>
        <div class="adminFormActions">
          <button type="submit">${editing ? "บันทึกการแก้ไข" : "เพิ่ม User"}</button>
          ${editing ? `<button class="secondary" type="button" data-cancel-edit>ยกเลิก</button>` : ""}
        </div>
      </form>
    </section>
    <section class="adminPanel">
      ${filterBar("users", [
        filterSelect("role", "Role", [["", "ทุก role"], ["STUDENT", "STUDENT"], ["INSTRUCTOR", "INSTRUCTOR"], ["ADMIN", "ADMIN"]], state.filters.users.role),
        filterInput("search", "ค้นหา", state.filters.users.search, "ชื่อหรือ User ID")
      ])}
      ${userTable(users)}
    </section>
  `;

  bindCrudForm("users", "/users", editing?.userId);
  bindFilters("users");
  bindTableActions("user", "/users");
}

function renderCourses() {
  const editing = state.editing?.type === "course"
    ? state.data.courses.find((course) => course.courseId === state.editing.id)
    : null;
  const courses = filteredCourses();

  content.innerHTML = `
    <section class="adminPanel">
      <form class="adminForm adminFormGrid" data-form="courses">
        <label>Course ID<input name="courseId" value="${escapeHtml(editing?.courseId ?? "")}" readonly/></label>
        <label>ชื่อคอร์ส<input name="name" value="${escapeHtml(editing?.name ?? "")}" required /></label>
        <label>ประเภท${select("courseType", [["CLASS", "รายครั้ง"], ["HOUR", "รายชม."]], editing?.courseType ?? "CLASS")}</label>
        <label>จำนวนทั้งหมด<input name="totalClasses" type="number" min="0" step="0.5" value="${editing?.totalClasses ?? 10}" required /></label>
        <div class="adminFormActions">
          <button type="submit">${editing ? "บันทึกการแก้ไข" : "เพิ่ม Course"}</button>
          ${editing ? `<button class="secondary" type="button" data-cancel-edit>ยกเลิก</button>` : ""}
        </div>
      </form>
    </section>
    <section class="adminPanel">
      ${filterBar("courses", [
        filterSelect("courseType", "ประเภท", [["", "ทุกประเภท"], ["CLASS", "รายครั้ง"], ["HOUR", "รายชม."]], state.filters.courses.courseType),
        filterInput("search", "ค้นหา", state.filters.courses.search, "ชื่อหรือ Course ID")
      ])}
      ${courseTable(courses)}
    </section>
  `;

  bindCrudForm("course", "/courses", editing?.courseId);
  bindFilters("courses");
  bindTableActions("course", "/courses");
}

function renderEnrollments() {
  const editing = state.editing?.type === "enrollment"
    ? state.data.enrollments.find((enrollment) => enrollment.enrollmentId === state.editing.id)
    : null;
  const enrollments = filteredEnrollments();

  content.innerHTML = `
    <section class="adminPanel">
      <form class="adminForm adminFormGrid" data-form="enrollments">
        <label>ผู้เรียน${select("userId", userOptions(), editing?.userId ?? "")}</label>
        <label>คอร์ส${select("courseId", courseOptions(), editing?.courseId ?? "")}</label>
        <label>ครูผู้สอน${select("instructorId", [["", "เลือกครูผู้สอน"], ...instructorOptions()], editing?.instructorId ?? "")}</label>
        <label>จำนวนที่ซื้อ<input name="purchasedClasses" type="number" min="0" step="0.5" value="${editing?.purchasedClasses || ""}" placeholder="เว้นว่าง = ใช้จำนวนจาก Course" /></label>
        <label>สถานะ${select("status", [["ACTIVE", "กำลังเรียน"], ["PAUSED", "พักไว้"], ["COMPLETED", "จบแล้ว"], ["CANCELLED", "ยกเลิก"]], editing?.status ?? "ACTIVE")}</label>
        <div class="adminFormActions">
          <button type="submit">${editing ? "บันทึกการแก้ไข" : "เพิ่ม Enrollment"}</button>
          ${editing ? `<button class="secondary" type="button" data-cancel-edit>ยกเลิก</button>` : ""}
        </div>
      </form>
    </section>
    <section class="adminPanel">
      ${filterBar("enrollments", [
        filterSelect("instructorId", "ครู", [["", "ครูทั้งหมด"], ...instructorOptions()], state.filters.enrollments.instructorId),
        filterSelect("userId", "นักเรียน", [["", "นักเรียนทั้งหมด"], ...userOptions()], state.filters.enrollments.userId),
        filterSelect("courseId", "คอร์ส", [["", "คอร์สทั้งหมด"], ...courseOptions()], state.filters.enrollments.courseId),
        filterSelect("status", "สถานะ", [["", "ทุกสถานะ"], ["ACTIVE", "กำลังเรียน"], ["PAUSED", "พักไว้"], ["COMPLETED", "จบแล้ว"], ["CANCELLED", "ยกเลิก"]], state.filters.enrollments.status)
      ])}
      ${enrollmentTable(enrollments)}
    </section>
  `;

  bindCrudForm("enrollment", "/enrollments", editing?.enrollmentId);
  bindFilters("enrollments");
  bindTableActions("enrollment", "/enrollments");
}

function renderAttendances() {
  const editing = state.editing?.type === "attendance"
    ? state.data.attendances.find((attendance) => attendance.attendanceId === state.editing.id)
    : null;
  const selectedUserId = selectedAttendanceUserId(editing);
  const attendances = sortAttendancesByDate(filteredAttendances());
  const pageCount = Math.max(Math.ceil(attendances.length / attendancePageSize), 1);
  state.attendancePage = Math.min(Math.max(state.attendancePage, 1), pageCount);
  const pageRows = paginateRows(attendances, state.attendancePage, attendancePageSize);

  content.innerHTML = `
    <section class="adminPanel">
      ${attendanceForm(editing, selectedUserId)}
    </section>
    <section class="adminPanel">
      ${filterBar("attendances", [
        filterSelect("instructorId", "ครู", [["", "ครูทั้งหมด"], ...instructorOptions()], state.filters.attendances.instructorId),
        filterSelect("userId", "นักเรียน", [["", "นักเรียนทั้งหมด"], ...userOptions()], state.filters.attendances.userId),
        filterSelect("courseId", "คอร์ส", [["", "คอร์สทั้งหมด"], ...courseOptions()], state.filters.attendances.courseId)
      ])}
      ${attendanceTable(pageRows, true)}
      ${attendancePagination(attendances.length, state.attendancePage, pageCount)}
    </section>
  `;

  bindCrudForm("attendance", "/attendances", editing?.attendanceId);
  bindAttendanceStudentSelect(editing?.enrollmentId ?? "");
  bindFilters("attendances");
  bindAttendanceDateSort();
  bindAttendancePagination();
  bindTableActions("attendance", "/attendances");
}

function bindCrudForm(type, path, editingId) {
  const form = content.querySelector("form");
  const cancelButton = content.querySelector("[data-cancel-edit]");

  if (cancelButton) {
    cancelButton.onclick = () => {
      state.editing = null;
      renderCurrentView();
    };
  }

  form.onsubmit = async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(form).entries());

    try {
      await adminApi(editingId ? `${path}/${encodeURIComponent(editingId)}` : path, {
        method: editingId ? "PUT" : "POST",
        body
      });
      state.editing = null;
      await loadDashboard();
      renderCurrentView();
      showToast("บันทึกเรียบร้อย");
    } catch (error) {
      showToast(error.message);
    }
  };
}

function bindAttendanceStudentSelect(selectedEnrollmentId = "") {
  const userSelect = content.querySelector('select[name="attendanceUserId"]');
  const enrollmentSelect = content.querySelector('select[name="enrollmentId"]');
  const usedInput = content.querySelector("[data-classes-used]");
  const refreshUsage = () => updateCheckinUsage(userSelect?.value, enrollmentSelect?.value);

  if (!userSelect || !enrollmentSelect) return;

  userSelect.onchange = () => {
    const options = enrollmentOptionsForUser(userSelect.value);
    enrollmentSelect.innerHTML = options.map(([value, label], index) => `
      <option value="${escapeHtml(value)}" ${index === 0 ? "selected" : ""}>${escapeHtml(label)}</option>
    `).join("");
    refreshUsage();
  };

  enrollmentSelect.onchange = refreshUsage;
  if (usedInput) usedInput.oninput = refreshUsage;

  if (selectedEnrollmentId) {
    enrollmentSelect.value = selectedEnrollmentId;
  }
  refreshUsage();
}

function updateCheckinUsage(userId, enrollmentId) {
  const enrollment = findEnrollment(enrollmentId);
  const course = findCourse(enrollment?.courseId);
  const usedInput = content.querySelector("[data-classes-used]");
  const usedValue = usedInput?.value || 0;
  const usage = content.querySelector("[data-course-usage]");
  const summary = content.querySelector("[data-checkin-summary]");

  if (usage) usage.innerHTML = courseUsagePanel(enrollment, course, usedValue);
  if (summary) summary.innerHTML = checkinSummary(enrollment, course, usedValue, userId);
}

function bindAttendancePagination() {
  content.querySelectorAll("[data-attendance-page]").forEach((button) => {
    button.onclick = () => {
      state.attendancePage = Number(button.dataset.attendancePage) || 1;
      renderCurrentView();
    };
  });
}

function bindAttendanceDateSort() {
  content.querySelectorAll("[data-attendance-date-sort]").forEach((button) => {
    button.onclick = () => {
      state.attendanceDateSort = state.attendanceDateSort === "asc" ? "desc" : "asc";
      state.attendancePage = 1;
      renderCurrentView();
    };
  });
}

function bindFilters(filterKey) {
  content.querySelectorAll(`[data-filter-group="${filterKey}"] [data-filter-name]`).forEach((field) => {
    field.oninput = () => {
      state.filters[filterKey][field.dataset.filterName] = field.value;
      if (filterKey === "attendances") state.attendancePage = 1;
      renderCurrentView();
    };
    field.onchange = field.oninput;
  });

  content.querySelectorAll(`[data-filter-reset="${filterKey}"]`).forEach((button) => {
    button.onclick = () => {
      Object.keys(state.filters[filterKey]).forEach((key) => {
        state.filters[filterKey][key] = "";
      });
      if (filterKey === "attendances") state.attendancePage = 1;
      renderCurrentView();
    };
  });
}

function bindTableActions(type, path) {
  content.querySelectorAll("[data-edit-id]").forEach((button) => {
    button.onclick = () => {
      state.editing = { type, id: button.dataset.editId };
      renderCurrentView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  });

  content.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.onclick = async () => {
      if (!confirm("ยืนยันการลบรายการนี้?")) return;

      try {
        await adminApi(`${path}/${encodeURIComponent(button.dataset.deleteId)}`, { method: "DELETE" });
        await loadDashboard();
        renderCurrentView();
        showToast("ลบเรียบร้อย");
      } catch (error) {
        showToast(error.message);
      }
    };
  });
}

async function adminApi(path, options = {}) {
  const headers = {};

  if (options.auth !== false && state.token) {
    headers.authorization = `Bearer ${state.token}`;
  }

  if (options.body) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(`/api/admin${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function userTable(users) {
  return table(["User ID", "ชื่อ", "วันเกิด", "Role", ""], users.map((user) => [
    user.userId,
    user.displayName,
    user.birthDate || "-",
    user.role,
    rowActions(user.userId)
  ]));
}

function lineProfileTable(lineProfiles) {
  return table(["Line Profile ID", "LINE User ID", "ชื่อ", "Email", "Linked users", "อัปเดตล่าสุด"], lineProfiles.map((profile) => [
    profile.lineProfileId,
    profile.lineUserId,
    profile.displayName,
    profile.email || "-",
    profile.linkedUsers?.length ? profile.linkedUsers.join(", ") : "-",
    profile.updatedAt || profile.createdAt || "-"
  ]));
}

function userLineProfileTable(links) {
  return table(["Link ID", "User", "Line Profile", "Relationship", "Primary", ""], links.map((link) => [
    link.userLineProfileId,
    link.userDisplayName || link.userId,
    link.lineDisplayName || link.lineProfileId,
    link.relationship || "-",
    link.isPrimary ? "Yes" : "-",
    rowActions(link.userLineProfileId)
  ]));
}

function teacherLoginTable(teacherLogins) {
  return table(["Login ID", "Teacher", "Username", "Password", ""], teacherLogins.map((teacherLogin) => [
    teacherLogin.teacherLoginId,
    teacherLogin.userDisplayName || teacherLogin.userId,
    teacherLogin.username,
    teacherLogin.password ? "••••••••" : "-",
    rowActions(teacherLogin.teacherLoginId)
  ]));
}

function courseTable(courses) {
  return table(["Course ID", "ชื่อ", "ประเภท", "ทั้งหมด", ""], courses.map((course) => [
    course.courseId,
    course.name,
    course.courseType === "HOUR" ? "รายชม." : "รายครั้ง",
    `${formatNumber(course.totalClasses)} ${courseUnit(course)}`,
    rowActions(course.courseId)
  ]));
}

function enrollmentTable(enrollments) {
  return table(["Enrollment ID", "ผู้เรียน", "คอร์ส", "ครู", "เหลือ", "สถานะ", ""], enrollments.map((enrollment) => {
    const course = findCourse(enrollment.courseId);
    return [
      enrollment.enrollmentId,
      enrollment.userDisplayName || enrollment.userId,
      enrollment.courseName || enrollment.courseId,
      enrollment.instructorName || "-",
      `${formatNumber(enrollment.remainingClasses)} / ${formatNumber(enrollment.purchasedClasses)} ${courseUnit(course)}`,
      statusLabel(enrollment.status),
      rowActions(enrollment.enrollmentId)
    ];
  }));
}

function attendanceForm(editing, selectedUserId) {
  const selectedEnrollmentId = editing?.enrollmentId ?? enrollmentOptionsForUser(selectedUserId)[0]?.[0] ?? "";
  const enrollment = findEnrollment(selectedEnrollmentId);
  const course = findCourse(enrollment?.courseId);
  const usedValue = editing?.classesUsed ?? 1;
  const hasActiveEnrollment = Boolean(selectedEnrollmentId);

  return `
    <form class="checkinForm" data-form="attendances">
      <div class="checkinHeader">
        <div>
          <p class="eyebrow">Check-in</p>
          <h2>${editing ? "แก้ไขประวัติการเข้าเรียน" : "บันทึกการเข้าเรียน"}</h2>
        </div>
        <div class="checkinSummary" data-checkin-summary>
          ${checkinSummary(enrollment, course, usedValue, selectedUserId)}
        </div>
      </div>

      <section class="checkinSection">
        <div class="checkinSectionTitle">
          <h3>ข้อมูลคลาส</h3>
        </div>
        <div class="checkinClassGrid">
          <label>คุณครู<input name="instructorName" value="${escapeHtml(editing?.instructorName ?? "ครูเอิร์ธ")}" required readonly /></label>
          <label>นักเรียน${select("attendanceUserId", attendanceStudentOptions(), selectedUserId)}</label>
          <label>วันที่ check-in<input name="checkedInAt" type="date" value="${escapeHtml(editing?.checkedInAt ?? todayInputValue())}" required /></label>
          <label class="checkinWide">คอร์ส${hasActiveEnrollment ? select("enrollmentId", enrollmentOptionsForUser(selectedUserId), selectedEnrollmentId) : `<select name="enrollmentId" required disabled><option>ไม่มีคอร์ส ACTIVE</option></select>`}</label>
          <div class="courseUsagePanel" data-course-usage>
            ${courseUsagePanel(enrollment, course, usedValue)}
          </div>
          <label>ใช้ครั้งนี้<input name="classesUsed" data-classes-used type="number" min="0" step="0.5" value="${escapeHtml(usedValue)}" required /></label>
        </div>
      </section>

      ${scoreInputs(editing)}

      <section class="checkinSection">
        <div class="checkinSectionTitle">
          <h3>หมายเหตุ</h3>
        </div>
        <label class="noteField">
          สรุปการเรียนวันนี้ / สิ่งที่ควรฝึกต่อ
          <textarea name="note" rows="4" placeholder="เช่น วันนี้เรียนเรื่องอะไร, นักเรียนมีปัญหาอะไร, สิ่งที่ควรฝึกต่อ">${escapeHtml(editing?.note ?? "")}</textarea>
        </label>
      </section>

      <div class="checkinFooter">
        ${editing ? `<button class="secondary" type="button" data-cancel-edit>ยกเลิก</button>` : ""}
        <button type="submit" ${hasActiveEnrollment ? "" : "disabled"}>${editing ? "บันทึกการแก้ไข" : "บันทึก Check-in"}</button>
      </div>
    </form>
  `;
}

function scoreInputs(editing) {
  const groups = [
    ["observe", "พฤติกรรมที่ต้องสังเกต"],
    ["skill", "ทักษะที่ทำได้ดี"]
  ];

  return `
    <section class="checkinSection">
      <div class="checkinSectionTitle">
        <h3>ประเมินพฤติกรรม</h3>
      </div>
      <div class="scoreGroups">
        ${groups.map(([group, title]) => `
          <div class="scoreGroup">
            <h4>${escapeHtml(title)}</h4>
            ${scoreFields.filter(([, , , , fieldGroup]) => fieldGroup === group).map(([name, label, lowLabel, highLabel]) => scoreChoice(name, label, lowLabel, highLabel, editing?.[name])).join("")}
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function scoreChoice(name, label, lowLabel, highLabel, value) {
  return `
    <fieldset class="scoreChoice">
      <legend>
        <span>${escapeHtml(label)}</span>
        <small>1 = ${escapeHtml(lowLabel)}, 5 = ${escapeHtml(highLabel)}</small>
      </legend>
      <div class="scoreScale" role="radiogroup" aria-label="${escapeHtml(label)}">
        ${[1, 2, 3, 4, 5].map((score) => `
          <label class="scoreOption">
            <input type="radio" name="${escapeHtml(name)}" value="${score}" ${Number(value) === score ? "checked" : ""} />
            <span>${score}</span>
          </label>
        `).join("")}
      </div>
      <div class="scoreHints"><span>${escapeHtml(lowLabel)}</span><span>${escapeHtml(highLabel)}</span></div>
    </fieldset>
  `;
}

function scoreSummary(attendance) {
  const scores = scoreFields
    .map(([name]) => Number(attendance[name]))
    .filter((score) => Number.isFinite(score));

  if (scores.length > 0) {
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return `${formatNumber(average)}/5 (${scores.length})`;
  }

  return Number.isFinite(Number(attendance.score)) ? `${formatNumber(attendance.score)}/5` : "-";
}

function checkinSummary(enrollment, course, usedValue, selectedUserId) {
  const used = Number(usedValue);
  const remaining = Number(enrollment?.remainingClasses);
  const after = Number.isFinite(remaining) ? Math.max(remaining - (Number.isFinite(used) ? used : 0), 0) : 0;
  const unit = courseUnit(course);
  const student = state.data.users.find((user) => user.userId === selectedUserId);

  return `
    <strong>${escapeHtml(student?.displayName ?? enrollment?.userDisplayName ?? "-")}</strong>
    <span>ใช้ครั้งนี้ ${formatNumber(Number.isFinite(used) ? used : 0)} ${unit}</span>
    <span>คงเหลือหลังบันทึก ${formatNumber(after)} ${unit}</span>
  `;
}

function courseUsagePanel(enrollment, course, usedValue) {
  const used = Number(usedValue);
  const remaining = Number(enrollment?.remainingClasses);
  const after = Number.isFinite(remaining) ? Math.max(remaining - (Number.isFinite(used) ? used : 0), 0) : 0;
  const unit = courseUnit(course);

  return `
    <div>
      <span>คอร์ส</span>
      <strong>${escapeHtml(enrollment?.courseName ?? enrollment?.courseId ?? "-")}</strong>
    </div>
    <div>
      <span>คงเหลือปัจจุบัน</span>
      <strong>${formatNumber(Number.isFinite(remaining) ? remaining : 0)} ${unit}</strong>
    </div>
    <div>
      <span>คงเหลือหลังบันทึก</span>
      <strong data-remaining-after>${formatNumber(after)} ${unit}</strong>
    </div>
  `;
}

function attendanceTable(attendances, withActions) {
  if (attendances.length === 0) return emptyAdmin("ยังไม่มีข้อมูล");

  const headers = ["ผู้เรียน", "คอร์ส", "ครูประจำ", "คุณครูเช็คอิน", "ใช้ไป", "คะแนน", withActions ? "" : null].filter(Boolean);
  const rows = attendances.map((attendance) => {
    const course = findCourse(attendance.courseId);
    const cells = [
      formatDate(attendance.checkedInAt),
      attendance.userDisplayName || attendance.userId || "-",
      attendance.courseName || attendance.courseId || "-",
      attendance.enrollmentInstructorName || "-",
      attendance.instructorName,
      `${formatNumber(attendance.classesUsed)} ${courseUnit(course)}`,
      scoreSummary(attendance)
    ];

    if (withActions) cells.push(rowActions(attendance.attendanceId));
    return cells;
  });

  return `
    <div class="adminTableWrap">
      <table class="adminTable">
        <thead>
          <tr>
            <th>${attendanceDateSortHeader()}</th>
            ${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${row.map((cell) => `<td>${tableCell(cell)}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function attendanceDateSortHeader() {
  const isAscending = state.attendanceDateSort === "asc";
  return `
    <button class="tableSortButton" type="button" data-attendance-date-sort aria-label="Sort attendance date ${isAscending ? "descending" : "ascending"}">
      วันที่ <span aria-hidden="true">${isAscending ? "↑" : "↓"}</span>
    </button>
  `;
}

function attendancePagination(totalRows, currentPage, pageCount) {
  if (totalRows === 0) return "";

  const start = (currentPage - 1) * attendancePageSize + 1;
  const end = Math.min(currentPage * attendancePageSize, totalRows);

  return `
    <div class="pagination adminPagination">
      <button class="secondary pageButton" type="button" data-attendance-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>ก่อนหน้า</button>
      <span>แสดง ${formatNumber(start)}-${formatNumber(end)} จาก ${formatNumber(totalRows)} รายการ | หน้า ${formatNumber(currentPage)} / ${formatNumber(pageCount)}</span>
      <button class="secondary pageButton" type="button" data-attendance-page="${currentPage + 1}" ${currentPage >= pageCount ? "disabled" : ""}>ถัดไป</button>
    </div>
  `;
}

function paginateRows(rows, page, pageSize) {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

function sortAttendancesByDate(attendances) {
  return [...attendances].sort((a, b) => {
    const delta = attendanceTime(a) - attendanceTime(b);
    return state.attendanceDateSort === "asc" ? delta : -delta;
  });
}

function attendanceTime(attendance) {
  const timestamp = new Date(attendance.checkedInAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function table(headers, rows) {
  if (rows.length === 0) return emptyAdmin("ยังไม่มีข้อมูล");

  return `
    <div class="adminTableWrap">
      <table class="adminTable">
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${row.map((cell) => `<td>${tableCell(cell)}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function rowActions(id) {
  return { html: `
    <span class="rowActionGroup">
      <button class="secondary iconTextButton" type="button" data-edit-id="${escapeHtml(id)}">แก้ไข</button>
      <button class="secondary dangerButton" type="button" data-delete-id="${escapeHtml(id)}">ลบ</button>
    </span>
  ` };
}

function tableCell(cell) {
  if (cell && typeof cell === "object" && "html" in cell) return cell.html;
  return escapeHtml(cell);
}

function select(name, options, selectedValue) {
  return `
    <select name="${escapeHtml(name)}" required>
      ${options.map(([value, label]) => `
        <option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>
      `).join("")}
    </select>
  `;
}

function filterBar(group, controls) {
  return `
    <div class="filterBar" data-filter-group="${escapeHtml(group)}">
      ${controls.join("")}
      <button class="secondary filterResetButton" type="button" data-filter-reset="${escapeHtml(group)}">ล้าง filter</button>
    </div>
  `;
}

function filterSelect(name, label, options, selectedValue) {
  return `
    <label class="filterControl">
      <span>${escapeHtml(label)}</span>
      <select data-filter-name="${escapeHtml(name)}">
        ${options.map(([value, optionLabel]) => `
          <option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(optionLabel)}</option>
        `).join("")}
      </select>
    </label>
  `;
}

function filterInput(name, label, value, placeholder = "") {
  return `
    <label class="filterControl">
      <span>${escapeHtml(label)}</span>
      <input data-filter-name="${escapeHtml(name)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />
    </label>
  `;
}

function userOptions() {
  return state.data.users
    .filter((user) => user.role === "STUDENT")
    .map((user) => [user.userId, `${user.displayName} (${user.userId})`]);
}

function allUserOptions() {
  return state.data.users.map((user) => [user.userId, `${user.displayName} (${user.userId})`]);
}

function lineProfileOptions() {
  return state.data.lineProfiles.map((profile) => [
    profile.lineProfileId,
    `${profile.displayName || profile.lineUserId} (${profile.lineProfileId})`
  ]);
}

function instructorOptions() {
  return state.data.users
    .filter((user) => user.role === "INSTRUCTOR" || user.role === "ADMIN")
    .map((user) => [user.userId, `${user.displayName} (${user.userId})`]);
}

function courseOptions() {
  return state.data.courses.map((course) => [course.courseId, `${course.name} (${course.courseId})`]);
}

function enrollmentOptions() {
  return state.data.enrollments.map((enrollment) => {
    const course = findCourse(enrollment.courseId);
    return [
      enrollment.enrollmentId,
      `${enrollment.userDisplayName || enrollment.userId} - ${enrollment.courseName || enrollment.courseId} เหลือ ${formatNumber(enrollment.remainingClasses)} ${courseUnit(course)}`
    ];
  });
}

function attendanceStudentOptions() {
  const enrolledUserIds = new Set(
    state.data.enrollments
      .filter((enrollment) => enrollment.status === "ACTIVE")
      .map((enrollment) => enrollment.userId)
  );
  return state.data.users
    .filter((user) => user.role === "STUDENT" && enrolledUserIds.has(user.userId))
    .map((user) => [user.userId, user.displayName]);
}

function enrollmentOptionsForUser(userId) {
  return state.data.enrollments
    .filter((enrollment) => enrollment.userId === userId && enrollment.status === "ACTIVE")
    .map((enrollment) => {
      const course = findCourse(enrollment.courseId);
      return [
        enrollment.enrollmentId,
        `${enrollment.courseName || enrollment.courseId} เหลือ ${formatNumber(enrollment.remainingClasses)} ${courseUnit(course)}`
      ];
    });
}

function selectedAttendanceUserId(editing) {
  if (editing?.userId) return editing.userId;
  return attendanceStudentOptions()[0]?.[0] ?? "";
}

function filteredLineProfiles() {
  const search = state.filters.lineProfiles.search.trim().toLowerCase();
  if (!search) return state.data.lineProfiles;

  return state.data.lineProfiles.filter((profile) => {
    return [
      profile.lineProfileId,
      profile.lineUserId,
      profile.displayName,
      profile.email,
      profile.statusMessage,
      ...(profile.linkedUsers ?? [])
    ].join(" ").toLowerCase().includes(search);
  });
}

function filteredUserLineProfiles() {
  const filters = state.filters.userLineProfiles;

  return state.data.userLineProfiles.filter((link) => {
    if (filters.userId && link.userId !== filters.userId) return false;
    if (filters.lineProfileId && link.lineProfileId !== filters.lineProfileId) return false;
    return true;
  });
}

function filteredTeacherLogins() {
  const filters = state.filters.teacherLogins;
  const search = filters.search.trim().toLowerCase();

  return state.data.teacherLogins.filter((teacherLogin) => {
    if (filters.userId && teacherLogin.userId !== filters.userId) return false;
    if (!search) return true;
    return [
      teacherLogin.teacherLoginId,
      teacherLogin.userId,
      teacherLogin.userDisplayName,
      teacherLogin.username
    ].join(" ").toLowerCase().includes(search);
  });
}

function filteredUsers() {
  const filters = state.filters.users;
  const search = filters.search.trim().toLowerCase();

  return state.data.users.filter((user) => {
    if (filters.role && user.role !== filters.role) return false;
    if (!search) return true;
    return `${user.userId ?? ""} ${user.displayName ?? ""}`.toLowerCase().includes(search);
  });
}

function filteredCourses() {
  const filters = state.filters.courses;
  const search = filters.search.trim().toLowerCase();

  return state.data.courses.filter((course) => {
    if (filters.courseType && course.courseType !== filters.courseType) return false;
    if (!search) return true;
    return `${course.courseId ?? ""} ${course.name ?? ""}`.toLowerCase().includes(search);
  });
}

function filteredEnrollments() {
  const filters = state.filters.enrollments;

  return state.data.enrollments.filter((enrollment) => {
    if (filters.instructorId && enrollment.instructorId !== filters.instructorId) return false;
    if (filters.userId && enrollment.userId !== filters.userId) return false;
    if (filters.courseId && enrollment.courseId !== filters.courseId) return false;
    if (filters.status && enrollment.status !== filters.status) return false;
    return true;
  });
}

function filteredAttendances() {
  const filters = state.filters.attendances;

  return state.data.attendances.filter((attendance) => {
    if (filters.instructorId && attendance.instructorId !== filters.instructorId) return false;
    if (filters.userId && attendance.userId !== filters.userId) return false;
    if (filters.courseId && attendance.courseId !== filters.courseId) return false;
    return true;
  });
}

function panelHeader(title, description) {
  return `
    <section class="adminPageHeader">
      <div>
        <p class="eyebrow">${escapeHtml(description)}</p>
        <h2>${escapeHtml(title)}</h2>
      </div>
    </section>
  `;
}

function statCard(label, value) {
  return `
    <article class="adminStat">
      <span>${escapeHtml(label)}</span>
      <strong>${formatNumber(value)}</strong>
    </article>
  `;
}

function emptyAdmin(text) {
  return `<article class="adminEmpty">${escapeHtml(text)}</article>`;
}

function findCourse(courseId) {
  return state.data.courses.find((course) => course.courseId === courseId);
}

function findEnrollment(enrollmentId) {
  return state.data.enrollments.find((enrollment) => enrollment.enrollmentId === enrollmentId);
}

function courseUnit(course) {
  return course?.courseType === "HOUR" ? "ชม." : "ครั้ง";
}

function statusLabel(status) {
  const labels = {
    ACTIVE: "กำลังเรียน",
    PAUSED: "พักไว้",
    COMPLETED: "จบแล้ว",
    CANCELLED: "ยกเลิก"
  };
  return labels[status] || status;
}

function todayInputValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.add("hidden"), 3200);
}
