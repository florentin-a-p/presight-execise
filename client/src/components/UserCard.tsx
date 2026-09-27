import { Avatar, Badge, Card, Group, Stack, Text, Tooltip, useMantineTheme } from "@mantine/core";
import { memo } from "react";
import type { User } from "../lib/api";

const VISIBLE_HOBBIES = 2;

interface Props {
  user: User;
  /** Hobbies currently used as filters; shown first and emphasized. */
  highlight?: string[];
}

export const UserCard = memo(function UserCard({ user, highlight = [] }: Props) {
  const theme = useMantineTheme();
  const name = `${user.first_name} ${user.last_name}`;
  const hobbies = [...user.hobbies].sort((a, b) => Number(highlight.includes(b)) - Number(highlight.includes(a)));
  const visible = hobbies.slice(0, VISIBLE_HOBBIES);
  const rest = hobbies.slice(VISIBLE_HOBBIES);

  return (
    <Card h={theme.other.userCardHeight} component="article" aria-label={name}>
      <Group wrap="nowrap" align="flex-start" gap="md" h="100%">
        {/* Falls back to colored initials if the image fails to load. */}
        <Avatar src={user.avatar} alt="" size={56} radius="xl" color="initials" name={name} />

        <Stack gap={2} flex={1} miw={0} h="100%">
          <Text fw={600} truncate="end" title={name}>
            {name}
          </Text>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Text size="sm" c="dimmed" truncate="end">
              {user.nationality}
            </Text>
            <Text size="sm" c="dimmed" style={{ flexShrink: 0 }} aria-label={`Age ${user.age}`}>
              {user.age}
            </Text>
          </Group>

          <Group gap={6} mt="auto" wrap="nowrap" data-testid="hobbies">
            {visible.length === 0 && (
              <Text size="xs" c="dimmed" fs="italic">
                No hobbies
              </Text>
            )}
            {visible.map((hobby) => (
              <Badge
                key={hobby}
                variant={highlight.includes(hobby) ? "filled" : "light"}
                style={{ minWidth: 0 }}
                title={hobby}
              >
                {hobby}
              </Badge>
            ))}
            {rest.length > 0 && (
              <Tooltip label={rest.join(", ")} multiline maw={240} withArrow>
                <Badge variant="outline" color="gray" style={{ flexShrink: 0 }} aria-label={`${rest.length} more hobbies`}>
                  +{rest.length}
                </Badge>
              </Tooltip>
            )}
          </Group>
        </Stack>
      </Group>
    </Card>
  );
});
