import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Bell, Info, Clock } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { useAuth } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/student/calendar")({ component: StudentCalendar });

function StudentCalendar() {
  const { user } = useAuth();
  const { events, courses } = useData();

  const myEnrolledCourses = useMemo(() => {
    if (!user) return [];
    return courses.filter((c) => c.studentIds.includes(user.id));
  }, [courses, user]);

  const myCourseIds = useMemo(() => new Set(myEnrolledCourses.map((c) => c.id)), [myEnrolledCourses]);

  // Combine custom events + course deadlines for enrolled courses
  const allCalEvents = useMemo(() => {
    const list: Array<{ id: string; title: string; description: string; date: Date; type: "event" | "deadline"; courseName: string }> = [];

    // Custom events
    events.forEach((e) => {
      if (!e.courseId || myCourseIds.has(e.courseId)) {
        const course = courses.find((c) => c.id === e.courseId);
        list.push({
          id: e.id,
          title: e.title,
          description: e.description || "No description.",
          date: new Date(e.eventDate),
          type: "event",
          courseName: course ? course.name : "All Courses",
        });
      }
    });

    // Course end deadlines
    myEnrolledCourses.forEach((c) => {
      if (c.endDate) {
        list.push({
          id: `deadline-${c.id}`,
          title: `Course End: ${c.name}`,
          description: `Access to course content ends on this day.`,
          date: new Date(c.endDate),
          type: "deadline",
          courseName: c.name,
        });
      }
    });

    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, myEnrolledCourses, myCourseIds, courses]);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Days calculations
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = [];
    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      days.push({ day: d, isCurrentMonth: false, date: new Date(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, d) });
    }
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    // Next month padding
    const totalSlots = 42; // 6 rows of 7 days
    const nextMonthDaysNeeded = totalSlots - days.length;
    for (let i = 1; i <= nextMonthDaysNeeded; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, i) });
    }
    return days;
  }, [year, month, firstDayIndex, totalDays, prevMonthTotalDays]);

  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [eventsPage, setEventsPage] = useState(1);

  // Fast O(1) lookup map for events by date string
  const eventsByDayMap = useMemo(() => {
    const map = new Map<string, typeof allCalEvents>();
    allCalEvents.forEach((e) => {
      const key = `${e.date.getFullYear()}-${e.date.getMonth()}-${e.date.getDate()}`;
      const list = map.get(key) || [];
      list.push(e);
      map.set(key, list);
    });
    return map;
  }, [allCalEvents]);

  const getEventsForDay = (d: Date) => {
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return eventsByDayMap.get(key) || [];
  };

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return getEventsForDay(selectedDate);
  }, [selectedDate, eventsByDayMap]);

  const EVENTS_PER_PAGE = 5;
  const totalEventPages = Math.max(1, Math.ceil(selectedDateEvents.length / EVENTS_PER_PAGE));
  const currentEventPage = Math.min(eventsPage, totalEventPages);

  const paginatedDateEvents = useMemo(() => {
    const start = (currentEventPage - 1) * EVENTS_PER_PAGE;
    return selectedDateEvents.slice(start, start + EVENTS_PER_PAGE);
  }, [selectedDateEvents, currentEventPage]);

  const handleSelectDate = (d: Date) => {
    setSelectedDate(d);
    setEventsPage(1);
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const isSelected = (d: Date) => {
    return selectedDate && d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
  };

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const jumpToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
    setEventsPage(1);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Schedule"
        subtitle="Stay updated with course end dates, assessments, and study sessions."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Calendar visual */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-foreground">
              {monthNames[month]} {year}
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={jumpToToday} className="h-8 text-xs">
                Today
              </Button>
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
                  onClick={() => handleSelectDate(date)}
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
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              Schedule for {selectedDate ? selectedDate.toLocaleDateString(undefined, { dateStyle: "long" }) : "Selected Date"}
            </h3>

            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-xs text-muted-foreground">No events or deadlines for this day.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedDateEvents.map((de) => (
                  <div
                    key={de.id}
                    className={`p-4 rounded-xl border flex flex-col gap-2 ${
                      de.type === "deadline" ? "border-destructive/30 bg-destructive/5" : "border-border bg-secondary/15"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
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

                {/* Event list pagination */}
                {totalEventPages > 1 && (
                  <div className="flex items-center justify-between pt-2 text-xs border-t border-border/40">
                    <span className="text-muted-foreground">
                      {currentEventPage} / {totalEventPages}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={currentEventPage <= 1}
                        onClick={() => setEventsPage((p) => Math.max(1, p - 1))}
                        className="h-7 w-7"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={currentEventPage >= totalEventPages}
                        onClick={() => setEventsPage((p) => Math.min(totalEventPages, p + 1))}
                        className="h-7 w-7"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
