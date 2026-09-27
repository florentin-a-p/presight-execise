import type { DB } from "./db.js";
import type { Filters, ListParams } from "./params.js";

export interface User {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  hobbies: string[];
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface UserPage {
  data: User[];
  meta: { page: number; pageSize: number; total: number; totalPages: number; hasMore: boolean };
}

export interface Facets {
  hobbies: FacetValue[];
  nationalities: FacetValue[];
}

const FACET_LIMIT = 20;

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const placeholders = (n: number) => Array(n).fill("?").join(", ");

/**
 * Builds the WHERE clause shared by the list and facet queries, so counts
 * always describe exactly the result set the list is paging through.
 * Expects the users table to be aliased as `u`.
 */
export function buildWhere({ q, nationalities, hobbies }: Filters): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  // Every whitespace-separated term must appear in first or last name, so
  // "ann smi" finds "Anna Smith". LIKE is case-insensitive for ASCII.
  for (const term of q.split(/\s+/).filter(Boolean)) {
    clauses.push(`(u.first_name LIKE ? ESCAPE '\\' OR u.last_name LIKE ? ESCAPE '\\')`);
    const pattern = `%${escapeLike(term)}%`;
    params.push(pattern, pattern);
  }

  // Nationalities: match ANY selected value.
  if (nationalities.length) {
    clauses.push(`u.nationality IN (${placeholders(nationalities.length)})`);
    params.push(...nationalities);
  }

  // Hobbies: match users having ALL selected values. (user_id, hobby_id) is the
  // primary key, so the per-user row count equals the number of distinct matches.
  if (hobbies.length) {
    clauses.push(`u.id IN (
      SELECT uh.user_id FROM user_hobbies uh
      JOIN hobbies h ON h.id = uh.hobby_id
      WHERE h.name IN (${placeholders(hobbies.length)})
      GROUP BY uh.user_id
      HAVING COUNT(*) = ?
    )`);
    params.push(...hobbies, hobbies.length);
  }

  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

const SORT_SQL: Record<ListParams["sort"], string> = {
  first_name: "u.first_name COLLATE NOCASE",
  last_name: "u.last_name COLLATE NOCASE",
  age: "u.age",
  nationality: "u.nationality",
};

export function listUsers(db: DB, p: ListParams): UserPage {
  const where = buildWhere(p);
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM users u ${where.sql}`).get(...where.params) as {
    total: number;
  };

  // `id` is the final tie-breaker so ordering is total and offset pages never
  // overlap or skip rows.
  const rows = db
    .prepare(
      `SELECT u.id, u.avatar, u.first_name, u.last_name, u.age, u.nationality
       FROM users u ${where.sql}
       ORDER BY ${SORT_SQL[p.sort]} ${p.order.toUpperCase()}, u.id ASC
       LIMIT ? OFFSET ?`,
    )
    .all(...where.params, p.pageSize, (p.page - 1) * p.pageSize) as Omit<User, "hobbies">[];

  const hobbiesByUser = new Map<number, string[]>(rows.map((r) => [r.id, []]));
  if (rows.length) {
    const links = db
      .prepare(
        `SELECT uh.user_id, h.name FROM user_hobbies uh
         JOIN hobbies h ON h.id = uh.hobby_id
         WHERE uh.user_id IN (${placeholders(rows.length)})
         ORDER BY h.name`,
      )
      .all(...rows.map((r) => r.id)) as { user_id: number; name: string }[];
    for (const { user_id, name } of links) hobbiesByUser.get(user_id)!.push(name);
  }

  const totalPages = Math.ceil(total / p.pageSize);
  return {
    data: rows.map((r) => ({ ...r, hobbies: hobbiesByUser.get(r.id)! })),
    meta: { page: p.page, pageSize: p.pageSize, total, totalPages, hasMore: p.page < totalPages },
  };
}

/**
 * Hobby counts describe the current result set (every filter applied).
 * Nationality counts apply the text and hobby filters but not the selected
 * nationalities themselves: nationalities combine with OR, so excluding their
 * own selection keeps the other options visible and shows how many users
 * each one would add (disjunctive faceting).
 */
export function getFacets(db: DB, filters: Filters): Facets {
  const where = buildWhere(filters);
  const nationalityWhere = buildWhere({ ...filters, nationalities: [] });
  const hobbies = db
    .prepare(
      `SELECT h.name AS value, COUNT(*) AS count
       FROM users u
       JOIN user_hobbies uh ON uh.user_id = u.id
       JOIN hobbies h ON h.id = uh.hobby_id
       ${where.sql}
       GROUP BY h.id
       ORDER BY count DESC, value ASC
       LIMIT ${FACET_LIMIT}`,
    )
    .all(...where.params) as FacetValue[];

  const nationalities = db
    .prepare(
      `SELECT u.nationality AS value, COUNT(*) AS count
       FROM users u ${nationalityWhere.sql}
       GROUP BY u.nationality
       ORDER BY count DESC, value ASC
       LIMIT ${FACET_LIMIT}`,
    )
    .all(...nationalityWhere.params) as FacetValue[];

  return { hobbies, nationalities };
}
