import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router";
import { SORT_FIELDS, type Filters, type Sort, type SortField } from "./api";

export interface DirectoryState extends Filters, Sort {}

/** A partial state, or a function deriving one from the latest state. */
export type StatePatch = Partial<DirectoryState> | ((current: DirectoryState) => Partial<DirectoryState>);
export type UpdateState = (patch: StatePatch, options?: { replace?: boolean }) => void;

export const DEFAULT_SORT: Sort = { sort: "first_name", order: "asc" };

const list = (value: string | null) =>
  [...new Set((value ?? "").split(",").map((v) => v.trim()).filter(Boolean))];

/** URL query string -> view state. Unknown or invalid values fall back to defaults. */
export function parseState(params: URLSearchParams): DirectoryState {
  const sort = params.get("sort");
  const order = params.get("order");
  return {
    q: (params.get("q") ?? "").trim(),
    nationalities: list(params.get("nationalities")),
    hobbies: list(params.get("hobbies")),
    sort: (SORT_FIELDS as readonly string[]).includes(sort ?? "") ? (sort as SortField) : DEFAULT_SORT.sort,
    order: order === "asc" || order === "desc" ? order : DEFAULT_SORT.order,
  };
}

/** View state -> URL query string. Defaults and empty values are omitted to keep URLs short. */
export function serializeState(state: DirectoryState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.nationalities.length) params.set("nationalities", state.nationalities.join(","));
  if (state.hobbies.length) params.set("hobbies", state.hobbies.join(","));
  if (state.sort !== DEFAULT_SORT.sort) params.set("sort", state.sort);
  if (state.order !== DEFAULT_SORT.order) params.set("order", state.order);
  return params;
}

/**
 * The URL is the single source of truth for the directory view, so reloads,
 * shared links and back/forward all restore the same list.
 */
export function useDirectoryState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const key = searchParams.toString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const state = useMemo(() => parseState(searchParams), [key]);

  // Latest state including updates not yet rendered. Render-time state (and
  // react-router's `prev`) lag behind, so two quick updates (e.g. rapid clicks)
  // before a re-render would otherwise overwrite each other.
  const latest = useRef(state);
  useLayoutEffect(() => {
    latest.current = state;
  }, [state]);

  const update = useCallback<UpdateState>(
    (patch, { replace = false } = {}) => {
      const changes = typeof patch === "function" ? patch(latest.current) : patch;
      latest.current = { ...latest.current, ...changes };
      setSearchParams(serializeState(latest.current), { replace });
    },
    [setSearchParams],
  );

  return [state, update] as const;
}

export const toggle = (values: string[], value: string) =>
  values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
