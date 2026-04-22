import { useState } from "react";

const GREEN = "#16A34A";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function CalendarWidget({ events }: { events: { date: string; name: string }[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const eventsByDate = new Map<string, { date: string; name: string }[]>();
  events.forEach((e) => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key)!.push(e);
  });

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const today = new Date();
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const getDayEvents = (d: number) => eventsByDate.get(`${year}-${month}-${d}`) || [];

  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: 0 }}>Upcoming Activities</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 6, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#64748B" }}
          >&#8249;</button>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", minWidth: 120, textAlign: "center" }}>{monthName}</span>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 6, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#64748B" }}
          >&#8250;</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#94A3B8", fontWeight: 600, padding: "4px 0" }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {days.map((d, i) => {
          const dayEvents = d ? getDayEvents(d) : [];
          const count = dayEvents.length;
          const todayCell = d !== null && isToday(d);
          const isHovered = hoveredDay === d && d !== null;

          return (
            <div
              key={i}
              style={{ position: "relative" }}
              onMouseEnter={() => { if (d !== null && count > 0) setHoveredDay(d); }}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div style={{
                textAlign: "center",
                fontSize: 12,
                borderRadius: 7,
                position: "relative",
                backgroundColor: todayCell ? GREEN : (count > 0 && isHovered ? "#F0FDF4" : "transparent"),
                color: d !== null ? (todayCell ? "#fff" : "#1E293B") : "transparent",
                fontWeight: todayCell ? 700 : (count > 0 ? 600 : 400),
                cursor: count > 0 ? "pointer" : "default",
                transition: "background-color 150ms",
                minHeight: 36,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 6,
                gap: 2,
              }}>
                <span>{d ?? ""}</span>
                {d !== null && count === 1 && (
                  <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: todayCell ? "#fff" : GREEN, flexShrink: 0 }} />
                )}
                {d !== null && count > 1 && (
                  <div style={{
                    fontSize: 9, fontWeight: 700, lineHeight: "14px", minWidth: 14,
                    backgroundColor: todayCell ? "rgba(255,255,255,0.25)" : "#DCFCE7",
                    color: todayCell ? "#fff" : "#15803D",
                    borderRadius: 8, padding: "0 3px", textAlign: "center",
                  }}>{count}</div>
                )}
              </div>

              {d !== null && count > 0 && isHovered && (
                <div style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "#1E293B",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 11,
                  zIndex: 200,
                  whiteSpace: "nowrap",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
                  pointerEvents: "none",
                }}>
                  {dayEvents.map((e, idx) => (
                    <div key={idx} style={{ padding: "2px 0", display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", backgroundColor: GREEN, flexShrink: 0 }} />
                      {e.name}
                    </div>
                  ))}
                  <div style={{
                    position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                    width: 0, height: 0,
                    borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
                    borderTop: "5px solid #1E293B",
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, borderTop: "1px solid #E2E8F0", paddingTop: 12 }}>
        {sortedEvents.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "8px 0" }}>No upcoming activities.</div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Scheduled</div>
            {sortedEvents.slice(0, 5).map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: i < Math.min(sortedEvents.length, 5) - 1 ? "1px solid #F1F5F9" : "none" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, flexShrink: 0, marginTop: 5 }} />
                <div>
                  <div style={{ fontSize: 13, color: "#1E293B", fontWeight: 500, lineHeight: 1.3 }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{e.date}</div>
                </div>
              </div>
            ))}
            {sortedEvents.length > 5 && (
              <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", paddingTop: 8 }}>
                +{sortedEvents.length - 5} more
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
