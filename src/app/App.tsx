import { Component, type ReactNode } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import { ConnectionBanner } from "./components/ConnectionBanner";

// Last-resort boundary for errors outside the router (e.g. AuthProvider crash).
// Route-level errors are handled by errorElement in routes.tsx, which auto-resets on navigation.
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; lastKey: string }> {
  state = { error: null as Error | null, lastKey: "" };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}>
          <h1 style={{ color: "#DC2626" }}>Something went wrong</h1>
          <pre style={{ whiteSpace: "pre-wrap", color: "#64748B" }}>{this.state.error.message}</pre>
          <button onClick={() => { this.setState({ error: null }); window.location.href = "/"; }}
            style={{ marginTop: 16, padding: "8px 16px", background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <ConnectionBanner />
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
