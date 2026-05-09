import { api } from "./api.js";
import { clearSessionToken, getSessionToken, setSessionToken, setTeacherSessionToken } from "./session.js";
import { renderStudentDashboard } from "./student-view.js";
import { showToast } from "./toast.js";

document.getElementById("logoutButton").addEventListener("click", () => {
  clearSessionToken();
  window.location.reload();
});

clearSessionFromQuery();

main().catch((error) => {
  document.getElementById("loadingView").textContent = "โหลดข้อมูลไม่สำเร็จ";
  console.error(error);
  showToast("รอคุณครูเอิร์ํธลิ้งค์กับระบบหลังบ้านนะครับ");
});

async function main() {
  const config = await api("/api/config", { auth: false });

  if (!getSessionToken()) {
    if (config.localDemoEnabled) {
      const { token } = await api("/api/auth/demo", { method: "POST", auth: false });
      setSessionToken(token);
    } else {
      const auth = await loginWithLiff(config.liffId);
      if (auth?.redirectPath && auth.redirectPath !== window.location.pathname) {
        window.location.replace(auth.redirectPath);
        return;
      }
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

  const auth = await api("/api/auth/liff", {
    method: "POST",
    auth: false,
    body: { idToken, accessToken }
  });

  if (auth.redirectPath === "/teacher") {
    setTeacherSessionToken(auth.token);
  } else {
    setSessionToken(auth.token);
  }

  return auth;
}

function clearSessionFromQuery() {
  const url = new URL(window.location.href);
  if (url.searchParams.get("clear") !== "1") return;

  clearSessionToken();
  url.searchParams.delete("clear");
  window.location.replace(url.toString());
}
