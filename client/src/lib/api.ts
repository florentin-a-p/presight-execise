export const SORT_FIELDS = ["first_name", "last_name", "age", "nationality"] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";

export interface User {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  hobbies: string[];
}

export interface UserPage {
  data: User[];
  meta: { page: number; pageSize: number; total: number; totalPages: number; hasMore: boolean };
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface Facets {
  hobbies: FacetValue[];
  nationalities: FacetValue[];
}

export interface Filters {
  q: string;
  nationalities: string[];
  hobbies: string[];
}

export interface Sort {
  sort: SortField;
  order: SortOrder;
}

export const PAGE_SIZE = 50;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function filterParams({ q, nationalities, hobbies }: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (nationalities.length) params.set("nationalities", nationalities.join(","));
  if (hobbies.length) params.set("hobbies", hobbies.join(","));
  return params;
}

async function getJson<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const qs = params.toString();
  const res = await fetch(qs ? `${path}?${qs}` : path, { signal, headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status);
  return body as T;
}

export function fetchUsers(filters: Filters, sort: Sort, page: number, signal?: AbortSignal) {
  const params = filterParams(filters);
  params.set("sort", sort.sort);
  params.set("order", sort.order);
  params.set("page", String(page));
  params.set("pageSize", String(PAGE_SIZE));
  return getJson<UserPage>("/api/users", params, signal);
}

export function fetchFacets(filters: Filters, signal?: AbortSignal) {
  return getJson<Facets>("/api/facets", filterParams(filters), signal);
}
