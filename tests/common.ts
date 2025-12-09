import { describe, test } from "bun:test";
import type z from "zod/v4";
import type z4 from "zod/v4/core";
import { testCase, type ZodTest } from "./utils";
import { checkMap } from "../src/surql";
import dedent from "dedent";
import { DateTime } from "surrealdb";

const testDateValue = new Date("2025-01-01T00:00:00.000Z");
const expectedTestDateValue = new DateTime("2025-01-01T00:00:00.000Z");

export interface CommonTestsContext {
  z: typeof z;
  defineTest(
    typeName: string,
    schemas: z4.$ZodType | z4.$ZodType[],
    expected: ZodTest,
  ): void;
}

const anyTests = [
  testCase({ value: "Hello World" }),
  testCase({ value: 12345 }),
  testCase({ value: true }),
  testCase({ value: false }),
  testCase({ value: null }),
  testCase({ value: undefined }),
  testCase({ value: [] }),
  testCase({ value: {} }),
];

export function any({ z, defineTest }: CommonTestsContext) {
  defineTest("any", z.any(), {
    type: "any",
    tests: [...anyTests],
  });
}

export function unknown({ z, defineTest }: CommonTestsContext) {
  defineTest("unknown", z.unknown(), {
    type: "any",
    tests: [...anyTests],
  });
}

export function never({ z, defineTest }: CommonTestsContext) {
  defineTest("never", z.never(), {
    type: "none",
    tests: [
      testCase({
        value: undefined,
      }),
      testCase({
        value: "Hello World",
        error: /expected `none` but found `'Hello World'`/i,
      }),
      testCase({
        value: 12345,
        error: /expected `none` but found `12345`/i,
      }),
      testCase({
        value: true,
        error: /expected `none` but found `true`/i,
      }),
      testCase({
        value: false,
        error: /expected `none` but found `false`/i,
      }),
      testCase({
        value: null,
        error: /expected `none` but found `NULL`/i,
      }),
      testCase({
        value: [],
        error: /expected `none` but found `\[\]`/i,
      }),
      testCase({
        value: {},
        error: /expected `none` but found `{\s+}`/i,
      }),
    ],
  });
}

function _undefined({ z, defineTest }: CommonTestsContext) {
  defineTest("undefined", z.undefined(), {
    type: "none",
    tests: [
      testCase({ value: undefined }),
      testCase({ value: null, error: /expected `none` but found `null`/i }),
      testCase({ value: 123, error: /expected `none` but found `123`/i }),
      testCase({ value: true, error: /expected `none` but found `true`/i }),
      testCase({ value: false, error: /expected `none` but found `false`/i }),
      testCase({ value: [], error: /expected `none` but found `\[\]`/i }),
      testCase({ value: {}, error: /expected `none` but found `{\s+}`/i }),
    ],
  });
}
export { _undefined as undefined };

export function optional({ z, defineTest }: CommonTestsContext) {
  defineTest("option<any> -> any", z.any().optional(), {
    type: "any",
    tests: [...anyTests],
  });
  defineTest("option<unknown> -> any", z.unknown().optional(), {
    type: "any",
    tests: [...anyTests],
  });
  defineTest("option<never> -> any", z.never().optional(), {
    type: "none",
    tests: [
      testCase({ value: undefined }),
      testCase({ value: null, error: /expected `none` but found `null`/i }),
      testCase({ value: 123, error: /expected `none` but found `123`/i }),
      testCase({ value: true, error: /expected `none` but found `true`/i }),
      testCase({ value: false, error: /expected `none` but found `false`/i }),
      testCase({ value: [], error: /expected `none` but found `\[\]`/i }),
      testCase({ value: {}, error: /expected `none` but found `{\s+}`/i }),
    ],
  });
  defineTest("option<undefined> -> none", z.undefined().optional(), {
    type: "none",
    tests: [
      testCase({ value: undefined }),
      testCase({ value: null, error: /expected `none` but found `null`/i }),
      testCase({ value: 123, error: /expected `none` but found `123`/i }),
      testCase({ value: true, error: /expected `none` but found `true`/i }),
      testCase({ value: false, error: /expected `none` but found `false`/i }),
      testCase({ value: [], error: /expected `none` but found `\[\]`/i }),
      testCase({ value: {}, error: /expected `none` but found `{\s+}`/i }),
    ],
  });
  defineTest("option<string>", z.string().optional(), {
    type: "string | none",
    tests: [
      testCase({ value: "123" }),
      testCase({ value: undefined }),
      testCase({
        value: 123,
        error: /expected `string | none` but found `123`/i,
      }),
    ],
  });
}

