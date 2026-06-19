import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getRedirectUrl } from "@/lib/capacitor";

export { isSupabaseConfigured };

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: mapAuthError(error) };
    return {};
  } catch {
    return { error: "Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung." };
  }
}

export async function signUp(email: string, password: string, name: string): Promise<{ error?: string; needsConfirmation?: boolean }> {
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: getRedirectUrl(),
      },
    });
    if (error) return { error: mapAuthError(error) };
    if (data.user && !data.session) return { needsConfirmation: true };
    return {};
  } catch {
    return { error: "Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung." };
  }
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function resetPassword(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl("#/passwort-reset"),
    });
    if (error) return { error: mapAuthError(error) };
    return {};
  } catch {
    return { error: "Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung." };
  }
}

export async function updatePassword(newPassword: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: mapAuthError(error) };
    return {};
  } catch {
    return { error: "Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung." };
  }
}

export async function resendConfirmation(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: getRedirectUrl() },
    });
    if (error) return { error: mapAuthError(error) };
    return {};
  } catch {
    return { error: "Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung." };
  }
}

export async function refreshSession(): Promise<{ expired: boolean }> {
  if (!supabase) return { expired: false };
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) return { expired: true };
  return { expired: false };
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

function mapAuthError(error: { message: string; status?: number }): string {
  const msg = error.message?.toLowerCase() || "";
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return "Ungültige Zugangsdaten. Bitte überprüfen Sie E-Mail und Passwort.";
  }
  if (msg.includes("email not confirmed")) {
    return "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.";
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "Diese E-Mail-Adresse ist bereits registriert.";
  }
  if (msg.includes("password") && msg.includes("at least")) {
    return "Das Passwort muss mindestens 6 Zeichen lang sein.";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Zu viele Anfragen. Bitte warten Sie einen Moment.";
  }
  if (msg.includes("email") && msg.includes("invalid")) {
    return "Bitte geben Sie eine gültige E-Mail-Adresse ein.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.";
  }
  if (msg.includes("expired") || msg.includes("invalid token")) {
    return "Der Link ist abgelaufen. Bitte fordern Sie einen neuen an.";
  }
  return "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.";
}
