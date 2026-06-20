import { escapeHtml, formatDate, formatNumber } from "./format.js";
import { api } from "./api.js";
import { showToast } from "./toast.js";

let selectedEnrollmentId = null;
let selectedStudentId = null;
let currentStudents = [];
let currentEnrollments = [];
let isCourseDetailOpen = false;
let isHistoryOpen = false;
let historyPage = 1;
let activePrePostAssessment = null;
const historyPageSize = 10;
const attendanceScoreFields = [
  ["hyperactiveScore", "อยู่ไม่นิ่ง"],
  ["distractionScore", "วอกแวกง่าย"],
  ["attentionSpanScore", "สมาธิในการเรียน"],
  ["selfControlScore", "ควบคุมตัวเอง"],
  ["selfEsteemScore", "ความมั่นใจ"],
  ["timeManagementScore", "จัดการเวลา"],
  ["behaviorScore", "พฤติกรรมโดยรวม"]
];
const prePostAssessmentScoreFields = [
  ["continuousActivityScore", "การนั่งทำกิจกรรมต่อเนื่อง", "ต้องช่วยมาก", "ทำได้ดี", "🧘", "นั่งต่อเนื่อง"],
  ["listeningInstructionScore", "การฟังและทำตามคำสั่ง", "ต้องช่วยมาก", "ทำได้ดี", "👂", "ฟังคำสั่ง"],
  ["emotionalControlScore", "การควบคุมอารมณ์เมื่อไม่พอใจ", "ต้องช่วยมาก", "ทำได้ดี", "🧠", "คุมอารมณ์"],
  ["waitingSelfControlScore", "การรอคอยและควบคุมตนเอง", "ต้องช่วยมาก", "ทำได้ดี", "⏳", "รอคอย"],
  ["concentrationScore", "สมาธิและการจดจ่อ", "ต้องช่วยมาก", "ทำได้ดี", "🎯", "สมาธิ"],
  ["physicalBalanceScore", "การใช้ร่างกายและการทรงตัว", "ต้องช่วยมาก", "ทำได้ดี", "💪", "ทรงตัว"],
  ["planningProblemSolvingScore", "การวางแผนและแก้ปัญหา", "ต้องช่วยมาก", "ทำได้ดี", "🧩", "แก้ปัญหา"],
  ["socialInteractionScore", "การเข้าสังคมและเล่นร่วมกับผู้อื่น", "ต้องช่วยมาก", "ทำได้ดี", "🤝", "เข้าสังคม"],
  ["confidenceNewExperienceScore", "ความมั่นใจและการลองทำสิ่งใหม่", "ต้องช่วยมาก", "ทำได้ดี", "🚀", "มั่นใจ"],
  ["activityCooperationScore", "ความร่วมมือในการทำกิจกรรม", "ต้องช่วยมาก", "ทำได้ดี", "🔥", "ร่วมมือ"]
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
  renderPrePostAssessmentCourse();
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
      <p class="muted">ใช้แล้ว ${formatNumber(enrollment.purchasedClasses - enrollment.remainingClasses)} จากทั้งหมด ${formatNumber(enrollment.purchasedClasses)} ${courseUnit(enrollment.course)}</p>
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
    renderPrePostAssessmentCourse();
  }
}

