import { getSessionToken } from "./session.js";

export async function api(path, options = {}) {
  const headers = { "content-type": "application/json" };
  const token = getSessionToken();

  if (options.auth !== false && token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
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
