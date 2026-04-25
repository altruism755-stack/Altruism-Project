import { CheckIcon } from "../../components/icons/PasswordIcons";

export function StepIndicator({ step, step1Valid, step2Valid }: { step: 1 | 2 | 3; step1Valid: boolean; step2Valid: boolean }) {
  const steps = [
    { n: 1 as const, label: "Account", hint: "Basic info to get started" },
    { n: 2 as const, label: "Profile", hint: "Help organizations know you better" },
    { n: 3 as const, label: "Preferences & Skills", hint: "Match with the right opportunities" },
  ];

  const seg1Complete = step > 1 && step1Valid;
  const seg2Complete = step > 2 && step2Valid;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", position: "relative", alignItems: "flex-start" }}>
        <div style={{ position: "absolute", top: 17, left: "16.667%", width: "33.333%", height: 2, backgroundColor: "#E5E7EB", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: seg1Complete ? "100%" : "0%", backgroundColor: "#16A34A", borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
        <div style={{ position: "absolute", top: 17, left: "50%", width: "33.333%", height: 2, backgroundColor: "#E5E7EB", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: seg2Complete ? "100%" : "0%", backgroundColor: "#16A34A", borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>

        {steps.map((s) => {
          const done = step > s.n;
          const active = step === s.n;

          return (
            <div key={s.n} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                backgroundColor: done ? "#16A34A" : "#FFFFFF",
                color: done ? "#FFFFFF" : active ? "#16A34A" : "#9CA3AF",
                border: done ? "2px solid #16A34A" : active ? "2px solid #16A34A" : "1.5px solid #D1D5DB",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
                transition: "all 200ms ease",
                boxSizing: "border-box",
              }}>
                {done ? <CheckIcon /> : s.n}
              </div>
              <span style={{
                marginTop: 8,
                fontSize: 12, whiteSpace: "nowrap", textAlign: "center", fontWeight: 500,
                color: active ? "#16A34A" : done ? "#374151" : "#9CA3AF",
              }}>
                {s.label}
              </span>
              <span style={{
                marginTop: 3,
                fontSize: 11, textAlign: "center", lineHeight: 1.35, padding: "0 6px",
                color: "#94A3B8",
                fontWeight: 400,
                maxWidth: 140,
              }}>
                {s.hint}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
