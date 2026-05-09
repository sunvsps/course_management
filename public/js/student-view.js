import { escapeHtml, formatDate, formatDateTime, formatNumber } from "./format.js";

let selectedEnrollmentId = null;
let selectedStudentId = null;
let currentStudents = [];
let currentEnrollments = [];
let isCourseDetailOpen = false;
let isHistoryOpen = false;
let historyPage = 1;
const historyPageSize = 10;
const scoreFields = [
  ["hyperactiveScore", "Hyperactive"],
  ["distractionScore", "Distraction"],
  ["attentionSpanScore", "Attention span"],
  ["selfControlScore", "Self control"],
  ["selfEsteemScore", "Self esteem"],
  ["timeManagementScore", "Time management"],
  ["behaviorScore", "Behavior"]
];

export function renderStudentDashboard(dashboard) {
  document.getElementById("loadingView").classList.add("hidden");
  document.getElementById("studentView").classList.remove("hidden");

  currentStudents = normalizeStudents(dashboard);
  selectedStudentId = selectDefaultStudentId(dashboard, currentStudents);
  renderProfile();
  renderSelectedStudent();
}

function renderProfile() {
  const profile = document.getElementById("profile");

  if (currentStudents.length <= 1) {
    profile.classList.remove("studentListProfile");
    const user = currentStudents[0]?.user;
    const initial = escapeHtml(user?.displayName?.charAt(0) || "S");
    profile.innerHTML = `
      <div class="avatar">${initial}</div>
      <div>
        <div class="rowTitle">${escapeHtml(user?.displayName || "ผู้เรียน")}</div>
        ${studentAgeText(user) ? `<div class="muted">${escapeHtml(studentAgeText(user))}</div>` : ""}
      </div>
    `;
    return;
  }

  profile.classList.add("studentListProfile");
  profile.innerHTML = `
    <div class="studentOptions">
      ${currentStudents.map((student) => `
        <article class="studentOptionShell ${student.user.userId === selectedStudentId ? "selected" : ""}">
          <button class="studentOption ${student.user.userId === selectedStudentId ? "selected" : ""}" type="button" data-student-id="${escapeHtml(student.user.userId)}">
            <span class="avatar small">${escapeHtml(student.user.displayName.charAt(0) || "S")}</span>
            <span class="studentOptionName">
              <strong>${escapeHtml(student.user.displayName)}</strong>
              ${studentAgeText(student.user) ? `<span class="muted">${escapeHtml(studentAgeText(student.user))}</span>` : ""}
            </span>
          </button>
          ${student.user.userId === selectedStudentId ? `
            <div class="studentInlineContent">
              <h2>คอร์สของฉัน</h2>
              <div id="inlineBalanceCards" class="courseRail"></div>
              <section id="inlineCourseDetail" class="courseDetail hidden"></section>
              <div id="inlineAttendanceHistory"></div>
            </div>
          ` : ""}
        </article>
      `).join("")}
    </div>
  `;

  profile.querySelectorAll("[data-student-id]").forEach((button) => {
    button.onclick = () => {
      selectedStudentId = button.dataset.studentId;
      isCourseDetailOpen = false;
      isHistoryOpen = false;
      historyPage = 1;
      renderProfile();
      renderSelectedStudent();
    };
  });
}

function renderSelectedStudent() {
  const selectedStudent = currentStudents.find((student) => student.user.userId === selectedStudentId);
  updateGlobalCourseVisibility();

  if (!selectedStudent) {
    currentEnrollments = [];
    selectedEnrollmentId = null;
    const elements = getCourseElements();
    elements.balanceCards.innerHTML = empty("กรุณาเลือกนักเรียนเพื่อดูข้อมูลการเรียน");
    elements.courseDetail.classList.add("hidden");
    elements.attendanceHistory.innerHTML = "";
    return;
  }

  currentEnrollments = selectedStudent.enrollments;
  selectedEnrollmentId = selectDefaultEnrollmentId(currentEnrollments);
  renderBalanceCards(currentEnrollments);
  renderSelectedCourse();
}

