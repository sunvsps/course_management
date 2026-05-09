import { renderStudentDashboard } from "./student-view.js";
import { escapeHtml, formatNumber } from "./format.js";

const tokenKey = "teacherSessionToken";
let token = localStorage.getItem(tokenKey);
let dashboardData = null;
let activeTeacherView = "checkin";

const loginView = document.getElementById("teacherLogin");
const loginForm = document.getElementById("teacherLoginForm");
const loadingView = document.getElementById("loadingView");
const logoutButton = document.getElementById("logoutButton");
const checkinView = document.getElementById("teacherCheckin");
const detailView = document.getElementById("studentView");
const teacherViewNav = document.getElementById("teacherViewNav");

const scoreFields = [
  ["hyperactiveScore", "Hyperactive | อยู่ไม่นิ่ง", "นิ่งมาก", "อยู่ไม่นิ่งมาก", "observe"],
  ["distractionScore", "Distraction | วอกแวกง่าย", "จดจ่อดี", "วอกแวกมาก", "observe"],
  ["attentionSpanScore", "Attention | สมาธิในการเรียน", "น้อย", "ดีมาก", "skill"],
  ["selfControlScore", "Self Control | ควบคุมตัวเอง", "ต้องช่วยมาก", "ทำได้ดี", "skill"],
  ["selfEsteemScore", "Self Esteem | ความมั่นใจ", "ไม่มั่นใจ", "มั่นใจมาก", "skill"],
  ["timeManagementScore", "Time Managment | จัดการเวลา", "ต้องช่วยมาก", "ทำได้ดี", "skill"],
  ["behaviorScore", "Behavior | พฤติกรรมโดยรวม", "ต้องดูแลมาก", "ดีมาก", "skill"]
];

loginForm.onsubmit = async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(loginForm).entries());

  try {
    const data = await teacherApi("/login", { method: "POST", body, auth: false });
    token = data.token;
    localStorage.setItem(tokenKey, token);
    await loadTeacherDashboard();
  } catch (error) {
    showToast(error.message);
  }
};

logoutButton.onclick = () => {
  localStorage.removeItem(tokenKey);
  token = null;
  dashboardData = null;
  teacherViewNav.classList.add("hidden");
  checkinView.classList.add("hidden");
  detailView.classList.add("hidden");
  logoutButton.classList.add("hidden");
  loginView.classList.remove("hidden");
};

if (token) {
  loadTeacherDashboard();
}

async function loadTeacherDashboard() {
  loginView.classList.add("hidden");
  loadingView.classList.remove("hidden");

  try {
    const dashboard = await teacherApi("/dashboard");
    dashboardData = dashboard;
    renderTeacherCheckin(dashboard);
    renderStudentDashboard(dashboard);
    loadingView.classList.add("hidden");
    teacherViewNav.classList.remove("hidden");
    logoutButton.classList.remove("hidden");
    setTeacherView(activeTeacherView);
  } catch (error) {
    localStorage.removeItem(tokenKey);
    token = null;
    loadingView.classList.add("hidden");
    teacherViewNav.classList.add("hidden");
    checkinView.classList.add("hidden");
    detailView.classList.add("hidden");
    loginView.classList.remove("hidden");
    showToast(error.message);
  }
}

teacherViewNav.querySelectorAll("[data-teacher-view]").forEach((button) => {
  button.onclick = () => setTeacherView(button.dataset.teacherView);
});

function setTeacherView(view) {
  activeTeacherView = view === "detail" ? "detail" : "checkin";
  checkinView.classList.toggle("hidden", activeTeacherView !== "checkin");
  detailView.classList.toggle("hidden", activeTeacherView !== "detail");

  teacherViewNav.querySelectorAll("[data-teacher-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.teacherView === activeTeacherView);
  });
}

