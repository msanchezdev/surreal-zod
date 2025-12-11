import { AsymmetricMatcher, describe, expect, test } from "bun:test";
import { safeParse } from "zod/v4";
import sz from "../src";
import { RecordId } from "surrealdb";

const suites = {
  string: {
    simple: "Hello World",
    empty: "",
  },
  number: {
    positive: 123,
    negative: -123,
    decimal: 123.456,
    zero: 0,
    max_int: Number.MAX_SAFE_INTEGER,
    min_int: Number.MIN_SAFE_INTEGER,
  },
  bigint: {
    positive: 123n,
    negative: -123n,
  },
  boolean: {
    true: true,
    false: false,
  },
  null: {
    simple: null,
  },
  undefined: {
    simple: undefined,
  },
  array: {
    empty: [],
    basic: [1, 2, 3],
    nested: [
      [1, 2, 3],
      [4, 5, 6],
    ],
  },
  object: {
    basic: {
      name: "John Doe",
      age: 17,
    },
    nested: {
      name: "John Doe",
      age: 17,
      meta: {
        created: new Date(),
        version: 1,
        deleted: false,
      },
    },
  },
  recordId: {
    basic: new RecordId("user", "123"),
    different_table: new RecordId("test", "123"),
    different_type: new RecordId("user", 123),
  },
};

type SuiteCfg = {
  [key in keyof typeof suites]?:
    | boolean
    | {
        [subkey in keyof (typeof suites)[key]]?:
          | boolean
          | {
              __but__?: {
                pass: true;
                expected: any;
              };
            }
          | {
              __but__?: {
                pass: false;
                error: AsymmetricMatcher;
              };
            }
          | {
              __but__?: {
                dontPatch: any;
              };
            };
      };
};

const all = (tests?: SuiteCfg) => {
  const toExecute = {};
  for (const suiteName in suites) {
    toExecute[suiteName] = {};

    if (typeof tests?.[suiteName] === "boolean") {
      for (const testCase in suites[suiteName]) {
        toExecute[suiteName][testCase] = tests?.[suiteName] ?? true;
      }
    } else {
      for (const testCase in suites[suiteName]) {
        toExecute[suiteName][testCase] = tests?.[suiteName]?.[testCase] ?? true;
      }
    }
  }
  return toExecute;
};

const none = (tests?: SuiteCfg) => {
  const toExecute = {};
  for (const suiteName in suites) {
    toExecute[suiteName] = {};

    if (typeof tests?.[suiteName] === "boolean") {
      for (const testCase in suites[suiteName]) {
        toExecute[suiteName][testCase] = tests?.[suiteName] ?? false;
      }
    } else {
      for (const testCase in suites[suiteName]) {
        toExecute[suiteName][testCase] =
          tests?.[suiteName]?.[testCase] ?? false;
      }
    }
  }
  return toExecute;
};

const but = {
  pass: {
    expecting: <T>(testcase: T, patch: (testcase: T) => any) => {
      return {
        __but__: {
          pass: true as const,
          expected: patch(structuredClone(testcase)),
        },
      };
    },
  },
  fail: {
    with: (error: ReturnType<typeof expect.objectContaining>) => {
      return {
        __but__: {
          pass: false as const,
          error,
        },
      };
    },
  },
  dontPatch: (value: any) => {
    return {
      __but__: {
        dontPatch: value,
      },
    };
  },
};

