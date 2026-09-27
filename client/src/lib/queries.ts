import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchFacets, fetchUsers, type Filters, type Sort } from "./api";

/**
 * Both queries are keyed on the filter state, so any change to the text or
 * selected filters refetches the list from page 1 and the sidebar facets.
 * Previous data stays on screen (dimmed) while the new results load.
 */
export function useUsers(filters: Filters, sort: Sort) {
  return useInfiniteQuery({
    queryKey: ["users", filters, sort],
    queryFn: ({ pageParam, signal }) => fetchUsers(filters, sort, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useFacets(filters: Filters) {
  return useQuery({
    queryKey: ["facets", filters],
    queryFn: ({ signal }) => fetchFacets(filters, signal),
    placeholderData: keepPreviousData,
  });
}
