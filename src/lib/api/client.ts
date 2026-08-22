// API client for authentication and data fetching

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

interface AuthResponse {
  ok: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "teacher" | "student";
    status: "active" | "inactive";
    joinedAt: Date;
  };
  error?: string;
}

const API_BASE = "/api";

export interface SessionResponse {
  ok: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "teacher" | "student";
    status: "active" | "inactive";
    joinedAt: Date;
  };
  error?: string;
}

// Authentication APIs
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(credentials),
    credentials: "include",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Login failed");
  }
  return data;
}

export async function register(userData: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(userData),
    credentials: "include",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Registration failed");
  }
  return data;
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Logout failed");
  }
}

export async function getSession(): Promise<SessionResponse> {
  const token = typeof window !== "undefined" ? localStorage.getItem("itech-auth-token") : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}/auth/session`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  const data = await response.json();
  return data;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("itech-auth-token") : null;
  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}
