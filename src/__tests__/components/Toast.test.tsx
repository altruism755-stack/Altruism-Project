import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "../../app/components/Toast";

function TestConsumer({ message, type }: { message: string; type?: "success" | "error" | "info" }) {
  const { showToast } = useToast();
  return <button onClick={() => showToast(message, type)}>show</button>;
}

describe("ToastProvider", () => {
  it("renders children", () => {
    render(
      <ToastProvider>
        <div>child content</div>
      </ToastProvider>
    );
    expect(screen.getByText("child content")).toBeTruthy();
  });

  it("shows a toast message when showToast is called", async () => {
    render(
      <ToastProvider>
        <TestConsumer message="Hello world" type="success" />
      </ToastProvider>
    );
    await act(async () => {
      screen.getByText("show").click();
    });
    expect(screen.getByText(/Hello world/)).toBeTruthy();
  });

  it("throws when useToast is used outside provider", () => {
    const BadConsumer = () => {
      useToast();
      return null;
    };
    expect(() => render(<BadConsumer />)).toThrow("useToast must be used within ToastProvider");
  });
});
