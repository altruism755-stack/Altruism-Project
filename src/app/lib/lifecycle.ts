/**
 * Frontend lifecycle bridge.
 *
 * The backend computes all step definitions and returns them as BackendLifecycleStep[].
 * resolveStepActions() wires each step's action_key to a real click handler.
 * UI components stay pure renderers — no business logic here.
 */

import type { LifecycleStep } from "../components/StatusPill";

// ── Canonical lifecycle states ───────────────────────────────────────────────
export const LIFECYCLE_STATE = {
  APPLICATION_PENDING:   "APPLICATION_PENDING",
  APPLICATION_APPROVED:  "APPLICATION_APPROVED",
  ACTIVITY_LOGGED:       "ACTIVITY_LOGGED",
  ACTIVITY_UNDER_REVIEW: "ACTIVITY_UNDER_REVIEW",
  ACTIVITY_APPROVED:     "ACTIVITY_APPROVED",
  CERTIFICATE_ISSUED:    "CERTIFICATE_ISSUED",
} as const;

export type LifecycleState = typeof LIFECYCLE_STATE[keyof typeof LIFECYCLE_STATE];

// ── Backend wire types ───────────────────────────────────────────────────────

export interface BackendLifecycleStep {
  label: string;
  status: "done" | "active" | "pending";
  icon?: string | null;
  tooltip: string;
  action_key?: string | null;
}

export interface BackendLifecycle {
  steps: BackendLifecycleStep[];
  current_step: string;
  state: string;
  next_action: string;
  blocking_reason?: string | null;
  stuck_msg?: string | null;
}

// ── Action resolver ──────────────────────────────────────────────────────────

/**
 * Maps action_key tokens from backend steps to real click handlers.
 * Unknown keys are silently ignored (step renders without onClick).
 */
export function resolveStepActions(
  steps: BackendLifecycleStep[],
  handlers: Partial<Record<string, () => void>>,
): LifecycleStep[] {
  return steps.map((s) => ({
    label: s.label,
    status: s.status,
    icon: s.icon ?? undefined,
    tooltip: s.tooltip,
    onClick: s.action_key ? handlers[s.action_key] : undefined,
  }));
}

// ── Event mini-stepper (Supervisor Events tab) ───────────────────────────────
// No backend endpoint for per-event steps — computed directly from event fields.

export function buildEventMiniSteps(event: {
  status: string;
  current_volunteers: number;
  onViewActivities: () => void;
}): Pick<LifecycleStep, "label" | "status" | "tooltip" | "onClick">[] {
  const hasVols = (event.current_volunteers || 0) > 0;
  const isCompleted = event.status === "Completed";
  const isActive = event.status === "Active";

  return [
    {
      label: "Created",
      status: "done",
      tooltip: "Event is scheduled",
    },
    {
      label: "Volunteers Joined",
      status: hasVols ? "done" : isCompleted ? "pending" : "active",
      tooltip: `${event.current_volunteers || 0} volunteer${event.current_volunteers !== 1 ? "s" : ""}`,
    },
    {
      label: "Hours Logging",
      status: isActive ? "active" : isCompleted ? "done" : "pending",
      tooltip: isActive ? "Ongoing — volunteers should log hours" : "Volunteers log hours after attending",
      onClick: isActive ? event.onViewActivities : undefined,
    },
    {
      label: "Completed",
      status: isCompleted ? "done" : "pending",
      tooltip: isCompleted ? "Event wrapped up" : "Pending completion",
    },
  ];
}
