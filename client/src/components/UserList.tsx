import { Box, Button, Center, Group, Loader, Text, useMantineTheme } from "@mantine/core";
import { useElementSize, useMergedRef } from "@mantine/hooks";
import { IconRefresh } from "@tabler/icons-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import type { User } from "../lib/api";
import { EmptyState, ErrorState, ListSkeleton } from "./ListStates";
import { UserCard } from "./UserCard";

const GAP = 12;
/** Start loading the next page when this many rows remain below the viewport. */
const PREFETCH_ROWS = 4;

export function columnsFor(width: number) {
  if (width >= 1100) return 3;
  if (width >= 640) return 2;
  return 1;
}

interface Props {
  users: User[];
  /** Changes whenever filters/sort change; used to reset scroll position. */
  resetKey: string;
  highlightHobbies: string[];
  isLoading: boolean;
  isStale: boolean;
  error: Error | null;
  onRetry: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  nextPageError: Error | null;
  fetchNextPage: () => void;
  onClearFilters?: () => void;
}

export function UserList(props: Props) {
  const { users, resetKey, highlightHobbies, hasNextPage, isFetchingNextPage, nextPageError, fetchNextPage } = props;
  const theme = useMantineTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { ref: sizeRef, width } = useElementSize();
  const ref = useMergedRef(scrollRef, sizeRef);

  const columns = columnsFor(width || 1);
  const dataRows = Math.ceil(users.length / columns);
  // One extra row at the end for the "loading more" / retry footer.
  const showFooter = hasNextPage || Boolean(nextPageError);
  const rowCount = dataRows + (showFooter ? 1 : 0);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => theme.other.userCardHeight + GAP,
    overscan: 4,
  });

  const items = virtualizer.getVirtualItems();
  const lastIndex = items.length ? items[items.length - 1].index : -1;

  useEffect(() => {
    if (lastIndex >= dataRows - PREFETCH_ROWS && hasNextPage && !isFetchingNextPage && !nextPageError) {
      fetchNextPage();
    }
  }, [lastIndex, dataRows, hasNextPage, isFetchingNextPage, nextPageError, fetchNextPage]);

  useEffect(() => {
    virtualizer.scrollToOffset(0);
  }, [resetKey, virtualizer]);

  useEffect(() => {
    virtualizer.measure();
  }, [columns, virtualizer]);

  let body: React.ReactNode;
  if (props.error) {
    body = <ErrorState message={props.error.message} onRetry={props.onRetry} />;
  } else if (props.isLoading) {
    body = <ListSkeleton columns={columns} />;
  } else if (users.length === 0) {
    body = <EmptyState onClear={props.onClearFilters} />;
  } else {
    body = (
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: "relative",
          opacity: props.isStale ? 0.55 : 1,
          transition: "opacity 150ms",
        }}
        role="list"
        aria-busy={props.isStale}
      >
        {items.map((row) => {
          const isFooter = row.index >= dataRows;
          return (
            <div
              key={row.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: row.size,
                transform: `translateY(${row.start}px)`,
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: GAP,
                paddingBottom: GAP,
              }}
            >
              {isFooter ? (
                <Center style={{ gridColumn: "1 / -1" }}>
                  {nextPageError ? (
                    <Group gap="xs">
                      <Text size="sm" c="red">
                        Couldn't load more people.
                      </Text>
                      <Button size="xs" variant="light" leftSection={<IconRefresh size={14} />} onClick={fetchNextPage}>
                        Retry
                      </Button>
                    </Group>
                  ) : (
                    <Group gap="xs">
                      <Loader size="sm" />
                      <Text size="sm" c="dimmed">
                        Loading more…
                      </Text>
                    </Group>
                  )}
                </Center>
              ) : (
                users.slice(row.index * columns, row.index * columns + columns).map((user) => (
                  <div role="listitem" key={user.id}>
                    <UserCard user={user} highlight={highlightHobbies} />
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Box ref={ref} flex={1} mih={0} px="md" pt={4} pb="md" style={{ overflowY: "auto", overscrollBehavior: "contain" }}>
      {body}
      {!showFooter && users.length > 0 && !props.isLoading && (
        <Text ta="center" size="xs" c="dimmed" py="md">
          You've reached the end · {users.length.toLocaleString()} people
        </Text>
      )}
    </Box>
  );
}
