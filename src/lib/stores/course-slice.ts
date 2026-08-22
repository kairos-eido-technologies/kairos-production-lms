import { StateCreator } from "zustand";
import type { Course, Section, ContentItem } from "../types/store";

export interface CourseSlice {
  courses: Course[];
  addCourse: (
    c: Omit<Course, "id" | "sections" | "studentIds"> & { studentIds?: string[] },
  ) => void;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
  assignCourse: (
    studentId: string,
    courseId: string,
    accessMode: "lifetime" | "limited",
    endDate?: string,
  ) => Promise<void>;
  revokeCourse: (studentId: string, courseId: string) => Promise<void>;
  addSection: (courseId: string, title: string) => void;
  updateSection: (courseId: string, sectionId: string, title: string) => void;
  deleteSection: (courseId: string, sectionId: string) => void;
  addItem: (courseId: string, sectionId: string, item: Omit<ContentItem, "id">) => void;
  updateItem: (
    courseId: string,
    sectionId: string,
    itemId: string,
    patch: Partial<ContentItem>,
  ) => void;
  deleteItem: (courseId: string, sectionId: string, itemId: string) => void;
  reorderSections: (courseId: string, sections: Section[]) => void;
  reorderItems: (courseId: string, sectionId: string, items: ContentItem[]) => void;
}

export const createCourseSlice: StateCreator<CourseSlice, [], [], CourseSlice> = (set, get) => ({
  courses: [],

  addCourse: (c) => {
    fetch("/api/courses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(c),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.course) {
          set((s) => ({
            courses: [...s.courses.filter((x) => x.id !== data.course.id), data.course],
          }));
        }
      })
      .catch((err) => console.error("Failed to add course:", err));
  },

  updateCourse: (id, patch) => {
    set((s) => ({
      courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    fetch(`/api/courses/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.course) {
          set((s) => ({
            courses: s.courses.map((c) => (c.id === id ? { ...c, ...data.course } : c)),
          }));
        }
      })
      .catch((err) => console.error("Failed to update course:", err));
  },

  deleteCourse: (id) => {
    set((s) => ({ courses: s.courses.filter((c) => c.id !== id) }));
    fetch(`/api/courses/${id}`, { method: "DELETE" }).catch((err) =>
      console.error("Failed to delete course:", err),
    );
  },

  assignCourse: async (studentId, courseId, accessMode, endDate) => {
    const targetCourse = get().courses.find((c) => c.id === courseId);
    if (!targetCourse) return;

    const studentIds = Array.from(new Set([...(targetCourse.studentIds || []), studentId]));
    const studentAccess = {
      ...(targetCourse.studentAccess || {}),
      [studentId]: { accessMode, endDate },
    };

    get().updateCourse(courseId, { studentIds, studentAccess });
  },

  revokeCourse: async (studentId, courseId) => {
    const targetCourse = get().courses.find((c) => c.id === courseId);
    if (!targetCourse) return;

    const studentIds = (targetCourse.studentIds || []).filter((id) => id !== studentId);
    const studentAccess = { ...(targetCourse.studentAccess || {}) };
    delete studentAccess[studentId];

    get().updateCourse(courseId, { studentIds, studentAccess });
  },

  addSection: (courseId, title) => {
    fetch("/api/sections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ courseId, title }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.section) {
          set((s) => ({
            courses: s.courses.map((c) => {
              if (c.id !== courseId) return c;
              return {
                ...c,
                sections: [
                  ...c.sections,
                  { id: data.section.id, courseId, title: data.section.title, items: [] },
                ],
              };
            }),
          }));
        }
      })
      .catch((err) => console.error("Failed to add section:", err));
  },

  updateSection: (courseId, sectionId, title) => {
    set((s) => ({
      courses: s.courses.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          sections: c.sections.map((sec) => (sec.id === sectionId ? { ...sec, title } : sec)),
        };
      }),
    }));
    fetch(`/api/sections/${sectionId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    }).catch((err) => console.error("Failed to update section:", err));
  },

  deleteSection: (courseId, sectionId) => {
    set((s) => ({
      courses: s.courses.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          sections: c.sections.filter((sec) => sec.id !== sectionId),
        };
      }),
    }));
    fetch(`/api/sections/${sectionId}`, { method: "DELETE" }).catch((err) =>
      console.error("Failed to delete section:", err),
    );
  },

  addItem: (courseId, sectionId, item) => {
    fetch("/api/content-items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...item, sectionId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.item) {
          set((s) => ({
            courses: s.courses.map((c) => {
              if (c.id !== courseId) return c;
              return {
                ...c,
                sections: c.sections.map((sec) => {
                  if (sec.id !== sectionId) return sec;
                  return {
                    ...sec,
                    items: [...sec.items, data.item],
                  };
                }),
              };
            }),
          }));
        }
      })
      .catch((err) => console.error("Failed to add content item:", err));
  },

  updateItem: (courseId, sectionId, itemId, patch) => {
    set((s) => ({
      courses: s.courses.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          sections: c.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              items: sec.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
            };
          }),
        };
      }),
    }));
    fetch(`/api/content-items/${itemId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }).catch((err) => console.error("Failed to update content item:", err));
  },

  deleteItem: (courseId, sectionId, itemId) => {
    set((s) => ({
      courses: s.courses.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          sections: c.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              items: sec.items.filter((it) => it.id !== itemId),
            };
          }),
        };
      }),
    }));
    fetch(`/api/content-items/${itemId}`, { method: "DELETE" }).catch((err) =>
      console.error("Failed to delete content item:", err),
    );
  },

  reorderSections: (courseId, newSections) => {
    set((s) => ({
      courses: s.courses.map((c) => (c.id === courseId ? { ...c, sections: newSections } : c)),
    }));
  },

  reorderItems: (courseId, sectionId, newItems) => {
    set((s) => ({
      courses: s.courses.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          sections: c.sections.map((sec) =>
            sec.id === sectionId ? { ...sec, items: newItems } : sec,
          ),
        };
      }),
    }));
  },
});
