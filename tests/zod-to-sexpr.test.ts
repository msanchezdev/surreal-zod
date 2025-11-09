import { describe, expect, test } from "bun:test";
import z from "zod/v4";
import * as z4 from "zod/v4/core";
import { zodToSexpr } from "../src/print";

describe("zodToSexpr", () => {
  describe("string", () => {
    test("basic", () => {
      const schema = z.string();
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(string)");
    });

    test("min", () => {
      const schema = z.string().min(1);
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(string [min:1])");
    });

    test("max", () => {
      const schema = z.string().max(10);
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(string [max:10])");
    });

    test("min and max", () => {
      const schema = z.string().min(1).max(10);
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(string [min:1 max:10])");
    });

    test("starts_with", () => {
      const schema = z.string().startsWith("Hello");
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe('(string [starts_with:"Hello"])');
    });

    test("ends_with", () => {
      const schema = z.string().endsWith("Hello");
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe('(string [ends_with:"Hello"])');
    });

    test("starts_with and ends_with", () => {
      const schema = z.string().startsWith("Hello").endsWith("World");
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe('(string [starts_with:"Hello" ends_with:"World"])');
    });

    test("includes", () => {
      const schema = z.string().includes("Hello");
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe('(string [includes:"Hello"])');
    });

    test("regex", () => {
      const schema = z.string().regex(/^[a-z0-9]+$/);
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe(`(string [regex:/^[a-z0-9]+$/])`);
    });

    test("length", () => {
      const schema = z.string().length(10);
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(string [length:10])");
    });

    test("nonempty", () => {
      const schema = z.string().nonempty();
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(string [min:1])");
    });

    test.todo("nonoptional", () => {
      const schema = z.string().nonoptional();
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(nonoptional (string))");
    });

    test("optional", () => {
      const schema = z.string().optional();
      const sexpr = zodToSexpr(schema);
      console.log(sexpr);
      expect(sexpr).toBe("(optional (string))");
    });

    test("nullable", () => {
      const schema = z.string().nullable();
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(nullable (string))");
    });

    test("nonoptional", () => {
      const schema = z.string().nonoptional();
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(nonoptional (string))");
    });

    describe("formats", () => {
      // z.string()[format]()
      test.each([
        "lowercase",
        "uppercase",
        "date",
        "datetime",
        "duration",
      ] as const)("%s", (format) => {
        const schema = z.string()[format]();
        const sexpr = zodToSexpr(schema);
        expect(sexpr).toBe(`(string [format:${format}])`);
      });

      // z[format]()
      test.each(["hex", "hostname"] as const)("%s", (format) => {
        const schema = z[format]();
        const sexpr = zodToSexpr(schema);
        expect(sexpr).toBe(`(string [format:${format}])`);
      });

      // z.string()[format]() & z[format]()
      test.each([
        "base64",
        "base64url",
        "cidrv4",
        "cidrv6",
        "cuid",
        "cuid2",
        "e164",
        "email",
        "emoji",
        "guid",
        "ipv4",
        "ipv6",
        "jwt",
        "ksuid",
        "nanoid",
        "url",
      ] as const)("%s", (format) => {
        const schema = z.string()[format]();
        const sexpr = zodToSexpr(schema);
        expect(sexpr).toBe(`(string [format:${format}])`);

        const schema2 = z[format]();
        const sexpr2 = zodToSexpr(schema2);
        expect(sexpr2).toBe(`(string [format:${format}])`);
      });
    });

    describe("hash", () => {
      const hashes = ["md5", "sha1", "sha256", "sha384", "sha512"] as const;
      const formats = ["hex", "base64", "base64url"] as const;
      test.each(
        hashes.flatMap((hash) => formats.map((format) => [hash, format])),
      )("%s_%s", (hash, format) => {
        const schema = z.hash(hash, { enc: format });
        const sexpr = zodToSexpr(schema);
        expect(sexpr).toBe(`(string [format:${hash}_${format}])`);
      });
    });

    describe("uuid", () => {
      test.each(["", "v4", "v6", "v7"] as const)("uuid%s", (version) => {
        const schema = z.string()[`uuid${version}`]();
        const sexpr = zodToSexpr(schema);
        expect(sexpr).toBe(`(string [format:uuid${version}])`);

        const schema2 = z[`uuid${version}`]();
        const sexpr2 = zodToSexpr(schema2);
        expect(sexpr2).toBe(`(string [format:uuid${version}])`);
      });
    });
  });

  describe("number", () => {
    test("basic", () => {
      const schema = z.number();
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(number)");
    });

    test.todo("min", () => {
      const schema = z.number().min(1);
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(number [>=1])");
    });

    test.todo("max", () => {
      const schema = z.number().max(10);
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(number [<=10])");
    });

    test.todo("min and max", () => {
      const schema = z.number().min(1).max(10);
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(number [>=1 <=10])");
    });
  });

  describe("bigint", () => {
    test("basic", () => {
      const schema = z.bigint();
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(bigint)");
    });
  });

  describe("boolean", () => {
    test("basic", () => {
      const schema = z.boolean();
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(boolean)");
    });
  });

  describe("symbol", () => {
    test("basic", () => {
      const schema = z.symbol();
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(symbol)");
    });
  });

  describe("undefined", () => {
    test("basic", () => {
      const schema = z.undefined();
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(undefined)");
    });
  });

  describe("null", () => {
    test("basic", () => {
      const schema = z.null();
      const sexpr = zodToSexpr(schema);
      expect(sexpr).toBe("(null)");
    });
  });
});
