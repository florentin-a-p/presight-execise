import { Button, Group, Pill } from "@mantine/core";
import type { DirectoryState, UpdateState } from "../lib/directoryState";

interface Props {
  state: DirectoryState;
  onChange: UpdateState;
}

export function ActiveFilters({ state, onChange }: Props) {
  const { q, nationalities, hobbies } = state;
  if (!q && !nationalities.length && !hobbies.length) return null;

  return (
    <Group gap={6} aria-label="Active filters">
      {q && (
        <Pill withRemoveButton onRemove={() => onChange({ q: "" })} removeButtonProps={{ "aria-label": "Remove search" }}>
          “{q}”
        </Pill>
      )}
      {nationalities.map((n) => (
        <Pill
          key={`n:${n}`}
          withRemoveButton
          onRemove={() => onChange((s) => ({ nationalities: s.nationalities.filter((v) => v !== n) }))}
          removeButtonProps={{ "aria-label": `Remove nationality ${n}` }}
        >
          {n}
        </Pill>
      ))}
      {hobbies.map((h) => (
        <Pill
          key={`h:${h}`}
          withRemoveButton
          onRemove={() => onChange((s) => ({ hobbies: s.hobbies.filter((v) => v !== h) }))}
          removeButtonProps={{ "aria-label": `Remove hobby ${h}` }}
          bg="var(--mantine-primary-color-light)"
        >
          {h}
        </Pill>
      ))}
      <Button variant="subtle" size="compact-xs" onClick={() => onChange({ q: "", nationalities: [], hobbies: [] })}>
        Clear all
      </Button>
    </Group>
  );
}