export function nonoptional({ z, defineTest }: CommonTestsContext) {
  defineTest(
    "nonoptional<any> -> any",
    [z.any().nonoptional(), z.any().optional().nonoptional()],
    {
      type: "any",
      tests: [...anyTests],
    },
  );
  defineTest(
    "nonoptional<unknown> -> any",
    [z.unknown().nonoptional(), z.unknown().optional().nonoptional()],
    {
      type: "any",
      tests: [...anyTests],
    },
  );
  defineTest(
    "nonoptional<never> -> none",
    [z.never().nonoptional(), z.never().optional().nonoptional()],
    {
      type: "none",
      tests: [
        testCase({ value: undefined }),
        testCase({ value: null, error: /expected `none` but found `null`/i }),
        testCase({ value: 123, error: /expected `none` but found `123`/i }),
        testCase({ value: true, error: /expected `none` but found `true`/i }),
        testCase({ value: false, error: /expected `none` but found `false`/i }),
        testCase({ value: [], error: /expected `none` but found `\[\]`/i }),
        testCase({ value: {}, error: /expected `none` but found `{\s+}`/i }),
      ],
    },
  );
  defineTest(
    "nonoptional<undefined> -> none",
    [z.undefined().nonoptional(), z.undefined().optional().nonoptional()],
    {
      type: "none",
    },
  );
  defineTest(
    "nonoptional<string>",
    [z.string().optional().nonoptional(), z.optional(z.string()).nonoptional()],
    {
      type: "string",
      tests: [
        testCase({ value: "Hello World" }),
        testCase({
          value: undefined,
          error: /expected `string` but found `none`/i,
        }),
        testCase({
          value: null,
          error: /expected `string` but found `null`/i,
        }),
        testCase({ value: 123, error: /expected `string` but found `123`/i }),
      ],
    },
  );
}

function _null({ z, defineTest }: CommonTestsContext) {
  defineTest("null", z.null(), {
    type: "null",
    tests: [
      testCase({ value: null }),
      testCase({
        value: undefined,
        error: /expected `null` but found `none`/i,
      }),
      testCase({ value: 123, error: /expected `null` but found `123`/i }),
      testCase({ value: true, error: /expected `null` but found `true`/i }),
      testCase({ value: false, error: /expected `null` but found `false`/i }),
      testCase({ value: [], error: /expected `null` but found `\[\]`/i }),
      testCase({ value: {}, error: /expected `null` but found `{\s+}`/i }),
    ],
  });
}
export { _null as null };

