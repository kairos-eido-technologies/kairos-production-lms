import { StateCreator } from "zustand";
import type { CalendarEvent } from "../types/store";

export interface CalendarSlice {
  events: CalendarEvent[];
  addEvent: (
    courseId: string | null,
    title: string,
    description: string | null,
    eventDate: string,
  ) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export const createCalendarSlice: StateCreator<CalendarSlice, [], [], CalendarSlice> = (set) => ({
  events: [],

  addEvent: async (courseId, title, description, eventDate) => {
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId, title, description, eventDate }),
      });
      const data = await res.json();
      if (data.event) {
        set((s) => ({ events: [...s.events, data.event] }));
      }
    } catch (err) {
      console.error("Failed to add calendar event:", err);
    }
  },

  deleteEvent: async (id) => {
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    fetch(`/api/events/${id}`, { method: "DELETE" }).catch((err) =>
      console.error("Failed to delete calendar event:", err),
    );
  },
});
