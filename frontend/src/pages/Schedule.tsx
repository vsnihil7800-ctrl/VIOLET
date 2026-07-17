import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bell,
  X
} from "lucide-react";

interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  color: string;
}

interface Reminder {
  id: string;
  user_id: string;
  title: string;
  time: string;
  is_sent: boolean;
  created_at: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const Schedule: React.FC = () => {
  const queryClient = useQueryClient();

  // Calendar dates navigation
  const today = new Date();
  const [navYear, setNavYear] = useState(today.getFullYear());
  const [navMonth, setNavMonth] = useState(today.getMonth()); // 0-indexed

  // Modals & inputs state
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // New Event Form State
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventColor, setEventColor] = useState("indigo");
  const [isEventSaving, setIsEventSaving] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  // New Reminder Form State
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [isRemSaving, setIsRemSaving] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);

  // ----------------- API QUERIES -----------------

  // 1. Fetch Events
  const { data: events, isLoading: isEventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["scheduleEvents"],
    queryFn: async () => {
      const res = await api.get("/schedule/events");
      return res.data;
    },
  });

  // 2. Fetch Reminders
  const { data: reminders, isLoading: isRemindersLoading } = useQuery<Reminder[]>({
    queryKey: ["scheduleReminders"],
    queryFn: async () => {
      const res = await api.get("/schedule/reminders");
      return res.data;
    },
  });

  // ----------------- MUTATIONS -----------------

  // Create Event
  const createEventMutation = useMutation({
    mutationFn: (payload: any) => api.post("/schedule/events", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
      setIsEventOpen(false);
      setEventTitle("");
      setEventDesc("");
      setEventError(null);
      setIsEventSaving(false);
    },
    onError: (err: any) => {
      setEventError(err.response?.data?.detail || "Failed to schedule event.");
      setIsEventSaving(false);
    }
  });

  // Update Event
  const updateEventMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api.put(`/schedule/events/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
      setIsEventOpen(false);
      setEditingEventId(null);
      setEventTitle("");
      setEventDesc("");
      setEventError(null);
      setIsEventSaving(false);
    },
    onError: (err: any) => {
      setEventError(err.response?.data?.detail || "Failed to update event.");
      setIsEventSaving(false);
    }
  });

  // Delete Event
  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/schedule/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
    },
  });

  // Create Reminder
  const createReminderMutation = useMutation({
    mutationFn: (payload: any) => api.post("/schedule/reminders", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleReminders"] });
      setReminderTitle("");
      setReminderTime("");
      setIsRemSaving(false);
    },
  });

  // Update Reminder
  const updateReminderMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api.put(`/schedule/reminders/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleReminders"] });
      setReminderTitle("");
      setReminderTime("");
      setEditingReminderId(null);
      setIsRemSaving(false);
    },
  });

  // Delete Reminder
  const deleteReminderMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/schedule/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleReminders"] });
    },
  });

  // ----------------- ACTION HANDLERS -----------------

  const handlePrevMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear(navYear - 1);
    } else {
      setNavMonth(navMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear(navYear + 1);
    } else {
      setNavMonth(navMonth + 1);
    }
  };

  const handleDayClick = (dayNum: number) => {
    // Pre-fill Event DateTime Picker: "YYYY-MM-DDT09:00"
    const startStr = `${navYear}-${String(navMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}T09:00`;
    const endStr = `${navYear}-${String(navMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}T10:00`;
    setEditingEventId(null);
    setEventTitle("");
    setEventDesc("");
    setEventColor("indigo");
    setEventStart(startStr);
    setEventEnd(endStr);
    setEventError(null);
    setIsEventOpen(true);
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    if (new Date(eventEnd) <= new Date(eventStart)) {
      setEventError("End time must fall chronologically after start time.");
      return;
    }
    setIsEventSaving(true);
    const payload = {
      title: eventTitle.trim(),
      description: eventDesc.trim() || null,
      start_time: new Date(eventStart).toISOString(),
      end_time: new Date(eventEnd).toISOString(),
      color: eventColor,
    };
    if (editingEventId) {
      updateEventMutation.mutate({ id: editingEventId, payload });
    } else {
      createEventMutation.mutate(payload);
    }
  };

  const handleEditEvent = (ev: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEventId(ev.id);
    setEventTitle(ev.title);
    setEventDesc(ev.description || "");
    // Convert stored ISO (UTC) back into the "YYYY-MM-DDTHH:mm" shape datetime-local inputs expect, in local time
    const toLocalInputValue = (iso: string) => {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setEventStart(toLocalInputValue(ev.start_time));
    setEventEnd(toLocalInputValue(ev.end_time));
    setEventColor(ev.color);
    setEventError(null);
    setIsEventOpen(true);
  };

  const handleDeleteEvent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Cancel this calendar planner event?")) {
      deleteEventMutation.mutate(id);
    }
  };

  const handleReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim() || !reminderTime) return;
    setIsRemSaving(true);
    const payload = {
      title: reminderTitle.trim(),
      time: new Date(reminderTime).toISOString(),
    };
    if (editingReminderId) {
      updateReminderMutation.mutate({ id: editingReminderId, payload });
    } else {
      createReminderMutation.mutate(payload);
    }
  };

  const handleEditReminder = (rem: Reminder) => {
    const toLocalInputValue = (iso: string) => {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setEditingReminderId(rem.id);
    setReminderTitle(rem.title);
    setReminderTime(toLocalInputValue(rem.time));
  };

  const handleCancelReminderEdit = () => {
    setEditingReminderId(null);
    setReminderTitle("");
    setReminderTime("");
  };

  const handleDeleteReminder = (id: string) => {
    deleteReminderMutation.mutate(id);
  };

  // ----------------- CALENDAR GRID GENERATOR MATH -----------------

  const firstDayIndex = new Date(navYear, navMonth, 1).getDay(); // weekday index of day 1
  const totalMonthDays = new Date(navYear, navMonth + 1, 0).getDate(); // days count in month

  // Buffer empty blocks before day 1
  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }

  // Populate days of month
  for (let d = 1; d <= totalMonthDays; d++) {
    calendarCells.push(d);
  }

  // Group events matching date
  const getEventsForDay = (dayNum: number) => {
    if (!events) return [];
    const dateCompareStr = new Date(navYear, navMonth, dayNum).toDateString();
    return events.filter(e => new Date(e.start_time).toDateString() === dateCompareStr);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Calendar & Reminders</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Program your monthly event planner, log agendas, and establish one-time alert schedules
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Interactive Month Grid Calendar */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Navigation Header */}
            <div className="flex justify-between items-center pb-2 border-b border-border/60">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <CalendarIcon size={16} className="text-primary" />
                {MONTH_NAMES[navMonth]} {navYear}
              </h3>
              
              <div className="flex gap-1.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 bg-secondary hover:bg-secondary/80 border border-border/80 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 bg-secondary hover:bg-secondary/80 border border-border/80 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Weekdays Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {WEEKDAY_NAMES.map(w => <div key={w} className="py-1">{w}</div>)}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((dayNum, cellIdx) => {
                if (dayNum === null) {
                  return <div key={`empty-${cellIdx}`} className="h-16 bg-secondary/5 rounded-lg opacity-30" />;
                }

                const isToday =
                  dayNum === today.getDate() &&
                  navMonth === today.getMonth() &&
                  navYear === today.getFullYear();

                const dayEvents = getEventsForDay(dayNum);

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => handleDayClick(dayNum)}
                    className={`h-16 p-1 border rounded-lg cursor-pointer flex flex-col justify-between relative transition-all hover:bg-secondary/20 hover:border-primary/20
                      ${isToday ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border/40 bg-secondary/10"}`}
                  >
                    {/* Day Number */}
                    <span className={`text-[10px] font-bold self-start px-1 py-0.5 rounded
                      ${isToday ? "bg-primary text-primary-foreground font-extrabold" : "text-muted-foreground"}`}>
                      {dayNum}
                    </span>

                    {/* Indicator dots for events */}
                    <div className="flex flex-wrap gap-1 mt-1 max-h-[22px] overflow-hidden pr-0.5">
                      {dayEvents.map(e => (
                        <span
                          key={e.id}
                          title={e.title}
                          className={`w-1.5 h-1.5 rounded-full shrink-0
                            ${e.color === "indigo" ? "bg-indigo-500" : ""}
                            ${e.color === "emerald" ? "bg-emerald-500" : ""}
                            ${e.color === "amber" ? "bg-amber-500" : ""}
                            ${e.color === "rose" ? "bg-rose-500" : ""}
                            ${e.color === "slate" ? "bg-slate-500" : ""}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Right Column: Reminders Schedules Sidebar */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          
          {/* Quick Reminders Form */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <Bell size={16} className="text-amber-500 fill-amber-500/10" />
              Set Reminder Alert
            </h3>
            <form onSubmit={handleReminderSubmit} className="space-y-3 bg-secondary/15 border border-border/40 p-4 rounded-xl">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Reminder Details</label>
                <input
                  type="text"
                  required
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="e.g. Call client for project review"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Alert Time</label>
                <input
                  type="datetime-local"
                  required
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none text-xs"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isRemSaving}
                  className="flex-1 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 text-xs flex items-center justify-center gap-1 shadow"
                >
                  {isRemSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} />}
                  {editingReminderId ? "Save Changes" : "Schedule Alert"}
                </button>
                {editingReminderId && (
                  <button
                    type="button"
                    onClick={handleCancelReminderEdit}
                    className="px-3 py-2 border border-border hover:bg-secondary rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Active reminders list */}
          <div className="flex-1 flex flex-col min-h-[180px] overflow-hidden border-t border-border/80 pt-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Upcoming Alarms</h4>
            
            {isRemindersLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin" size={16} />
              </div>
            ) : !reminders || reminders.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-[10px] py-10 bg-secondary/5 border border-dashed border-border/40 rounded-xl">
                No scheduled reminders.
              </div>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {reminders.map(rem => (
                  <div key={rem.id} className="p-3 bg-secondary/15 border border-border/40 rounded-xl flex items-center justify-between gap-3 group relative">
                    <div className="min-w-0">
                      <h5 className="font-bold text-xs text-foreground truncate max-w-[130px]">{rem.title}</h5>
                      <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock size={9} />
                        {new Date(rem.time).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleEditReminder(rem)}
                      className="p-1 text-muted-foreground hover:text-primary hover:bg-secondary/40 rounded transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteReminder(rem.id)}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-secondary/40 rounded transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Planned agenda table list details */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-sm">Scheduled Agenda List</h3>
        
        {isEventsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : !events || events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs">
            <CalendarIcon size={32} className="opacity-40 mb-2" />
            No events scheduled. Click a date on the calendar grid to block plans!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground font-semibold">
                  <th className="py-2.5">Agenda / Title</th>
                  <th className="py-2.5">Color Tag</th>
                  <th className="py-2.5">Start Time</th>
                  <th className="py-2.5">End Time</th>
                  <th className="py-2.5 hidden sm:table-cell">Details / Description</th>
                  <th className="py-2.5 text-right">Edit</th>
                  <th className="py-2.5 text-right">Delete</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id} className="border-b border-border/40 hover:bg-secondary/15 transition-colors">
                    <td className="py-2.5 font-bold text-foreground">{ev.title}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase text-white
                        ${ev.color === "indigo" ? "bg-indigo-500" : ""}
                        ${ev.color === "emerald" ? "bg-emerald-500" : ""}
                        ${ev.color === "amber" ? "bg-amber-500" : ""}
                        ${ev.color === "rose" ? "bg-rose-500" : ""}
                        ${ev.color === "slate" ? "bg-slate-500" : ""}`}>
                        {ev.color}
                      </span>
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(ev.start_time).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(ev.end_time).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2.5 text-muted-foreground max-w-[200px] truncate hidden sm:table-cell">
                      {ev.description || "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={(e) => handleEditEvent(ev, e)}
                        className="p-1 text-muted-foreground hover:text-primary hover:bg-secondary/40 rounded transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={(e) => handleDeleteEvent(ev.id, e)}
                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-secondary/40 rounded transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Calendar Event Modal Overlay */}
      {isEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg">{editingEventId ? "Edit Calendar Event" : "Block Calendar Schedule"}</h3>
              <button onClick={() => { setIsEventOpen(false); setEditingEventId(null); }} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            {eventError && (
              <div className="mx-6 mt-4 px-4 py-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-semibold">
                {eventError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleEventSubmit} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Finance sync sync review"
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Color Tag Indicator
                </label>
                <select
                  value={eventColor}
                  onChange={(e) => setEventColor(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-medium"
                >
                  <option value="indigo">Indigo Tag</option>
                  <option value="emerald">Emerald Tag</option>
                  <option value="amber">Amber Tag</option>
                  <option value="rose">Rose Tag</option>
                  <option value="slate">Slate Tag</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Start */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-semibold"
                  />
                </div>

                {/* End */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Agenda Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Notes, link to video calls, objectives..."
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-border/80">
                <button
                  type="button"
                  onClick={() => { setIsEventOpen(false); setEditingEventId(null); }}
                  className="py-2 px-4 border border-border hover:bg-secondary rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEventSaving}
                  className="py-2 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 text-xs flex items-center gap-1.5 shadow"
                >
                  {isEventSaving ? <Loader2 className="animate-spin" size={14} /> : null}
                  {editingEventId ? "Save Changes" : "Schedule Event"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
