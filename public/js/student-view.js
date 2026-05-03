import { escapeHtml, formatDate, formatDateTime, formatNumber, formatTime } from "./format.js";

export function renderStudentDashboard(dashboard) {
  document.getElementById("loadingView").classList.add("hidden");
  document.getElementById("studentView").classList.remove("hidden");

  renderProfile(dashboard.user);
  renderBalanceCards(dashboard.enrollments);
  // renderNextLessons(dashboard.enrollments);
  renderAttendanceHistory(dashboard.enrollments);
}

function renderProfile(user) {
  const initial = escapeHtml(user.displayName.charAt(0) || "S");
  document.getElementById("profile").innerHTML = `
    <div class="avatar">${initial}</div>
    <div>
      <div class="rowTitle">${escapeHtml(user.displayName)}</div>
      <div class="muted">ข้อมูลจาก Google Sheet</div>
    </div>
  `;
}

function renderBalanceCards(enrollments) {
  document.getElementById("balanceCards").innerHTML = enrollments.map((enrollment) => `
    <article class="card">
      <strong>${escapeHtml(enrollment.course?.name || "-")}</strong>
      <div class="balance">${formatNumber(enrollment.remainingClasses)} ครั้ง</div>
      <p class="muted">จากทั้งหมด ${formatNumber(enrollment.purchasedClasses)} ครั้ง</p>
    </article>
  `).join("") || empty("ยังไม่มีคอร์ส");
}

function renderNextLessons(enrollments) {
  const lessons = enrollments.flatMap((enrollment) =>
    enrollment.lessons.map((lesson) => ({ enrollment, lesson }))
  );

  document.getElementById("nextLessons").innerHTML = lessons.map(({ enrollment, lesson }) => `
    <article class="row">
      <div class="rowTitle">${escapeHtml(enrollment.course?.name || "-")}</div>
      <div>${formatDateTime(lesson.startsAt)}</div>
      <div class="muted">ผู้สอน: ${escapeHtml(lesson.instructorName)}</div>
    </article>
  `).join("") || empty("ยังไม่มีตารางเรียน");
}

function renderAttendanceHistory(enrollments) {
  const rows = enrollments.flatMap((enrollment) =>
    enrollment.attendances.map((attendance) => ({ enrollment, attendance }))
  );

  if (rows.length === 0) {
    document.getElementById("attendanceHistory").innerHTML = empty("ยังไม่มีประวัติ");
    return;
  }

  document.getElementById("attendanceHistory").innerHTML = `
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
              <td data-label="จำนวน" class="numeric">${formatNumber(attendance.classesUsed)} ครั้ง</td>
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
