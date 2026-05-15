import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill } from "../../app/components/StatusPill";

describe("StatusPill", () => {
  it("renders the status label", () => {
    render(<StatusPill status="approved" />);
    expect(screen.getByText("Approved")).toBeTruthy();
  });

  it("renders unknown status as-is", () => {
    render(<StatusPill status="custom_status" />);
    expect(screen.getByText("custom_status")).toBeTruthy();
  });

  it("renders dot when dot prop is true", () => {
    const { container } = render(<StatusPill status="pending" dot />);
    const dots = container.querySelectorAll("span span");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("is case-insensitive for known statuses", () => {
    render(<StatusPill status="APPROVED" />);
    expect(screen.getByText("Approved")).toBeTruthy();
  });

  it("renders completed status", () => {
    render(<StatusPill status="completed" />);
    expect(screen.getByText("Completed")).toBeTruthy();
  });

  it("renders upcoming status", () => {
    render(<StatusPill status="upcoming" />);
    expect(screen.getByText("Upcoming")).toBeTruthy();
  });
});
