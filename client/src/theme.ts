import {
  ActionIcon,
  Badge,
  Card,
  Chip,
  createTheme,
  type MantineColorsTuple,
  SegmentedControl,
  TextInput,
} from "@mantine/core";

// Brand indigo, generated as a 10-shade Mantine tuple (index 6 is the primary shade).
const brand: MantineColorsTuple = [
  "#eef0ff",
  "#dbdcfa",
  "#b3b6ef",
  "#898ee5",
  "#666cdc",
  "#5056d7",
  "#444ad6",
  "#363cbe",
  "#2e35aa",
  "#232d97",
];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 5 },
  colors: { brand },
  defaultRadius: "md",
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headings: { fontWeight: "650" },
  cursorType: "pointer",
  other: {
    /** Fixed card height the virtualized list relies on for row sizing. */
    userCardHeight: 132,
    headerHeight: 64,
    sidebarWidth: 300,
  },
  components: {
    Card: Card.extend({
      defaultProps: { withBorder: true, padding: "md", radius: "md" },
    }),
    Badge: Badge.extend({
      defaultProps: { variant: "light", radius: "sm", tt: "none", fw: 500 },
    }),
    Chip: Chip.extend({
      defaultProps: { size: "xs", radius: "sm", variant: "light" },
    }),
    TextInput: TextInput.extend({
      defaultProps: { radius: "md" },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: { variant: "default", radius: "md" },
    }),
    SegmentedControl: SegmentedControl.extend({
      defaultProps: { radius: "md" },
    }),
  },
});

export type AppTheme = typeof theme;
