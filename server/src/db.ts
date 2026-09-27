import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type DB = Database.Database;

export const DEFAULT_DB_PATH = process.env.DB_PATH ?? path.resolve(process.cwd(), "data", "users.db");

// Hobbies are normalized into their own table so "has all selected hobbies"
// and per-hobby facet counts are plain indexed joins instead of string parsing.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY,
  avatar      TEXT    NOT NULL,
  first_name  TEXT    NOT NULL,
  last_name   TEXT    NOT NULL,
  age         INTEGER NOT NULL,
  nationality TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS hobbies (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_hobbies (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hobby_id INTEGER NOT NULL REFERENCES hobbies(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, hobby_id)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_user_hobbies_hobby ON user_hobbies(hobby_id, user_id);
CREATE INDEX IF NOT EXISTS idx_users_first_name  ON users(first_name COLLATE NOCASE, id);
CREATE INDEX IF NOT EXISTS idx_users_last_name   ON users(last_name COLLATE NOCASE, id);
CREATE INDEX IF NOT EXISTS idx_users_age         ON users(age, id);
CREATE INDEX IF NOT EXISTS idx_users_nationality ON users(nationality, id);
`;

export function openDb(file: string = DEFAULT_DB_PATH): DB {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export function userCount(db: DB): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
}