function testSchema(
  name: string,
  schema: sz.SurrealZodType,
  shouldMatch: SuiteCfg,
) {
  describe(name, () => {
    // console.log(name, shouldMatch);
    for (const [suiteName, suite] of Object.entries(suites)) {
      for (const [testcaseName, testcaseValue] of Object.entries(suite)) {
        const title = `${suiteName}.${testcaseName}`;
        test(`= ${title}`, () => {
          const override = shouldMatch[suiteName][testcaseName]?.__but__
            ? shouldMatch[suiteName][testcaseName].__but__
            : undefined;

          const shouldPass =
            override?.pass ?? shouldMatch[suiteName][testcaseName];

          if (shouldPass) {
            const parse = safeParse(schema, testcaseValue);
            expect(parse).toMatchObject({
              success: true,
              data: override?.expected ?? testcaseValue,
            });
          } else {
            const parse = safeParse(schema, testcaseValue);
            let received: string = typeof testcaseValue;
            if (testcaseValue === null) {
              received = "null";
            } else if (testcaseValue === undefined) {
              received = "undefined";
            } else if (received === "object") {
              if (Array.isArray(testcaseValue)) {
                received = "array";
              } else if (testcaseValue instanceof RecordId) {
                received = "RecordId";
              }
            }

            expect(parse).toMatchObject({
              success: false,
              error:
                override?.error ??
                expect.objectContaining({
                  issues: expect.arrayContaining([
                    expect.objectContaining({
                      code: "invalid_type",
                    }),
                  ]),
                }),
            });
          }
        });
      }
    }
  });
}

function _patch(tests: SuiteCfg, patch: SuiteCfg) {
  const patched = {};
  // clone tests
  for (const [suiteName, suite] of Object.entries(tests)) {
    patched[suiteName] = {};
    for (const [testcaseName, testcaseValue] of Object.entries(suite)) {
      patched[suiteName][testcaseName] = testcaseValue;
    }
  }
  // patch tests
  for (const [suiteName, suite] of Object.entries(tests)) {
    for (const [testcaseName, _testcaseValue] of Object.entries(suite)) {
      if (
        tests[suiteName]?.[testcaseName]?.__but__ &&
        tests[suiteName]?.[testcaseName].__but__.dontPatch !== undefined
      ) {
        patched[suiteName][testcaseName] =
          tests[suiteName]?.[testcaseName].__but__?.dontPatch;
      } else if (typeof patch[suiteName] === "boolean") {
        patched[suiteName][testcaseName] = patch[suiteName];
      } else if (typeof patch[suiteName]?.[testcaseName] === "boolean") {
        patched[suiteName][testcaseName] = patch[suiteName]?.[testcaseName];
      }
    }
  }
  return patched;
}

