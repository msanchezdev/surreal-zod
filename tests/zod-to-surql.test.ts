import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { Surreal } from "surrealdb";
import { createWasmEngines } from "@surrealdb/wasm";
import z from "zod/v4";
import { zodTypeToSurrealType } from "../src/surql";

describe("zodTypeToSurrealType", () => {
  let surreal: Surreal;
  let testId = 0;

  beforeAll(async () => {
    surreal = new Surreal({
      engines: createWasmEngines(),
    });
    await surreal.connect("mem://");
  });

  beforeEach(async () => {
    // await surreal.signin({ username: "root", password: "Welc0me123." });
    await surreal.use({ namespace: "test", database: `test_${testId}` });
    testId++;
  });

  test("string", async () => {
    const schema = z.string();
    const type = zodTypeToSurrealType(schema);
    expect(type).toBe("string");

    await surreal.query(`DEFINE FIELD username ON client TYPE ${type};`);
  });

  test("number", () => {
    const schema = z.number();
    const type = zodTypeToSurrealType(schema);
    expect(type).toBe("number");
  });

  test("bigint", () => {
    const schema = z.bigint();
    const type = zodTypeToSurrealType(schema);
    expect(type).toBe("bigint");
  });

  test("boolean", () => {
    const schema = z.boolean();
    const type = zodTypeToSurrealType(schema);
    expect(type).toBe("boolean");
  });

  test("symbol", () => {
    const schema = z.symbol();
    const type = zodTypeToSurrealType(schema);
    expect(type).toBe("symbol");
  });

  test("undefined", () => {
    const schema = z.undefined();
    const type = zodTypeToSurrealType(schema);
    expect(type).toBe("undefined");
  });
});
