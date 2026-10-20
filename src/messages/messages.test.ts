import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";

function messageShape(value: unknown, prefix = ""): [string, string[]][] {
  if (typeof value === "string") {
    const parameters = [...value.matchAll(/\{\s*([\w]+)\s*(?:[,}])/g)]
      .map((match) => match[1]!)
      .sort();
    return [[prefix, parameters]];
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) =>
    messageShape(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("message catalogs", () => {
  it("have identical keys and ICU parameters", () => {
    expect(messageShape(en)).toEqual(messageShape(es));
  });
});
