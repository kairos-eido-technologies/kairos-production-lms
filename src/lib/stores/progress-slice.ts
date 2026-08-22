import { StateCreator } from "zustand";

export interface ProgressSlice {
  progress: Record<string, string[]>;
  markComplete: (studentId: string, courseId: string, contentItemId: string) => void;
  markItemComplete: (studentId: string, courseId: string, contentItemId: string) => void;
  unmarkComplete: (studentId: string, courseId: string, contentItemId: string) => void;
  unmarkItemComplete: (studentId: string, courseId: string, contentItemId: string) => void;
}

export const createProgressSlice: StateCreator<ProgressSlice, [], [], ProgressSlice> = (set) => ({
  progress: {},

  markComplete: (studentId, courseId, contentItemId) => {
    const key = `${studentId}:${courseId}`;
    set((s) => {
      const current = s.progress[key] || [];
      if (current.includes(contentItemId)) return s;
      return {
        progress: { ...s.progress, [key]: [...current, contentItemId] },
      };
    });
    fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, courseId, contentItemId }),
    }).catch((err) => console.error("Failed to mark progress:", err));
  },

  markItemComplete: (studentId, courseId, contentItemId) => {
    const key = `${studentId}:${courseId}`;
    set((s) => {
      const current = s.progress[key] || [];
      if (current.includes(contentItemId)) return s;
      return {
        progress: { ...s.progress, [key]: [...current, contentItemId] },
      };
    });
    fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, courseId, contentItemId }),
    }).catch((err) => console.error("Failed to mark progress:", err));
  },

  unmarkComplete: (studentId, courseId, contentItemId) => {
    const key = `${studentId}:${courseId}`;
    set((s) => {
      const current = s.progress[key] || [];
      return {
        progress: { ...s.progress, [key]: current.filter((id) => id !== contentItemId) },
      };
    });
    fetch(
      `/api/progress?studentId=${encodeURIComponent(studentId)}&courseId=${encodeURIComponent(
        courseId,
      )}&contentItemId=${encodeURIComponent(contentItemId)}`,
      { method: "DELETE" },
    ).catch((err) => console.error("Failed to unmark progress:", err));
  },

  unmarkItemComplete: (studentId, courseId, contentItemId) => {
    const key = `${studentId}:${courseId}`;
    set((s) => {
      const current = s.progress[key] || [];
      return {
        progress: { ...s.progress, [key]: current.filter((id) => id !== contentItemId) },
      };
    });
    fetch(
      `/api/progress?studentId=${encodeURIComponent(studentId)}&courseId=${encodeURIComponent(
        courseId,
      )}&contentItemId=${encodeURIComponent(contentItemId)}`,
      { method: "DELETE" },
    ).catch((err) => console.error("Failed to unmark progress:", err));
  },
});
