import request from "supertest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { openDb, type DB } from "../src/db.js";
import { seed } from "../src/seed.js";
import type { FacetValue, User } from "../src/users.js";

let db: DB;
// One server bound explicitly to IPv4 loopback for the whole suite; supertest's
// per-request ephemeral servers can collide with other local listeners.
let server: Server;
let app: string;
let everyone: User[];

/** Fetch every user with all hobbies, as the reference for brute-force checks. */
function loadAll(db: DB): User[] {
  const users = db.prepare("SELECT * FROM users").all() as Omit<User, "hobbies">[];
  const links = db
    .prepare("SELECT uh.user_id, h.name FROM user_hobbies uh JOIN hobbies h ON h.id = uh.hobby_id")
    .all() as { user_id: number; name: string }[];
  const byUser = new Map<number, string[]>(users.map((u) => [u.id, []]));
  for (const l of links) byUser.get(l.user_id)!.push(l.name);
  return users.map((u) => ({ ...u, hobbies: byUser.get(u.id)!.sort() }));
}

async function fetchAllPages(query: Record<string, string>, pageSize = 37): Promise<User[]> {
  const out: User[] = [];
  for (let page = 1; ; page++) {
    const res = await request(app).get("/api/users").query({ ...query, page, pageSize }).expect(200);
    out.push(...res.body.data);
    if (!res.body.meta.hasMore) return out;
  }
}

const topCounts = (values: string[]): FacetValue[] => {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || (a.value < b.value ? -1 : 1))
    .slice(0, 20);
};

