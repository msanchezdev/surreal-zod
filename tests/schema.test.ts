import { describe, expect, test } from "bun:test";
import * as z4 from "zod/v4/core";
import z from "zod/v4";
import sz from "../src";
import { RecordId } from "surrealdb";

describe("surreal-zod", () => {
  test("any", () => {
    const schema = sz.any();
    expect(z.safeParse(schema, "Hello World")).toMatchObject({
      success: true,
      data: "Hello World",
    });
    expect(z.safeParse(schema, 123)).toMatchObject({
      success: true,
      data: 123,
    });
  });

  test("boolean", () => {
    const schema = sz.boolean();
    expect(z.safeParse(schema, true)).toMatchObject({
      success: true,
      data: true,
    });
    expect(z.safeParse(schema, false)).toMatchObject({
      success: true,
      data: false,
    });
    expect(z.safeParse(schema, 123)).toMatchObject({
      success: false,
      error: expect.any(Error),
    });
    expect(z.safeParse(schema, "Hello World")).toMatchObject({
      success: false,
      error: expect.any(Error),
    });
    expect(z.safeParse(schema, null)).toMatchObject({
      success: false,
      error: expect.any(Error),
    });
  });

  test("string", () => {
    const schema = sz.string();
    expect(z.safeParse(schema, "Hello World")).toMatchObject({
      success: true,
      data: "Hello World",
    });
    expect(z.safeParse(schema, 123)).toMatchObject({
      success: false,
      error: expect.any(Error),
    });
    expect(z.safeParse(schema, null)).toMatchObject({
      success: false,
      error: expect.any(Error),
    });
  });

  describe("recordId", () => {
    test("from RecordId", () => {
      const schema = sz.recordId(["user", "admin"]);
      const parsing = z.safeParse(schema, new RecordId("test", "123"));
      expect(parsing).toMatchObject({
        success: true,
        data: new RecordId("test", "123"),
      });
      const data = parsing.data as RecordId;
      expect(data.table.name).toBe("test");
      expect(data.id).toBe("123");
    });
  });
});
