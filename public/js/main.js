import { api } from "./api.js";
import { clearSessionToken, getSessionToken, setSessionToken } from "./session.js";
import { renderStudentDashboard } from "./student-view.js";
import { showToast } from "./toast.js";

document.getElementById("logoutButton").addEventListener("click", () => {
  clearSessionToken();
  window.location.reload();
});

clearSessionFromQuery();

main().catch((error) => {
  document.getElementById("loadingView").textContent = "โหลดข้อมูลไม่สำเร็จ";
  showToast(error.message || "เกิดข้อผิดพลาด");
});

async function main() {
  const config = await api("/api/config", { auth: false });

  if (!getSessionToken()) {
    if (config.localDemoEnabled) {
      const { token } = await api("/api/auth/demo", { method: "POST", auth: false });
      setSessionToken(token);
    } else {
      await loginWithLiff(config.liffId);
    }
  }

  const dashboard = await api("/api/me/dashboard");
  // document.getElementById("logoutButton").classList.remove("hidden");
  renderStudentDashboard(dashboard);
}

async function loginWithLiff(liffId) {
  await liff.init({ liffId });

  if (!liff.isLoggedIn()) {
    liff.login();
    return;
  }

  const idToken = liff.getIDToken();
  const accessToken = liff.getAccessToken();

  if (!idToken && !accessToken) {
    throw new Error("ไม่พบ LINE token กรุณาตรวจ LIFF scope และลองเปิดใหม่อีกครั้ง");
  }

  const { token } = await api("/api/auth/liff", {
    method: "POST",
    auth: false,
    body: { idToken, accessToken }
  });

  setSessionToken(token);
}

function clearSessionFromQuery() {
  const url = new URL(window.location.href);
  if (url.searchParams.get("clear") !== "1") return;

  clearSessionToken();
  url.searchParams.delete("clear");
  window.location.replace(url.toString());
}