beforeAll(() => {
  db = openDb(":memory:");
  seed(db, { count: 1500, seed: 7 });
  everyone = loadAll(db);
  return new Promise<void>((resolve) => {
    server = createApp(db).listen(0, "127.0.0.1", () => {
      app = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server?.close();
  db?.close();
});

describe("GET /api/users", () => {
  it("returns a first page with pagination metadata", async () => {
    const res = await request(app).get("/api/users").query({ pageSize: 20 }).expect(200);
    expect(res.body.data).toHaveLength(20);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 20, total: 1500, totalPages: 75, hasMore: true });
    const user = res.body.data[0];
    expect(Object.keys(user).sort()).toEqual(
      ["age", "avatar", "first_name", "hobbies", "id", "last_name", "nationality"].sort(),
    );
    expect(user.hobbies.length).toBeLessThanOrEqual(10);
  });

  it("reports hasMore=false on the last page and returns empty pages past the end", async () => {
    const last = await request(app).get("/api/users").query({ pageSize: 100, page: 15 }).expect(200);
    expect(last.body.data).toHaveLength(100);
    expect(last.body.meta.hasMore).toBe(false);
    const past = await request(app).get("/api/users").query({ pageSize: 100, page: 16 }).expect(200);
    expect(past.body.data).toEqual([]);
  });

  it.each(["first_name", "last_name", "age", "nationality"])(
    "pages through sort=%s in both directions without duplicates or gaps",
    async (sort) => {
      for (const order of ["asc", "desc"] as const) {
        const users = await fetchAllPages({ sort, order });
        const ids = users.map((u) => u.id);
        expect(new Set(ids).size).toBe(everyone.length);

        const key = (u: User) => {
          const v = u[sort as keyof User];
          return typeof v === "string" ? v.toLowerCase() : (v as number);
        };
        for (let i = 1; i < users.length; i++) {
          const [a, b] = [key(users[i - 1]), key(users[i])];
          if (a === b) expect(users[i - 1].id).toBeLessThan(users[i].id);
          else expect(order === "asc" ? a < b : a > b).toBe(true);
        }
      }
    },
  );

  it("filters by text across first and last name, case-insensitively", async () => {
    const sample = everyone[42];
    const term = sample.last_name.slice(1, 4).toUpperCase();
    const users = await fetchAllPages({ q: term });
    const expected = everyone.filter((u) =>
      [u.first_name, u.last_name].some((n) => n.toLowerCase().includes(term.toLowerCase())),
    );
    expect(users.map((u) => u.id).sort()).toEqual(expected.map((u) => u.id).sort());
    expect(users.some((u) => u.id === sample.id)).toBe(true);
  });

  it("requires every search term to match first or last name", async () => {
    const sample = everyone[7];
    const users = await fetchAllPages({ q: `${sample.first_name} ${sample.last_name}` });
    expect(users.some((u) => u.id === sample.id)).toBe(true);
    for (const u of users) {
      const name = `${u.first_name} ${u.last_name}`.toLowerCase();
      expect(name).toContain(sample.first_name.toLowerCase());
      expect(name).toContain(sample.last_name.toLowerCase());
    }
  });

  it("treats LIKE wildcards in the search text literally", async () => {
    const res = await request(app).get("/api/users").query({ q: "%" }).expect(200);
    expect(res.body.meta.total).toBe(0);
  });

  it("combines text, ANY-of nationalities and ALL-of hobbies", async () => {
    const nationalities = topCounts(everyone.map((u) => u.nationality)).slice(0, 3).map((f) => f.value);
    const hobbies = topCounts(everyone.flatMap((u) => u.hobbies)).slice(0, 2).map((f) => f.value);
    const users = await fetchAllPages({ q: "a", nationalities: nationalities.join(","), hobbies: hobbies.join(",") });
    const expected = everyone.filter(
      (u) =>
        [u.first_name, u.last_name].some((n) => /a/i.test(n)) &&
        nationalities.includes(u.nationality) &&
        hobbies.every((h) => u.hobbies.includes(h)),
    );
    expect(expected.length).toBeGreaterThan(0);
    expect(users.map((u) => u.id).sort()).toEqual(expected.map((u) => u.id).sort());
  });

  it("accepts repeated query params as well as comma-separated lists", async () => {
    const a = await request(app).get("/api/users?hobbies=Reading&hobbies=Hiking").expect(200);
    const b = await request(app).get("/api/users?hobbies=Reading,Hiking").expect(200);
    expect(a.body.meta.total).toBe(b.body.meta.total);
  });

  it.each([
    [{ sort: "id" }, /sort/],
    [{ order: "up" }, /order/],
    [{ page: "0" }, /page/],
    [{ pageSize: "1000" }, /pageSize/],
    [{ pageSize: "abc" }, /pageSize/],
  ])("rejects invalid params %o with 400", async (query, message) => {
    const res = await request(app).get("/api/users").query(query).expect(400);
    expect(res.body.error).toMatch(message);
  });
});

describe("GET /api/facets", () => {
  it("returns global top 20 hobbies and nationalities with counts when unfiltered", async () => {
    const res = await request(app).get("/api/facets").expect(200);
    expect(res.body.hobbies).toEqual(topCounts(everyone.flatMap((u) => u.hobbies)));
    expect(res.body.nationalities).toEqual(topCounts(everyone.map((u) => u.nationality)));
    expect(res.body.hobbies).toHaveLength(20);
    expect(res.body.nationalities).toHaveLength(20);
  });

  it("reflects the active text and selected filters", async () => {
    const q = "e";
    const hobbies = [topCounts(everyone.flatMap((u) => u.hobbies))[0].value];
    const nationalities = topCounts(everyone.map((u) => u.nationality)).slice(0, 2).map((f) => f.value);
    const res = await request(app)
      .get("/api/facets")
      .query({ q, hobbies: hobbies.join(","), nationalities: nationalities.join(",") })
      .expect(200);

    const matching = everyone.filter(
      (u) =>
        [u.first_name, u.last_name].some((n) => n.toLowerCase().includes(q)) &&
        nationalities.includes(u.nationality) &&
        hobbies.every((h) => u.hobbies.includes(h)),
    );
    expect(res.body.hobbies).toEqual(topCounts(matching.flatMap((u) => u.hobbies)));

    // Nationality counts ignore the nationality selection itself (OR facet)...
    const ignoringNationality = everyone.filter(
      (u) =>
        [u.first_name, u.last_name].some((n) => n.toLowerCase().includes(q)) &&
        hobbies.every((h) => u.hobbies.includes(h)),
    );
    expect(res.body.nationalities).toEqual(topCounts(ignoringNationality.map((u) => u.nationality)));
    expect(res.body.nationalities.length).toBeGreaterThan(nationalities.length);
    // ...so the selected nationalities' counts add up to the list total.
    const selectedSum = res.body.nationalities
      .filter((n: FacetValue) => nationalities.includes(n.value))
      .reduce((sum: number, n: FacetValue) => sum + n.count, 0);
    expect(selectedSum).toBe(matching.length);
    // Every matching user has the selected hobby, so it counts all of them.
    expect(res.body.hobbies.find((h: FacetValue) => h.value === hobbies[0])?.count).toBe(matching.length);

    const list = await request(app)
      .get("/api/users")
      .query({ q, hobbies: hobbies.join(","), nationalities: nationalities.join(",") })
      .expect(200);
    expect(list.body.meta.total).toBe(matching.length);
  });

  it("returns empty facets when nothing matches", async () => {
    const res = await request(app).get("/api/facets").query({ q: "zzzzzzzz" }).expect(200);
    expect(res.body).toEqual({ hobbies: [], nationalities: [] });
  });
});

it("returns JSON 404 for unknown API routes", async () => {
  const res = await request(app).get("/api/nope").expect(404);
  expect(res.body.error).toBe("Not found");
});
