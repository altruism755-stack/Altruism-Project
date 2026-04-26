import { Component, type ReactNode } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import { ConnectionBanner } from "./components/ConnectionBanner";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}>
          <h1 style={{ color: "#DC2626" }}>Something went wrong</h1>
          <pre style={{ whiteSpace: "pre-wrap", color: "#64748B" }}>{this.state.error.message}</pre>
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
