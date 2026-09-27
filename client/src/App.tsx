import { AppShell, Burger, Group, Indicator, Loader, Text, ThemeIcon, Title, useMantineTheme } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconUsers } from "@tabler/icons-react";
import { useCallback, useMemo } from "react";
import { ActiveFilters } from "./components/ActiveFilters";
import { ColorSchemeToggle } from "./components/ColorSchemeToggle";
import { FilterSidebar } from "./components/FilterSidebar";
import { SearchInput } from "./components/SearchInput";
import { SortControl } from "./components/SortControl";
import { UserList } from "./components/UserList";
import { useDirectoryState } from "./lib/directoryState";
import { useUsers } from "./lib/queries";

export default function App() {
  const theme = useMantineTheme();
  const [navOpen, { toggle: toggleNav }] = useDisclosure(false);
  const [state, update] = useDirectoryState();
  const { q, nationalities, hobbies, sort, order } = state;

  const filters = useMemo(() => ({ q, nationalities, hobbies }), [q, nationalities, hobbies]);
  const sorting = useMemo(() => ({ sort, order }), [sort, order]);
  const users = useUsers(filters, sorting);

  const list = useMemo(() => users.data?.pages.flatMap((p) => p.data) ?? [], [users.data]);
  const total = users.data?.pages[0]?.meta.total;
  const filterCount = nationalities.length + hobbies.length;
  const hasFilters = Boolean(q) || filterCount > 0;

  // Typing replaces the history entry; discrete filter/sort changes push one.
  const setQuery = useCallback((value: string) => update({ q: value }, { replace: true }), [update]);
  const clearFilters = useCallback(() => update({ q: "", nationalities: [], hobbies: [] }), [update]);

  return (
    <AppShell
      header={{ height: theme.other.headerHeight }}
      navbar={{ width: theme.other.sidebarWidth, breakpoint: "sm", collapsed: { mobile: !navOpen } }}
      padding={0}
    >
      <AppShell.Header px="md">
        <Group h="100%" gap="sm" wrap="nowrap">
          <Indicator label={filterCount} size={16} disabled={filterCount === 0} hiddenFrom="sm">
            <Burger opened={navOpen} onClick={toggleNav} size="sm" aria-label="Toggle filters" />
          </Indicator>
          <Group gap="xs" wrap="nowrap" visibleFrom="xs">
            <ThemeIcon size="lg" radius="md">
              <IconUsers size={18} />
            </ThemeIcon>
            <Title order={4} visibleFrom="md" style={{ whiteSpace: "nowrap" }}>
              People Directory
            </Title>
          </Group>
          <div style={{ flex: 1, maxWidth: 560, marginInline: "auto" }}>
            <SearchInput value={q} onChange={setQuery} />
          </div>
          <ColorSchemeToggle />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollAreaSection}>
          <FilterSidebar state={state} onChange={update} />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
        <Group justify="space-between" px="md" pt="md" pb="xs" gap="sm">
          <Group gap="xs">
            <Text fw={600} aria-live="polite">
              {total == null ? "Loading people…" : `${total.toLocaleString()} ${total === 1 ? "person" : "people"}`}
            </Text>
            {users.isFetching && !users.isFetchingNextPage && total != null && <Loader size="xs" />}
          </Group>
          <SortControl sort={sort} order={order} onChange={(s) => update(s)} />
        </Group>
        {hasFilters && (
          <Group px="md" pb="sm" gap={0}>
            <ActiveFilters state={state} onChange={update} />
          </Group>
        )}

        <UserList
          users={list}
          resetKey={JSON.stringify([filters, sorting])}
          highlightHobbies={hobbies}
          isLoading={users.isPending}
          isStale={users.isPlaceholderData}
          error={users.isFetchNextPageError ? null : users.error}
          onRetry={() => void users.refetch()}
          hasNextPage={users.hasNextPage}
          isFetchingNextPage={users.isFetchingNextPage}
          nextPageError={users.isFetchNextPageError ? users.error : null}
          fetchNextPage={() => void users.fetchNextPage()}
          onClearFilters={hasFilters ? clearFilters : undefined}
        />
      </AppShell.Main>
    </AppShell>
  );
}

function ScrollAreaSection(props: React.ComponentProps<"div">) {
  return <div {...props} style={{ ...props.style, overflowY: "auto", marginInline: -16, paddingInline: 16 }} />;
}
