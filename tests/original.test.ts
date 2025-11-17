import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import dedent from "dedent";
import { RecordId, surql, Surreal, Table } from "surrealdb";
import z from "zod/v4";
import type z4 from "zod/v4/core";
import { zodToSurql } from "../src/surql";
import {
  startSurrealTestInstance,
  testCase,
  type TestCaseChildField,
  type TestInstance,
  type ZodTest,
} from "./utils";

describe("zod", () => {
  let testInstance: TestInstance;
  let surreal: Surreal;
  let testId = 0;

  beforeAll(async () => {
    testInstance = await startSurrealTestInstance();
    surreal = testInstance.surreal;
  });

  beforeEach(async () => {
    await surreal.use({ namespace: "test", database: `test_${testId}` });
    testId++;
  });

  afterAll(async () => {
    await testInstance.close();
  });

  function getFieldQuery(field: TestCaseChildField) {
    return dedent.withOptions({ alignValues: true })`
      DEFINE FIELD OVERWRITE ${field.name} ON TABLE test TYPE ${field.type}${
        field.default
          ? field.default.always
            ? ` DEFAULT ALWAYS ${JSON.stringify(field.default.value)}`
            : ` DEFAULT ${JSON.stringify(field.default.value)}`
          : ""
      }${
        field.transforms?.length
          ? ` ${dedent.withOptions({ alignValues: true })`
              VALUE {
                  ${field.transforms?.join("\n")}
              }
            `}`
          : ""
      }${
        field.asserts?.length
          ? ` ${dedent.withOptions({ alignValues: true })`
              ASSERT {
                  ${field.asserts?.join("\n")}
              }
            `}`
          : ""
      };\n
    `;
  }

  function defineTest(
    typeName: string,
    schemas: z4.$ZodType | z4.$ZodType[],
    expected: ZodTest,
  ) {
    test(typeName, async () => {
      schemas = Array.isArray(schemas) ? schemas : [schemas];
      for (const schema of schemas) {
        const [_, query] = zodToSurql({
          table: new Table("test"),
          exists: "overwrite",
          schema: z.object({
            test: schema,
          }),
        });

        const resultingQuery = query.query;
        let expectedQuery = dedent.withOptions({ alignValues: true })`
          DEFINE TABLE OVERWRITE test SCHEMALESS;
          ${getFieldQuery({
            name: "test",
            type: expected.type ?? "any",
            default: expected.default ?? undefined,
            transforms: expected.transforms ?? [],
            asserts: expected.asserts ?? [],
          })}
        `;
        if (expected.children?.length) {
          expectedQuery += "\n";
          const childrenQueue = [
            ...expected.children.map((child) => ({
              ...child,
              name: `test.${child.name}`,
            })),
          ];
          while (childrenQueue.length > 0) {
            // biome-ignore lint/style/noNonNullAssertion: bounds accounted for
            const child = childrenQueue.shift()!;
            if (child.children?.length) {
              childrenQueue.unshift(
                ...child.children.map((subchild) => ({
                  ...subchild,
                  name: `${child.name}.${subchild.name}`,
                })),
              );
            }
            expectedQuery += getFieldQuery(child);
          }
        }

        if (expected.debug) {
          console.log("========== expected query ==========");
          console.log(expectedQuery.trimEnd());
          console.log("========== resulting query ==========");
          console.log(resultingQuery.trimEnd());
        }

        expect(resultingQuery.trimEnd()).toEqual(expectedQuery.trimEnd());
        await surreal.query(resultingQuery);

        if (expected.tests) {
          for (let i = 0; i < expected.tests.length; i++) {
            // biome-ignore lint/style/noNonNullAssertion: bounds accounted for
            const test = expected.tests[i]!;
            const result = surreal
              .query(
                surql`UPSERT ONLY ${new RecordId("test", `passing_${i}`)} SET test = ${test.value} RETURN AFTER.test`,
              )
              .collect()
              .then(([result]) => result);
            if ("error" in test) {
              expect(result).rejects.toThrow(test.error);
            } else if ("matches" in test) {
              const awaitedResult = await result;
              if (
                test.matches instanceof RegExp ||
                typeof test.matches === "string"
              ) {
                expect(awaitedResult).toMatch(test.matches);
              } else {
                expect(awaitedResult).toMatchObject(test.matches);
              }
            } else if ("check" in test) {
              const awaitedResult = await result;
              const checkResult = test.check(awaitedResult);
              if (checkResult instanceof Promise) {
                expect(checkResult).resolves.toBeUndefined();
              } else {
                expect(checkResult).toBeUndefined();
              }
            } else {
              const awaitedResult = await result;
              expect(awaitedResult).toEqual(test.equals ?? test.value);
            }
          }
        }
      }
    });
  }

  defineTest("any", z.any(), {
    type: "any",
    tests: [
      testCase({ value: "Hello World" }),
      testCase({ value: 12345 }),
      testCase({ value: true }),
      testCase({ value: false }),
      testCase({ value: null }),
      testCase({ value: undefined }),
      testCase({ value: [] }),
      testCase({ value: {} }),
    ],
  });

  defineTest("unknown", z.unknown(), {
    type: "any",
    tests: [
      testCase({ value: "Hello World" }),
      testCase({ value: 12345 }),
      testCase({ value: true }),
      testCase({ value: false }),
      testCase({ value: null }),
      testCase({ value: undefined }),
      testCase({ value: [] }),
      testCase({ value: {} }),
    ],
  });

  defineTest("never", z.never(), {
    type: "NONE",
    tests: [
      testCase({
        value: undefined,
      }),
      testCase({
        value: "Hello World",
        error: /expected `NONE` but found `'Hello World'`/i,
      }),
      testCase({
        value: 12345,
        error: /expected `NONE` but found `12345`/i,
      }),
      testCase({
        value: true,
        error: /expected `NONE` but found `true`/i,
      }),
      testCase({
        value: false,
        error: /expected `NONE` but found `false`/i,
      }),
      testCase({
        value: null,
        error: /expected `NONE` but found `NULL`/i,
      }),
      testCase({
        value: [],
        error: /expected `NONE` but found `\[\]`/i,
      }),
      testCase({
        value: {},
        error: /expected `NONE` but found `{\s+}`/i,
      }),
    ],
  });

  // defineTest("NONE", z.undefined(), {
  //   type: "NONE",
  //   tests: {
  //     passing: [{ value: undefined }],
  //     failing: [
  //       { value: null, error: /expected `NONE` but found `NULL`/i },
  //       { value: 123, error: /expected `NONE` but found `123`/i },
  //     ],
  //   },
  // });

  // defineTest("NULL", z.null(), {
  //   type: "NULL",
  //   tests: {
  //     passing: [{ value: null }],
  //     failing: [
  //       { value: undefined, error: /expected `NULL` but found `NONE`/i },
  //       { value: 123, error: /expected `NULL` but found `123`/i },
  //     ],
  //   },
  // });

  defineTest("boolean", z.boolean(), {
    type: "bool",
    tests: [
      testCase({ value: true }),
      testCase({ value: false }),
      testCase({ value: 123, error: /expected `bool` but found `123`/i }),
    ],
  });

  defineTest("string", z.string(), {
    type: "string",
    tests: [
      testCase({ value: "Hello World" }),
      testCase({
        value: true,
        error: /expected `string` but found `true`/i,
      }),
      testCase({
        value: null,
        error: /expected `string` but found `NULL`/i,
      }),
      testCase({
        value: undefined,
        error: /expected `string` but found `NONE`/i,
      }),
    ],
  });

  // defineTest("string [min:1]", z.string().min(1), {
  //   type: "string",
  //   asserts: [checkMap.min_length("test", 1, "string")],
  //   tests: {
  //     passing: [{ value: "Hello World" }],
  //     failing: [
  //       {
  //         value: "",
  //         error: /must be at least 1 characters? long/i,
  //       },
  //     ],
  //   },
  // });

  // defineTest("string [max:10]", z.string().max(10), {
  //   type: "string",
  //   asserts: [checkMap.max_length("test", 10, "string")],
  //   tests: {
  //     passing: [{ value: "Hello" }],
  //     failing: [
  //       {
  //         value: "Hello World Hello World",
  //         error: /must be at most 10 characters? long/i,
  //       },
  //     ],
  //   },
  // });

  // defineTest("string [min:1 max:10]", z.string().min(1).max(10), {
  //   type: "string",
  //   asserts: [
  //     checkMap.min_length("test", 1, "string"),
  //     checkMap.max_length("test", 10, "string"),
  //   ],
  //   tests: {
  //     passing: [{ value: "Hello" }],
  //     failing: [
  //       {
  //         value: "",
  //         error: /must be at least 1 characters? long/i,
  //       },
  //       {
  //         value: "12345678901",
  //         error: /must be at most 10 characters? long/i,
  //       },
  //     ],
  //   },
  // });

  // defineTest("string [length:10]", z.string().length(10), {
  //   type: "string",
  //   asserts: [checkMap.length_equals("test", 10)],
  //   tests: {
  //     passing: [{ value: "1234567890" }],
  //     failing: [
  //       { value: "123456789", error: /must be exactly 10 characters? long/i },
  //       { value: "12345678901", error: /must be exactly 10 characters? long/i },
  //     ],
  //   },
  // });

  // defineTest("string [format:email]", [z.string().email(), z.email()], {
  //   type: "string",
  //   asserts: [checkMap.string_format.email("test")],
  //   tests: {
  //     passing: [
  //       { value: "test@example.com" },
  //       { value: "test+test@example.com" },
  //       { value: "test.test@example.com" },
  //     ],
  //     failing: [
  //       { value: "test", error: /must be a valid email address/i },
  //       { value: "test@", error: /must be a valid email address/i },
  //       { value: "@example", error: /must be a valid email address/i },
  //       { value: "@example.com", error: /must be a valid email address/i },
  //       { value: "test@example", error: /must be a valid email address/i },
  //       { value: "test@example", error: /must be a valid email address/i },
  //       { value: ".test@example", error: /must be a valid email address/i },
  //       { value: "te..st@example", error: /must be a valid email address/i },
  //     ],
  //   },
  // });

  // defineTest("string [format:url]", [z.string().url(), z.url()], {
  //   type: "string",
  //   asserts: [checkMap.string_format.url("test")],
  //   tests: {
  //     passing: [
  //       { value: "http://example" },
  //       { value: "http://example.com" },
  //       { value: "http://example.com/api/users" },
  //       { value: "http://example.com/api/users?page=1&limit=10#data" },
  //       { value: "http://example.com/api/users#data" },
  //       { value: "http://example.com/api/users?page=1&limit=10#data" },
  //       { value: "file:/" },
  //       { value: "file:/path/to/file" },
  //       { value: "file:///path/to/file" },
  //     ],
  //     failing: [
  //       { value: "http", error: /must be a valid URL/i },
  //       { value: "http:", error: /must be a valid URL/i },
  //       { value: "http:/", error: /must be a valid URL/i },
  //       { value: "http://", error: /must be a valid URL/i },
  //     ],
  //   },
  // });

  // defineTest(
  //   `string [format:url(protocol:${/https?/})`,
  //   [z.string().url({ protocol: /https?/ }), z.url({ protocol: /https?/ })],
  //   {
  //     type: "string",
  //     asserts: [checkMap.string_format.url("test", { protocol: /https?/ })],
  //     tests: {
  //       passing: [{ value: "https://example.com" }],
  //       failing: [
  //         {
  //           value: "ftp://example.com",
  //           error: /must match protocol \/https\?\//i,
  //         },
  //       ],
  //     },
  //   },
  // );

  // defineTest(
  //   `string [format:url(hostname:${/example\.com/})`,
  //   [
  //     z.string().url({ hostname: /example\.com/ }),
  //     z.url({ hostname: /example\.com/ }),
  //   ],
  //   {
  //     type: "string",
  //     asserts: [
  //       checkMap.string_format.url("test", { hostname: /example\.com/ }),
  //     ],
  //     tests: {
  //       passing: [
  //         { value: "https://example.com" },
  //         { value: "http://example.com" },
  //         { value: "http://example.com:8080" },
  //         { value: "http://www.example.com" },
  //       ],
  //       failing: [
  //         {
  //           value: "http://example.es",
  //           error: /must match hostname \/example\\\.com\//i,
  //         },
  //       ],
  //     },
  //   },
  // );

  // defineTest(
  //   `string [format:url(normalize, protocol:${/https?/})`,
  //   [
  //     z.string().url({ normalize: true, protocol: /https?/ }),
  //     z.url({ normalize: true, protocol: /https?/ }),
  //   ],
  //   {
  //     type: "string",
  //     transforms: [
  //       checkMap.string_format.url("test", {
  //         normalize: true,
  //         protocol: /https?/,
  //       }),
  //     ],
  //     tests: {
  //       passing: [
  //         { value: "https://example.com", equals: "https://example.com/" },
  //         { value: "http://example.com", equals: "http://example.com/" },
  //         { value: "https://example.com:443", equals: "https://example.com/" },
  //         { value: "http://example.com:80", equals: "http://example.com/" },
  //         {
  //           value: "https://example.com:8443",
  //           equals: "https://example.com:8443/",
  //         },
  //         {
  //           value: "http://example.com:8080",
  //           equals: "http://example.com:8080/",
  //         },
  //         {
  //           value: "https:example.com:8443",
  //           equals: "https://example.com:8443/",
  //         },
  //       ],
  //       failing: [
  //         {
  //           value: "ftp://example.com",
  //           error: /must match protocol \/https\?\//i,
  //         },
  //       ],
  //     },
  //   },
  // );

  // defineTest(
  //   `string [format:url(normalize, hostname:${/example\.com/})`,
  //   [
  //     z.string().url({ normalize: true, hostname: /example\.com/ }),
  //     z.url({ normalize: true, hostname: /example\.com/ }),
  //   ],
  //   {
  //     type: "string",
  //     transforms: [
  //       checkMap.string_format.url("test", {
  //         normalize: true,
  //         hostname: /example\.com/,
  //       }),
  //     ],
  //     tests: {
  //       passing: [
  //         { value: "https://example.com", equals: "https://example.com/" },
  //         { value: "http://example.com", equals: "http://example.com/" },
  //         { value: "https://example.com:443", equals: "https://example.com/" },
  //         { value: "http://example.com:80", equals: "http://example.com/" },
  //       ],
  //     },
  //   },
  // );

  // defineTest(
  //   "option<string>",
  //   [
  //     z.string().optional(),
  //     z.string().optional().nonoptional().optional(),
  //     z.optional(z.string()),
  //   ],
  //   {
  //     type: "option<string>",
  //     tests: {
  //       passing: [
  //         { value: "Hello World" },
  //         { value: "" },
  //         { value: undefined },
  //       ],
  //       failing: [
  //         { value: null, error: /expected `none | string` but found `NULL`/i },
  //         { value: 123, error: /expected `none | string` but found `123`/i },
  //       ],
  //     },
  //   },
  // );

  // defineTest(`array<string>`, [z.array(z.string()), z.string().array()], {
  //   type: "array<string>",
  //   tests: {
  //     passing: [{ value: ["Hello World"] }, { value: ["Hello", "World"] }],
  //     failing: [{ value: [123], error: /expected `string` but found `123`/i }],
  //   },
  // });

  // defineTest(
  //   "array<option<string>>",
  //   [z.array(z.string().optional()), z.optional(z.string()).array()],
  //   {
  //     type: "array<option<string>>",
  //     tests: {
  //       passing: [
  //         { value: ["Hello World", undefined] },
  //         { value: ["Hello", "World", undefined] },
  //       ],
  //       failing: [
  //         { value: [123], error: /expected `none | string` but found `123`/i },
  //       ],
  //     },
  //   },
  // );

  // defineTest(
  //   "option<bool>",
  //   [
  //     z.boolean().optional(),
  //     z.boolean().optional().nonoptional().optional(),
  //     z.optional(z.boolean()),
  //   ],
  //   {
  //     type: "option<bool>",
  //     tests: {
  //       passing: [{ value: true }, { value: false }, { value: undefined }],
  //       failing: [
  //         { value: null, error: /expected `none | bool` but found `NULL`/i },
  //         { value: 123, error: /expected `none | bool` but found `123`/i },
  //       ],
  //     },
  //   },
  // );

  // defineTest("array<bool>", [z.array(z.boolean()), z.boolean().array()], {
  //   type: "array<bool>",
  //   tests: {
  //     passing: [
  //       { value: [] },
  //       { value: [true, false] },
  //       { value: [false, true] },
  //       { value: [true, false, true] },
  //     ],
  //     failing: [{ value: [123], error: /expected `bool` but found `123`/i }],
  //   },
  // });

  // defineTest("number", z.number(), {
  //   type: "number",
  //   tests: {
  //     passing: [
  //       { value: 123 },
  //       { value: 123.456 },
  //       { value: 123.456789 },
  //       { value: 12345n, equals: 12345 },
  //       { value: 12345678901234567n },
  //       testCase({
  //         value: new Decimal(12345678901234567n),
  //         check(value) {
  //           expect(value.toJSON()).toEqual(
  //             new Decimal(12345678901234567n).toJSON(),
  //           );
  //         },
  //       }),
  //     ],
  //     failing: [
  //       { value: "123", error: /expected `number` but found `'123'`/i },
  //       { value: null, error: /expected `number` but found `NULL`/i },
  //       { value: undefined, error: /expected `number` but found `NONE`/i },
  //     ],
  //   },
  // });

  // defineTest(
  //   "option<number>",
  //   [
  //     z.number().optional(),
  //     z.number().optional().nonoptional().optional(),
  //     z.optional(z.number()),
  //   ],
  //   {
  //     type: "option<number>",
  //     tests: {
  //       passing: [{ value: 123 }, { value: undefined }],
  //       failing: [
  //         {
  //           value: "123",
  //           error: /expected `none | number` but found `'123'`/i,
  //         },
  //         {
  //           value: null,
  //           error: /expected `none | number` but found `NULL`/i,
  //         },
  //       ],
  //     },
  //   },
  // );

  // defineTest("array<number>", [z.array(z.number()), z.number().array()], {
  //   type: "array<number>",
  //   tests: {
  //     passing: [
  //       testCase({
  //         value: [
  //           123,
  //           123.456,
  //           123.456789,
  //           12345n,
  //           12345678901234567n,
  //           new Decimal(12345678901234567n),
  //         ],
  //         check(value) {
  //           expect(value.slice(0, -1)).toEqual([
  //             123,
  //             123.456,
  //             123.456789,
  //             12345,
  //             12345678901234567n,
  //           ]);
  //           expect((value.at(-1) as Decimal).toJSON()).toEqual(
  //             new Decimal(12345678901234567n).toJSON(),
  //           );
  //         },
  //       }),
  //     ],
  //   },
  // });

  // defineTest("object", z.object({}), {
  //   type: "object",
  //   debug: true,
  //   tests: {
  //     passing: [{ value: {} }, { value: { name: "Manuel" } }],
  //     failing: [
  //       {
  //         value: "Hello",
  //         error: /expected `object` but found `'Hello'`/i,
  //       },
  //       {
  //         value: undefined,
  //         error: /expected `object` but found `NONE`/i,
  //       },
  //       {
  //         value: null,
  //         error: /expected `object` but found `NULL`/i,
  //       },
  //     ],
  //   },
  // });

  // defineTest("object { name: string }", z.object({ name: z.string() }), {
  //   type: "object",
  //   children: [
  //     {
  //       name: "name",
  //       type: "string",
  //     },
  //   ],
  //   debug: true,
  //   tests: {
  //     passing: [{ value: { name: "Manuel" } }],
  //   },
  // });

  // defineTest(
  //   "object { name: string, age: number }",
  //   z.object({ name: z.string(), age: z.number() }),
  //   {
  //     type: "object",
  //     children: [
  //       {
  //         name: "name",
  //         type: "string",
  //       },
  //       {
  //         name: "age",
  //         type: "number",
  //       },
  //     ],
  //   },
  // );

  // defineTest(
  //   "nested object",
  //   z.object({
  //     name: z.object({
  //       given: z.string().min(1).max(50),
  //       middle: z.string().max(50).optional(),
  //       family: z.string().min(1).max(50),
  //       prefix: z.string().max(10).optional(),
  //       suffix: z.string().max(10).optional(),
  //     }),
  //     address: z.object({
  //       street: z.string().min(1),
  //       unit: z.string().optional(),
  //       city: z.string().min(1),
  //       state: z.string().length(2),
  //       postalCode: z.string().min(5).max(10),
  //       country: z.string().length(2),
  //       coordinates: z
  //         .object({
  //           latitude: z.number().min(-90).max(90),
  //           longitude: z.number().min(-180).max(180),
  //         })
  //         .optional(),
  //     }),
  //   }),
  //   {
  //     type: "object",
  //     children: [
  //       {
  //         name: "name",
  //         type: "object",
  //         children: [
  //           {
  //             name: "given",
  //             type: "string",
  //             asserts: [
  //               checkMap.min_length("test.name.given", 1, "string"),
  //               checkMap.max_length("test.name.given", 50, "string"),
  //             ],
  //           },
  //           {
  //             name: "middle",
  //             type: "option<string>",
  //             asserts: [checkMap.max_length("test.name.middle", 50, "string")],
  //           },
  //           {
  //             name: "family",
  //             type: "string",
  //             asserts: [
  //               checkMap.min_length("test.name.family", 1, "string"),
  //               checkMap.max_length("test.name.family", 50, "string"),
  //             ],
  //           },
  //           {
  //             name: "prefix",
  //             type: "option<string>",
  //             asserts: [checkMap.max_length("test.name.prefix", 10, "string")],
  //           },
  //           {
  //             name: "suffix",
  //             type: "option<string>",
  //             asserts: [checkMap.max_length("test.name.suffix", 10, "string")],
  //           },
  //         ],
  //       },
  //       {
  //         name: "address",
  //         type: "object",
  //         children: [
  //           {
  //             name: "street",
  //             type: "string",
  //             asserts: [
  //               checkMap.min_length("test.address.street", 1, "string"),
  //             ],
  //           },
  //           {
  //             name: "unit",
  //             type: "option<string>",
  //           },
  //           {
  //             name: "city",
  //             type: "string",
  //             asserts: [checkMap.min_length("test.address.city", 1, "string")],
  //           },
  //           {
  //             name: "state",
  //             type: "string",
  //             asserts: [checkMap.length_equals("test.address.state", 2)],
  //           },
  //           {
  //             name: "postalCode",
  //             type: "string",
  //             asserts: [
  //               checkMap.min_length("test.address.postalCode", 5, "string"),
  //               checkMap.max_length("test.address.postalCode", 10, "string"),
  //             ],
  //           },
  //           {
  //             name: "country",
  //             type: "string",
  //             asserts: [checkMap.length_equals("test.address.country", 2)],
  //           },
  //           {
  //             name: "coordinates",
  //             type: "option<object>",
  //             children: [
  //               {
  //                 name: "latitude",
  //                 type: "number",
  //                 asserts: [
  //                   checkMap.greater_than(
  //                     "test.address.coordinates.latitude",
  //                     -90,
  //                     true,
  //                   ),
  //                   checkMap.less_than(
  //                     "test.address.coordinates.latitude",
  //                     90,
  //                     true,
  //                   ),
  //                 ],
  //               },
  //               {
  //                 name: "longitude",
  //                 type: "number",
  //                 asserts: [
  //                   checkMap.greater_than(
  //                     "test.address.coordinates.longitude",
  //                     -180,
  //                     true,
  //                   ),
  //                   checkMap.less_than(
  //                     "test.address.coordinates.longitude",
  //                     180,
  //                     true,
  //                   ),
  //                 ],
  //               },
  //             ],
  //           },
  //         ],
  //       },
  //     ],
  //   },
  // );

  // defineTest("array<object>", [z.array(z.object({})), z.object({}).array()], {
  //   type: "array<object>",
  //   debug: true,
  //   tests: {
  //     passing: [
  //       testCase({
  //         value: [],
  //       }),
  //       testCase({
  //         value: [
  //           {
  //             name: "Manuel",
  //           },
  //           {
  //             name: "David",
  //           },
  //         ],
  //       }),
  //     ],
  //   },
  // });

  // // defineTest("array", [z.array(z.any()), z.any().array()], {
  // //   type: "array<any>",
  // // });

  // // test.each([
  // //   // <expected>, <schema>
  // //   // ----------------------
  // //   [
  // //     "any",
  // //     z.any(),
  // //     dedent`
  // //       DEFINE TYPE test TYPE any;
  // //     `,
  // //   ],
  // //   // ["bool", z.boolean()],
  // //   // ["object", z.object()],
  // //   // ["number", z.number()],
  // //   // // ['["asd", "qwe"]', z.tuple([z.literal('asd'), z.literal('qwe')])]
  // //   // [
  // //   //   "option<string>",
  // //   //   [z.string().optional(), z.string().optional().nonoptional().optional()],
  // //   // ],
  // //   // ["string | NULL", z.string().nullable()],
  // //   // ["string", z.base64()],
  // //   // ["string", z.base64url()],
  // //   // ["array<any>", z.any().array()],
  // //   // // ['range', sz.range()],
  // //   // // ["record", sz.record()],
  // //   // // ["record<user>", z.record(['user'])],
  // //   // // ["record<user | administrator>", sz.record(['user', 'administrator'])],
  // //   // // ["set", z.set(z.any())],
  // //   // // ["set<string>", z.set(z.string())],
  // //   // // ["set<string, 10>", z.set(z.string()).max(10)],
  // //   // ["string", [z.string(), z.string().optional().nonoptional()]],
  // //   // ["NONE", z.undefined()],
  // //   // ["NONE | NULL", z.undefined().nullable()],
  // // ])("%s", async (typeName, _schemas) => {
  // //   const schemas = Array.isArray(_schemas) ? _schemas : [_schemas];
  // //   for (let i = 0; i < schemas.length; i++) {
  // //     // biome-ignore lint/style/noNonNullAssertion: bounds accounted for
  // //     const schema = schemas[i]!;
  // //     const type = zodTypeToSurrealType(schema, [], {
  // //       transforms: [],
  // //       asserts: [],
  // //       children: [],
  // //       rootSchema: schema,
  // //       table: new Table("test"),
  // //       name: `test_${i}`,
  // //     });
  // //     expect(type).toBe(typeName);
  // //     await surreal.query(
  // //       `DEFINE FIELD test_${i} ON TABLE client TYPE ${type};`,
  // //     );
  // //   }
  // // });

  // describe("default values", () => {
  //   defineTest(
  //     "string [default: 'Hello World']",
  //     z.string().default("Hello World"),
  //     {
  //       type: "string",
  //       default: { value: "Hello World" },
  //       tests: {
  //         passing: [{ value: undefined, equals: "Hello World" }],
  //       },
  //     },
  //   );
  // });
});

// describe("backwards compatibility", () => {
//   test("email regex didn't change", () => {
//     const original =
//       /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
//     const newRegex = z.email()._zod.def.pattern as RegExp;
//     expect(newRegex).toEqual(original);
//   });
// });
