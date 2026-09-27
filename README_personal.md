# Presight Frontend Exercise: People Directory

A searchable, filterable, infinitely scrolling user directory.

- **Server:** Node.js, Express 5, TypeScript, SQLite (`better-sqlite3`), OpenAPI 3.1 + Swagger UI
- **Client:** React 19, Mantine 8 (themed, light/dark), TanStack Query, TanStack Virtual, React Router (state in the URL)
- **Tests:** Vitest (API tests against a seeded in-memory database; client tests with Testing Library)

## Quick start

### Docker Compose

```bash
docker compose up --build
```

Open http://localhost:3000 (API docs at http://localhost:3000/api/docs). On first start the container seeds 10,000 users into a SQLite database on the `db-data` volume. Later starts reuse it.

| Variable     | Default | Purpose                                   |
| ------------ | ------- | ----------------------------------------- |
| `PORT`       | `3000`  | Host port                                 |
| `SEED_COUNT` | `10000` | Number of users seeded on first start     |

Reseed the running container, or start over:

```bash
docker compose exec app node dist/seed.js 20000   # replace the data with 20k users
docker compose down -v                            # remove the volume; next start reseeds
docker compose exec app sqlite3 /data/users.db    # open the database with the sqlite3 CLI
```

### Local development

Requires Node.js 20+ and Yarn 1.

```bash
yarn install
yarn seed          # optional: the server also seeds automatically if the DB is empty
yarn dev           # API on :4000, Vite on http://localhost:5173 (proxies /api)
```

| Command                     | What it does                                                        |
| --------------------------- | ------------------------------------------------------------------- |
| `yarn seed [count]`         | (Re)create `server/data/users.db` with `count` users (default 10k)  |
| `yarn test`                 | Server and client test suites                                       |
| `yarn build && yarn start`  | Production build; Express serves the API and the built client on :4000 |

The server reads `PORT` (default `4000`) and `DB_PATH` (default `server/data/users.db`).

## API

Interactive docs (Swagger UI) are at **`/api/docs`**: http://localhost:3000/api/docs with Docker, or http://localhost:4000/api/docs in development. The raw OpenAPI 3.1 spec is at `/api/openapi.json`. The spec lives in `server/src/openapi.ts` and reuses the validator's limits and enums, and a test checks real responses against its schemas so the docs can't silently drift.

### `GET /api/users`

| Param           | Example                  | Notes                                                |
| --------------- | ------------------------ | ---------------------------------------------------- |
| `q`             | `ann smi`                | Every term must match `first_name` or `last_name` (case-insensitive substring) |
| `nationalities` | `French,Dutch`           | Match **any** (comma-separated or repeated param)    |
| `hobbies`       | `Chess,Yoga`             | Match **all**                                        |
| `sort`          | `first_name` \| `last_name` \| `age` \| `nationality` | Default `first_name` |
| `order`         | `asc` \| `desc`           | Default `asc`                                        |
| `page`          | `1`                      | 1-based                                              |
| `pageSize`      | `50`                     | 1–100, default 50                                    |

```json
{
  "data": [{ "id": 1, "avatar": "…", "first_name": "Ada", "last_name": "Lovelace", "age": 36, "nationality": "British", "hobbies": ["Chess"] }],
  "meta": { "page": 1, "pageSize": 50, "total": 1234, "totalPages": 25, "hasMore": true }
}
```

Results are ordered by the sort field, then by `id`, so the order is total and offset pages never duplicate or skip users. Invalid parameters return `400 { "error": "…" }`.

### `GET /api/facets`

Takes the same `q`, `nationalities` and `hobbies` parameters. Returns the top 20 of each, as `{ value, count }`, sorted by count and then by name:

- **Hobbies** count the current result set, with every filter applied.
- **Nationalities** apply the text and hobby filters but not the nationality selection itself. Nationalities combine with OR, so with every filter applied, picking one nationality would hide all the others and you could never add a second. Leaving out the facet's own selection ("disjunctive faceting") keeps the other options available. The counts of the selected nationalities still add up to the list total.

## Design notes

