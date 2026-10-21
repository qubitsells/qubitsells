import { safeRedirect } from "../security/validation";

export function signInDestination(params: URLSearchParams) {
  const invite = (params.get("code") || "").slice(0, 100);
  return invite
    ? `/couple-space/profile?code=${encodeURIComponent(invite)}`
    : safeRedirect(params.get("redirect"), "/profile");
}

export function authCallbackUrl(origin: string, destination: string) {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", safeRedirect(destination, "/profile"));
  return callback.toString();
}

// Keep Google's callback stable for Supabase's exact redirect allowlist. The
// short-lived cookie carries the selected product/query through the round trip.
export const AUTH_RETURN_COOKIE = "qubitsells_auth_return";
export function authReturnDestination(value: string | undefined) {
  if (!value || value.length > 4096) return null;
  try {
    return safeRedirect(value.startsWith("/") ? value : decodeURIComponent(value), "") || null;
  } catch { return null; }
}

export function authReturnCookie(destination: string, secure: boolean, clear = false) {
  return `${AUTH_RETURN_COOKIE}=${clear ? "" : encodeURIComponent(safeRedirect(destination, "/profile"))}; Path=/; Max-Age=${clear ? 0 : 600}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function authRequestOrigin(request: Request, vercel = false) {
  const target = new URL(request.url);
  const host = request.headers.get("host") || target.host;
  const protocol = vercel ? request.headers.get("x-forwarded-proto") === "http" ? "http:" : "https:" : target.protocol;
  if (!/[\\/\s,@?#]/.test(host)) {
    try { return new URL(`${protocol}//${host}`).origin; } catch { /* Fall back to the request origin. */ }
  }
  return target.origin;
}

export function googleSignInRequest(origin: string) {
  return {
    provider: "google" as const,
    options: {
      redirectTo: new URL("/auth/callback", origin).toString(),
      queryParams: { prompt: "select_account" },
      skipBrowserRedirect: true,
    },
  };
}

export function authErrorMessage(code: string | null) {
  if (!code) return null;
  if (code === "auth_cancelled") return "Google sign-in was cancelled. Choose an account to continue, or use your email.";
  return "We couldn’t complete your sign-in. Please start again using the same browser and try once more.";
}

// Provider errors and both sources of return destinations are untrusted.
export async function authCallbackDestination(
  requestUrl: string,
  exchangeCode: (code: string) => Promise<{ error: unknown }>,
  productionOrigin?: string,
  storedDestination?: string,
) {
  const { searchParams } = new URL(requestUrl);
  const { origin } = new URL(productionOrigin || requestUrl);
  const next = safeRedirect(searchParams.get("next"), authReturnDestination(storedDestination) || "/profile");
  const providerError = searchParams.get("error");
  const code = searchParams.get("code");
  if (!providerError && code) {
    try {
      const { error } = await exchangeCode(code);
      if (!error) return new URL(next, origin);
    } catch {
      // Network failures and expired PKCE codes should return to sign-in too.
    }
  }
  const login = new URL("/login", origin);
  login.searchParams.set("error", providerError === "access_denied" ? "auth_cancelled" : "auth_failed");
  login.searchParams.set("redirect", next);
  return login;
}
