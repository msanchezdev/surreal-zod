import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import dedent from "dedent";
import {
  Decimal,
  RecordId,
  Surreal,
  surql,
  Table,
  escapeIdent,
} from "surrealdb";
import type z4 from "zod/v4/core";
import { sz } from "../src";
import { checkMap } from "../src/surql";
import {
  startSurrealTestInstance,
  testCase,
  type TestCaseChildField,
  type TestInstance,
  type ZodTest,
} from "./utils";
import { SurrealZodTable, type SurrealZodType } from "../src/zod/schema";
import * as common from "./common";
import z from "zod";
import { inspect } from "bun";

describe("surreal-zod", () => {
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

  function getFieldQuery(field: TestCaseChildField, table = "test") {
    return dedent.withOptions({ alignValues: true })`
      DEFINE FIELD OVERWRITE ${field.name} ON TABLE ${table} TYPE ${field.type}${
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
    schemas: SurrealZodType | SurrealZodType[],
    expected: ZodTest,
  ) {
    test(typeName, async () => {
      schemas = Array.isArray(schemas) ? schemas : [schemas];
      for (const schema of schemas) {
        const isTable = schema instanceof SurrealZodTable;
        const table = isTable
          ? schema
          : sz.table("test").fields({
              test: schema as any,
            });
        const query = table.toSurql("define", {
          exists: "overwrite",
          fields: true,
        });
        const tableName = table._zod.def.name;
        const schemafull = table._zod.def.surreal.schemafull;
        const tableType = table._zod.def.surreal.tableType;

        const resultingQuery = query.query;
        let expectedQuery = dedent.withOptions({ alignValues: true })`
          DEFINE TABLE OVERWRITE ${escapeIdent(tableName)} TYPE ${tableType.toUpperCase()} ${schemafull ? "SCHEMAFULL" : "SCHEMALESS"};
        `;
        expectedQuery += "\n";
        if (!isTable) {
          expectedQuery += getFieldQuery(
            {
              name: "id",
              type: "any",
              default: expected.default ?? undefined,
              transforms: expected.transforms ?? [],
              asserts: expected.asserts ?? [],
            },
            tableName,
          );
          expectedQuery += getFieldQuery(
            {
              name: "test",
              type: expected.type ?? "any",
              default: expected.default ?? undefined,
              transforms: expected.transforms ?? [],
              asserts: expected.asserts ?? [],
            },
            tableName,
          );
        }
        if (expected.children?.length) {
          const childrenQueue = [
            ...expected.children.map((child) => ({
              ...child,
              name: isTable ? child.name : `test.${child.name}`,
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
            expectedQuery += getFieldQuery(child, tableName);
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
            const testCaseId = isTable
              ? new RecordId(tableName, `testcase_${i}`)
              : new RecordId("test", `testcase_${i}`);

            if (expected.debug) {
              console.log("========== inserting directly ==========");
              console.log(
                inspect(
                  isTable
                    ? {
                        id: testCaseId,
                        ...test.value,
                      }
                    : {
                        id: testCaseId,
                        test: test.value,
                      },
                  { colors: true, depth: 100 },
                ),
              );
            }

            const result = surreal
              .query(
                isTable
                  ? surql`UPSERT ONLY ${testCaseId} CONTENT ${test.value}`
                  : surql`UPSERT ONLY ${testCaseId} SET test = ${test.value}`,
              )
              .collect()
              .then(([result]) => {
                if (expected.debug) {
                  console.log("========== inserted ==========");
                  console.log(inspect(result, { colors: true, depth: 100 }));
                }
                return result.test;
              })
              .catch((error) => {
                if (expected.debug) {
                  console.log("========== errored with ==========");
                  console.log(error.message);
                }
                throw error;
              });
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
              expect(awaitedResult).toEqual(
                isTable
                  ? {
                      id: new RecordId("a", "b"),
                      ...(test.equals ?? test.value),
                    }
                  : (test.equals ?? test.value),
              );
            }
          }
        }
      }
    });
  }

  const ctx: common.CommonTestsContext = {
    z: sz as any,
    defineTest,
  };

  common.number(ctx);

  common.optional(ctx);
  common.nonoptional(ctx);
  common.null(ctx);
  common.nullable(ctx);
  common.nullish(ctx);
  common.object(ctx);

  describe("recordId", () => {
    defineTest(
      "any table",
      [
        sz.recordId(),
        sz.recordId("user").anytable(),
        sz.recordId(["user", "order"]).anytable(),
        sz.recordId("user").type(z.string()).anytable(),
      ],
      {
        type: "record",
        tests: [
          testCase({ value: new RecordId("user", "123") }),
          testCase({ value: new RecordId("admin", "123") }),
        ],
      },
    );

    defineTest(
      "single table",
      [
        sz.recordId("user"),
        sz.recordId("user").table("user"),
        sz.recordId(["user", "order"]).table("user"),
        sz.recordId("user").type(z.string()),
      ],
      {
        type: "record<user>",
        tests: [
          testCase({ value: new RecordId("user", "123") }),
          testCase({
            value: new RecordId("order", "123"),
            error: /Expected `record<user>` but found `order:\u27e8123\u27e9`/i,
          }),
        ],
      },
    );

    defineTest(
      "multiple tables",
      [
        sz.recordId(["user", "admin"]),
        sz.recordId(["user", "admin"]).type(z.string()),
      ],
      {
        type: "record<user | admin>",
        tests: [testCase({ value: new RecordId("user", "123") })],
      },
    );
  });

  describe("table", () => {
    test("toSurql('info')", () => {
      const schema = sz.table("user").fields({
        name: z.string(),
      });
      const query = schema.toSurql("info");
      expect(query.query).toEqual(dedent.withOptions({ alignValues: true })`
        INFO FOR TABLE user;
      `);
    });
    test("toSurql('structure')", () => {
      const schema = sz.table("user").fields({
        name: z.string(),
      });
      const query = schema.toSurql("structure");
      expect(query.query).toEqual(dedent.withOptions({ alignValues: true })`
        INFO FOR TABLE user STRUCTURE;
      `);
    });
    test("toSurql('remove')", () => {
      const schema = sz.table("user").fields({
        name: z.string(),
      });
      const query = schema.toSurql("remove");
      expect(query.query).toEqual(dedent.withOptions({ alignValues: true })`
        REMOVE TABLE user;
      `);
      const query2 = schema.toSurql("remove", { missing: "ignore" });
      expect(query2.query).toEqual(dedent.withOptions({ alignValues: true })`
        REMOVE TABLE IF EXISTS user;
        `);
    });
    test("toSurql('define') - default", () => {
      const schema = sz.table("user").comment("Users table").fields({
        name: z.string(),
      });
      const query = schema.toSurql("define");
      expect(query.query.trim()).toMatch(
        /^DEFINE TABLE user TYPE ANY SCHEMALESS COMMENT \$bind__\d+;$/i,
      );
    });
    test("toSurql('define') - ignore", () => {
      const schema = sz.table("user").fields({
        name: z.string(),
      });
      const query = schema.toSurql("define", { exists: "ignore" });
      expect(query.query.trim()).toEqual(
        dedent.withOptions({ alignValues: true })`
          DEFINE TABLE IF NOT EXISTS user TYPE ANY SCHEMALESS;
        `,
      );
    });
    test("toSurql('define') - overwrite", () => {
      const schema = sz.table("user").fields({
        name: z.string(),
      });
      const query = schema.toSurql("define", { exists: "overwrite" });
      expect(query.query.trim()).toEqual(
        dedent.withOptions({ alignValues: true })`
          DEFINE TABLE OVERWRITE user TYPE ANY SCHEMALESS;
        `,
      );
    });
    test("toSurql('define') - with fields", () => {
      const schema = sz.table("user").fields({
        name: z.string(),
      });
      const query = schema.drop().toSurql("define", { fields: true });
      expect(query.query.trim()).toEqual(
        dedent.withOptions({ alignValues: true })`
          DEFINE TABLE user TYPE ANY DROP SCHEMALESS;
          DEFINE FIELD id ON TABLE user TYPE any;
          DEFINE FIELD name ON TABLE user TYPE string;
        `,
      );
    });
    test("toSurql('define') - relation table", () => {
      const schema = sz
        .table("like")
        .relation()
        .from("user")
        .to(sz.recordId("post"))
        .fields({
          created_at: sz.string(),
        });
      const query = schema.toSurql("define");
      expect(query.query.trim()).toEqual(
        dedent.withOptions({ alignValues: true })`
          DEFINE TABLE like TYPE RELATION FROM user TO post SCHEMALESS;
        `,
      );
    });
    test("toSurql('define') - relation table with fields", () => {
      const schema = sz
        .table("like")
        .relation()
        .from(sz.recordId("user"))
        .to(["post", "comment"])
        .fields({
          created_at: sz.string(),
        });
      const query = schema
        .schemafull()
        .toSurql("define", { fields: true, exists: "ignore" });
      expect(query.query.trim()).toEqual(
        dedent.withOptions({ alignValues: true })`
          DEFINE TABLE IF NOT EXISTS like TYPE RELATION FROM user TO post | comment SCHEMAFULL;
          DEFINE FIELD IF NOT EXISTS id ON TABLE like TYPE any;
          DEFINE FIELD IF NOT EXISTS in ON TABLE like TYPE record<user>;
          DEFINE FIELD IF NOT EXISTS out ON TABLE like TYPE record<post | comment>;
          DEFINE FIELD IF NOT EXISTS created_at ON TABLE like TYPE string;
        `,
      );
    });
    test("toSurql(unknown statement)", () => {
      const schema = sz.table("user").fields({
        name: sz.string(),
      });
      expect(() => schema.toSurql("unknown" as any)).toThrow(
        /Invalid statement/i,
      );
    });
  });

  describe("object", () => {
    describe("schemafull table", () => {
      defineTest(
        "strict object { name: string, age: number }",
        sz
          .table("user")
          .fields({
            test: sz.object({ name: sz.string(), age: sz.number() }).strict(),
          })
          .schemafull(),
        {
          children: [
            { name: "id", type: "any" },
            {
              name: "test",
              type: "object",
              children: [
                { name: "name", type: "string" },
                { name: "age", type: "number" },
              ],
            },
          ],
        },
      );

      defineTest(
        "loose object { name: string, age: number }",
        sz
          .table("user")
          .fields({
            test: sz.object({ name: sz.string(), age: sz.number() }).loose(),
          })
          .schemafull(),
        {
          children: [
            { name: "id", type: "any" },
            {
              name: "test",
              type: "object FLEXIBLE",
              children: [
                { name: "name", type: "string" },
                { name: "age", type: "number" },
              ],
            },
          ],
        },
      );
    });
  });

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

  // defineTest("record", z.recordId(), {
  //   type: "record",
  //   tests: [
  //     testCase({ value: new RecordId("test", "123") }),
  //     testCase({
  //       value: "123",
  //       error: /expected `record` but found `'123'`/i,
  //     }),
  //   ],
  // });

  // defineTest("record<user | admin>", z.recordId(["user", "admin"]), {
  //   type: "record<user | admin>",
  //   tests: [
  //     testCase({
  //       value: new RecordId("user", "123"),
  //       check(value) {
  //         expect(value.table.name).toBe("user");
  //         expect(value.id).toBe("123");
  //       },
  //     }),
  //     testCase({
  //       value: new RecordId("admin", "123"),
  //       check(value) {
  //         expect(value.table.name).toBe("admin");
  //         expect(value.id).toBe("123");
  //       },
  //     }),
  //     testCase({
  //       value: new RecordId("test", "123"),
  //       error:
  //         /expected `record<user\|admin>` but found `test:\u27e8123\u27e9`/i,
  //     }),
  //     testCase({
  //       value: "123",
  //       error: /expected `record<user\|admin>` but found `'123'`/i,
  //     }),
  //   ],
  // });

  // //////////////////////////////////////////
  // /////////      Table Tests      //////////
  // //////////////////////////////////////////

  // describe("table", () => {
  //   defineTest(
  //     "schemafull",
  //     z.table("user").schemafull().fields({
  //       name: z.string(),
  //     }),
  //     {
  //       children: [
  //         {
  //           name: "id",
  //           type: "any",
  //         },
  //         {
  //           name: "name",
  //           type: "string",
  //         },
  //       ],
  //       tests: [
  //         testCase({
  //           value: { name: "John Doe" },
  //         }),
  //         testCase({
  //           value: { name: "John Doe", age: 17 },
  //           error: /no such field exists for table/i,
  //         }),
  //       ],
  //     },
  //   );

  //   defineTest(
  //     "schemaless",
  //     z.table("user").schemaless().fields({
  //       name: z.string(),
  //     }),
  //     {
  //       children: [
  //         {
  //           name: "id",
  //           type: "any",
  //         },
  //         {
  //           name: "name",
  //           type: "string",
  //         },
  //       ],
  //       tests: [
  //         testCase({
  //           value: { name: "John Doe" },
  //         }),
  //         testCase({
  //           value: { name: "John Doe", age: 17 },
  //         }),
  //       ],
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
