import { escapeHtml, formatDate, formatDateTime, formatNumber, formatTime } from "./format.js";

let selectedEnrollmentId = null;
let currentEnrollments = [];
let isCourseDetailOpen = false;

export function renderStudentDashboard(dashboard) {
  document.getElementById("loadingView").classList.add("hidden");
  document.getElementById("studentView").classList.remove("hidden");

  currentEnrollments = dashboard.enrollments;
  selectedEnrollmentId = selectDefaultEnrollmentId(currentEnrollments);
  renderProfile(dashboard.user);
  renderBalanceCards(dashboard.enrollments);
  renderSelectedCourse();
}

function renderProfile(user) {
  const initial = escapeHtml(user.displayName.charAt(0) || "S");
  document.getElementById("profile").innerHTML = `
    <div class="avatar">${initial}</div>
    <div>
      <div class="rowTitle">${escapeHtml(user.displayName)}</div>
    </div>
  `;
}

function renderBalanceCards(enrollments) {
  const rail = document.getElementById("balanceCards");
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
    renderBalanceCards(currentEnrollments);
    renderSelectedCourse();
  }
}

function renderSelectedCourse() {
  const enrollment = currentEnrollments.find((item) => item.enrollmentId === selectedEnrollmentId);
  const detail = document.getElementById("courseDetail");

  if (!enrollment) {
    detail.classList.add("hidden");
    document.getElementById("attendanceHistory").innerHTML = empty("ยังไม่มีคอร์ส");
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

  document.getElementById("courseDetail").insertAdjacentHTML("beforeend", `
    <div class="nextLesson">
      <div class="rowTitle">ตารางเรียนถัดไป</div>
      ${enrollment.lessons.map((lesson) => `
        <div class="muted">${formatDateTime(lesson.startsAt)} | ผู้สอน: ${escapeHtml(lesson.instructorName)}</div>
      `).join("")}
    </div>
  `);
}

function renderAttendanceHistory(enrollment) {
  const rows = enrollment.attendances.map((attendance) => ({ enrollment, attendance }));

  if (rows.length === 0) {
    document.getElementById("attendanceHistory").innerHTML = `
      <h2 class="sectionLabel">ประวัติการเข้าเรียน</h2>
      ${empty("ยังไม่มีประวัติ")}
    `;
    return;
  }

  document.getElementById("attendanceHistory").innerHTML = `
    <h2 class="sectionLabel">ประวัติการเข้าเรียน</h2>
    <div class="tableWrap">
      <table class="dataTable">
        <thead>
          <tr>
            <th>วันที่</th>
            <th>เวลา</th>
            <th>คอร์ส</th>
            <th>ผู้สอน</th>
            <th class="numeric">จำนวน</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(({ enrollment, attendance }) => `
            <tr>
              <td data-label="วันที่">${formatDate(attendance.checkedInAt)}</td>
              <td data-label="เวลา">${formatTime(attendance.checkedInAt)}</td>
              <td data-label="คอร์ส">${escapeHtml(enrollment.course?.name || "-")}</td>
              <td data-label="ผู้สอน">${escapeHtml(attendance.instructorName)}</td>
              <td data-label="จำนวน" class="numeric">${formatNumber(attendance.classesUsed)} ${courseUnit(enrollment.course)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function empty(text) {
  return `<article class="row muted">${escapeHtml(text)}</article>`;
}

function courseUnit(course) {
  return course?.courseType === "HOUR" ? "ชม." : "ครั้ง";
}

function selectDefaultEnrollmentId(enrollments) {
  return enrollments[0]?.enrollmentId ?? null;
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
