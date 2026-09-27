/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": process.env.API_URL ?? "http://localhost:4000" },
  },
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks so app changes don't bust library caches.
        manualChunks: {
          react: ["react", "react-dom", "react-router"],
          mantine: ["@mantine/core", "@mantine/hooks"],
          tanstack: ["@tanstack/react-query", "@tanstack/react-virtual"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