describe("surreal-zod", () => {
  for (const { name, wrap, patch } of [
    {
      name: "",
      wrap: (schema: sz.SurrealZodType) => schema,
      patch: (tests: SuiteCfg) => _patch(tests, tests),
    },
    {
      name: "optional",
      wrap: (schema: sz.SurrealZodType) => sz.optional(schema),
      patch: (tests: SuiteCfg) =>
        _patch(tests, {
          undefined: true,
        }),
    },
    {
      name: "nonoptional",
      wrap: (schema: sz.SurrealZodType) => sz.nonoptional(schema),
      patch: (tests: SuiteCfg) =>
        _patch(tests, {
          undefined: false,
        }),
    },
    {
      name: "nullable",
      wrap: (schema: sz.SurrealZodType) => sz.nullable(schema),
      patch: (tests: SuiteCfg) =>
        _patch(tests, {
          null: true,
        }),
    },
    {
      name: "nullish",
      wrap: (schema: sz.SurrealZodType) => sz.nullish(schema),
      patch: (tests: SuiteCfg) =>
        _patch(tests, {
          undefined: true,
          null: true,
        }),
    },
  ]) {
    (name ? describe : (_name: string, fn: () => any) => fn())(name, () => {
      testSchema("any", wrap(sz.any()), patch(all({})));
      testSchema("unknown", wrap(sz.unknown()), patch(all({})));
      testSchema("never", wrap(sz.never()), patch(none({})));
      testSchema("boolean", wrap(sz.boolean()), patch(none({ boolean: true })));
      testSchema("string", wrap(sz.string()), patch(none({ string: true })));
      testSchema("number", wrap(sz.number()), patch(none({ number: true })));
      testSchema("bigint", wrap(sz.bigint()), patch(none({ bigint: true })));
      testSchema("null", wrap(sz.null()), patch(none({ null: true })));
      testSchema(
        "undefined",
        wrap(sz.undefined()),
        patch(none({ undefined: true })),
      );
      // testSchema("array", sz.array(sz.number()), none({ array: true }));
      testSchema(
        "object",
        wrap(
          sz.object({
            name: sz.string(),
            age: sz.number(),
          }),
        ),
        patch(
          none({
            object: {
              basic: true,
              nested: but.pass.expecting(suites.object.nested, (testcase) => {
                // @ts-expect-error - not undefined
                delete testcase.meta;
                return testcase;
              }),
            },
          }),
        ),
      );
      testSchema(
        "loose object",
        wrap(
          sz.object({
            name: sz.string(),
            age: sz.number(),
            meta: sz.object().loose(),
          }),
        ),
        patch(
          none({
            object: {
              basic: false,
              nested: true,
            },
          }),
        ),
      );
      testSchema(
        "strict object",
        wrap(
          sz.object({
            name: sz.string(),
            age: sz.number(),
            meta: sz
              .object({
                created: sz.any(),
                deleted: sz.boolean(),
              })
              .strict(),
          }),
        ),
        patch(
          none({
            object: {
              basic: false,
              nested: (() => {
                switch (name) {
                  default: {
                    return but.fail.with(
                      expect.objectContaining({
                        issues: expect.arrayContaining([
                          expect.objectContaining({
                            code: "unrecognized_keys",
                            keys: ["version"],
                          }),
                        ]),
                      }),
                    );
                  }
                }
              })(),
            },
          }),
        ),
      );
      testSchema(
        "recordId",
        wrap(sz.recordId(["user", "admin"]).type(sz.string())),
        patch(
          none({
            recordId: {
              basic: true,
              different_type: false,
              different_table: but.fail.with(
                expect.objectContaining({
                  issues: expect.arrayContaining([
                    expect.objectContaining({
                      code: "invalid_value",
                      values: ["user", "admin"],
                    }),
                  ]),
                }),
              ),
            },
          }),
        ),
      );
    });
  }

  describe("recordId", () => {
    test("from RecordId", () => {
      const schema = sz.recordId(["user", "admin"]);
      let parse = safeParse(schema, new RecordId("user", "123"));
      expect(parse).toMatchObject({
        success: true,
        data: new RecordId("user", "123"),
      });
      parse = safeParse(schema, new RecordId("test", "123"));
      expect(parse.success).toBeFalse();
      expect(parse.error?.message).toMatch(
        /Expected RecordId's table to be one of user \| admin but found test/i,
      );
    });

    test("type is overriden", () => {
      const schema = sz.recordId(["user", "admin"]).type(sz.string());
      let parse = safeParse(schema, new RecordId("user", "123"));
      expect(parse).toMatchObject({
        success: true,
        data: new RecordId("user", "123"),
      });
      parse = safeParse(schema, new RecordId("test", 123));
      expect(parse.success).toBeFalse();
      expect(parse.error?.message).toMatch(/expected string, received number/i);
    });

    test("table is overriden", () => {
      let schema: sz.SurrealZodRecordId<string> = sz.recordId([
        "user",
        "admin",
      ]);
      let parse = safeParse(schema, new RecordId("user", "123"));
      expect(parse).toMatchObject({
        success: true,
        data: new RecordId("user", "123"),
      });
      parse = safeParse(schema, new RecordId("test", "123"));
      expect(parse.success).toBeFalse();
      expect(parse.error?.message).toMatch(
        /Expected RecordId's table to be one of user \| admin but found test/i,
      );
      schema = schema.table("test");
      parse = safeParse(schema, new RecordId("test", "123"));
      expect(parse).toMatchObject({
        success: true,
        data: new RecordId("test", "123"),
      });
      parse = safeParse(schema, new RecordId("admin", "123"));
      expect(parse.success).toBeFalse();
      expect(parse.error?.message).toMatch(
        /Expected RecordId's table to be test but found admin/i,
      );
    });

    test("anytable", () => {
      let schema: sz.SurrealZodRecordId = sz.recordId(["user", "admin"]);
      let parse = safeParse(schema, new RecordId("test", "123"));
      expect(parse).toMatchObject({
        success: false,
        error: expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              code: "invalid_value",
              values: ["user", "admin"],
            }),
          ]),
        }),
      });
      schema = schema.anytable();
      parse = safeParse(schema, new RecordId("test", "123"));
      expect(parse).toMatchObject({
        success: true,
        data: new RecordId("test", "123"),
      });
    });
  });

  describe("table", () => {
    test("fails if not an object", () => {
      const schema = sz.table("test").fields({
        name: sz.string(),
      });
      expect(safeParse(schema, "Hello World")).toMatchObject({
        success: false,
        error: expect.objectContaining({
          message: expect.stringMatching(/expected object, received string/i),
        }),
      });
      expect(safeParse(schema, null)).toMatchObject({
        success: false,
        error: expect.objectContaining({
          message: expect.stringMatching(/expected object, received null/i),
        }),
      });
      expect(safeParse(schema, 123)).toMatchObject({
        success: false,
        error: expect.objectContaining({
          message: expect.stringMatching(/expected object, received number/i),
        }),
      });
      expect(safeParse(schema, true)).toMatchObject({
        success: false,
        error: expect.objectContaining({
          message: expect.stringMatching(/expected object, received boolean/i),
        }),
      });
    });

    test("fails if id does not match table name", () => {
      const schema = sz.table("user").schemaless().fields({
        name: sz.string(),
      });
      const parse = safeParse(schema, {
        id: new RecordId("test", 123),
        name: "John Doe",
        age: 99,
      });
      expect(parse).toMatchObject({
        success: false,
        error: expect.objectContaining({
          message: expect.stringMatching(
            /Expected RecordId's table to be user but found test/i,
          ),
        }),
      });
    });

    test("id's table is overriden if already set", () => {
      const schema = sz.table("user").fields({
        id: sz.recordId(["test", "admin"]),
      });
      expect(
        safeParse(schema, {
          id: new RecordId("test", 123),
        }),
      ).toMatchObject({
        success: false,
        error: expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              code: "invalid_value",
              values: ["user"],
              path: ["id"],
            }),
          ]),
          message: expect.stringMatching(
            /Expected RecordId's table to be user but found test/i,
          ),
        }),
      });
    });

    test("fails if id is not provided", () => {
      const schema = sz.table("user").fields({
        name: sz.string(),
      });
      const parse = safeParse(schema, {
        name: "John Doe",
        age: 99,
      });
      expect(parse).toMatchObject({
        success: false,
        error: expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              code: "invalid_type",
              path: ["id"],
              expected: "custom",
            }),
          ]),
        }),
      });
    });

    test("allow extra fields if schemaless", () => {
      const schema = sz.table("user").schemaless().fields({
        name: sz.string(),
      });
      const parse = safeParse(schema, {
        id: new RecordId("user", 123),
        name: "John Doe",
        age: 99,
      });
      expect(parse).toMatchObject({
        success: true,
        data: {
          name: "John Doe",
          age: 99,
        },
      });
    });

    test("deny extra fields if schemafull", () => {
      const schema = sz.table("user").schemafull().fields({
        name: sz.string(),
      });
      const parse = safeParse(schema, {
        id: new RecordId("user", "213"),
        name: "John Doe",
        age: 99,
      });
      expect(parse).toMatchObject({
        success: false,
        error: expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              code: "unrecognized_keys",
              keys: ["age"],
            }),
          ]),
        }),
      });
    });

    test("fail on missing fields", () => {
      const schema = sz.table("test").fields({
        name: sz.string(),
        age: sz.string(),
      });
      const parse = safeParse(schema, {
        id: new RecordId("test", "123"),
      });
      expect(parse).toMatchObject({
        success: false,
        error: expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              code: "invalid_type",
              path: ["name"],
              expected: "string",
            }),
            expect.objectContaining({
              code: "invalid_type",
              path: ["age"],
              expected: "string",
            }),
          ]),
        }),
      });
    });

    describe("record()", () => {
      test("matches table's id type", () => {
        const schema = sz.table("test").record();
        let parse = safeParse(schema, new RecordId("test", "123"));
        expect(parse).toMatchObject({
          success: true,
          data: new RecordId("test", "123"),
        });
        parse = safeParse(schema, new RecordId("user", "123"));
        expect(parse).toMatchObject({
          success: false,
          error: expect.any(Error),
        });
      });

      test("original id schema is preserved", () => {
        const schema = sz
          .table("test")
          .fields({
            id: sz.string(),
            name: sz.string(),
          })
          .record();
        let parse = safeParse(schema, new RecordId("test", "123"));
        expect(parse).toMatchObject({
          success: true,
          data: new RecordId("test", "123"),
        });
        parse = safeParse(schema, new RecordId("user", "123"));
        expect(parse).toMatchObject({
          success: false,
          error: expect.objectContaining({
            issues: expect.arrayContaining([
              expect.objectContaining({
                code: "invalid_value",
                values: ["test"],
              }),
            ]),
          }),
        });
      });
    });

    describe("dto()", () => {
      test("id is optional", () => {
        const schema = sz.table("user").dto().fields({
          name: sz.string(),
        });
        const parse = safeParse(schema, {
          name: "John Doe",
        });
        expect(parse).toMatchObject({
          success: true,
          data: {
            name: "John Doe",
          },
        });
      });

      test("original id schema is preserved", () => {
        const schema = sz.table("user").dto().fields({
          name: sz.string(),
        });
        let parse = safeParse(schema, {
          id: new RecordId("user", "123"),
          name: "John Doe",
        });
        expect(parse).toMatchObject({
          success: true,
          data: {
            id: new RecordId("user", "123"),
            name: "John Doe",
          },
        });
        parse = safeParse(schema, {
          id: new RecordId("test", "456"),
          name: "John Doe",
        });
        expect(parse).toMatchObject({
          success: false,
          error: expect.objectContaining({
            issues: expect.arrayContaining([
              expect.objectContaining({
                code: "invalid_value",
                values: ["user"],
              }),
            ]),
          }),
        });
      });
    });

    describe("entity()", () => {
      test("id is required", () => {
        const schema = sz.table("user").dto().entity().fields({
          name: sz.string(),
        });
        const parse = safeParse(schema, {
          name: "John Doe",
        });
        expect(parse).toMatchObject({
          success: false,
          error: expect.objectContaining({
            issues: expect.arrayContaining([
              expect.objectContaining({
                code: "invalid_type",
                path: ["id"],
                expected: "custom",
              }),
            ]),
          }),
        });
      });

      test("original id schema is preserved", () => {
        const schema = sz.table("user").dto().entity().fields({
          name: sz.string(),
        });
        let parse = safeParse(schema, {
          id: new RecordId("user", "123"),
          name: "John Doe",
        });
        expect(parse).toMatchObject({
          success: true,
          data: {
            id: new RecordId("user", "123"),
            name: "John Doe",
          },
        });
        parse = safeParse(schema, {
          id: new RecordId("test", "456"),
          name: "John Doe",
        });
        expect(parse).toMatchObject({
          success: false,
          error: expect.objectContaining({
            issues: expect.arrayContaining([
              expect.objectContaining({
                code: "invalid_value",
                values: ["user"],
              }),
            ]),
          }),
        });
      });
    });
  });
});
