import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getRedirectUrl } from "@/lib/capacitor";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSupabaseReady: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  resendConfirmation: (email: string) => Promise<{ error?: string }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapAuthError(error: { message: string; status?: number }): string {
  const msg = error.message?.toLowerCase() || "";
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return "Ungültige Zugangsdaten. Bitte überprüfe E-Mail und Passwort.";
  }
  if (msg.includes("email not confirmed")) {
    return "Bitte bestätige zuerst deine E-Mail-Adresse.";
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "Diese E-Mail-Adresse ist bereits registriert.";
  }
  if (msg.includes("password") && msg.includes("at least")) {
    return "Das Passwort muss mindestens 6 Zeichen lang sein.";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Zu viele Anfragen. Bitte warte einen Moment.";
  }
  if (msg.includes("email") && msg.includes("invalid")) {
    return "Bitte gib eine gültige E-Mail-Adresse ein.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Netzwerkfehler. Bitte prüfe deine Internetverbindung.";
  }
  if (msg.includes("expired") || msg.includes("invalid token")) {
    return "Der Link ist abgelaufen. Bitte fordere einen neuen an.";
  }
  return "Ein Fehler ist aufgetreten. Bitte versuche es erneut.";
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    isSupabaseReady: isSupabaseConfigured,
  });

  useEffect(() => {
    if (!supabase) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        isLoading: false,
        isAuthenticated: !!session?.user,
        isSupabaseReady: true,
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        isLoading: false,
        isAuthenticated: !!session?.user,
        isSupabaseReady: true,
      });

      if (event === "TOKEN_REFRESHED" && !session) {
        import("sonner").then(({ toast }) => {
          toast.error("Sitzung abgelaufen. Bitte melde dich erneut an.");
        });
      }

      if (event === "SIGNED_OUT") {
        setState((s) => ({
          ...s,
          user: null,
          session: null,
          isAuthenticated: false,
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
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
      if (data.user && !data.session) {
        return { needsConfirmation: true };
      }
      return {};
    } catch {
      return { error: "Netzwerkfehler. Bitte prüfe deine Internetverbindung." };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: mapAuthError(error) };
      return {};
    } catch {
      return { error: "Netzwerkfehler. Bitte prüfe deine Internetverbindung." };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getRedirectUrl("#/passwort-reset"),
      });
      if (error) return { error: mapAuthError(error) };
      return {};
    } catch {
      return { error: "Netzwerkfehler. Bitte prüfe deine Internetverbindung." };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: mapAuthError(error) };
      return {};
    } catch {
      return { error: "Netzwerkfehler. Bitte prüfe deine Internetverbindung." };
    }
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      });
      if (error) return { error: mapAuthError(error) };
      return {};
    } catch {
      return { error: "Netzwerkfehler. Bitte prüfe deine Internetverbindung." };
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.refreshSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        resendConfirmation,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within SupabaseAuthProvider");
  return ctx;
}
