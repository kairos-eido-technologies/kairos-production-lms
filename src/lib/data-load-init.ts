import { useData, normalizeCertificateList } from "./data-store";

const cacheTimestamps: Record<string, number> = {};
const CACHE_TTL_MS = 60 * 1000; // 60 seconds cache TTL per endpoint
let isRefreshing = false;

const ALL_ENDPOINTS: Record<string, string> = {
  courses: "/api/courses",
  users: "/api/users",
  certificates: "/api/certificates",
  assessments: "/api/assessments",
  submissions: "/api/submissions",
  progress: "/api/progress",
  notifications: "/api/notifications",
  messages: "/api/messages",
  events: "/api/events",
  announcements: "/api/announcements",
  discussions: "/api/discussions",
  discussionReplies: "/api/discussion-replies",
  videoCheckpoints: "/api/video-checkpoints",
  checkpointProgress: "/api/checkpoint-progress",
};

export async function refreshData(force = false, requestedKeys?: string[]) {
  if (typeof window === "undefined") return;

  const now = Date.now();
  if (!force && isRefreshing) {
    return;
  }
  isRefreshing = true;

  const token = localStorage.getItem("itech-auth-token");
  const isAuth = !!(token || document.cookie.includes("auth_token="));

  // Only fetch protected endpoints if authenticated; anonymous visitors only load courses
  const keysToFetch = (requestedKeys || (isAuth ? Object.keys(ALL_ENDPOINTS) : ["courses"])).filter(
    (key) => {
      if (force) return true;
      const lastFetched = cacheTimestamps[key] || 0;
      return now - lastFetched > CACHE_TTL_MS;
    },
  );

  if (keysToFetch.length === 0) {
    isRefreshing = false;
    return;
  }

  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  try {
    await Promise.all(
      keysToFetch.map(async (key) => {
        const url = ALL_ENDPOINTS[key];
        if (!url) return;
        try {
          const res = await fetch(url, { headers: authHeaders, credentials: "include" });
          if (res.ok) {
            const json = await res.json();
            cacheTimestamps[key] = Date.now();
            if (json[key] !== undefined) {
              if (key === "certificates") {
                const incoming = normalizeCertificateList(json.certificates || []);
                const incomingIds = new Set(incoming.map((c) => c.id));
                useData.setState((s) => {
                  const localOnly = s.certificates.filter((c) => !incomingIds.has(c.id));
                  return { certificates: [...localOnly, ...incoming] };
                });
              } else {
                useData.setState({ [key]: json[key] });
              }
            }
          }
        } catch (err) {
          console.error(`Failed to load ${key} from ${url}`, err);
        }
      }),
    );

    // Separately load extra attempts for authenticated users if assessments requested or stale
    if (isAuth && (force || keysToFetch.includes("assessments"))) {
      try {
        const res = await fetch("/api/extra-attempts", { headers: authHeaders, credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          if (json.extraAttempts && typeof json.extraAttempts === "object") {
            useData.getState().loadExtraAttempts(json.extraAttempts);
          }
        }
      } catch (err) {
        console.error("Failed to load extra attempts", err);
      }
    }
  } finally {
    isRefreshing = false;
  }
}

// Run initially on import
if (typeof window !== "undefined") {
  refreshData();
}

