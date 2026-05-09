import { api } from "./api.js";
import { setSessionToken, setTeacherSessionToken } from "./session.js";
import { showToast } from "./toast.js";

const status = document.getElementById("entryStatus");

main().catch((error) => {
  status.textContent = "เข้าสู่ระบบไม่สำเร็จ";
  showToast(error.message || "เกิดข้อผิดพลาด");
});

async function main() {
  if (localStorage.getItem("teacherSessionToken")) {
    window.location.replace("/teacher");
    return;
  }

  if (localStorage.getItem("studentSessionToken")) {
    window.location.replace("/student");
    return;
  }

  const config = await api("/api/config", { auth: false });

  if (config.localDemoEnabled) {
    const { token } = await api("/api/auth/demo", { method: "POST", auth: false });
    setSessionToken(token);
    window.location.replace("/student");
    return;
  }

  const auth = await loginWithLiff(config.liffId);
  window.location.replace(auth.redirectPath || "/student");
}

async function loginWithLiff(liffId) {
  await liff.init({ liffId });

  if (!liff.isLoggedIn()) {
    liff.login();
    return new Promise(() => {});
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