export function nullable({ z, defineTest }: CommonTestsContext) {
  defineTest(
    "nullable<any> -> any",
    [z.any().nullable(), z.any().optional().nullable()],
    {
      type: "any",
      tests: [...anyTests],
    },
  );
  defineTest(
    "nullable<unknown> -> any",
    [z.unknown().nullable(), z.unknown().optional().nullable()],
    {
      type: "any",
    },
  );
  defineTest(
    "nullable<never>",
    [z.never().nullable(), z.never().optional().nullable()],
    {
      type: "none | null",
    },
  );
  defineTest(
    "nullable<undefined>",
    [z.undefined().nullable(), z.undefined().optional().nullable()],
    {
      type: "none | null",
    },
  );
  defineTest(
    "nullable<string>",
    [z.string().nullable(), z.string().nullable()],
    {
      type: "string | null",
      tests: [
        testCase({ value: "Hello World" }),
        testCase({ value: null }),
        testCase({
          value: undefined,
          error: /expected `string | null` but found `none`/i,
        }),
        testCase({
          value: 123,
          error: /expected `string | null` but found `123`/i,
        }),
        testCase({
          value: true,
          error: /expected `string | null` but found `true`/i,
        }),
        testCase({
          value: false,
          error: /expected `string | null` but found `false`/i,
        }),
        testCase({
          value: [],
          error: /expected `string | null` but found `\[\]`/i,
        }),
        testCase({
          value: {},
          error: /expected `string | null` but found `{\s+}`/i,
        }),
      ],
    },
  );
  defineTest(
    "nullable<boolean>",
    [z.boolean().nullable(), z.boolean().nullable()],
    {
      type: "bool | null",
      tests: [
        testCase({ value: true }),
        testCase({ value: false }),
        testCase({ value: null }),
        testCase({
          value: undefined,
          error: /expected `boolean | null` but found `none`/i,
        }),
        testCase({
          value: "Hello World",
          error: /expected `boolean | null` but found `'Hello World'`/i,
        }),
        testCase({
          value: 123,
          error: /expected `boolean | null` but found `123`/i,
        }),
        testCase({
          value: [],
          error: /expected `boolean | null` but found `\[\]`/i,
        }),
        testCase({
          value: {},
          error: /expected `boolean | null` but found `{\s+}`/i,
        }),
      ],
    },
  );
}

export function nullish({ z, defineTest }: CommonTestsContext) {
  defineTest("nullish<any> -> any", z.any().nullish(), {
    type: "any",
  });
  defineTest("nullish<unknown> -> any", z.unknown().nullish(), {
    type: "any",
  });
  defineTest("nullish<never>", z.never().nullish(), {
    type: "none | null",
  });
  defineTest("nullish<undefined>", z.undefined().nullish(), {
    type: "none | null",
  });
  defineTest("nullish<string>", z.string().nullish(), {
    type: "string | null | none",
    tests: [
      testCase({ value: "Hello World" }),
      testCase({ value: null }),
      testCase({ value: undefined }),
      testCase({
        value: 123,
        error: /expected `string | null | none` but found `123`/i,
      }),
      testCase({
        value: true,
        error: /expected `string | null | none` but found `true`/i,
      }),
      testCase({
        value: false,
        error: /expected `string | null | none` but found `false`/i,
      }),
      testCase({
        value: [],
        error: /expected `string | null | none` but found `\[\]`/i,
      }),
      testCase({
        value: {},
        error: /expected `string | null | none` but found `{\s+}`/i,
      }),
    ],
  });
  defineTest("nullish<number>", z.number().nullish(), {
    type: "number | null | none",
    tests: [
      testCase({ value: 123 }),
      testCase({ value: null }),
      testCase({ value: undefined }),
      testCase({
        value: "Hello World",
        error: /expected `number | null | none` but found `'Hello World'`/i,
      }),
      testCase({
        value: true,
        error: /expected `number | null | none` but found `true`/i,
      }),
      testCase({
        value: false,
        error: /expected `number | null | none` but found `false`/i,
      }),
      testCase({
        value: [],
        error: /expected `number | null | none` but found `\[\]`/i,
      }),
      testCase({
        value: {},
        error: /expected `number | null | none` but found `{\s+}`/i,
      }),
    ],
  });
  defineTest("nullish<boolean>", z.boolean().nullish(), {
    type: "bool | null | none",
    tests: [
      testCase({ value: true }),
      testCase({ value: false }),
      testCase({ value: null }),
      testCase({ value: undefined }),
      testCase({
        value: "Hello World",
        error: /expected `bool | null | none` but found `'Hello World'`/i,
      }),
      testCase({
        value: 123,
        error: /expected `bool | null | none` but found `123`/i,
      }),
      testCase({
        value: [],
        error: /expected `bool | null | none` but found `\[\]`/i,
      }),
      testCase({
        value: {},
        error: /expected `bool | null | none` but found `{\s+}`/i,
      }),
    ],
  });
}

export function boolean({ z, defineTest }: CommonTestsContext) {
  defineTest("boolean", z.boolean(), {
    type: "bool",
    tests: [
      testCase({ value: true }),
      testCase({ value: false }),
      testCase({ value: 123, error: /expected `bool` but found `123`/i }),
    ],
  });
}

