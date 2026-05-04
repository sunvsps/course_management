import { escapeHtml, formatDate, formatNumber } from "./format.js";

const tokenKey = "adminSessionToken";
const navItems = [
  { id: "portal", label: "Portal" },
  { id: "attendances", label: "Check-in" },
  { id: "courses", label: "Courses" },
  { id: "enrollments", label: "Enrollments" },
  { id: "users", label: "Users" }
];

const state = {
  token: localStorage.getItem(tokenKey),
  view: "portal",
  editing: null,
  data: null
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
  if (state.view === "courses") return renderCourses();
  if (state.view === "enrollments") return renderEnrollments();
  if (state.view === "users") return renderUsers();
  return renderPortal();
}

function renderPortal() {
  const data = state.data;
  const activeEnrollments = data.enrollments.filter((item) => item.status === "ACTIVE").length;
  const latestAttendances = data.attendances.slice(0, 5);

  content.innerHTML = `
    <section class="adminStats">
      ${statCard("ผู้เรียน", data.users.filter((user) => user.role === "STUDENT").length)}
      ${statCard("คอร์ส", data.courses.length)}
      ${statCard("กำลังเรียน", activeEnrollments)}
      ${statCard("ประวัติ Check-in", data.attendances.length)}
    </section>
    <section class="adminPanel">
      <div class="adminPanelHeader">
        <div>
          <p class="eyebrow">Quick actions</p>
          <h2>เมนูหลัก</h2>
        </div>
      </div>
      <div class="adminActionGrid">
        ${navItems.filter((item) => item.id !== "portal").map((item) => `
          <button class="secondary adminActionButton" type="button" data-view-shortcut="${item.id}">
            ${escapeHtml(item.label)}
          </button>
        `).join("")}
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

  content.querySelectorAll("[data-view-shortcut]").forEach((button) => {
    button.onclick = () => {
      state.view = button.dataset.viewShortcut;
      state.editing = null;
      renderNav();
      renderCurrentView();
    };
  });
}

function renderUsers() {
  const editing = state.editing?.type === "user"
    ? state.data.users.find((user) => user.userId === state.editing.id)
    : null;

  content.innerHTML = `
    ${panelHeader("Users", "เพิ่ม แก้ไข ลบ ผู้เรียน/ผู้สอน/admin")}
    <section class="adminPanel">
      <form class="adminForm adminFormGrid" data-form="users">
        <label>User ID<input name="userId" value="${escapeHtml(editing?.userId ?? "")}" ${editing ? "readonly" : ""} placeholder="เว้นว่างเพื่อให้ระบบสร้าง" /></label>
        <label>ชื่อ<input name="displayName" value="${escapeHtml(editing?.displayName ?? "")}" required /></label>
        <label>วันเกิด<input name="birthDate" type="date" value="${escapeHtml(editing?.birthDate ?? "")}" /></label>
        <label>Role${select("role", [["STUDENT", "STUDENT"], ["INSTRUCTOR", "INSTRUCTOR"], ["ADMIN", "ADMIN"]], editing?.role ?? "STUDENT")}</label>
        <label>LINE Profile ID<input name="lineProfileId" value="${escapeHtml(editing?.lineProfileId ?? "")}" placeholder="ถ้ามี" /></label>
        <label>รูปภาพ URL<input name="pictureUrl" value="${escapeHtml(editing?.pictureUrl ?? "")}" placeholder="ถ้ามี" /></label>
        <div class="adminFormActions">
          <button type="submit">${editing ? "บันทึกการแก้ไข" : "เพิ่ม User"}</button>
          ${editing ? `<button class="secondary" type="button" data-cancel-edit>ยกเลิก</button>` : ""}
        </div>
      </form>
    </section>
    <section class="adminPanel">
      ${userTable(state.data.users)}
    </section>
  `;

  bindCrudForm("users", "/users", editing?.userId);
  bindTableActions("user", "/users");
}

function renderCourses() {
  const editing = state.editing?.type === "course"
    ? state.data.courses.find((course) => course.courseId === state.editing.id)
    : null;

  content.innerHTML = `
    ${panelHeader("Courses", "จัดการรายครั้ง/รายชั่วโมง")}
    <section class="adminPanel">
      <form class="adminForm adminFormGrid" data-form="courses">
        <label>Course ID<input name="courseId" value="${escapeHtml(editing?.courseId ?? "")}" ${editing ? "readonly" : ""} placeholder="เว้นว่างเพื่อให้ระบบสร้าง" /></label>
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
      ${courseTable(state.data.courses)}
    </section>
  `;

  bindCrudForm("course", "/courses", editing?.courseId);
  bindTableActions("course", "/courses");
}

function renderEnrollments() {
  const editing = state.editing?.type === "enrollment"
    ? state.data.enrollments.find((enrollment) => enrollment.enrollmentId === state.editing.id)
    : null;

  content.innerHTML = `
    ${panelHeader("Enrollments", "ผูก User กับ Course และสถานะการเรียน")}
    <section class="adminPanel">
      <form class="adminForm adminFormGrid" data-form="enrollments">
        <label>Enrollment ID<input name="enrollmentId" value="${escapeHtml(editing?.enrollmentId ?? "")}" ${editing ? "readonly" : ""} placeholder="เว้นว่างเพื่อให้ระบบสร้าง" /></label>
        <label>ผู้เรียน${select("userId", userOptions(), editing?.userId ?? "")}</label>
        <label>คอร์ส${select("courseId", courseOptions(), editing?.courseId ?? "")}</label>
        <label>จำนวนที่ซื้อ<input name="purchasedClasses" type="number" min="0" step="0.5" value="${editing?.purchasedClasses || ""}" placeholder="เว้นว่าง = ใช้จำนวนจาก Course" /></label>
        <label>สถานะ${select("status", [["ACTIVE", "กำลังเรียน"], ["PAUSED", "พักไว้"], ["COMPLETED", "จบแล้ว"], ["CANCELLED", "ยกเลิก"]], editing?.status ?? "ACTIVE")}</label>
        <div class="adminFormActions">
          <button type="submit">${editing ? "บันทึกการแก้ไข" : "เพิ่ม Enrollment"}</button>
          ${editing ? `<button class="secondary" type="button" data-cancel-edit>ยกเลิก</button>` : ""}
        </div>
      </form>
    </section>
    <section class="adminPanel">
      ${enrollmentTable(state.data.enrollments)}
    </section>
  `;

  bindCrudForm("enrollment", "/enrollments", editing?.enrollmentId);
  bindTableActions("enrollment", "/enrollments");
}

function renderAttendances() {
  const editing = state.editing?.type === "attendance"
    ? state.data.attendances.find((attendance) => attendance.attendanceId === state.editing.id)
    : null;

  content.innerHTML = `
    ${panelHeader("Check-in", "บันทึกและจัดการประวัติการเข้าเรียน")}
    <section class="adminPanel">
      <form class="adminForm adminFormGrid" data-form="attendances">
        <label>Attendance ID<input name="attendanceId" value="${escapeHtml(editing?.attendanceId ?? "")}" ${editing ? "readonly" : ""} placeholder="เว้นว่างเพื่อให้ระบบสร้าง" /></label>
        <label>Enrollment${select("enrollmentId", enrollmentOptions(), editing?.enrollmentId ?? "")}</label>
        <label>คุณครู<input name="instructorName" value="${escapeHtml(editing?.instructorName ?? "")}" required /></label>
        <label>วันที่ check-in<input name="checkedInAt" type="date" value="${escapeHtml(editing?.checkedInAt ?? todayInputValue())}" required /></label>
        <label>ใช้ไป<input name="classesUsed" type="number" min="0" step="0.5" value="${editing?.classesUsed ?? 1}" required /></label>
        <label>คะแนน / 5<input name="score" type="number" min="0" max="5" step="0.5" value="${editing?.score ?? ""}" /></label>
        <label class="adminFormWide">Note<input name="note" value="${escapeHtml(editing?.note ?? "")}" /></label>
        <div class="adminFormActions">
          <button type="submit">${editing ? "บันทึกการแก้ไข" : "Check-in"}</button>
          ${editing ? `<button class="secondary" type="button" data-cancel-edit>ยกเลิก</button>` : ""}
        </div>
      </form>
    </section>
    <section class="adminPanel">
      ${attendanceTable(state.data.attendances, true)}
    </section>
  `;

  bindCrudForm("attendance", "/attendances", editing?.attendanceId);
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
  return table(["Enrollment ID", "ผู้เรียน", "คอร์ส", "เหลือ", "สถานะ", ""], enrollments.map((enrollment) => {
    const course = findCourse(enrollment.courseId);
    return [
      enrollment.enrollmentId,
      enrollment.userDisplayName || enrollment.userId,
      enrollment.courseName || enrollment.courseId,
      `${formatNumber(enrollment.remainingClasses)} / ${formatNumber(enrollment.purchasedClasses)} ${courseUnit(course)}`,
      statusLabel(enrollment.status),
      rowActions(enrollment.enrollmentId)
    ];
  }));
}

function attendanceTable(attendances, withActions) {
  return table(["วันที่", "ผู้เรียน", "คอร์ส", "คุณครู", "ใช้ไป", "คะแนน", withActions ? "" : null].filter(Boolean), attendances.map((attendance) => {
    const course = findCourse(attendance.courseId);
    const cells = [
      formatDate(attendance.checkedInAt),
      attendance.userDisplayName || attendance.userId || "-",
      attendance.courseName || attendance.courseId || "-",
      attendance.instructorName,
      `${formatNumber(attendance.classesUsed)} ${courseUnit(course)}`,
      Number.isFinite(Number(attendance.score)) ? `${formatNumber(attendance.score)}/5` : "-"
    ];

    if (withActions) cells.push(rowActions(attendance.attendanceId));
    return cells;
  }));
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

function userOptions() {
  return state.data.users
    .filter((user) => user.role === "STUDENT")
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
