import { config } from "./config.js";

type LineVerifyResponse = {
  sub: string;
  aud: string;
  name?: string;
  picture?: string;
};

export async function verifyLineIdToken(idToken: string) {
  if (!config.LINE_LOGIN_CHANNEL_ID) {
    throw new Error("LINE_LOGIN_CHANNEL_ID is not configured");
  }

  const body = new URLSearchParams({
    id_token: idToken,
    client_id: config.LINE_LOGIN_CHANNEL_ID
  });

  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error("LINE ID token verification failed");
  }

  const payload = (await response.json()) as LineVerifyResponse;
  if (payload.aud !== config.LINE_LOGIN_CHANNEL_ID) {
    throw new Error("LINE ID token audience mismatch");
  }

  return {
    lineUserId: payload.sub,
    displayName: payload.name ?? "LINE User",
    pictureUrl: payload.picture
  };
}