function renderPrePostAssessmentCourse() {
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
        <span class="eyebrow">การประเมินพัฒนาการ</span>
        <strong>${escapeHtml(enrollment.course?.name || "-")}</strong>
      </span>
      <span class="toggleText">${isCourseDetailOpen ? "ซ่อน" : "ดูรายละเอียด"}</span>
    </button>
    ${isCourseDetailOpen ? `
      <div class="assessmentActions">
        ${prePostAssessmentButton(enrollment, "PRE")}
        ${prePostAssessmentButton(enrollment, "POST")}
      </div>
      ${prePostAssessmentChart(enrollment)}
    ` : ""}
  `;

  detail.querySelector(".courseDetailToggle").onclick = () => {
    isCourseDetailOpen = !isCourseDetailOpen;
    renderPrePostAssessmentCourse();
  };
  detail.querySelectorAll("[data-assessment-type]").forEach((button) => {
    button.onclick = () => openPrePostAssessmentPanel(enrollment, button.dataset.assessmentType);
  });

  renderAttendanceHistory(enrollment);
  renderPrePostAssessmentPanel();
}

function prePostAssessmentButton(enrollment, assessmentType) {
  const role = currentPrePostAssessmentRole();
  const submitted = hasPrePostAssessment(enrollment, assessmentType, role);
  const postLocked = assessmentType === "POST" && !isPostPrePostAssessmentAvailable(enrollment);
  const disabled = submitted || postLocked;
  const label = assessmentType === "PRE" ? "Pre assessment" : "Post assessment";
  const helper = submitted
    ? "ส่งแบบประเมินแล้ว"
    : postLocked
      ? "เปิดเมื่อถึงครั้งสุดท้ายของคอร์ส"
      : assessmentType === "PRE"
        ? "ประเมินตั้งแต่เริ่มคอร์ส"
        : "ประเมินท้ายคอร์ส";

  return `
    <button class="assessmentButton ${assessmentType.toLowerCase()}" type="button" data-assessment-type="${assessmentType}" ${disabled ? "disabled" : ""}>
      <span>${label}</span>
      <small>${helper}</small>
    </button>
  `;
}

function openPrePostAssessmentPanel(enrollment, assessmentType) {
  activePrePostAssessment = {
    enrollmentId: enrollment.enrollmentId,
    assessmentType
  };
  renderPrePostAssessmentPanel();
}

function closePrePostAssessmentPanel() {
  activePrePostAssessment = null;
  renderPrePostAssessmentPanel();
}

function renderPrePostAssessmentPanel() {
  document.querySelector(".assessmentOverlay")?.remove();
  if (!activePrePostAssessment) return;

  const enrollment = currentEnrollments.find((item) => item.enrollmentId === activePrePostAssessment.enrollmentId);
  if (!enrollment) return;

  document.body.insertAdjacentHTML("beforeend", `
    <div class="assessmentOverlay" role="dialog" aria-modal="true" aria-label="แบบประเมิน">
      <form class="assessmentPanel" data-assessment-form>
        <div class="assessmentPanelHeader">
          <div>
            <p class="eyebrow">${activePrePostAssessment.assessmentType === "PRE" ? "Pre assessment" : "Post assessment"}</p>
            <h2>${escapeHtml(enrollment.course?.name || "-")}</h2>
          </div>
          <button class="secondary assessmentCloseButton" type="button" data-assessment-close>ปิด</button>
        </div>
        <div class="assessmentScoreGrid">
          ${prePostAssessmentScoreFields.map(([name, label, lowLabel, highLabel]) => prePostAssessmentScoreChoice(name, label, lowLabel, highLabel)).join("")}
        </div>
        <label class="assessmentNote">
          หมายเหตุ
          <textarea name="note" rows="3" placeholder="เขียนข้อสังเกตเพิ่มเติม"></textarea>
        </label>
        <div class="assessmentSubmitRow">
          <button class="secondary" type="button" data-assessment-close>ยกเลิก</button>
          <button type="submit">Submit</button>
        </div>
      </form>
    </div>
  `);

  document.querySelectorAll("[data-assessment-close]").forEach((button) => {
    button.onclick = closePrePostAssessmentPanel;
  });
  document.querySelector("[data-assessment-form]").onsubmit = (event) => submitPrePostAssessment(event, enrollment);
}

function prePostAssessmentScoreChoice(name, label, lowLabel, highLabel) {
  return `
    <fieldset class="assessmentScoreChoice">
      <legend>
        <span>${escapeHtml(label)}</span>
        <small>0 = ${escapeHtml(lowLabel)}, 5 = ${escapeHtml(highLabel)}</small>
      </legend>
      <div class="scoreScale compact" role="radiogroup" aria-label="${escapeHtml(label)}">
        ${[0, 1, 2, 3, 4, 5].map((score) => `
          <label class="scoreOption">
            <input type="radio" name="${escapeHtml(name)}" value="${score}" required />
            <span>${score}</span>
          </label>
        `).join("")}
      </div>
    </fieldset>
  `;
}

async function submitPrePostAssessment(event, enrollment) {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());
  body.enrollmentId = enrollment.enrollmentId;
  body.assessmentType = activePrePostAssessment.assessmentType;

  try {
    const { prePostAssessment } = await postPrePostAssessment(body);
    enrollment.prePostAssessments = [prePostAssessment, ...(enrollment.prePostAssessments || [])];
    closePrePostAssessmentPanel();
    showToast("ส่งแบบประเมินเรียบร้อย");
    renderPrePostAssessmentCourse();
  } catch (error) {
    showToast(error.message);
  }
}

async function postPrePostAssessment(body) {
  if (currentPrePostAssessmentRole() === "INSTRUCTOR") {
    const token = localStorage.getItem("teacherSessionToken");
    const response = await fetch("/api/teacher/pre-post-assessments", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  return api("/api/me/pre-post-assessments", { method: "POST", body });
}

function prePostAssessmentChart(enrollment) {
  const prePostAssessments = enrollment.prePostAssessments || [];
  const combinedPre = combinedPrePostAssessment(prePostAssessments, "PRE");
  const combinedPost = combinedPrePostAssessment(prePostAssessments, "POST");
  const series = [
    ["PRE", "Pre เฉลี่ย", "#2f80c0", combinedPre],
    ["POST", "Post เฉลี่ย", "#1f9d62", combinedPost]
  ].map(([type, label, color, prePostAssessment]) => ({
    type,
    label,
    color,
    prePostAssessment
  })).filter((item) => item.prePostAssessment);
  const comparisonItems = prePostAssessmentScoreFields.map(([name, label, , , emoji, shortLabel], index) => {
    const preScore = scoreValue(combinedPre?.[name]);
    const postScore = scoreValue(combinedPost?.[name]);
    const change = Number.isFinite(preScore) && Number.isFinite(postScore) ? postScore - preScore : undefined;
    return {
      name,
      label,
      emoji,
      shortLabel,
      index: index + 1,
      preScore,
      postScore,
      change,
      preParentScore: scoreValue(combinedPre?.sources.parent?.[name]),
      preTeacherScore: scoreValue(combinedPre?.sources.instructor?.[name]),
      postParentScore: scoreValue(combinedPost?.sources.parent?.[name]),
      postTeacherScore: scoreValue(combinedPost?.sources.instructor?.[name])
    };
  });
  const bestGrowth = comparisonItems
    .filter((item) => Number.isFinite(item.change))
    .sort((a, b) => b.change - a.change)[0];
  const preTotal = totalScore(combinedPre);
  const postTotal = totalScore(combinedPost);

  if (series.length === 0) {
    return `
      <section class="assessmentChartPanel">
        <div class="assessmentChartHeader">
          <strong>ผลประเมิน Pre & Post</strong>
          <span class="muted">ยังไม่มีข้อมูลประเมิน</span>
        </div>
      </section>
    `;
  }

  const width = 720;
  const height = 230;
  const padding = { top: 22, right: 18, bottom: 38, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xFor = (index) => padding.left + (plotWidth / (prePostAssessmentScoreFields.length - 1)) * index;
  const yFor = (score) => padding.top + plotHeight - (Math.max(0, Math.min(5, score)) / 5) * plotHeight;

  return `
    <section class="assessmentChartPanel">
      <div class="assessmentChartHeader">
        <div>
          <strong>ผลประเมิน Pre & Post</strong>
          <span class="muted">คะแนนเฉลี่ยกลางจากผู้ปกครองและคุณครู เพื่อลด bias</span>
        </div>
        <div class="assessmentLegend">
          ${series.map((item) => `
            <span><i style="background:${item.color};"></i>${escapeHtml(item.label)}</span>
          `).join("")}
        </div>
      </div>
      <div class="assessmentSummaryGrid">
        ${assessmentSummaryCard("💪", "Pre รวม", totalScoreText(preTotal), interpretationLabel(preTotal), interpretationDescription(preTotal))}
        ${assessmentSummaryCard("🚀", "Post รวม", totalScoreText(postTotal), interpretationLabel(postTotal), interpretationDescription(postTotal))}
        ${assessmentSummaryCard("🔥", "พัฒนาเด่น", Number.isFinite(bestGrowth?.change) ? formatSignedScore(bestGrowth.change) : "-", bestGrowth ? `${bestGrowth.emoji} ${bestGrowth.shortLabel}` : "ยังไม่มีข้อมูลเทียบ", "เทียบจากคะแนนเฉลี่ยรายทักษะ")}
      </div>
      <div class="assessmentChartScroller">
        <svg class="assessmentChart" viewBox="0 0 ${width} ${height}" role="img" aria-label="กราฟผลประเมิน pre และ post">
          ${[0, 1, 2, 3, 4, 5].map((score) => `
            <line x1="${padding.left}" y1="${yFor(score)}" x2="${width - padding.right}" y2="${yFor(score)}" class="chartGridLine" />
            <text x="14" y="${yFor(score) + 4}" class="chartAxisText">${score}</text>
          `).join("")}
          ${prePostAssessmentScoreFields.map(([, , , , emoji], index) => `
            <text x="${xFor(index)}" y="${height - 18}" class="chartAxisText chartXAxisText">${index + 1}</text>
            <text x="${xFor(index)}" y="${height - 3}" class="chartEmojiText">${emoji}</text>
          `).join("")}
          ${series.map((item) => {
            const points = prePostAssessmentScoreFields
              .map(([name], index) => {
                const score = scoreValue(item.prePostAssessment[name]);
                return Number.isFinite(score) ? { name, index, score, x: xFor(index), y: yFor(score) } : undefined;
              })
              .filter(Boolean);
            if (points.length === 0) return "";
            return `
              <polyline points="${points.map(({ x, y }) => `${x},${y}`).join(" ")}" fill="none" stroke="${item.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
              ${points.map(({ name, index, score, x, y }) => {
                const [, fieldLabel, , , emoji] = prePostAssessmentScoreFields[index];
                return `
                  <circle class="assessmentPoint" cx="${x}" cy="${y}" r="5" fill="${item.color}" tabindex="0">
                    <title>${escapeHtml(`${emoji} ${fieldLabel} | ${item.label}: ${formatNumber(score)}/5 | ผู้ปกครอง ${scoreTextValue(scoreValue(item.prePostAssessment.sources.parent?.[name]))} | ครู ${scoreTextValue(scoreValue(item.prePostAssessment.sources.instructor?.[name]))}`)}</title>
                  </circle>
                `;
              }).join("")}
            `;
          }).join("")}
        </svg>
      </div>
      <div class="assessmentCompareGrid">
        ${comparisonItems.map((item) => assessmentCompareCard(item)).join("")}
      </div>
    </section>
  `;
}

function assessmentSummaryCard(emoji, title, valueText, resultText, helper) {
  return `
    <article class="assessmentSummaryCard">
      <span>${emoji}</span>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <b>${escapeHtml(valueText)}</b>
        <em>${escapeHtml(resultText)}</em>
        <small>${escapeHtml(helper)}</small>
      </div>
    </article>
  `;
}

function assessmentCompareCard(item) {
  const preWidth = scorePercent(item.preScore);
  const postWidth = scorePercent(item.postScore);
  const changeText = Number.isFinite(item.change) ? formatSignedScore(item.change) : "-";
  const tone = scoreChangeTone(item.change);
  const tooltip = [
    `${item.index}. ${item.emoji} ${item.label}`,
    `Pre เฉลี่ย: ${scoreTextValue(item.preScore)} (ผู้ปกครอง ${scoreTextValue(item.preParentScore)}, ครู ${scoreTextValue(item.preTeacherScore)})`,
    `Post เฉลี่ย: ${scoreTextValue(item.postScore)} (ผู้ปกครอง ${scoreTextValue(item.postParentScore)}, ครู ${scoreTextValue(item.postTeacherScore)})`,
    `เปลี่ยนแปลง: ${changeText}`
  ].join(" | ");

  return `
    <article class="assessmentCompareCard ${tone}" tabindex="0" title="${escapeHtml(tooltip)}">
      <div class="assessmentCompareTop">
        <span class="metricBadge">${item.index}</span>
        <span class="metricEmoji">${item.emoji}</span>
        <strong>${escapeHtml(item.shortLabel)}</strong>
        <b>${escapeHtml(changeText)}</b>
      </div>
      <div class="assessmentBarRows">
        <div class="assessmentBarRow">
          <span>Pre</span>
          <div class="assessmentTrack"><i class="pre" style="width:${preWidth}%"></i></div>
          <b>${escapeHtml(scoreTextValue(item.preScore))}</b>
        </div>
        <div class="assessmentBarRow">
          <span>Post</span>
          <div class="assessmentTrack"><i class="post" style="width:${postWidth}%"></i></div>
          <b>${escapeHtml(scoreTextValue(item.postScore))}</b>
        </div>
      </div>
      <div class="assessmentSourceRows" aria-label="รายละเอียดคะแนนผู้ประเมิน">
        <div>
          <span>ผู้ปกครอง</span>
          <b>Pre ${escapeHtml(scoreTextValue(item.preParentScore))}</b>
          <b>Post ${escapeHtml(scoreTextValue(item.postParentScore))}</b>
        </div>
        <div>
          <span>คุณครู</span>
          <b>Pre ${escapeHtml(scoreTextValue(item.preTeacherScore))}</b>
          <b>Post ${escapeHtml(scoreTextValue(item.postTeacherScore))}</b>
        </div>
      </div>
    </article>
  `;
}

function combinedPrePostAssessment(prePostAssessments, assessmentType) {
  const parent = latestPrePostAssessment(prePostAssessments, assessmentType, "PARENT");
  const instructor = latestPrePostAssessment(prePostAssessments, assessmentType, "INSTRUCTOR");
  if (!parent && !instructor) return undefined;

  const combined = {
    assessmentType,
    sources: { parent, instructor }
  };

  prePostAssessmentScoreFields.forEach(([name]) => {
    combined[name] = averageValues([parent?.[name], instructor?.[name]]);
  });

  return combined;
}

function averageValues(values) {
  const scores = values.map(scoreValue).filter(Number.isFinite);
  if (scores.length === 0) return undefined;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function totalScore(prePostAssessment) {
  const scores = prePostAssessmentScoreFields
    .map(([name]) => scoreValue(prePostAssessment?.[name]))
    .filter(Number.isFinite);

  if (scores.length === 0) return undefined;
  return scores.reduce((sum, score) => sum + score, 0);
}

function totalScoreText(score) {
  return Number.isFinite(score) ? `${formatNumber(score)}/50` : "-";
}

function interpretationLabel(score) {
  if (!Number.isFinite(score)) return "ยังไม่มีผลแปลคะแนน";
  if (score <= 10) return "ต้องได้รับการช่วยเหลือเพิ่มเติม";
  if (score <= 20) return "ควรได้รับการส่งเสริมอย่างต่อเนื่อง";
  if (score <= 30) return "อยู่ในระหว่างการพัฒนา";
  if (score <= 40) return "อยู่ในระดับดี";
  return "อยู่ในระดับดีมาก";
}

function interpretationDescription(score) {
  if (!Number.isFinite(score)) return "ยังไม่มีข้อมูลเพียงพอสำหรับการแปลผล";
  if (score <= 10) return "ยังต้องได้รับการดูแล ช่วยเหลือ และฝึกฝนอย่างใกล้ชิดในหลายด้าน";
  if (score <= 20) return "มีบางด้านที่ควรได้รับการดูแลและติดตามพัฒนาการอย่างสม่ำเสมอ";
  if (score <= 30) return "เริ่มมีพัฒนาการที่ดีขึ้น แต่ยังควรฝึกฝนและส่งเสริมอย่างต่อเนื่อง";
  if (score <= 40) return "สามารถทำได้ดีในหลายด้าน และอาจต้องส่งเสริมเพิ่มเติมในบางเรื่อง";
  return "มีพัฒนาการเหมาะสมตามวัย และสามารถทำกิจกรรมต่าง ๆ ได้ดี";
}

function scoreValue(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score : undefined;
}

function scorePercent(score) {
  return Number.isFinite(score) ? Math.max(0, Math.min(100, (score / 5) * 100)) : 0;
}

function scoreTextValue(score) {
  return Number.isFinite(score) ? `${formatNumber(score)}/5` : "-";
}

function formatSignedScore(score) {
  if (!Number.isFinite(score)) return "-";
  if (score > 0) return `+${formatNumber(score)}`;
  return formatNumber(score);
}

function scoreChangeTone(score) {
  if (!Number.isFinite(score) || score === 0) return "steady";
  return score > 0 ? "up" : "down";
}

function latestPrePostAssessment(prePostAssessments, assessmentType, raterRole) {
  return prePostAssessments
    .filter((prePostAssessment) => prePostAssessment.assessmentType === assessmentType && prePostAssessment.raterRole === raterRole)
    .sort((a, b) => prePostAssessmentTimestamp(b) - prePostAssessmentTimestamp(a))[0];
}

function prePostAssessmentTimestamp(prePostAssessment) {
  const value = new Date(prePostAssessment.updatedAt || prePostAssessment.createdAt || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

function hasPrePostAssessment(enrollment, assessmentType, raterRole) {
  return Boolean((enrollment.prePostAssessments || []).find((prePostAssessment) => {
    return prePostAssessment.assessmentType === assessmentType && prePostAssessment.raterRole === raterRole;
  }));
}

function isPostPrePostAssessmentAvailable(enrollment) {
  return enrollment.status === "COMPLETED" || Number(enrollment.remainingClasses) <= 1;
}

function currentPrePostAssessmentRole() {
  return window.location.pathname.startsWith("/teacher") ? "INSTRUCTOR" : "PARENT";
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
            const attendanceNumber = rows.length - (start + index);
            return `
              <article class="historyItem">
                <div class="historyItemTop">
                  <strong>ครั้งที่ ${formatNumber(attendanceNumber)}</strong>
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
  const scores = attendanceScoreFields
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