- **Schema:** `users`, `hobbies` and a `user_hobbies` join table (primary key `(user_id, hobby_id)`, plus an index on `(hobby_id, user_id)`). "Has all selected hobbies" is a `GROUP BY … HAVING COUNT(*) = n` subquery, and hobby facets are an indexed join. The list and the facets share one `WHERE` builder, so the counts and the list can't disagree. The seed is deterministic (faker, fixed seed) with skewed distributions, so facet counts vary.
- **URL as source of truth:** `q`, `nationalities`, `hobbies`, `sort` and `order` live in the query string, and defaults are left out. Reloading, sharing a link, or using back/forward restores the view. Typing is debounced (300 ms) and replaces the history entry. Filter and sort changes push a new one.
- **Data fetching:** TanStack Query keys both queries on the filter state, so any change refetches page 1 and the facets. The previous results stay visible, dimmed, while new ones load.
- **Virtualized list:** `@tanstack/react-virtual` virtualizes rows of fixed-height cards. The number of columns (1–3) follows the container width. The next page is requested when the viewport gets within 4 rows of the end, and a footer row shows loading or a retry.
- **States:** skeleton cards on first load, a dimmed list while refetching, an empty state with "Clear all filters", error states with retry for the list, the next page and the facets. Client errors (4xx) are not retried.
- **Theme:** `client/src/theme.ts` sets the Mantine theme: brand color, radius, typography, component defaults and layout sizes. Light and dark modes follow the OS, with a toggle in the header.
- **Responsive:** on small screens the filter sidebar collapses behind a burger button with an active-filter count badge.

---

# Exercise brief

Build a small full-stack user directory application. The goal is to evaluate how you design a searchable, filterable, paginated UI backed by persisted data and clear API boundaries.

The application should include:

- A React client.
- A Node.js API server.
- A SQLite database used as the source of truth for user data.
- Docker configuration for running the application locally.

## Scenario

Users need to browse a large directory of people, search by name, and narrow results by nationality and hobbies. The filter sidebar should help users discover useful filters based on the result set they are currently viewing.

## Requirements

### Data Model

Seed a SQLite database with enough records to make pagination, infinite scroll, search, and filter counts meaningful.

Each user should have:

- `avatar`
- `first_name`
- `last_name`
- `age`
- `nationality`
- `hobbies`, from 0 to 10 hobbies per user

Choose a data model that supports the required behavior.

SQLite must be the persisted source of user data.

### API

Expose an API that supports:

- Paginated user results.
- Text filtering from user input across `first_name` and `last_name`.
- Filtering by one or more nationalities.
- Filtering by one or more hobbies.
- Sorting by `first_name`, `last_name`, `age`, and `nationality`.
- Pagination metadata so the client can determine whether more results are available.
- Top 20 hobbies for the active text filter and filter state, including `{ value, count }`.
- Top 20 nationalities for the active text filter and filter state, including `{ value, count }`.

The top 20 values and counts must reflect the currently applied text filter and selected filters, not the global dataset.

Filter semantics:

- Multiple selected hobbies should match users who have all selected hobbies.
- Multiple selected nationalities should match users from any selected nationality.
- Text, hobby, and nationality filters should apply together.

Sorting semantics:

- Sorted results must be deterministic. Use `id` as a final tie-breaker when values are equal.
- Pagination must respect the active sort without duplicate or missing users.

### Client

Build a React interface that includes:

- A text filter input for `first_name` and `last_name`.
- A virtualized, infinitely scrolling list of user cards.
- A sidebar containing the top 20 hobbies and top 20 nationalities for the current result set, including counts.
- Controls for applying and removing hobby and nationality filters.
- Controls for choosing sort field and sort direction.
- Loading, empty, and error states.
- A responsive layout that remains usable on desktop and mobile.

User cards should follow this structure:

```text
|----------------------------------|
| avatar      first_name+last_name |
|             nationality      age |
|                                  |
|             (2 hobbies) (+n)     |
|----------------------------------|
```

Show up to 2 hobbies on the card. If the user has more hobbies, display the remaining count as `+n`.

Use a virtual scroll implementation for the list.

When the text filter or selected filters change, the client must refresh both:

- The paginated user list.
- The top 20 hobbies and nationalities in the sidebar.

The text filter value, selected hobbies, selected nationalities, sort field, and sort direction must be reflected in the URL query string. Reloading or sharing the URL should restore the same view state.

## Implementation Notes

- Keep the database setup easy to run locally.
- Include seed logic or a documented command that creates the SQLite database.
- Include a `Dockerfile` and `docker-compose.yml` that can run the application locally.

## Evaluation Focus

We will pay particular attention to:

- Correct data persistence and API behavior.
- Correct filtering, sorting, pagination, and top 20 counts.
- Smooth infinite scrolling with virtualization.
- URL-synced state.
- Clear loading, empty, and error states.
- Easy local and Docker-based setup.

## Deliverables

Please provide:

- Source code for the React client and Node.js server.
- A `Dockerfile` and `docker-compose.yml`.
- Instructions for setup, database seeding, and running locally.
- Instructions for running with Docker Compose.