function renderTeacherCheckin(dashboard) {
  const selectedStudentId = teacherStudentOptions(dashboard)[0]?.[0] ?? "";
  const selectedEnrollmentId = enrollmentOptionsForStudent(selectedStudentId)[0]?.[0] ?? "";
  const enrollment = findEnrollment(selectedEnrollmentId);
  const course = enrollment?.course;
  const latestAttendance = latestAttendanceForEnrollment(enrollment);
  const hasActiveEnrollment = Boolean(selectedEnrollmentId);

  checkinView.innerHTML = `
    <form class="checkinForm" data-form="teacher-attendance">
      <div class="checkinHeader">
        <div>
          <p class="eyebrow">Check-in</p>
          <h2>บันทึกการเข้าเรียน</h2>
        </div>
        <div class="checkinSummary" data-checkin-summary>
          ${checkinSummary(enrollment, course, 1, selectedStudentId)}
        </div>
      </div>

      <section class="checkinSection">
        <div class="checkinSectionTitle">
          <h3>ข้อมูลคลาส</h3>
        </div>
        <div class="checkinClassGrid">
          <label>คุณครู<input value="${escapeHtml(dashboard.user.displayName)}" readonly /></label>
          <label>นักเรียน${select("attendanceUserId", teacherStudentOptions(dashboard), selectedStudentId)}</label>
          <label>วันที่ check-in<input name="checkedInAt" type="date" value="${escapeHtml(todayInputValue())}" required /></label>
          <label class="checkinWide">คอร์ส${hasActiveEnrollment ? select("enrollmentId", enrollmentOptionsForStudent(selectedStudentId), selectedEnrollmentId) : `<select name="enrollmentId" required disabled><option>ไม่มีคอร์ส ACTIVE</option></select>`}</label>
          <div class="courseUsagePanel" data-course-usage>
            ${courseUsagePanel(enrollment, course, 1)}
          </div>
          <label>ใช้ครั้งนี้<input name="classesUsed" data-classes-used type="number" min="0" step="0.5" value="1" required /></label>
        </div>
      </section>

      <div data-score-inputs>
        ${scoreInputs(latestAttendance)}
      </div>

      <section class="checkinSection">
        <div class="checkinSectionTitle">
          <h3>หมายเหตุ</h3>
        </div>
        <label class="noteField">
          สรุปการเรียนวันนี้ / สิ่งที่ควรฝึกต่อ
          <textarea name="note" rows="4" placeholder="เช่น วันนี้เรียนเรื่องอะไร, นักเรียนมีปัญหาอะไร, สิ่งที่ควรฝึกต่อ"></textarea>
        </label>
      </section>

      <div class="checkinFooter">
        <button type="submit" ${hasActiveEnrollment ? "" : "disabled"}>บันทึก Check-in</button>
      </div>
    </form>
  `;

  bindTeacherCheckinForm();
}

function bindTeacherCheckinForm() {
  const form = checkinView.querySelector("[data-form='teacher-attendance']");
  const userSelect = form.querySelector('select[name="attendanceUserId"]');
  const enrollmentSelect = form.querySelector('select[name="enrollmentId"]');
  const usedInput = form.querySelector("[data-classes-used]");
  const refreshUsage = () => updateCheckinUsage(userSelect.value, enrollmentSelect.value);

  userSelect.onchange = () => {
    const options = enrollmentOptionsForStudent(userSelect.value);
    enrollmentSelect.innerHTML = options.map(([value, label], index) => `
      <option value="${escapeHtml(value)}" ${index === 0 ? "selected" : ""}>${escapeHtml(label)}</option>
    `).join("");
    refreshUsage();
  };
  enrollmentSelect.onchange = refreshUsage;
  usedInput.oninput = refreshUsage;
  refreshUsage();

  form.onsubmit = async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(form).entries());

    try {
      await teacherApi("/attendances", { method: "POST", body });
      showToast("บันทึก check-in เรียบร้อย");
      await loadTeacherDashboard();
    } catch (error) {
      showToast(error.message);
    }
  };
}

function updateCheckinUsage(userId, enrollmentId) {
  const enrollment = findEnrollment(enrollmentId);
  const course = enrollment?.course;
  const usedValue = checkinView.querySelector("[data-classes-used]")?.value || 0;
  const usage = checkinView.querySelector("[data-course-usage]");
  const summary = checkinView.querySelector("[data-checkin-summary]");

  if (usage) usage.innerHTML = courseUsagePanel(enrollment, course, usedValue);
  if (summary) summary.innerHTML = checkinSummary(enrollment, course, usedValue, userId);
  updatePreviousScores(enrollment);
}

