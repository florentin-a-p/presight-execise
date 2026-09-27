import { Ajv2020 } from "ajv/dist/2020.js";
import ajvFormats from "ajv-formats";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { openDb, type DB } from "../src/db.js";
import { openApiSpec } from "../src/openapi.js";
import { seed } from "../src/seed.js";

let db: DB;
let server: Server;
let app: string;

// Compile response schemas straight from the published spec, so a change to
// the API that isn't reflected in the docs fails here.
const ajv = new Ajv2020({ strict: false, allErrors: true });
// ajv-formats is CommonJS; under NodeNext its plugin is the `default` property.
ajvFormats.default(ajv);
ajv.addSchema({ $id: "openapi", components: openApiSpec.components });
const schema = (name: string) => ajv.getSchema(`openapi#/components/schemas/${name}`)!;

function expectValid(name: string, body: unknown) {
  const validate = schema(name);
  const ok = validate(body);
  expect(validate.errors ?? [], `${name}: ${ajv.errorsText(validate.errors)}`).toEqual([]);
  expect(ok).toBe(true);
}

beforeAll(() => {
  db = openDb(":memory:");
  seed(db, { count: 300, seed: 3 });
  return new Promise<void>((resolve) => {
    server = createApp(db).listen(0, "127.0.0.1", () => {
      app = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server?.close();
  db?.close();
});

describe("OpenAPI docs", () => {
  it("serves the spec as JSON", async () => {
    const res = await request(app).get("/api/openapi.json").expect(200).expect("Content-Type", /json/);
    expect(res.body.openapi).toBe("3.1.0");
    expect(Object.keys(res.body.paths).sort()).toEqual(["/api/facets", "/api/health", "/api/users"]);
  });

  it("serves Swagger UI", async () => {
    const res = await request(app).get("/api/docs/").expect(200).expect("Content-Type", /html/);
    expect(res.text).toContain("swagger-ui");
    expect(res.text).toContain("People Directory API");
  });
});

describe("responses match the spec", () => {
  it.each([
    {},
    { q: "a", sort: "age", order: "desc", page: "2", pageSize: "10" },
    { hobbies: "Chess,Reading", nationalities: "French,Dutch" },
    { q: "zzzzzz" },
    { page: "999" },
  ])("GET /api/users %o", async (query) => {
    const res = await request(app).get("/api/users").query(query).expect(200);
    expectValid("UserPage", res.body);
  });

  it.each([{}, { q: "e", hobbies: "Chess" }, { nationalities: "French" }, { q: "zzzzzz" }])(
    "GET /api/facets %o",
    async (query) => {
      const res = await request(app).get("/api/facets").query(query).expect(200);
      expectValid("Facets", res.body);
    },
  );

  it("400 responses", async () => {
    const res = await request(app).get("/api/users").query({ sort: "nope" }).expect(400);
    expectValid("Error", res.body);
  });

  it("rejects a response that breaks the schema (sanity check)", () => {
    expect(schema("User")({ id: 1 })).toBe(false);
  });
});
