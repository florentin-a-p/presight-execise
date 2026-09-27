import { Divider, Stack } from "@mantine/core";
import { toggle, type DirectoryState, type UpdateState } from "../lib/directoryState";
import { useFacets } from "../lib/queries";
import { FacetGroup } from "./FacetGroup";

interface Props {
  state: DirectoryState;
  onChange: UpdateState;
}

export function FilterSidebar({ state, onChange }: Props) {
  const { q, nationalities, hobbies } = state;
  const facets = useFacets({ q, nationalities, hobbies });
  const shared = {
    isLoading: facets.isPending,
    error: facets.error,
    onRetry: () => void facets.refetch(),
  };

  return (
    <Stack gap="lg" style={{ opacity: facets.isPlaceholderData ? 0.6 : 1, transition: "opacity 150ms" }}>
      <FacetGroup
        title="Nationality"
        hint="Matches any selected · top 20"
        values={facets.data?.nationalities}
        selected={nationalities}
        onToggle={(v) => onChange((s) => ({ nationalities: toggle(s.nationalities, v) }))}
        onClear={() => onChange({ nationalities: [] })}
        {...shared}
      />
      <Divider />
      <FacetGroup
        title="Hobbies"
        hint="Matches all selected · top 20"
        values={facets.data?.hobbies}
        selected={hobbies}
        onToggle={(v) => onChange((s) => ({ hobbies: toggle(s.hobbies, v) }))}
        onClear={() => onChange({ hobbies: [] })}
        {...shared}
      />
    </Stack>
  );
}
