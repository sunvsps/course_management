export function getSessionToken() {
  return localStorage.getItem("studentSessionToken");
}

export function setSessionToken(token) {
  localStorage.setItem("studentSessionToken", token);
}

export function setTeacherSessionToken(token) {
  localStorage.setItem("teacherSessionToken", token);
}

export function clearSessionToken() {
  localStorage.removeItem("studentSessionToken");
}