function scoreInputs(latestAttendance) {
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
            ${scoreFields.filter(([, , , , fieldGroup]) => fieldGroup === group).map(([name, label, lowLabel, highLabel]) => scoreChoice(name, label, lowLabel, highLabel, latestAttendance?.[name])).join("")}
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function scoreChoice(name, label, lowLabel, highLabel, previousValue) {
  return `
    <fieldset class="scoreChoice">
      <legend>
        <span>${escapeHtml(label)}</span>
        <small>1 = ${escapeHtml(lowLabel)}, 5 = ${escapeHtml(highLabel)}</small>
      </legend>
      ${previousScoreBadge(previousValue)}
      <div class="scoreScale" role="radiogroup" aria-label="${escapeHtml(label)}">
        ${[1, 2, 3, 4, 5].map((score) => `
          <label class="scoreOption">
            <input type="radio" name="${escapeHtml(name)}" value="${score}" />
            <span>${score}</span>
          </label>
        `).join("")}
      </div>
      <div class="scoreHints"><span>${escapeHtml(lowLabel)}</span><span>${escapeHtml(highLabel)}</span></div>
    </fieldset>
  `;
}

function previousScoreBadge(previousValue) {
  if (!Number.isFinite(Number(previousValue))) return "";
  return `<div class="previousScoreBadge" aria-readonly="true">ครั้งล่าสุด ${formatNumber(previousValue)}/5</div>`;
}

function updatePreviousScores(enrollment) {
  const wrapper = checkinView.querySelector("[data-score-inputs]");
  if (!wrapper) return;
  wrapper.innerHTML = scoreInputs(latestAttendanceForEnrollment(enrollment));
}

function checkinSummary(enrollment, course, usedValue, selectedStudentId) {
  const used = Number(usedValue);
  const remaining = Number(enrollment?.remainingClasses);
  const after = Number.isFinite(remaining) ? Math.max(remaining - (Number.isFinite(used) ? used : 0), 0) : 0;
  const unit = courseUnit(course);
  const student = dashboardData?.students.find((item) => item.user.userId === selectedStudentId)?.user;

  return `
    <strong>${escapeHtml(student?.displayName ?? "-")}</strong>
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
      <strong>${escapeHtml(enrollment?.course?.name ?? enrollment?.courseId ?? "-")}</strong>
    </div>
    <div>
      <span>คงเหลือปัจจุบัน</span>
      <strong>${formatNumber(Number.isFinite(remaining) ? remaining : 0)} ${unit}</strong>
    </div>
    <div>
      <span>คงเหลือหลังบันทึก</span>
      <strong>${formatNumber(after)} ${unit}</strong>
    </div>
  `;
}

function teacherStudentOptions(dashboard) {
  return dashboard.students
    .filter((student) => student.enrollments.some((enrollment) => enrollment.status === "ACTIVE"))
    .map((student) => [student.user.userId, student.user.displayName]);
}

function enrollmentOptionsForStudent(userId) {
  const student = dashboardData?.students.find((item) => item.user.userId === userId);
  return (student?.enrollments ?? [])
    .filter((enrollment) => enrollment.status === "ACTIVE")
    .map((enrollment) => [
      enrollment.enrollmentId,
      `${enrollment.course?.name ?? enrollment.courseId} เหลือ ${formatNumber(enrollment.remainingClasses)} ${courseUnit(enrollment.course)}`
    ]);
}

function findEnrollment(enrollmentId) {
  return dashboardData?.students
    .flatMap((student) => student.enrollments)
    .find((enrollment) => enrollment.enrollmentId === enrollmentId);
}

function latestAttendanceForEnrollment(enrollment) {
  return (enrollment?.attendances ?? []).find((attendance) => {
    return scoreFields.some(([name]) => Number.isFinite(Number(attendance[name])));
  });
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

function courseUnit(course) {
  return course?.courseType === "HOUR" ? "ชม." : "ครั้ง";
}

function todayInputValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

async function teacherApi(path, options = {}) {
  const headers = {};

  if (options.auth !== false && token) {
    headers.authorization = `Bearer ${token}`;
  }

  if (options.body) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(`/api/teacher${path}`, {
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

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.add("hidden"), 3200);
}
