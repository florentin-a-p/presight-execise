import path from "node:path";
import { createApp } from "./app.js";
import { DEFAULT_DB_PATH, openDb, userCount } from "./db.js";
import { seed } from "./seed.js";

const PORT = Number(process.env.PORT ?? 4000);
const STATIC_DIR = process.env.STATIC_DIR ?? path.resolve(import.meta.dirname, "../../client/dist");

const db = openDb();
if (userCount(db) === 0) {
  const count = Number(process.env.SEED_COUNT ?? 10_000);
  console.log(`Database ${DEFAULT_DB_PATH} is empty, seeding ${count} users...`);
  seed(db, { count });
}

const server = createApp(db, { staticDir: STATIC_DIR }).listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT} (${userCount(db)} users)`);
});

const shutdown = () => server.close(() => { db.close(); process.exit(0); });
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
