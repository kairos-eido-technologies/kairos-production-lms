import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Calendar, Plus, Clock, Trash2, CalendarPlus } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { useAuth } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/calendar")({ component: AdminCalendar });

function AdminCalendar() {
  const { user } = useAuth();
  const { events, courses, addEvent, deleteEvent } = useData();

  // Combined events globally for admin
  const allCalEvents = useMemo(() => {
    const list: Array<{ id: string; title: string; description: string; date: Date; type: "event" | "deadline"; courseName: string; courseId?: string }> = [];

    // Custom events
    events.forEach((e) => {
      const course = e.courseId ? courses.find((c) => c.id === e.courseId) : null;
      list.push({
        id: e.id,
        title: e.title,
        description: e.description || "No description.",
        date: new Date(e.eventDate),
        type: "event",
        courseName: course ? course.name : "Global Event",
        courseId: e.courseId || undefined,
      });
    });

    // Course end deadlines
    courses.forEach((c) => {
      if (c.endDate) {
        list.push({
          id: `deadline-${c.id}`,
          title: `Course End: ${c.name}`,
          description: `Scheduled end date for the course.`,
          date: new Date(c.endDate),
          type: "deadline",
          courseName: c.name,
          courseId: c.id,
        });
      }
    });

    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, courses]);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      days.push({ day: d, isCurrentMonth: false, date: new Date(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, d) });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    const totalSlots = 42;
    const nextMonthDaysNeeded = totalSlots - days.length;
    for (let i = 1; i <= nextMonthDaysNeeded; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, i) });
    }
    return days;
  }, [year, month, firstDayIndex, totalDays, prevMonthTotalDays]);

  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return allCalEvents.filter(
      (e) =>
        e.date.getDate() === selectedDate.getDate() &&
        e.date.getMonth() === selectedDate.getMonth() &&
        e.date.getFullYear() === selectedDate.getFullYear()
    );
  }, [selectedDate, allCalEvents]);

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const isSelected = (d: Date) => {
    return selectedDate && d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
  };

  const getEventsForDay = (d: Date) => {
    return allCalEvents.filter(
      (e) =>
        e.date.getDate() === d.getDate() &&
        e.date.getMonth() === d.getMonth() &&
        e.date.getFullYear() === d.getFullYear()
    );
  };

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  // Event Creation State
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetCourseId, setTargetCourseId] = useState("");
  const [eventTime, setEventTime] = useState("10:00");

  const openCreateDialog = () => {
    setTitle("");
    setDescription("");
    setTargetCourseId(courses[0]?.id || "");
    setCreating(true);
  };

  const handleSaveEvent = async () => {
    if (!title.trim() || !selectedDate || !targetCourseId) {
      toast.error("Title and Course are required.");
      return;
    }
    const [hours, minutes] = eventTime.split(":").map(Number);
    const eventDate = new Date(selectedDate);
    eventDate.setHours(hours, minutes, 0, 0);

    await addEvent(targetCourseId, title.trim(), description.trim() || null, eventDate.toISOString());
    toast.success("Event created successfully");
    setCreating(false);
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteEvent(id);
    toast.success("Event deleted");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Calendar Manager"
        subtitle="Manage global timetables and custom schedule events."
        actions={
          courses.length > 0 && (
            <Button onClick={openCreateDialog} className="gradient-primary text-primary-foreground border-0 glow">
              <CalendarPlus className="mr-2 h-4 w-4" />Create Event
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Calendar visual */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-foreground">
              {monthNames[month]} {year}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-2">
            {daysOfWeek.map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ day, isCurrentMonth, date }, idx) => {
              const dayEvents = getEventsForDay(date);
              const active = isSelected(date);
              const today = isToday(date);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className={`min-h-[72px] p-2 flex flex-col items-start justify-between rounded-xl border transition text-left cursor-pointer select-none bg-transparent ${
                    active
                      ? "border-primary/50 bg-primary/10"
                      : isCurrentMonth
                      ? "border-border/40 hover:border-border-hover hover:bg-secondary/20"
                      : "border-transparent text-muted-foreground/40 opacity-40 hover:border-border/20"
                  }`}
                >
                  <span className={`text-xs font-semibold rounded-md h-5 min-w-5 flex items-center justify-center ${
                    today ? "bg-primary text-primary-foreground font-bold" : ""
                  }`}>
                    {day}
                  </span>
                  
                  <div className="w-full flex flex-wrap gap-1 mt-1.5">
                    {dayEvents.map((de, di) => (
                      <span
                        key={di}
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          de.type === "deadline" ? "bg-destructive animate-pulse" : "bg-primary"
                        }`}
                        title={de.title}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Selected date events */}
        <div className="space-y-4">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Events on {selectedDate ? selectedDate.toLocaleDateString(undefined, { dateStyle: "long" }) : "Selected Date"}
              </h3>
              {courses.length > 0 && (
                <Button size="sm" variant="ghost" onClick={openCreateDialog} className="h-7 text-xs text-primary px-2">
                  + Add
                </Button>
              )}
            </div>

            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-xs text-muted-foreground">No events or deadlines for this day.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((de) => (
                  <div
                    key={de.id}
                    className={`p-4 rounded-xl border flex flex-col gap-2 relative group ${
                      de.type === "deadline" ? "border-destructive/30 bg-destructive/5" : "border-border bg-secondary/15"
                    }`}
                  >
                    {de.type === "event" && (
                      <button
                        onClick={() => handleDeleteEvent(de.id)}
                        className="absolute top-3 right-3 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition cursor-pointer bg-transparent border-0 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    <div className="flex items-start justify-between gap-6">
                      <span className="text-sm font-bold text-foreground leading-tight">{de.title}</span>
                      <Badge variant={de.type === "deadline" ? "destructive" : "default"} className="text-[9px] px-1.5 uppercase shrink-0">
                        {de.type}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">{de.courseName}</span>
                    <p className="text-xs text-muted-foreground leading-normal">{de.description}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
                      <Clock className="h-3.5 w-3.5" />
                      {de.date.toLocaleTimeString(undefined, { timeStyle: "short" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Creation Dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Schedule an event for any course on {selectedDate ? selectedDate.toLocaleDateString() : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Course</Label>
              <Select value={targetCourseId} onValueChange={setTargetCourseId}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Event Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Guest Lecture" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide agenda or live links..." />
            </div>
            <div className="space-y-1">
              <Label>Time</Label>
              <Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={handleSaveEvent} className="gradient-primary text-primary-foreground border-0">Save Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
