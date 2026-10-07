import { describe, expect, test } from "vitest";
import { convertImportContent, importContentAsString } from "./recipe-create-content";

describe("convertImportContent", () => {
  test("switching to the JSON editor parses JSON text", () => {
    expect(convertImportContent("{\"name\":\"Soup\"}", true)).toEqual({ name: "Soup" });
  });

  test("switching to the JSON editor wraps text that is not JSON", () => {
    expect(convertImportContent("<html></html>", true)).toEqual({ data: "<html></html>" });
  });

  test("switching to the JSON editor starts with an empty object when there is no content", () => {
    expect(convertImportContent(null, true)).toEqual({});
  });

  test("switching back to the text field serialises the object", () => {
    expect(convertImportContent({ name: "Soup" }, false)).toBe("{\"name\":\"Soup\"}");
  });

  test("switching back to the text field clears an empty object", () => {
    expect(convertImportContent({}, false)).toBeNull();
    expect(convertImportContent(null, false)).toBeNull();
  });
});

describe("importContentAsString", () => {
  test("passes text through, serialises objects and maps nothing to null", () => {
    expect(importContentAsString("text")).toBe("text");
    expect(importContentAsString({ a: 1 })).toBe("{\"a\":1}");
    expect(importContentAsString(null)).toBeNull();
    expect(importContentAsString("")).toBeNull();
  });
});
