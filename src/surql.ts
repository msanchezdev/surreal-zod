import {
  BoundQuery,
  escapeIdent,
  escapeIdPart,
  RecordId,
  surql,
  Table,
} from "surrealdb";
import * as z4 from "zod/v4/core";
import z from "zod";
import dedent from "dedent";
import type sz from ".";
import type { SurrealZodType, SurrealZodTypes } from "./zod/schema";

export type ZodTypeName = z4.$ZodType["_zod"]["def"]["type"];
export type SurrealZodTypeName = SurrealZodType["_zod"]["def"]["type"];

export interface ZodToSurqlOptions<S extends z4.$ZodObject> {
  table: string | Table;
  schemafull?: boolean;
  exists?: "ignore" | "error" | "overwrite";
  drop?: boolean;
  comment?: string;
  schema: S;
}

export function zodToSurql<S extends z4.$ZodObject>(
  options: ZodToSurqlOptions<S>,
): [
  S extends z4.$ZodObject<infer Shape>
    ? z4.$ZodObject<Shape & { id: z4.$ZodCustom<RecordId> }>
    : never,
  BoundQuery,
] {
  const table =
    typeof options.table === "string"
      ? new Table(options.table)
      : options.table;

  const schema = options.schema;
  if (!("_zod" in schema)) {
    throw new Error(
      "Invalid schema provided, make sure you are using zod v4 as zod v3 is currently not supported.",
    );
  }

  const def = schema._zod.def;
  const shape = def.shape;
  const query = defineTable(options);
  for (const [key, value] of Object.entries(shape)) {
    query.append(
      defineField({ name: key, table, type: value, exists: options.exists }),
    );
  }

  // @ts-expect-error - extend is not a method of z4.$ZodObject
  return [schema.extend({ id: z.any() }), query];
}

function defineTable<S extends z4.$ZodObject>(options: ZodToSurqlOptions<S>) {
  const table =
    typeof options.table === "string"
      ? new Table(options.table)
      : options.table;
  const query = surql`DEFINE TABLE`;

  if (options.exists === "ignore") {
    query.append(" IF NOT EXISTS");
  } else if (options.exists === "overwrite") {
    query.append(" OVERWRITE");
  }
  // Looks like passing Table instance is not supported yet
  query.append(` ${escapeIdPart(table.name)}`);

  if (options.drop) {
    query.append(" DROP");
  }

  if (options.schemafull) {
    query.append(" SCHEMAFULL");
  } else {
    query.append(" SCHEMALESS");
  }

  if (options.comment) {
    query.append(surql` COMMENT ${options.comment}`);
  }

  query.append(";\n");

  return query;
}

function defineField(options: {
  name: string;
  table: string | Table;
  type: z4.$ZodType;
  exists?: "ignore" | "error" | "overwrite";
}) {
  const name = options.name;
  const table =
    typeof options.table === "string"
      ? new Table(options.table)
      : options.table;
  const schema = options.type as z4.$ZodTypes;
  if (!("_zod" in schema)) {
    throw new Error(
      "Invalid field schema provided, make sure you are using zod v4 as zod v3 is currently not supported.",
    );
  }

  const context: ZodSurrealTypeContext = {
    name,
    table,
    rootSchema: schema,
    children: [],
    asserts: [],
    transforms: [],
  };
  const query = surql`DEFINE FIELD`;

  if (options.exists === "ignore") {
    query.append(" IF NOT EXISTS");
  } else if (options.exists === "overwrite") {
    query.append(" OVERWRITE");
  }

  query.append(` ${name} ON TABLE ${table.name}`);

  const type = zodTypeToSurrealType(schema, [], context);

  query.append(` TYPE ${type}`);

  if (context.default) {
    query.append(
      context.default.always
        ? ` DEFAULT ALWAYS ${JSON.stringify(context.default.value)}`
        : ` DEFAULT ${JSON.stringify(context.default.value)}`,
    );
  }

  if (context.transforms.length > 0) {
    query.append(` VALUE {\n`);
    for (const transform of context.transforms) {
      query.append(
        dedent.withOptions({ alignValues: true })`
          //
              ${transform}\n`.slice(3),
      );
    }
    query.append(`}`);
  }

  if (context.asserts.length > 0) {
    query.append(` ASSERT {\n`);
    for (const assert of context.asserts) {
      query.append(
        dedent.withOptions({ alignValues: true })`
          //
              ${assert}\n`.slice(3),
      );
    }
    query.append(`}`);
  }

  query.append(`;\n`);

  if (context.children.length > 0) {
    for (const { name: childName, type: childType } of context.children) {
      query.append(
        defineField({
          name: `${name}.${childName}`,
          table,
          type: childType,
          exists: options.exists,
        }),
      );
    }
  }

  return query;
}