export function string({ z, defineTest }: CommonTestsContext) {
  defineTest("string", z.string(), {
    type: "string",
    tests: [
      testCase({ value: "Hello World" }),
      testCase({ value: 12345, error: /expected `string` but found `12345`/i }),
      testCase({ value: true, error: /expected `string` but found `true`/i }),
      testCase({ value: null, error: /expected `string` but found `null`/i }),
      testCase({
        value: undefined,
        error: /expected `string` but found `none`/i,
      }),
    ],
  });
}

export function number({ z, defineTest }: CommonTestsContext) {
  defineTest("number", z.number(), {
    type: "number",
    tests: [
      testCase({ value: 123 }),
      testCase({
        value: "Hello World",
        error: /expected `number` but found `'Hello World'`/i,
      }),
      testCase({ value: true, error: /expected `number` but found `true`/i }),
      testCase({ value: null, error: /expected `number` but found `null`/i }),
      testCase({
        value: undefined,
        error: /expected `number` but found `none`/i,
      }),
    ],
  });
}

export function bigint({ z, defineTest }: CommonTestsContext) {
  defineTest("bigint", z.bigint(), {
    type: "number",
    tests: [
      // @ts-expect-error - surrealdb has no bigint type
      testCase({ value: 123n, equals: 123 }),
      testCase({ value: 123, equals: 123 }),
      testCase({
        value: "Hello World",
        error: /expected `number` but found `'Hello World'`/i,
      }),
      testCase({ value: true, error: /expected `number` but found `true`/i }),
      testCase({ value: null, error: /expected `number` but found `null`/i }),
      testCase({
        value: undefined,
        error: /expected `number` but found `none`/i,
      }),
    ],
  });
}

export function object({ z, defineTest }: CommonTestsContext) {
  defineTest(
    "object { name: string, age: number }",
    z.object({ name: z.string(), age: z.number() }),
    {
      type: "object",
      children: [
        { name: "name", type: "string" },
        { name: "age", type: "number" },
      ],
      tests: [
        testCase({ value: { name: "John Doe", age: 17 } }),
        testCase({
          value: {
            name: "John Doe",
            age: 17,
            meta: { created: new Date("2025-01-01T00:00:00.000Z") },
          },
          equals: {
            name: "John Doe",
            age: 17,
            meta: { created: new DateTime("2025-01-01T00:00:00.000Z") },
          },
          // @FIXME should error, but we dont know how to make objects strict
          // current syntax with object literal doesnt work properly
          // error:
          //   /but found .*? meta: \{ created: d'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,})?Z' \}/i,
        }),
      ],
    },
  );

  defineTest(
    "strict object { name: string, age: number | none }",
    z.object({ name: z.string(), age: z.number().optional() }).strict(),
    {
      type: "object",
      children: [
        { name: "name", type: "string" },
        { name: "age", type: "number | none" },
      ],
      tests: [
        testCase({ value: { name: "John Doe", age: 17 } }),
        testCase({
          value: {
            name: "John Doe",
            age: 17,
            meta: { created: new Date("2025-01-01T00:00:00.000Z") },
          },
          equals: {
            name: "John Doe",
            age: 17,
            meta: { created: new DateTime("2025-01-01T00:00:00.000Z") },
          },
          // @FIXME should error, but we dont know how to make objects strict
          // current syntax with object literal doesnt work properly
          // error:
          //   /but found .*? meta: \{ created: d'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,})?Z' \}/i,
        }),
      ],
    },
  );

  defineTest(
    "loose object { name: string, age: number }",
    z.object({ name: z.string(), age: z.number() }).loose(),
    {
      type: "object",
      children: [
        { name: "name", type: "string" },
        { name: "age", type: "number" },
      ],
      tests: [
        testCase({ value: { name: "John Doe", age: 17 } }),
        testCase({
          value: {
            name: "John Doe",
            age: 17,
            meta: { created: new Date("2025-01-01T00:00:00.000Z") },
          },
          equals: {
            name: "John Doe",
            age: 17,
            meta: { created: new DateTime("2025-01-01T00:00:00.000Z") },
          },
        }),
      ],
    },
  );
}
