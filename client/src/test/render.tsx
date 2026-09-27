import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { theme } from "../theme";

export let currentSearch = "";

function LocationSpy() {
  currentSearch = useLocation().search;
  return null;
}

export function renderWithProviders(ui: ReactNode, { url = "/" } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MantineProvider theme={theme}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[url]}>
          {ui}
          <LocationSpy />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>,
  );
}
