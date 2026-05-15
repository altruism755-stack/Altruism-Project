import { describe, it, expect, vi, beforeEach } from "vitest";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("api service", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.restoreAllMocks();
  });

  it("includes Authorization header when token is present", async () => {
    localStorageMock.setItem("altruism_token", "test-jwt");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 200, headers: { "Content-Type": "application/json" } })
    );

    const { api } = await import("../../app/services/api");
    await api.getMe();

    const [, init] = fetchSpy.mock.calls[0];
    const headers = new Headers(init?.headers as HeadersInit);
    expect(headers.get("Authorization")).toBe("Bearer test-jwt");
  });

  it("omits Authorization header when no token is stored", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 200, headers: { "Content-Type": "application/json" } })
    );

    const { api } = await import("../../app/services/api");
    await api.getMe();

    const [, init] = fetchSpy.mock.calls[0];
    const headers = new Headers(init?.headers as HeadersInit);
    expect(headers.get("Authorization")).toBeNull();
  });

  it("sends correct JSON body on login", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ token: "abc" }), { status: 200, headers: { "Content-Type": "application/json" } })
    );

    const { api } = await import("../../app/services/api");
    await api.login("user@test.com", "password123");

    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({ email: "user@test.com", password: "password123" });
  });
});
