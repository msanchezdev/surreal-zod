import { expect } from "bun:test";
import getPort from "get-port";
import { Surreal } from "surrealdb";

export const surrealBin = Bun.which("surreal");
export const version = await getSurrealVersion();

if (!version.version.startsWith("3.")) {
  throw new Error("Only surrealdb 3 is supported");
}

async function getSurrealVersion() {
  if (!surrealBin) {
    throw new Error("No surreal binary found, please install surrealdb");
  }

  const match = /(?<version>.*?) for (?<platform>.*?) on (?<arch>.*?)\n/.exec(
    // @ts-expect-error - unknown bun typing error, but it works
    await Bun.spawn([surrealBin, "version"]).stdout.text(),
  );

  if (!match) {
    throw new Error("Failed to get surreal version");
  }

  return match?.groups as { version: string; platform: string; arch: string };
}

export async function startSurrealTestInstance() {
  if (!surrealBin) {
    throw new Error("No surreal binary found, please install surrealdb");
  }
  const port = await getPort();
  const process = Bun.spawn({
    cmd: [
      surrealBin,
      "start",
      `--bind=127.0.0.1:${port}`,
      "--username=test",
      "--password=test",
    ],
    stdio: ["ignore", "ignore", "ignore"],
  });

  const surreal = new Surreal();
  await surreal.connect(`ws://127.0.0.1:${port}`, {
    authentication: {
      username: "test",
      password: "test",
    },
    namespace: "test",
    database: "test",
  });

  return {
    version,
    process,
    port,
    surreal,
    async close() {
      await surreal.close();
      process.kill("SIGTERM");
      await process.exited;
    },
  };
}

export type TestCase<T = any> =
  | {
      value: T;
      parse?: { data: T } | { error: any };
      equals?: T;
    }
  | {
      value: T;
      parse?: { data: T } | { error: any };
      matches: any;
    }
  | {
      value: T;
      parse?: { data: T } | { error: any };
      check(value: T): void | Promise<void>;
    }
  | {
      value: T;
      parse?: { data: T } | { error: any };
      error: Error | string | RegExp;
    };

export type ZodTest = {
  type?: string;
  async?: boolean;
  default?: { value: any; always?: boolean };
  children?: TestCaseChildField[];
  asserts?: string[];
  transforms?: string[];
  schemafull?: boolean;
  debug?: boolean;
  tests?: readonly TestCase<any>[];
  error?: any;
};

export type TestCaseChildField = {
  name: string;
  type: string;
  default?: { value: any; always?: boolean };
  asserts?: string[];
  transforms?: string[];
  children?: TestCaseChildField[];
};

// Helper function to create a properly typed test case
export const testCase = <T>(test: TestCase<T>): TestCase<T> => test;

export const issues = (issues: any[]) =>
  expect.objectContaining({
    issues: expect.arrayContaining(issues),
  });
export const issue = {
  invalid_type: (expected: string, extras?: { path?: string[] }) =>
    expect.objectContaining({
      code: "invalid_type",
      expected,
      ...extras,
    }),
  invalid_union: (...unionIssues: any[]) =>
    expect.objectContaining({
      code: "invalid_union",
      errors: expect.arrayContaining(
        unionIssues.map((issues) => expect.arrayContaining(issues)),
      ),
    }),
  invalid_format: (
    format: string,
    extras?: {
      origin?: string;
      pattern?: RegExp;
      message?: string;
    },
  ) =>
    expect.objectContaining({
      code: "invalid_format",
      format,
      ...extras,
      ...(extras?.pattern ? { pattern: extras.pattern.source } : {}),
    }),
  too_big: (maximum: number | bigint) =>
    expect.objectContaining({
      code: "too_big",
      maximum,
    }),
  too_small: (minimum: number | bigint) =>
    expect.objectContaining({
      code: "too_small",
      minimum,
    }),
  unrecognized_keys: (keys: string[]) =>
    expect.objectContaining({
      code: "unrecognized_keys",
      keys,
    }),
  missing_keys: (keys: string[]) =>
    expect.objectContaining({
      code: "missing_keys",
      keys,
    }),
  invalid_value: (values: string[]) =>
    expect.objectContaining({
      code: "invalid_value",
      values,
    }),
};

export type TestInstance = Awaited<ReturnType<typeof startSurrealTestInstance>>;