type ZodSurrealTypeContext = {
  name: string;
  table: Table;
  rootSchema: z4.$ZodType;
  children: ZodSurrealChildType[];
  asserts: string[];
  transforms: string[];
  default?: { value: any; always: boolean };
};
type ZodSurrealChildType = { name: string; type: z4.$ZodType };

export function zodTypeToSurrealType(
  type: z4.$ZodType | SurrealZodType,
  parents: string[] = [],
  context: ZodSurrealTypeContext,
): string {
  const schema = type as z4.$ZodTypes | SurrealZodTypes;
  if (!("_zod" in schema)) {
    throw new Error(
      "Invalid schema provided, make sure you are using zod v4 as zod v3 is currently not supported.",
    );
  }

  const def = schema._zod.def;
  const checks = getChecks(schema);
  parseChecks(context.name, checks, context, def.type);
  // console.log(zodToSexpr(type));

  if ("surrealType" in def) {
    switch (def.surrealType) {
      case "record_id":
        if (def.table) {
          return `record<${def.table.map(escapeIdent).join(" | ")}>`;
        } else {
          return "record";
        }
    }
  }

  switch (def.type) {
    case "any":
    case "unknown":
      return "any";
    case "never":
    case "undefined":
      return "NONE";
    case "string":
      return "string";
    case "boolean":
      return "bool";
    case "object": {
      const isInArray = context.rootSchema._zod.def.type === "array";
      // TODO: remove any
      for (const [key, value] of Object.entries((def as any).shape)) {
        context.children.push({
          name: isInArray ? `*.${key}` : key,
          // TODO: remove as
          type: value as z4.$ZodType,
        });
      }
      return "object";
    }
    case "number":
      return "number";
    case "null":
      return "NULL";
    // case "bigint":
    //   return "bigint";
    // case "symbol":
    //   return "symbol";

    case "default": {
      // if (typeof def.defaultValue === "function") {
      //   context.default = { value: def.defaultValue(), always: false };
      // } else {
      // console.log(
      //   "default",
      //   Object.getOwnPropertyDescriptor(def, "defaultValue").get?.toString(),
      // );
      // TODO: remove any
      context.default = { value: (def as any).defaultValue, always: false };
      // }
      return zodTypeToSurrealType(
        // TODO: remove any
        (def as any).innerType,
        [...parents, def.type],
        context,
      );
    }
    case "nullable": {
      const inner = zodTypeToSurrealType(
        // TODO: remove any
        (def as any).innerType,
        [...parents, def.type],
        context,
      );
      if (parents.includes("nullable")) {
        return inner;
      }
      return `${inner} | NULL`;
    }
    case "optional": {
      const inner = zodTypeToSurrealType(
        // TODO: remove any
        (def as any).innerType,
        [...parents, def.type],
        context,
      );
      if (parents.includes("optional") || parents.includes("nonoptional")) {
        return inner;
      }
      return `option<${inner}>`;
    }
    case "nonoptional": {
      // just a marker for children optional to skip the option<...> wrapper
      return zodTypeToSurrealType(
        // TODO: remove any
        (def as any).innerType,
        [...parents, def.type],
        context,
      );
    }
    case "union": {
      // TODO: remove any
      return (
        (def as any).options
          // TODO: remove any
          .map((option: any) =>
            zodTypeToSurrealType(option, [...parents, def.type], context),
          )
          .join(" | ")
      );
    }
    case "array": {
      const inner = zodTypeToSurrealType(
        // TODO: remove any
        (def as any).element,
        [...parents, def.type],
        context,
      );

      return `array<${inner}>`;
    }
    case "custom": {
      return "any";
    }
    default: {
      console.log("unknown type", def.type);
      return "any";
    }
  }
}

function getChecks(_schema: z4.$ZodType | SurrealZodType) {
  const schema = _schema as z4.$ZodTypes | SurrealZodTypes;
  const checks = schema._zod.def.checks ?? [];
  if ("check" in schema._zod.def) {
    checks.unshift(schema as z4.$ZodCheck);
  }
  return checks;
}

function parseChecks(
  name: string,
  checks: z4.$ZodCheck[],
  context: ZodSurrealTypeContext,
  type: ZodTypeName | SurrealZodTypeName,
) {
  for (const check of checks) {
    const { transform, assert } = parseCheck(name, check, type);
    if (transform) {
      context.transforms.push(transform);
    }
    if (assert) {
      context.asserts.push(assert);
    }
  }
}