function renderBalanceCards(enrollments) {
  const rail = getCourseElements().balanceCards;
  rail.innerHTML = enrollments.map((enrollment) => `
    <button class="courseCard ${enrollment.enrollmentId === selectedEnrollmentId ? "selected" : ""}" type="button" data-enrollment-id="${escapeHtml(enrollment.enrollmentId)}">
      <span class="courseCardTop">
        <strong>${escapeHtml(enrollment.course?.name || "-")}</strong>
        <span class="statusBadge ${statusClass(enrollment.status)}">${statusLabel(enrollment.status)}</span>
      </span>
      <span class="balance">${formatNumber(enrollment.remainingClasses)} ${courseUnit(enrollment.course)}</span>
      <p class="muted">จากทั้งหมด ${formatNumber(enrollment.purchasedClasses)} ${courseUnit(enrollment.course)}</p>
    </button>
  `).join("") || empty("ยังไม่มีคอร์ส");

  rail.onclick = handleCourseSelect;
  rail.querySelector(".courseCard.selected")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function handleCourseSelect(event) {
  const button = event.target.closest("[data-enrollment-id]");
  if (button) {
    selectedEnrollmentId = button.dataset.enrollmentId;
    isCourseDetailOpen = false;
    isHistoryOpen = false;
    historyPage = 1;
    renderBalanceCards(currentEnrollments);
    renderSelectedCourse();
  }
}

function renderSelectedCourse() {
  const enrollment = currentEnrollments.find((item) => item.enrollmentId === selectedEnrollmentId);
  const { courseDetail: detail, attendanceHistory } = getCourseElements();

  if (!enrollment) {
    detail.classList.add("hidden");
    attendanceHistory.innerHTML = empty("ยังไม่มีคอร์ส");
    return;
  }

  detail.classList.remove("hidden");
  detail.innerHTML = `
    <button class="courseDetailToggle" type="button" aria-expanded="${isCourseDetailOpen ? "true" : "false"}">
      <span>
        <span class="eyebrow">รายละเอียดคอร์ส</span>
        <strong>${escapeHtml(enrollment.course?.name || "-")}</strong>
      </span>
      <span class="toggleText">${isCourseDetailOpen ? "ซ่อน" : "ดูรายละเอียด"}</span>
    </button>
    ${isCourseDetailOpen ? `
      <p class="courseStatusText">${statusLabel(enrollment.status)}</p>
      <div class="detailStats">
        <div class="detailStat primary">
          <span class="detailLabel">เหลือ</span>
          <strong>${formatNumber(enrollment.remainingClasses)} ${courseUnit(enrollment.course)}</strong>
        </div>
        <div class="detailSecondaryStats">
          <div class="detailStat compact">
            <span class="detailLabel">ใช้แล้ว</span>
            <strong>${formatNumber(enrollment.purchasedClasses - enrollment.remainingClasses)} ${courseUnit(enrollment.course)}</strong>
          </div>
          <div class="detailStat compact">
            <span class="detailLabel">ทั้งหมด</span>
            <strong>${formatNumber(enrollment.purchasedClasses)} ${courseUnit(enrollment.course)}</strong>
          </div>
        </div>
      </div>
    ` : ""}
  `;

  detail.querySelector(".courseDetailToggle").onclick = () => {
    isCourseDetailOpen = !isCourseDetailOpen;
    renderSelectedCourse();
  };

  // renderNextLessons(enrollment);
  renderAttendanceHistory(enrollment);
}

function renderNextLessons(enrollment) {
  if (enrollment.lessons.length === 0) return;

  getCourseElements().courseDetail.insertAdjacentHTML("beforeend", `
    <div class="nextLesson">
      <div class="rowTitle">ตารางเรียนถัดไป</div>
      ${enrollment.lessons.map((lesson) => `
        <div class="muted">${formatDateTime(lesson.startsAt)} | ผู้สอน: ${escapeHtml(lesson.instructorName)}</div>
      `).join("")}
    </div>
  `);
}

function renderAttendanceHistory(enrollment) {
  const rows = enrollment.attendances
    .map((attendance) => ({ enrollment, attendance }))
    .sort((a, b) => new Date(b.attendance.checkedInAt).getTime() - new Date(a.attendance.checkedInAt).getTime());
  const history = getCourseElements().attendanceHistory;
  const totalPages = Math.max(1, Math.ceil(rows.length / historyPageSize));
  historyPage = Math.min(Math.max(historyPage, 1), totalPages);
  const start = (historyPage - 1) * historyPageSize;
  const pageRows = rows.slice(start, start + historyPageSize);

  history.innerHTML = `
    <section class="historyPanel">
      <button class="historyToggle" type="button" aria-expanded="${isHistoryOpen ? "true" : "false"}">
        <span>
          <span class="eyebrow">ประวัติ</span>
          <strong>ประวัติการเข้าเรียน</strong>
          <span class="muted">${formatNumber(rows.length)} รายการ</span>
        </span>
        <span class="toggleText">${isHistoryOpen ? "ซ่อน" : "ดูประวัติ"}</span>
      </button>
      ${isHistoryOpen ? rows.length === 0 ? empty("ยังไม่มีประวัติ") : `
        <div class="historyMeta">
          <span>แสดง ${formatNumber(start + 1)}-${formatNumber(Math.min(start + historyPageSize, rows.length))} จาก ${formatNumber(rows.length)} รายการ</span>
          <span>หน้า ${formatNumber(historyPage)} / ${formatNumber(totalPages)}</span>
        </div>
        <div class="historyList">
          ${pageRows.map(({ enrollment, attendance }, index) => {
            const lessonNumber = rows.length - (start + index);
            return `
              <article class="historyItem">
                <div class="historyItemTop">
                  <strong>ครั้งที่ ${formatNumber(lessonNumber)}</strong>
                  <span>${formatNumber(attendance.classesUsed)} ${courseUnit(enrollment.course)}</span>
                </div>
                ${scoreText(attendance) ? `
                  <div class="scoreLine">
                    <span>คะแนนให้ความร่วมมือ</span>
                    <strong>${scoreText(attendance)}</strong>
                  </div>
                ` : ""}
                <div class="historyDivider"></div>
                <div class="historyItemMeta">
                  <span>${formatDate(attendance.checkedInAt)}</span>
                  <span>คุณครู: ${escapeHtml(attendance.instructorName)}</span>
                </div>
              </article>
            `;
          }).join("")}
        </div>
        ${totalPages > 1 ? `
          <div class="pagination">
            <button class="secondary pageButton" type="button" data-page-action="prev" ${historyPage === 1 ? "disabled" : ""}>ก่อนหน้า</button>
            <button class="secondary pageButton" type="button" data-page-action="next" ${historyPage === totalPages ? "disabled" : ""}>ถัดไป</button>
          </div>
        ` : ""}
      ` : ""}
    </section>
  `;

  history.querySelector(".historyToggle").onclick = () => {
    isHistoryOpen = !isHistoryOpen;
    historyPage = 1;
    renderAttendanceHistory(enrollment);
  };

  history.querySelectorAll("[data-page-action]").forEach((button) => {
    button.onclick = () => {
      historyPage += button.dataset.pageAction === "next" ? 1 : -1;
      renderAttendanceHistory(enrollment);
    };
  });
}

function empty(text) {
  return `<article class="row muted">${escapeHtml(text)}</article>`;
}

function courseUnit(course) {
  return course?.courseType === "HOUR" ? "ชม." : "ครั้ง";
}

function getCourseElements() {
  if (currentStudents.length > 1) {
    return {
      balanceCards: document.getElementById("inlineBalanceCards"),
      courseDetail: document.getElementById("inlineCourseDetail"),
      attendanceHistory: document.getElementById("inlineAttendanceHistory")
    };
  }

  return {
    balanceCards: document.getElementById("balanceCards"),
    courseDetail: document.getElementById("courseDetail"),
    attendanceHistory: document.getElementById("attendanceHistory")
  };
}

function updateGlobalCourseVisibility() {
  const shouldHideGlobalCourse = currentStudents.length > 1;
  document.getElementById("courseSectionTitle").classList.toggle("hidden", shouldHideGlobalCourse);
  document.getElementById("balanceCards").classList.toggle("hidden", shouldHideGlobalCourse);
  document.getElementById("courseDetail").classList.toggle("hidden", shouldHideGlobalCourse);
  document.getElementById("attendanceHistory").classList.toggle("hidden", shouldHideGlobalCourse);
}

function selectDefaultEnrollmentId(enrollments) {
  return enrollments[0]?.enrollmentId ?? null;
}

function selectDefaultStudentId(dashboard, students) {
  if (students.length === 0) return null;
  const sessionUserId = dashboard.user?.userId;
  const sessionStudent = students.find((student) => student.user.userId === sessionUserId);
  return sessionStudent?.user.userId ?? students[0].user.userId;
}

function normalizeStudents(dashboard) {
  if (Array.isArray(dashboard.students) && dashboard.students.length > 0) {
    return dashboard.students.map((student) => ({
      user: student.user ?? student,
      enrollments: student.enrollments ?? []
    }));
  }

  return [{
    user: dashboard.user,
    enrollments: dashboard.enrollments ?? []
  }];
}

function studentAgeText(user) {
  if (!user) return "";
  if (!user.birthDate) return "";

  const age = calculateAge(user.birthDate);
  if (!age) return "";
  return `อายุ ${formatNumber(age.years)} ปี ${formatNumber(age.months)} เดือน`;
}

function scoreText(attendance) {
  const scores = scoreFields
    .map(([name, label]) => [label, Number(attendance[name])])
    .filter(([, score]) => Number.isFinite(score));

  if (scores.length > 0) {
    return scores.map(([label, score]) => `${label} ${formatNumber(score)}/5`).join(" | ");
  }

  if (!Number.isFinite(Number(attendance.score))) return "";
  return `ครูประเมิน ${formatNumber(attendance.score)}/5 คะแนน`;
}

function calculateAge(birthDate) {
  const birth = new Date(birthDate);
  if (!Number.isFinite(birth.getTime())) return null;

  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();

  if (today.getDate() < birth.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years: Math.max(years, 0), months: Math.max(months, 0) };
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

function statusClass(status) {
  return status === "ACTIVE" ? "active" : "inactive";
}
