import { useState, useRef, useEffect } from "react";

const GREEN = "#16A34A";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

interface Props {
  value: string;               // stored as yyyy-mm-dd
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  focusedKey?: string;
  currentFocused?: string | null;
  onFocus?: () => void;
  onBlur?: () => void;
  inputStyleBase?: React.CSSProperties;
}

export function DatePicker({
  value,
  onChange,
  required,
  placeholder = "dd/mm/yyyy",
  focusedKey,
  currentFocused,
  onFocus,
  onBlur,
  inputStyleBase = {},
}: Props) {
  const today = new Date();
  const defaultYear = today.getFullYear() - 20;
  const defaultMonth = today.getMonth();

  const parseYear  = (v: string) => v ? parseInt(v.split("-")[0], 10) : defaultYear;
  const parseMonth = (v: string) => v ? parseInt(v.split("-")[1], 10) - 1 : defaultMonth;

  const [open, setOpen]           = useState(false);
  const [tentative, setTentative] = useState(value);
  const [viewYear, setViewYear]   = useState(() => parseYear(value));
  const [viewMonth, setViewMonth] = useState(() => parseMonth(value));
  const containerRef              = useRef<HTMLDivElement>(null);
  const openRef                   = useRef(open);
  openRef.current = open;

  // Sync internal state when value changes externally (e.g. form reset or parent update).
  // Skip when the calendar is currently open to avoid overwriting the user's in-progress selection.
  useEffect(() => {
    if (openRef.current) return;
    const y = value ? parseInt(value.split("-")[0], 10) : (today.getFullYear() - 20);
    const m = value ? parseInt(value.split("-")[1], 10) - 1 : today.getMonth();
    setTentative(value);
    setViewYear(y);
    setViewMonth(m);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close on outside click (reset tentative without confirming)
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTentative(value);
        setOpen(false);
        onBlur?.();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, value, onBlur]);

  const handleOpen = () => {
    setTentative(value);
    setViewYear(parseYear(value));
    setViewMonth(parseMonth(value));
    setOpen(true);
    onFocus?.();
  };

  const handleConfirm = () => {
    console.log("[DatePicker] confirming date:", tentative);
    onChange(tentative);
    setOpen(false);
    onBlur?.();
  };

  const handleCancel = () => {
    setTentative(value);
    setOpen(false);
    onBlur?.();
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (d: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    setTentative(`${viewYear}-${mm}-${dd}`);
  };

  // Build day grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const tentDay   = tentative ? parseInt(tentative.split("-")[2], 10) : null;
  const tentMonth = tentative ? parseInt(tentative.split("-")[1], 10) - 1 : null;
  const tentYear  = tentative ? parseInt(tentative.split("-")[0], 10) : null;
  const isSelected = (d: number) =>
    tentYear === viewYear && tentMonth === viewMonth && tentDay === d;

  // Year range: 1940 → current year - 10
  const maxYear = today.getFullYear() - 10;
  const years = Array.from({ length: maxYear - 1940 + 1 }, (_, i) => maxYear - i);

  const isFocused = open || currentFocused === focusedKey;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* ── Trigger input ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(e) => e.key === "Enter" && handleOpen()}
        style={{
          ...inputStyleBase,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
          borderColor: isFocused ? "#2563EB" : "#E2E8F0",
          outline: "none",
        }}
      >
        <span style={{ color: value ? "#1E293B" : "#94A3B8", fontSize: 14 }}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={isFocused ? "#2563EB" : "#94A3B8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8"  y1="2" x2="8"  y2="6" />
          <line x1="3"  y1="10" x2="21" y2="10" />
        </svg>
      </div>

      {/* Hidden input for required validation */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required={required}
          style={{ position: "absolute", opacity: 0, width: "100%", height: 1, bottom: 0, pointerEvents: "none" }}
          tabIndex={-1}
        />
      )}

      {/* ── Calendar dropdown ── */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 9999,
          backgroundColor: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 14,
          boxShadow: "0 12px 32px rgba(0,0,0,0.13)",
          width: 300,
          padding: "16px 16px 14px",
        }}>

          {/* Month / Year navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <button
              type="button" onClick={prevMonth}
              style={{ width: 30, height: 30, border: "1px solid #E2E8F0", borderRadius: 7, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#64748B", flexShrink: 0 }}
            >‹</button>

            <div style={{ flex: 1, display: "flex", gap: 6 }}>
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                style={{ flex: 1, height: 30, border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 12, padding: "0 6px", cursor: "pointer", outline: "none", backgroundColor: "#F8FAFC", color: "#1E293B", fontWeight: 500 }}
              >
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                style={{ width: 68, height: 30, border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 12, padding: "0 4px", cursor: "pointer", outline: "none", backgroundColor: "#F8FAFC", color: "#1E293B", fontWeight: 500 }}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <button
              type="button" onClick={nextMonth}
              style={{ width: 30, height: 30, border: "1px solid #E2E8F0", borderRadius: 7, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#64748B", flexShrink: 0 }}
            >›</button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#94A3B8", padding: "2px 0 6px" }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 14 }}>
            {cells.map((d, i) => {
              const selected = d !== null && isSelected(d);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={d === null}
                  onClick={() => d !== null && selectDay(d)}
                  style={{
                    height: 34,
                    border: "none",
                    borderRadius: 7,
                    fontSize: 13,
                    cursor: d !== null ? "pointer" : "default",
                    backgroundColor: selected ? GREEN : "transparent",
                    color: d !== null ? (selected ? "#fff" : "#1E293B") : "transparent",
                    fontWeight: selected ? 700 : 400,
                    transition: "background-color 120ms",
                  }}
                  onMouseEnter={(e) => { if (d !== null && !selected) e.currentTarget.style.backgroundColor = "#F1F5F9"; }}
                  onMouseLeave={(e) => { if (d !== null && !selected) e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  {d ?? ""}
                </button>
              );
            })}
          </div>

          {/* Selected date label */}
          <div style={{
            textAlign: "center",
            fontSize: 12,
            color: tentative ? "#1E293B" : "#94A3B8",
            fontWeight: tentative ? 500 : 400,
            backgroundColor: tentative ? "#F0FDF4" : "#F8FAFC",
            border: `1px solid ${tentative ? "#BBF7D0" : "#E2E8F0"}`,
            borderRadius: 7,
            padding: "6px 0",
            marginBottom: 12,
          }}>
            {tentative ? `${formatDisplay(tentative)}` : "No date selected"}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{ flex: 1, height: 36, border: "1.5px solid #E2E8F0", borderRadius: 8, backgroundColor: "#fff", color: "#64748B", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!tentative}
              style={{
                flex: 1, height: 36, border: "none", borderRadius: 8,
                backgroundColor: tentative ? GREEN : "#E2E8F0",
                color: tentative ? "#fff" : "#94A3B8",
                fontSize: 13, fontWeight: 600,
                cursor: tentative ? "pointer" : "not-allowed",
                transition: "background-color 150ms",
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
