import { useState, useRef } from "react";
import { useNavigate } from "react-router";

// ─── Event type color palette ─────────────────────────────────────────────────
const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Campaign: { bg: "#DCFCE7", text: "#15803D", dot: "#16A34A" },
  Training:  { bg: "#DBEAFE", text: "#1D4ED8", dot: "#2563EB" },
  Gala:      { bg: "#EDE9FE", text: "#6D28D9", dot: "#7C3AED" },
  Forum:     { bg: "#FFEDD5", text: "#C2410C", dot: "#EA580C" },
  Drive:     { bg: "#FEE2E2", text: "#B91C1C", dot: "#DC2626" },
  Workshop:  { bg: "#FEF9C3", text: "#A16207", dot: "#CA8A04" },
  Default:   { bg: "#E0F2FE", text: "#0369A1", dot: "#0891B2" },
};

function inferEventType(name: string, type?: string): string {
  if (type && TYPE_COLORS[type]) return type;
  const lower = name.toLowerCase();
  if (lower.includes("campaign")) return "Campaign";
  if (lower.includes("training") || lower.includes("workshop")) return "Training";
  if (lower.includes("gala")) return "Gala";
  if (lower.includes("forum")) return "Forum";
  if (lower.includes("drive")) return "Drive";
  return "Default";
}

function formatTime(time?: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export interface CalEvent {
  date: string;
  name: string;
  time?: string;
  location?: string;
  org_name?: string;
  org_id?: number;
  type?: string;
  id?: number;
  applicationStatus?: string; // "Pending" | "Approved" | "Rejected"
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EventPill({ event }: { event: CalEvent }) {
  const type = inferEventType(event.name, event.type);
  const colors = TYPE_COLORS[type];
  return (
    <div style={{
      fontSize: 9, fontWeight: 600,
      background: colors.bg, color: colors.text,
      borderRadius: 4, padding: "1px 4px",
      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      lineHeight: "14px",
    }}>
      {event.name.length > 13 ? event.name.slice(0, 12) + "…" : event.name}
    </div>
  );
}

function HappeningNowBadge() {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700,
      background: "#FEF9C3", color: "#A16207",
      borderRadius: 4, padding: "1px 5px", flexShrink: 0,
    }}>Happening Now</span>
  );
}

