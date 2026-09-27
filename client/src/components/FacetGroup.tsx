import { Alert, Badge, Button, Checkbox, Group, ScrollArea, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { FacetValue } from "../lib/api";
import classes from "./FacetGroup.module.css";

interface Props {
  title: string;
  hint: string;
  values: FacetValue[] | undefined;
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function FacetGroup({ title, hint, values, selected, onToggle, onClear, isLoading, error, onRetry }: Props) {
  // Keep selected values visible (and removable) even if they fall out of the top 20.
  const listed = new Set(values?.map((v) => v.value));
  const rows: { value: string; count: number | null }[] = [
    ...selected.filter((v) => !listed.has(v)).map((value) => ({ value, count: null })),
    ...(values ?? []),
  ];

  return (
    <Stack gap={6} component="section" aria-label={title}>
      <Group justify="space-between" align="baseline">
        <div>
          <Text fw={600} size="sm">
            {title}
          </Text>
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        </div>
        {selected.length > 0 && (
          <Button variant="subtle" size="compact-xs" onClick={onClear}>
            Clear
          </Button>
        )}
      </Group>

      {error ? (
        <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
          <Text size="xs">Couldn't load {title.toLowerCase()}.</Text>
          <Button size="compact-xs" variant="light" color="red" mt={6} onClick={onRetry}>
            Retry
          </Button>
        </Alert>
      ) : isLoading ? (
        <Stack gap={8} py={4}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} h={18} radius="sm" />
          ))}
        </Stack>
      ) : rows.length === 0 ? (
        <Text size="xs" c="dimmed" py={4}>
          No values in the current results.
        </Text>
      ) : (
        <ScrollArea.Autosize mah={360} type="auto" offsetScrollbars>
          <Stack gap={2}>
            {rows.map(({ value, count }) => {
              const checked = selected.includes(value);
              return (
                <UnstyledButton
                  key={value}
                  className={classes.row}
                  data-checked={checked || undefined}
                  onClick={() => onToggle(value)}
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={`${value}${count == null ? "" : `, ${count} people`}`}
                >
                  <Group gap="xs" wrap="nowrap">
                    <Checkbox checked={checked} readOnly tabIndex={-1} size="xs" aria-hidden />
                    <Text size="sm" truncate="end" flex={1}>
                      {value}
                    </Text>
                    <Badge size="sm" variant={checked ? "filled" : "light"} color={checked ? undefined : "gray"}>
                      {count == null ? "–" : count.toLocaleString()}
                    </Badge>
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>
        </ScrollArea.Autosize>
      )}
    </Stack>
  );
}
