import { CloseButton, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Keeps keystrokes local and pushes the trimmed value upstream after a short
 * debounce. External changes (back/forward, "clear all") flow back in without
 * clobbering text the user is still typing.
 */
export function SearchInput({ value, onChange }: Props) {
  const [text, setText] = useState(value);
  const [debounced] = useDebouncedValue(text.trim(), 300);
  const lastSent = useRef(value);

  useEffect(() => {
    if (debounced !== lastSent.current) {
      lastSent.current = debounced;
      onChange(debounced);
    }
  }, [debounced, onChange]);

  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value;
      setText(value);
    }
  }, [value]);

  return (
    <TextInput
      type="search"
      placeholder="Search by first or last name"
      aria-label="Search by first or last name"
      leftSection={<IconSearch size={16} />}
      value={text}
      onChange={(e) => setText(e.currentTarget.value)}
      onKeyDown={(e) => e.key === "Escape" && setText("")}
      rightSection={text ? <CloseButton size="sm" aria-label="Clear search" onClick={() => setText("")} /> : null}
      maxLength={100}
      w="100%"
    />
  );
}