function TypeBadge({ event }: { event: CalEvent }) {
  const type = inferEventType(event.name, event.type);
  const colors = TYPE_COLORS[type];
  return (
    <span style={{
      fontSize: 9, fontWeight: 700,
      background: colors.bg, color: colors.text,
      borderRadius: 4, padding: "1px 5px",
    }}>{type}</span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CalendarWidget({ events }: { events: CalEvent[] }) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [popoverDay, setPopoverDay] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [showAll, setShowAll] = useState(false);
  const popoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const todayDate = new Date();
  const isToday = (d: number) =>
    d === todayDate.getDate() && month === todayDate.getMonth() && year === todayDate.getFullYear();

  // Group events by Y-M-D key
  const eventsByDate = new Map<string, CalEvent[]>();
  events.forEach((e) => {
    const dt = new Date(e.date);
    const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    if (!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key)!.push(e);
  });
  const getDayEvents = (d: number) => eventsByDate.get(`${year}-${month}-${d}`) || [];

  // Calendar grid
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  // List events
  const monthEvents = events
    .filter((e) => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === month; })
    .sort((a, b) => a.date.localeCompare(b.date));

  const listEvents = selectedDay ? getDayEvents(selectedDay) : monthEvents;

  // Group list by date string
  const groupedList = new Map<string, CalEvent[]>();
  listEvents.forEach((e) => {
    if (!groupedList.has(e.date)) groupedList.set(e.date, []);
    groupedList.get(e.date)!.push(e);
  });

  const isHappeningNow = (e: CalEvent) => {
    const dt = new Date(e.date);
    return dt.getFullYear() === todayDate.getFullYear() &&
      dt.getMonth() === todayDate.getMonth() &&
      dt.getDate() === todayDate.getDate();
  };

  const formatDateLabel = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const handleDayClick = (d: number) => {
    if (!getDayEvents(d).length) return;
    setSelectedDay(selectedDay === d ? null : d);
    setShowAll(false);
  };

  const openPopover = (d: number) => {
    if (popoverTimer.current) clearTimeout(popoverTimer.current);
    setPopoverDay(d);
  };
  const closePopover = () => {
    popoverTimer.current = setTimeout(() => setPopoverDay(null), 150);
  };

  // Compute popover horizontal offset to avoid edge overflow
  const getPopoverAlign = (d: number) => {
    const col = (firstDay + d - 1) % 7;
    if (col <= 1) return { left: 0, transform: "none" };
    if (col >= 5) return { right: 0, left: "auto", transform: "none" };
    return { left: "50%", transform: "translateX(-50%)" };
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      backgroundColor: "#fff", border: "1px solid #E2E8F0",
      borderRadius: 16, padding: 20,
      boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
    }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", margin: 0 }}>Upcoming Activities</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* View toggle */}
          <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 8, padding: 2 }}>
            {(["calendar", "list"] as const).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                border: "none", borderRadius: 6, padding: "3px 10px",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: viewMode === mode ? "#fff" : "transparent",
                color: viewMode === mode ? "#0F172A" : "#64748B",
                boxShadow: viewMode === mode ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 150ms", textTransform: "capitalize",
              }}>{mode}</button>
            ))}
          </div>
          {/* Month nav */}
          <button onClick={() => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); }} style={navBtnStyle}>‹</button>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", minWidth: 108, textAlign: "center" }}>{monthName}</span>
          <button onClick={() => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); }} style={navBtnStyle}>›</button>
        </div>
      </div>

      {/* ── Calendar Grid ── */}
      {viewMode === "calendar" && (
        <>
          {/* Weekday headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#94A3B8", fontWeight: 700, padding: "2px 0", letterSpacing: "0.04em" }}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {days.map((d, i) => {
              const dayEvents = d ? getDayEvents(d) : [];
              const count = dayEvents.length;
              const todayCell = d !== null && isToday(d);
              const selectedCell = d !== null && selectedDay === d;
              const hasEvents = count > 0;
              const shownEvents = dayEvents.slice(0, 2);
              const hiddenCount = count - 2;
              const isPopover = popoverDay === d && d !== null;
              const popoverAlign = d ? getPopoverAlign(d) : {};

              return (
                <div key={i} style={{ position: "relative" }}
                  onMouseEnter={() => d !== null && hasEvents && openPopover(d)}
                  onMouseLeave={closePopover}
                  onClick={() => d !== null && handleDayClick(d)}
                >
                  {/* Cell */}
                  <div style={{
                    borderRadius: 8, padding: "3px 3px 4px",
                    backgroundColor: selectedCell ? "#EEF2FF" : (todayCell ? "#F0FDF4" : (hasEvents ? "#FAFAFA" : "transparent")),
                    border: selectedCell ? "1.5px solid #6366F1" : (todayCell ? "1.5px solid #16A34A" : "1px solid transparent"),
                    cursor: hasEvents ? "pointer" : "default",
                    transition: "background 150ms",
                    minHeight: 60,
                    display: "flex", flexDirection: "column", alignItems: "stretch", gap: 2,
                  }}>
                    {/* Day number */}
                    <div style={{
                      textAlign: "center", fontSize: 11,
                      fontWeight: todayCell || selectedCell ? 700 : (hasEvents ? 600 : 400),
                      lineHeight: "18px",
                    }}>
                      {d !== null ? (
                        todayCell ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 20, height: 20, borderRadius: "50%",
                            background: "#16A34A", color: "#fff", fontSize: 11, fontWeight: 700,
                          }}>{d}</span>
                        ) : (
                          <span style={{ color: selectedCell ? "#4F46E5" : "#1E293B" }}>{d}</span>
                        )
                      ) : ""}
                    </div>

                    {/* Event pills */}
                    {shownEvents.map((e, idx) => <EventPill key={idx} event={e} />)}

                    {/* +X more */}
                    {hiddenCount > 0 && (
                      <div style={{ fontSize: 9, fontWeight: 600, color: "#64748B", paddingLeft: 4, lineHeight: "14px" }}>
                        +{hiddenCount} more
                      </div>
                    )}
                  </div>

                  {/* ── Hover Popover ── */}
                  {d !== null && hasEvents && isPopover && (
                    <div
                      onMouseEnter={() => { if (popoverTimer.current) clearTimeout(popoverTimer.current); }}
                      onMouseLeave={closePopover}
                      style={{
                        position: "absolute",
                        bottom: "calc(100% + 10px)",
                        ...popoverAlign,
                        backgroundColor: "#fff",
                        border: "1px solid #E2E8F0",
                        borderRadius: 12, padding: "12px 14px",
                        zIndex: 400, minWidth: 220, maxWidth: 280,
                        boxShadow: "0 8px 28px rgba(0,0,0,0.13)",
                        pointerEvents: "auto",
                      }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                        {new Date(year, month, d).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                      </div>
                      {dayEvents.map((e, idx) => {
                        const type = inferEventType(e.name, e.type);
                        const colors = TYPE_COLORS[type];
                        const now = isHappeningNow(e);
                        return (
                          <div key={idx} style={{ padding: "8px 0", borderBottom: idx < dayEvents.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors.dot, flexShrink: 0 }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", flex: 1, lineHeight: 1.3 }}>{e.name}</span>
                              {now && <HappeningNowBadge />}
                            </div>
                            {e.time && <div style={metaRow}>🕐 {formatTime(e.time)}</div>}
                            {e.location && <div style={metaRow}>📍 {e.location}</div>}
                            {e.org_name && <div style={metaRow}>🏢 {e.org_name}</div>}
                            {e.applicationStatus && (
                              <div style={{ marginLeft: 14, marginTop: 4 }}>
                                {e.applicationStatus === "Approved" && <span style={{ fontSize: 10, fontWeight: 700, background: "#DCFCE7", color: "#15803D", borderRadius: 4, padding: "2px 6px" }}>✓ Application Approved</span>}
                                {e.applicationStatus === "Pending"  && <span style={{ fontSize: 10, fontWeight: 700, background: "#FEF3C7", color: "#B45309",  borderRadius: 4, padding: "2px 6px" }}>⏳ Application Pending</span>}
                                {e.applicationStatus === "Rejected" && <span style={{ fontSize: 10, fontWeight: 700, background: "#FEE2E2", color: "#B91C1C",  borderRadius: 4, padding: "2px 6px" }}>✗ Application Rejected</span>}
                              </div>
                            )}
                            {e.org_id && (
                              <button
                                onClick={(ev) => { ev.stopPropagation(); navigate(`/dashboard/org/${e.org_id}`); }}
                                style={{ marginLeft: 14, marginTop: 6, background: colors.bg, color: colors.text, border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "3px 8px", cursor: "pointer" }}>
                                View Event →
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {/* Arrow */}
                      <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #E2E8F0" }} />
                      <div style={{ position: "absolute", top: "calc(100% - 1px)", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #fff" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Legend ── */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid #F1F5F9" }}>
            {(Object.entries(TYPE_COLORS) as [string, { bg: string; text: string; dot: string }][])
              .filter(([k]) => k !== "Default")
              .map(([type, colors]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: colors.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: "#64748B", fontWeight: 500 }}>{type}</span>
                </div>
              ))}
          </div>
        </>
      )}

      {/* ── Event List ── */}
      <div style={{ marginTop: viewMode === "calendar" ? 16 : 0, borderTop: viewMode === "calendar" ? "1px solid #E2E8F0" : "none", paddingTop: viewMode === "calendar" ? 12 : 0 }}>
        {/* List header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {selectedDay
              ? new Date(year, month, selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
              : "Scheduled"}
          </span>
          {selectedDay && (
            <button onClick={() => setSelectedDay(null)} style={{ fontSize: 11, color: "#6366F1", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
              ← All events
            </button>
          )}
        </div>

        {listEvents.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "16px 0" }}>No events scheduled.</div>
        ) : (
          <>
            {Array.from(groupedList.entries())
              .slice(0, showAll ? undefined : 3)
              .map(([dateKey, dayEvts]) => (
                <div key={dateKey} style={{ marginBottom: 10 }}>
                  {!selectedDay && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                      {formatDateLabel(dateKey)}
                    </div>
                  )}
                  {dayEvts.map((e, idx) => {
                    const type = inferEventType(e.name, e.type);
                    const colors = TYPE_COLORS[type];
                    const now = isHappeningNow(e);
                    return (
                      <div key={idx}
                        onClick={() => e.org_id && navigate(`/dashboard/org/${e.org_id}`)}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          padding: "8px 10px", borderRadius: 8, marginBottom: 4,
                          background: "#FAFAFA", border: "1px solid #F1F5F9",
                          cursor: e.id ? "pointer" : "default", transition: "background 150ms",
                        }}
                        onMouseEnter={(ev) => { if (e.id) (ev.currentTarget as HTMLDivElement).style.background = "#F1F5F9"; }}
                        onMouseLeave={(ev) => { (ev.currentTarget as HTMLDivElement).style.background = "#FAFAFA"; }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors.dot, flexShrink: 0, marginTop: 4 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", flex: 1 }}>{e.name}</span>
                            {now && <HappeningNowBadge />}
                            {e.applicationStatus === "Approved" && <span style={{ fontSize: 9, fontWeight: 700, background: "#DCFCE7", color: "#15803D", borderRadius: 4, padding: "1px 5px" }}>Applied ✓</span>}
                            {e.applicationStatus === "Pending"  && <span style={{ fontSize: 9, fontWeight: 700, background: "#FEF3C7", color: "#B45309",  borderRadius: 4, padding: "1px 5px" }}>Applied ⏳</span>}
                            {e.applicationStatus === "Rejected" && <span style={{ fontSize: 9, fontWeight: 700, background: "#FEE2E2", color: "#B91C1C",  borderRadius: 4, padding: "1px 5px" }}>Rejected</span>}
                            <TypeBadge event={e} />
                          </div>
                          {(e.time || e.location || e.org_name) && (
                            <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                              {e.time && <span style={{ fontSize: 11, color: "#64748B" }}>🕐 {formatTime(e.time)}</span>}
                              {e.location && <span style={{ fontSize: 11, color: "#64748B" }}>📍 {e.location}</span>}
                              {e.org_name && <span style={{ fontSize: 11, color: "#94A3B8" }}>· {e.org_name}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

            {/* View All / Show Less */}
            {!selectedDay && groupedList.size > 3 && (
              <button
                onClick={() => setShowAll(!showAll)}
                style={{
                  width: "100%", padding: "8px 0", marginTop: 4,
                  background: "none", border: "1px solid #E2E8F0",
                  borderRadius: 8, cursor: "pointer",
                  fontSize: 12, fontWeight: 600, color: "#6366F1",
                  transition: "all 150ms",
                }}>
                {showAll ? "Show less ↑" : `View all ${monthEvents.length} events this month ↓`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Shared style tokens ──────────────────────────────────────────────────────
const navBtnStyle: React.CSSProperties = {
  background: "none", border: "1px solid #E2E8F0", borderRadius: 6,
  width: 28, height: 28, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 15, color: "#64748B",
};

const metaRow: React.CSSProperties = {
  fontSize: 11, color: "#64748B", marginLeft: 14, marginTop: 2,
};
