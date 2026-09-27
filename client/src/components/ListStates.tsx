import { Alert, Button, Card, Center, Group, SimpleGrid, Skeleton, Stack, Text, ThemeIcon, useMantineTheme } from "@mantine/core";
import { IconAlertTriangle, IconRefresh, IconUserSearch } from "@tabler/icons-react";

export function ListSkeleton({ columns }: { columns: number }) {
  const theme = useMantineTheme();
  return (
    <SimpleGrid cols={columns} spacing="sm" aria-busy="true" aria-label="Loading people">
      {Array.from({ length: columns * 6 }, (_, i) => (
        <Card key={i} h={theme.other.userCardHeight}>
          <Group wrap="nowrap" align="flex-start">
            <Skeleton circle h={56} w={56} />
            <Stack gap={8} flex={1}>
              <Skeleton h={14} w="70%" />
              <Skeleton h={10} w="50%" />
              <Group gap={6} mt={18}>
                <Skeleton h={18} w={64} radius="sm" />
                <Skeleton h={18} w={56} radius="sm" />
              </Group>
            </Stack>
          </Group>
        </Card>
      ))}
    </SimpleGrid>
  );
}

export function EmptyState({ onClear }: { onClear?: () => void }) {
  return (
    <Center py={80}>
      <Stack align="center" gap="xs" maw={320} ta="center">
        <ThemeIcon size={56} radius="xl" variant="light">
          <IconUserSearch size={28} />
        </ThemeIcon>
        <Text fw={600}>No people match your filters</Text>
        <Text size="sm" c="dimmed">
          Try a different name or remove some of the selected nationalities and hobbies.
        </Text>
        {onClear && (
          <Button variant="light" mt="xs" onClick={onClear}>
            Clear all filters
          </Button>
        )}
      </Stack>
    </Center>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Center py={80}>
      <Alert
        color="red"
        variant="light"
        title="Couldn't load people"
        icon={<IconAlertTriangle />}
        maw={420}
        w="100%"
        role="alert"
      >
        <Text size="sm">{message}</Text>
        <Button mt="sm" size="xs" color="red" variant="light" leftSection={<IconRefresh size={14} />} onClick={onRetry}>
          Try again
        </Button>
      </Alert>
    </Center>
  );
}
