import {
  DEFAULT_PAGE_SIZE,
  MAX_FILTER_VALUES,
  MAX_PAGE_SIZE,
  MAX_QUERY_LENGTH,
  SORT_FIELDS,
} from "./params.js";

/**
 * OpenAPI 3.1 description of the HTTP API. Limits and enums come from the same
 * constants the request validator uses, so the docs can't drift from behavior.
 */
export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "People Directory API",
    version: "1.0.0",
    description:
      "Search, filter, sort and page through a directory of users stored in SQLite, " +
      "and get top-20 hobby and nationality counts for the current filters.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Users", description: "Paginated user results" },
    { name: "Facets", description: "Top values and counts for the filter sidebar" },
    { name: "System" },
  ],
  paths: {
    "/api/users": {
      get: {
        tags: ["Users"],
        operationId: "listUsers",
        summary: "List users",
        description:
          "Returns one page of users matching all active filters. Results are ordered by `sort`, " +
          "then by `id`, so the order is total and pages never overlap or skip users.",
        parameters: [
          { $ref: "#/components/parameters/q" },
          { $ref: "#/components/parameters/nationalities" },
          { $ref: "#/components/parameters/hobbies" },
          {
            name: "sort",
            in: "query",
            description: "Field to sort by. Text fields sort case-insensitively.",
            schema: { type: "string", enum: [...SORT_FIELDS], default: "first_name" },
          },
          {
            name: "order",
            in: "query",
            description: "Sort direction.",
            schema: { type: "string", enum: ["asc", "desc"], default: "asc" },
          },
          {
            name: "page",
            in: "query",
            description: "1-based page number. Pages past the end return an empty `data` array.",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "pageSize",
            in: "query",
            description: "Users per page.",
            schema: { type: "integer", minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE },
          },
        ],
        responses: {
          "200": {
            description: "A page of users",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UserPage" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/api/facets": {
      get: {
        tags: ["Facets"],
        operationId: "getFacets",
        summary: "Top 20 hobbies and nationalities",
        description:
          "Counts for the current filters, sorted by count (descending) then value.\n\n" +
          "- **hobbies** count the current result set, with every filter applied.\n" +
          "- **nationalities** apply the text and hobby filters but not the nationality selection " +
          "itself. Nationalities combine with OR, so this keeps the other options visible " +
          "(disjunctive faceting). The counts of the selected nationalities add up to the list total.",
        parameters: [
          { $ref: "#/components/parameters/q" },
          { $ref: "#/components/parameters/nationalities" },
          { $ref: "#/components/parameters/hobbies" },
        ],
        responses: {
          "200": {
            description: "Facet counts",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Facets" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/api/health": {
      get: {
        tags: ["System"],
        operationId: "health",
        summary: "Health check",
        responses: {
          "200": {
            description: "The server is up",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["ok"],
                  properties: { ok: { type: "boolean", const: true } },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    parameters: {
      q: {
        name: "q",
        in: "query",
        description:
          "Text filter. Every whitespace-separated term must appear in `first_name` or `last_name` " +
          "(case-insensitive substring match), e.g. `ann smi`.",
        schema: { type: "string", maxLength: MAX_QUERY_LENGTH },
      },
      nationalities: {
        name: "nationalities",
        in: "query",
        description:
          "Match users of **any** of these nationalities. Comma-separated (`French,Dutch`); " +
          "repeating the parameter also works.",
        style: "form",
        explode: false,
        schema: { type: "array", maxItems: MAX_FILTER_VALUES, items: { type: "string" } },
      },
      hobbies: {
        name: "hobbies",
        in: "query",
        description:
          "Match users who have **all** of these hobbies. Comma-separated (`Chess,Yoga`); " +
          "repeating the parameter also works.",
        style: "form",
        explode: false,
        schema: { type: "array", maxItems: MAX_FILTER_VALUES, items: { type: "string" } },
      },
    },
    schemas: {
      User: {
        type: "object",
        required: ["id", "avatar", "first_name", "last_name", "age", "nationality", "hobbies"],
        additionalProperties: false,
        properties: {
          id: { type: "integer", example: 42 },
          avatar: { type: "string", format: "uri", example: "https://api.dicebear.com/9.x/notionists/svg?seed=Ada" },
          first_name: { type: "string", example: "Ada" },
          last_name: { type: "string", example: "Lovelace" },
          age: { type: "integer", example: 36 },
          nationality: { type: "string", example: "British" },
          hobbies: {
            type: "array",
            maxItems: 10,
            items: { type: "string" },
            description: "0 to 10 hobbies, sorted alphabetically.",
            example: ["Chess", "Reading"],
          },
        },
      },
      PageMeta: {
        type: "object",
        required: ["page", "pageSize", "total", "totalPages", "hasMore"],
        additionalProperties: false,
        properties: {
          page: { type: "integer", minimum: 1 },
          pageSize: { type: "integer", minimum: 1, maximum: MAX_PAGE_SIZE },
          total: { type: "integer", minimum: 0, description: "Users matching the filters, across all pages." },
          totalPages: { type: "integer", minimum: 0 },
          hasMore: { type: "boolean", description: "Whether a next page exists." },
        },
      },
      UserPage: {
        type: "object",
        required: ["data", "meta"],
        additionalProperties: false,
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/User" } },
          meta: { $ref: "#/components/schemas/PageMeta" },
        },
      },
      FacetValue: {
        type: "object",
        required: ["value", "count"],
        additionalProperties: false,
        properties: {
          value: { type: "string", example: "Chess" },
          count: { type: "integer", minimum: 1, example: 1409 },
        },
      },
      Facets: {
        type: "object",
        required: ["hobbies", "nationalities"],
        additionalProperties: false,
        properties: {
          hobbies: { type: "array", maxItems: 20, items: { $ref: "#/components/schemas/FacetValue" } },
          nationalities: { type: "array", maxItems: 20, items: { $ref: "#/components/schemas/FacetValue" } },
        },
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: { error: { type: "string" } },
      },
    },
    responses: {
      BadRequest: {
        description: "Invalid query parameters",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { error: '"sort" must be one of first_name, last_name, age, nationality' },
          },
        },
      },
      ServerError: {
        description: "Unexpected server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { error: "Internal server error" },
          },
        },
      },
    },
  },
};
