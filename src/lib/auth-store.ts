import { create } from "zustand";
import type { User, Role } from "./mock-data";
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getSession,
} from "./api/client";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true; role: Role } | { ok: false; error: string }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  initializeSession: () => Promise<void>;
  setUser: (u: User) => void;
  verifyEmail: (code: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  resendCode: () => Promise<{ ok: true; code?: string } | { ok: false; error: string }>;
  forgotPassword: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  resetPassword: (data: {
    email: string;
    code: string;
    newPassword: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}

function getInitialUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("itech-auth-user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.email) return parsed;
    }
  } catch (e) {}
  return null;
}

const initialUser = getInitialUser();

export const useAuth = create<AuthState>()((set, get) => ({
  user: initialUser,
  isLoading: false,
  isInitialized: !!initialUser,
  error: null,

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiLogin({ email, password });

      if (response.ok) {
        const u = response.user as unknown as User;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("itech-auth-user", JSON.stringify(u));
            if (response.token) {
              localStorage.setItem("itech-auth-token", response.token);
            }
          } catch (e) {}
        }
        set({
          user: u,
          isLoading: false,
          isInitialized: true,
        });
        // Immediately sync data from the server with authenticated credentials
        try {
          const { refreshData } = await import("./data-load-init");
          refreshData(true);
        } catch (e) {}
        return { ok: true, role: response.user.role as Role };
      }

      throw new Error(response.error || "Login failed");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Login failed";
      set({ error: errorMsg, isLoading: false, isInitialized: true });
      return { ok: false, error: errorMsg };
    }
  },

  register: async ({ name, email, password, phone }) => {
    try {
      set({ isLoading: true, error: null });

      if (!name.trim()) {
        throw new Error("Name is required.");
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error("Enter a valid email.");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      const response = await apiRegister({ name, email, password, phone });

      if (response.ok) {
        const u = response.user as unknown as User;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("itech-auth-user", JSON.stringify(u));
            if (response.token) {
              localStorage.setItem("itech-auth-token", response.token);
            }
          } catch (e) {}
        }
        set({
          user: u,
          isLoading: false,
          isInitialized: true,
        });
        try {
          const { refreshData } = await import("./data-load-init");
          refreshData(true);
        } catch (e) {}
        return { ok: true };
      }

      throw new Error(response.error || "Registration failed");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Registration failed";
      set({ error: errorMsg, isLoading: false, isInitialized: true });
      return { ok: false, error: errorMsg };
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("itech-auth-user");
          localStorage.removeItem("itech-auth-token");
        } catch (e) {}
      }
      await apiLogout();
      set({ user: null, isLoading: false, isInitialized: true });
    } catch (err) {
      console.error("Logout error:", err);
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("itech-auth-user");
          localStorage.removeItem("itech-auth-token");
        } catch (e) {}
      }
      set({ user: null, isLoading: false, isInitialized: true });
    }
  },

  initializeSession: async () => {
    try {
      set({ isLoading: true, error: null });
      const session = await getSession();
      if (session.ok && session.user) {
        const u = session.user as unknown as User;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("itech-auth-user", JSON.stringify(u));
          } catch (e) {}
        }
        set({ user: u, isLoading: false, isInitialized: true });
      } else {
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("itech-auth-user");
          } catch (e) {}
        }
        set({ user: null, isLoading: false, isInitialized: true });
      }
    } catch (err) {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("itech-auth-user");
        } catch (e) {}
      }
      set({ user: null, isLoading: false, isInitialized: true });
    }
  },

  setUser: (u) => {
    if (typeof window !== "undefined") {
      try {
        if (u) localStorage.setItem("itech-auth-user", JSON.stringify(u));
        else localStorage.removeItem("itech-auth-user");
      } catch (e) {}
    }
    set({ user: u, isInitialized: true });
  },

  verifyEmail: async (code) => {
    try {
      const currentUser = get().user;
      const resp = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, email: currentUser?.email }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        const currentUser = get().user;
        const updatedUser = data.user
          ? (data.user as User)
          : currentUser
            ? { ...currentUser, isEmailVerified: true }
            : null;
        set({ user: updatedUser, isLoading: false });
        return { ok: true };
      }
      throw new Error(data.error || "Verification failed");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Verification failed";
      set({ error: errorMsg, isLoading: false });
      return { ok: false, error: errorMsg };
    }
  },

  resendCode: async () => {
    try {
      set({ isLoading: true, error: null });
      const resp = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        set({ isLoading: false });
        return { ok: true };
      }
      throw new Error(data.error || "Resend failed");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Resend failed";
      set({ error: errorMsg, isLoading: false });
      return { ok: false, error: errorMsg };
    }
  },

  forgotPassword: async (email) => {
    try {
      set({ isLoading: true, error: null });
      const resp = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        set({ isLoading: false });
        return { ok: true };
      }
      throw new Error(data.error || "Failed to send reset code");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send reset code";
      set({ error: errorMsg, isLoading: false });
      return { ok: false, error: errorMsg };
    }
  },

  resetPassword: async ({ email, code, newPassword }) => {
    try {
      set({ isLoading: true, error: null });
      const resp = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        set({ isLoading: false });
        return { ok: true };
      }
      throw new Error(data.error || "Failed to reset password");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to reset password";
      set({ error: errorMsg, isLoading: false });
      return { ok: false, error: errorMsg };
    }
  },
}));
