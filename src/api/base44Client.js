import { createClient, getAccessToken } from "@base44/sdk";

const APP_ID = "6a62f603c1dbaee5c93a8b96";
const API = "https://base44.app";

const token = typeof window !== "undefined" ? getAccessToken() : null;

export const base44 = createClient({
  appId: APP_ID,
  serverUrl: API,
  appBaseUrl: API,
  token: token || undefined,
  requiresAuth: false,
});

export function goGoogleLogin() {
  base44.auth.loginWithProvider("google", `${window.location.origin}/`);
}
