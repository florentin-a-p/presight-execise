import { ActionIcon, Group, Select, Tooltip } from "@mantine/core";
import { IconSortAscending, IconSortDescending } from "@tabler/icons-react";
import { SORT_FIELDS, type Sort, type SortField } from "../lib/api";

const LABELS: Record<SortField, string> = {
  first_name: "First name",
  last_name: "Last name",
  age: "Age",
  nationality: "Nationality",
};

interface Props extends Sort {
  onChange: (sort: Partial<Sort>) => void;
}

export function SortControl({ sort, order, onChange }: Props) {
  const next = order === "asc" ? "desc" : "asc";
  const directionLabel = order === "asc" ? "Ascending" : "Descending";

  return (
    <Group gap={6} wrap="nowrap">
      <Select
        aria-label="Sort by"
        data={SORT_FIELDS.map((value) => ({ value, label: LABELS[value] }))}
        value={sort}
        onChange={(value) => value && onChange({ sort: value as SortField })}
        allowDeselect={false}
        w={150}
        size="sm"
        leftSection={<span style={{ fontSize: "var(--mantine-font-size-xs)" }}>Sort</span>}
        leftSectionWidth={44}
        comboboxProps={{ withinPortal: true }}
      />
      <Tooltip label={`${directionLabel} — switch to ${next === "asc" ? "ascending" : "descending"}`}>
        <ActionIcon size={36} onClick={() => onChange({ order: next })} aria-label={`Sort direction: ${directionLabel}`}>
          {order === "asc" ? <IconSortAscending size={18} /> : <IconSortDescending size={18} />}
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