export const checkMap = {
  min_length(name: string, value: number, type: ZodTypeName) {
    if (type === "array") {
      return `$value.len() >= ${value} || { THROW 'Field "${name}" must have at least ${value} ${value === 1 ? "item" : "items"}' };`;
    }

    if (type === "string") {
      return `$value.len() >= ${value} || { THROW 'Field "${name}" must be at least ${value} ${value === 1 ? "character" : "characters"} long' };`;
    }

    throw new Error(`Invalid type: ${type}`);
  },
  max_length(name: string, value: number, type: ZodTypeName) {
    if (type === "array") {
      return `$value.len() <= ${value} || { THROW 'Field "${name}" must have at most ${value} ${value === 1 ? "item" : "items"}' };`;
    }

    if (type === "string") {
      return `$value.len() <= ${value} || { THROW 'Field "${name}" must be at most ${value} ${value === 1 ? "character" : "characters"} long' };`;
    }

    throw new Error(`Invalid type: ${type}`);
  },
  greater_than(name: string, value: z4.util.Numeric, inclusive: boolean) {
    return `$value ${inclusive ? ">=" : ">"} ${value} || { THROW 'Field "${name}" must be greater than ${inclusive ? "or equal to" : ""} ${value}' };`;
  },
  less_than(name: string, value: z4.util.Numeric, inclusive: boolean) {
    return `$value ${inclusive ? "<=" : "<"} ${value} || { THROW 'Field "${name}" must be less than ${inclusive ? "or equal to" : ""} ${value}' };`;
  },
  length_equals(name: string, value: number, type: ZodTypeName = "string") {
    if (type === "array") {
      return `$value.len() == ${value} || { THROW 'Field "${name}" must have exactly ${value} ${value === 1 ? "item" : "items"}' };`;
    }

    if (type === "string") {
      return `$value.len() == ${value} || { THROW 'Field "${name}" must be exactly ${value} ${value === 1 ? "character" : "characters"} long' };`;
    }

    throw new Error(`Invalid type: ${type}`);
  },

  string_format: {
    email: (name: string) => {
      const regex =
        /^[A-Za-z0-9'_+-]+(?:\.[A-Za-z0-9'_+-]+)*@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
      return `string::matches($value, ${regex}) || { THROW "Field '${name}' must be a valid email address" };`;
    },
    url: (
      name: string,
      def?: Pick<z4.$ZodCheckURLParams, "hostname" | "protocol" | "normalize">,
    ) => {
      return dedent`
        LET $url = {
            scheme: parse::url::scheme($value),
            host: parse::url::host($value),
            domain: parse::url::domain($value),
            path: parse::url::path($value),
            port: parse::url::port($value),
            query: parse::url::query($value),
            hash: parse::url::fragment($value),
        };
        $url.scheme || { THROW "Field '${name}' must be a valid URL" };
        ${
          def?.hostname
            ? `($url.host ?? "").matches(${def.hostname}) || { THROW "Field '${name}' must match hostname ${def.hostname.toString().replace(/\\/g, "\\\\")}" };`
            : ""
        }
        ${
          def?.protocol
            ? `($url.scheme ?? "").matches(${def.protocol}) || { THROW "Field '${name}' must match protocol ${def.protocol.toString().replace(/\\/g, "\\\\")}" };`
            : ""
        }
        $url.scheme + "://" + ($url.host ?? "") + (
            IF $url.port && (
                ($url.scheme == "http" && $url.port != 80) ||
                ($url.scheme == "https" && $url.port != 443)
            ) { ":" + <string>$url.port } ?? ""
        )
        + ($url.path ?? "")
        + (IF $url.query { "?" + $url.query } ?? "")
        + (IF $url.fragment { "#" + $url.fragment } ?? "");
      `;
    },
  },
};

function parseCheck(
  name: string,
  _check: z4.$ZodCheck,
  type: ZodTypeName,
): { transform?: string; assert?: string } {
  const check = _check as z4.$ZodChecks;
  const def = check._zod.def;
  switch (def.check) {
    case "min_length":
      return { assert: checkMap.min_length(name, def.minimum, type) };
    case "max_length":
      return { assert: checkMap.max_length(name, def.maximum, type) };
    case "greater_than":
      return { assert: checkMap.greater_than(name, def.value, def.inclusive) };
    case "less_than":
      return { assert: checkMap.less_than(name, def.value, def.inclusive) };
    case "length_equals":
      return { assert: checkMap.length_equals(name, def.length, type) };
    case "string_format":
      return assertionForStringFormat(name, check);
    default:
      return { assert: `THROW 'Unknown check: ${def.check}';` };
  }
}

// Remove look-around, look-behind, and look-ahead as they are not supported by SurrealDB
function assertionForStringFormat(
  name: string,
  _check: z4.$ZodCheck,
): { transform?: string; assert?: string } {
  const check = _check as z4.$ZodStringFormatChecks;
  const def = check._zod.def;

  switch (def.format) {
    case "email": {
      return { assert: checkMap.string_format.email(name) };
    }
    case "url": {
      const code = checkMap.string_format.url(name, def);
      return def.normalize ? { transform: code } : { assert: code };
    }
    default:
      return { assert: `THROW 'Unsupported string format: ${def.format}';` };
  }
}
