import { getDb } from "../client";
import { events } from "../schema";
import { eq, desc } from "drizzle-orm";
import { makeId, toIso } from "./helpers";

export interface RepositoryCalendarEvent {
  id: string;
  courseId: string | null;
  title: string;
  description: string | null;
  eventDate: string;
  createdAt: string;
}

export const calendarRepository = {
  async getEvents(): Promise<RepositoryCalendarEvent[]> {
    const db = getDb();
    const list = await db.query.events.findMany({
      orderBy: [desc(events.eventDate)],
    });

    return list.map((e) => ({
      id: e.id,
      courseId: e.courseId || null,
      title: e.title,
      description: e.description || null,
      eventDate: toIso(e.eventDate),
      createdAt: toIso(e.createdAt),
    }));
  },

  async createEvent(data: {
    courseId?: string | null;
    title: string;
    description?: string | null;
    eventDate: string;
  }): Promise<RepositoryCalendarEvent> {
    const id = makeId();
    const db = getDb();
    await db.insert(events).values({
      id,
      courseId: data.courseId || null,
      title: data.title || "",
      description: data.description || null,
      eventDate: new Date(data.eventDate),
    });
    return {
      id,
      courseId: data.courseId || null,
      title: data.title,
      description: data.description || null,
      eventDate: data.eventDate,
      createdAt: new Date().toISOString(),
    };
  },

  async deleteEvent(id: string): Promise<boolean> {
    const db = getDb();
    await db.delete(events).where(eq(events.id, id));
    return true;
  },
};
