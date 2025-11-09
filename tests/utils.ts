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
      equals?: T;
    }
  | {
      value: T;
      matches: any;
    }
  | {
      value: T;
      check(value: T): void | Promise<void>;
    }
  | {
      value: T;
      error: Error | string | RegExp;
    };

export type ZodTest = {
  type?: string;
  default?: { value: any; always?: boolean };
  children?: TestCaseChildField[];
  asserts?: string[];
  transforms?: string[];
  debug?: boolean;
  tests?: readonly TestCase<any>[];
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

export type TestInstance = Awaited<ReturnType<typeof startSurreal>>;
