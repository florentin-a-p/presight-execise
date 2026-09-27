import { describe, expect, it } from "vitest";
import { parseState, serializeState, toggle } from "./directoryState";

describe("URL state", () => {
  it("parses every field", () => {
    const state = parseState(
      new URLSearchParams("q=ann&nationalities=French,Dutch&hobbies=Chess&sort=age&order=desc"),
    );
    expect(state).toEqual({
      q: "ann",
      nationalities: ["French", "Dutch"],
      hobbies: ["Chess"],
      sort: "age",
      order: "desc",
    });
  });

  it("falls back to defaults for missing or invalid values", () => {
    expect(parseState(new URLSearchParams("sort=id&order=sideways&hobbies=,,"))).toEqual({
      q: "",
      nationalities: [],
      hobbies: [],
      sort: "first_name",
      order: "asc",
    });
  });

  it("round-trips and omits defaults", () => {
    const state = parseState(new URLSearchParams("hobbies=Board Games,Chess&order=desc"));
    const params = serializeState(state);
    expect(params.has("sort")).toBe(false);
    expect(params.has("q")).toBe(false);
    expect(parseState(params)).toEqual(state);
  });

  it("toggles values", () => {
    expect(toggle(["a"], "b")).toEqual(["a", "b"]);
    expect(toggle(["a", "b"], "a")).toEqual(["b"]);
  });
});
