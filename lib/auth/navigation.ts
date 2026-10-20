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

export function googleSignInRequest(origin: string, destination: string) {
  return {
    provider: "google" as const,
    options: {
      redirectTo: authCallbackUrl(origin, destination),
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

// Use the configured public origin behind Vercel's production proxy. Local and
// preview sessions stay on their request origin. Provider errors are untrusted.
export async function authCallbackDestination(
  requestUrl: string,
  exchangeCode: (code: string) => Promise<{ error: unknown }>,
  productionOrigin?: string,
) {
  const { searchParams } = new URL(requestUrl);
  const { origin } = new URL(productionOrigin || requestUrl);
  const next = safeRedirect(searchParams.get("next"), "/profile");
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
