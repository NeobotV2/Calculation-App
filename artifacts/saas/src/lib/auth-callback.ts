import { supabase, isSupabaseConfigured } from "./supabase";

export async function handleAuthCallback(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const hash = window.location.hash;
  if (!hash) return;

  const tokenIndex = hash.indexOf("access_token=");
  if (tokenIndex === -1) return;

  const tokenPart = hash.substring(tokenIndex);
  const params = new URLSearchParams(tokenPart);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = params.get("type");

  if (!accessToken || !refreshToken) return;

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    console.error("Auth callback error:", error.message);
    window.location.hash = "#/login";
    return;
  }

  if (type === "recovery") {
    window.location.hash = "#/passwort-reset";
  } else {
    window.location.hash = "#/";
  }
}
