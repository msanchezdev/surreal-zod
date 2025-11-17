import { describe, expect, test } from "bun:test";
import * as z4 from "zod/v4/core";
import z from "zod/v4";
import sz from "../src";
import { RecordId } from "surrealdb";
import { SurrealZodRecordId } from "../src/zod/schema";

describe("surreal-zod", () => {
  test("any", () => {
    const schema = sz.any();
    let parse = z.safeParse(schema, "Hello World");
    expect(parse.success).toBeTrue();
    expect(parse.data).toEqual("Hello World");
    parse = z.safeParse(schema, 123);
    expect(parse.success).toBeTrue();
    expect(parse.data).toEqual(123);
  });

  test("unknown", () => {
    const schema = sz.unknown();
    let parse = z.safeParse(schema, "Hello World");
    expect(parse.success).toBeTrue();
    expect(parse.data).toEqual("Hello World");
    parse = z.safeParse(schema, 123);
    expect(parse.success).toBeTrue();
    expect(parse.data).toEqual(123);
  });

  test("never", () => {
    const schema = sz.never();
    let parse = z.safeParse(schema, "Hello World");
    expect(parse.success).toBeFalse();
    parse = z.safeParse(schema, 123);
    expect(parse.success).toBeFalse();
    parse = z.safeParse(schema, true);
    expect(parse.success).toBeFalse();
    parse = z.safeParse(schema, null);
    expect(parse.success).toBeFalse();
    parse = z.safeParse(schema, undefined);
    expect(parse.success).toBeFalse();
  });

  test("boolean", () => {
    const schema = sz.boolean();
    let parse = z.safeParse(schema, true);
    expect(parse.success).toBeTrue();
    expect(parse.data).toEqual(true);
    parse = z.safeParse(schema, false);
    expect(parse.success).toBeTrue();
    expect(parse.data).toEqual(false);
    parse = z.safeParse(schema, 123);
    expect(parse.success).toBeFalse();
    parse = z.safeParse(schema, "Hello World");
    expect(parse.success).toBeFalse();
    parse = z.safeParse(schema, null);
    expect(parse.success).toBeFalse();
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
      let parse = z.safeParse(schema, new RecordId("user", "123"));
      expect(parse).toMatchObject({
        success: true,
        data: new RecordId("user", "123"),
      });
      parse = z.safeParse(schema, new RecordId("test", "123"));
      expect(parse.success).toBeFalse();
      expect(parse.error?.message).toMatch(
        /Expected RecordId's table to be one of user \| admin but found test/i,
      );
    });

    test("type is overriden", () => {
      const schema = sz.recordId(["user", "admin"]).type(sz.string());
      let parse = z.safeParse(schema, new RecordId("user", "123"));
      expect(parse).toMatchObject({
        success: true,
        data: new RecordId("user", "123"),
      });
      parse = z.safeParse(schema, new RecordId("test", 123));
      expect(parse.success).toBeFalse();
      expect(parse.error?.message).toMatch(/expected string, received number/i);
    });

    test("table is overriden", () => {
      let schema: SurrealZodRecordId<string> = sz.recordId(["user", "admin"]);
      let parse = z.safeParse(schema, new RecordId("user", "123"));
      expect(parse).toMatchObject({
        success: true,
        data: new RecordId("user", "123"),
      });
      parse = z.safeParse(schema, new RecordId("test", "123"));
      expect(parse.success).toBeFalse();
      expect(parse.error?.message).toMatch(
        /Expected RecordId's table to be one of user \| admin but found test/i,
      );

      schema = schema.table("test");
      parse = z.safeParse(schema, new RecordId("test", "123"));
      expect(parse).toMatchObject({
        success: true,
        data: new RecordId("test", "123"),
      });
      parse = z.safeParse(schema, new RecordId("admin", "123"));
      expect(parse.success).toBeFalse();
      expect(parse.error?.message).toMatch(
        /Expected RecordId's table to be test but found admin/i,
      );
    });
  });

  describe("table", () => {
    test("fails if not an object", () => {
      const schema = sz.table("test").fields({
        name: sz.string(),
      });
      let parse = z.safeParse(schema, "Hello World");
      expect(parse.success).toEqual(false);
      expect(parse.error?.message).toMatch(/expected object, received string/i);

      parse = z.safeParse(schema, null);
      expect(parse.success).toEqual(false);
      expect(parse.error?.message).toMatch(/expected object, received null/i);

      parse = z.safeParse(schema, 123);
      expect(parse.success).toEqual(false);
      expect(parse.error?.message).toMatch(/expected object, received number/i);

      parse = z.safeParse(schema, true);
      expect(parse.success).toEqual(false);
      expect(parse.error?.message).toMatch(
        /expected object, received boolean/i,
      );
    });

    test("allow extra fields if schemaless", () => {
      const schema = sz.table("user").schemaless().fields({
        name: sz.string(),
      });
      const parse = z.safeParse(schema, {
        name: "John Doe",
        age: 99,
      });
      expect(parse.success).toEqual(true);
      expect(parse.data).toEqual({
        name: "John Doe",
        age: 99,
      });
    });

    test("deny extra fields if schemafull", () => {
      const schema = sz.table("user").schemafull().fields({
        name: sz.string(),
      });
      const parse = z.safeParse(schema, {
        name: "John Doe",
        age: 99,
      });
      expect(parse.success).toEqual(false);
    });

    test("fail on missing fields", () => {
      const schema = sz.table("test").fields({
        name: sz.string(),
        age: sz.string(),
      });
      const parse = z.safeParse(schema, {});
      expect(parse.success).toEqual(false);
      expect(parse.error?.message).toMatch(
        /expected string, received undefined/,
      );
      expect(parse.error?.issues).toHaveLength(2);
      expect(parse.error?.issues[0].path).toEqual(["name"]);
      expect(parse.error?.issues[1].path).toEqual(["age"]);
    });

    test("record()", () => {
      const schema = sz.table("test").record();
      let parse = z.safeParse(schema, new RecordId("test", "123"));
      expect(parse).toMatchObject({
        success: true,
        data: new RecordId("test", "123"),
      });
      parse = z.safeParse(schema, new RecordId("user", "123"));
      expect(parse).toMatchObject({
        success: false,
        error: expect.any(Error),
      });
    });
  });
});
