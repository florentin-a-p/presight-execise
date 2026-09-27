import express, { type ErrorRequestHandler } from "express";
import fs from "node:fs";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import type { DB } from "./db.js";
import { openApiSpec } from "./openapi.js";
import { parseFilters, parseListParams, ValidationError } from "./params.js";
import { getFacets, listUsers } from "./users.js";

export interface AppOptions {
  /** Directory of the built client; served with SPA fallback when present. */
  staticDir?: string;
}

export function createApp(db: DB, { staticDir }: AppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/users", (req, res) => {
    res.json(listUsers(db, parseListParams(req.query)));
  });

  app.get("/api/facets", (req, res) => {
    res.json(getFacets(db, parseFilters(req.query)));
  });

  app.get("/api/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: "People Directory API",
      swaggerOptions: { displayRequestDuration: true, tryItOutEnabled: true },
    }),
  );

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir, { index: false, maxAge: "1h" }));
    app.get("/{*splat}", (_req, res) => res.sendFile(path.join(staticDir, "index.html")));
  }

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  };
  app.use(onError);

  return app;
}
