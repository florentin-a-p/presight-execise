import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { Facets, UserPage } from "./lib/api";
import { currentSearch, renderWithProviders } from "./test/render";

const facets: Facets = {
  nationalities: [
    { value: "French", count: 3 },
    { value: "Dutch", count: 2 },
  ],
  hobbies: [
    { value: "Chess", count: 4 },
    { value: "Yoga", count: 1 },
  ],
};

const page = (total: number): UserPage => ({
  data: Array.from({ length: total }, (_, i) => ({
    id: i + 1,
    avatar: "",
    first_name: `First${i}`,
    last_name: "Last",
    age: 30,
    nationality: "French",
    hobbies: [],
  })),
  meta: { page: 1, pageSize: 50, total, totalPages: total ? 1 : 0, hasMore: false },
});

let fetchMock: ReturnType<typeof vi.fn>;
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const requested = (path: string) =>
  fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith(path));

beforeEach(() => {
  fetchMock = vi.fn((url: string) => (url.startsWith("/api/facets") ? json(facets) : json(page(3))));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("App", () => {
  it("restores view state from the URL and passes it to both API calls", async () => {
    renderWithProviders(<App />, { url: "/?q=ann&nationalities=French&hobbies=Chess&sort=age&order=desc" });

    await screen.findByText("3 people");
    expect(screen.getByRole("searchbox", { name: /search/i })).toHaveValue("ann");
    expect(requested("/api/users")[0]).toBe(
      "/api/users?q=ann&nationalities=French&hobbies=Chess&sort=age&order=desc&page=1&pageSize=50",
    );
    expect(requested("/api/facets")[0]).toBe("/api/facets?q=ann&nationalities=French&hobbies=Chess");
  });

  it("writes facet selections to the URL and refetches list and facets", async () => {
    renderWithProviders(<App />);
    await screen.findByText("3 people");

    const chess = await screen.findByRole("checkbox", { name: /^Chess/ });
    const yoga = screen.getByRole("checkbox", { name: /^Yoga/ });
    const french = screen.getByRole("checkbox", { name: /^French/ });
    // Rapid clicks before re-render must not overwrite each other.
    act(() => {
      fireEvent.click(chess);
      fireEvent.click(yoga);
      fireEvent.click(french);
    });

    await waitFor(() => expect(currentSearch).toBe("?nationalities=French&hobbies=Chess%2CYoga"));
    await waitFor(() => {
      expect(requested("/api/users")).toContain(
        "/api/users?nationalities=French&hobbies=Chess%2CYoga&sort=first_name&order=asc&page=1&pageSize=50",
      );
      expect(requested("/api/facets")).toContain("/api/facets?nationalities=French&hobbies=Chess%2CYoga");
    });
  });

  it("debounces the text filter into the URL", async () => {
    renderWithProviders(<App />);
    await screen.findByText("3 people");
    fireEvent.change(screen.getByRole("searchbox", { name: /search/i }), { target: { value: "  bob " } });
    await waitFor(() => expect(currentSearch).toBe("?q=bob"));
    await waitFor(() => expect(requested("/api/facets")).toContain("/api/facets?q=bob"));
  });

  it("shows the empty state", async () => {
    fetchMock.mockImplementation((url: string) => (url.startsWith("/api/facets") ? json(facets) : json(page(0))));
    renderWithProviders(<App />, { url: "/?q=zzz" });
    expect(await screen.findByText("No people match your filters")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));
    await waitFor(() => expect(currentSearch).toBe(""));
  });

  it("shows the error state with a retry", async () => {
    fetchMock.mockImplementation((url: string) =>
      url.startsWith("/api/facets") ? json(facets) : json({ error: "Database unavailable" }, 500),
    );
    renderWithProviders(<App />);
    expect(await screen.findByText("Couldn't load people")).toBeInTheDocument();
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();

    fetchMock.mockImplementation((url: string) => (url.startsWith("/api/facets") ? json(facets) : json(page(2))));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("2 people")).toBeInTheDocument();
  });
});
