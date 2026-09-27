export const SORT_FIELDS = ["first_name", "last_name", "age", "nationality"] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const MAX_FILTER_VALUES = 50;
export const MAX_QUERY_LENGTH = 100;

export interface Filters {
  q: string;
  nationalities: string[];
  hobbies: string[];
}

export interface ListParams extends Filters {
  sort: SortField;
  order: SortOrder;
  page: number;
  pageSize: number;
}

export class ValidationError extends Error {}

type Raw = Record<string, unknown>;

/** Accepts `?x=a&x=b` and `?x=a,b`; trims, drops empties and de-duplicates. */
function list(raw: unknown, name: string): string[] {
  const parts = (Array.isArray(raw) ? raw : raw == null ? [] : [raw]).flatMap((v) => {
    if (typeof v !== "string") throw new ValidationError(`"${name}" must be a string or list of strings`);
    return v.split(",");
  });
  const values = [...new Set(parts.map((v) => v.trim()).filter(Boolean))];
  if (values.length > MAX_FILTER_VALUES) throw new ValidationError(`"${name}" accepts at most ${MAX_FILTER_VALUES} values`);
  return values;
}

function single(raw: unknown, name: string): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== "string") throw new ValidationError(`"${name}" must be a single value`);
  return raw.trim();
}

function int(raw: unknown, name: string, fallback: number, min: number, max: number): number {
  const s = single(raw, name);
  if (!s) return fallback;
  const n = Number(s);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ValidationError(`"${name}" must be an integer between ${min} and ${max}`);
  }
  return n;
}

export function parseFilters(query: Raw): Filters {
  const q = single(query.q, "q") ?? "";
  if (q.length > MAX_QUERY_LENGTH) throw new ValidationError(`"q" must be at most ${MAX_QUERY_LENGTH} characters`);
  return {
    q,
    nationalities: list(query.nationalities, "nationalities"),
    hobbies: list(query.hobbies, "hobbies"),
  };
}

export function parseListParams(query: Raw): ListParams {
  const sort = single(query.sort, "sort") || "first_name";
  if (!(SORT_FIELDS as readonly string[]).includes(sort)) {
    throw new ValidationError(`"sort" must be one of ${SORT_FIELDS.join(", ")}`);
  }
  const order = (single(query.order, "order") || "asc").toLowerCase();
  if (order !== "asc" && order !== "desc") throw new ValidationError(`"order" must be "asc" or "desc"`);

  return {
    ...parseFilters(query),
    sort: sort as SortField,
    order,
    page: int(query.page, "page", 1, 1, 1_000_000),
    pageSize: int(query.pageSize, "pageSize", DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
  };
}
