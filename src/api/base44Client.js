import { createClient, getAccessToken } from "@base44/sdk";

const APP_ID = "6a62f603c1dbaee5c93a8b96";
/** API + OAuth host. loginWithProvider uses `${appBaseUrl}/api/apps/auth/login`. */
const API = "https://base44.app";
/**
 * Base44-hosted site. Auth redirects (Google from_url) must land on a
 * Base44-recognized domain — free plan can't attach custom/Vercel hosts.
 */
export const APP_HOST = "https://countersign-c93a8b96.base44.app";

const token = typeof window !== "undefined" ? getAccessToken() : null;

export const base44 = createClient({
  appId: APP_ID,
  serverUrl: API,
  appBaseUrl: API,
  token: token || undefined,
  requiresAuth: false,
});

export function isExternalHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return !(host.endsWith(".base44.app") || host === "localhost" || host === "127.0.0.1");
}

/**
 * App-user Google OAuth (not platform /login).
 * Always return to APP_HOST when the SPA is on Vercel/custom DNS —
 * Base44 rejects unrecognized from_url domains ("Domain is not valid").
 */
export function goGoogleLogin() {
  const back = isExternalHost() ? `${APP_HOST}/` : `${window.location.origin}/`;
  base44.auth.loginWithProvider("google", back);
}

export function goAuthHost() {
  window.location.href = `${APP_HOST}/`;
}
