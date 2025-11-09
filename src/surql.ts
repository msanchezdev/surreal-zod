import { BoundQuery, surql, Table } from "surrealdb";
// import type * as z3 from 'zod/v3'
import type * as z4 from "zod/v4/core";
import { zodToSexpr } from "./print";

export interface ZodToSurqlOptions {
  table: string | Table;
  schemafull?: boolean;
  exists?: "ignore" | "error" | "overwrite";
  drop?: boolean;
  comment?: string;
  schema: z4.$ZodObject;
}

export function zodToSurql(
  options: ZodToSurqlOptions,
): [z4.$ZodObject, BoundQuery] {
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
    query.append(queryForField({ name: key, table, type: value }));
  }

  return [schema, query];
}

function defineTable(options: ZodToSurqlOptions) {
  const table =
    typeof options.table === "string"
      ? new Table(options.table)
      : options.table;
  const query = surql`DEFINE TABLE`;

  if (options.exists === "ignore") {
    query.append(surql` IF NOT EXISTS`);
  } else if (options.exists === "overwrite") {
    query.append(surql` OVERWRITE`);
  }
  // Looks like passing Table instance is not supported yet
  query.append(surql` ${table.name}`);

  if (options.drop) {
    query.append(surql` DROP`);
  }

  if (options.schemafull) {
    query.append(surql` SCHEMAFULL`);
  } else {
    query.append(surql` SCHEMALESS`);
  }

  if (options.comment) {
    query.append(surql` COMMENT ${options.comment}`);
  }

  query.append(surql`;\n`);

  return query;
}

function queryForField(options: {
  name: string;
  table: string | Table;
  type: z4.$ZodType;
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

  const query = surql`DEFINE FIELD ${name} ON ${table.name}`;
  const type = zodTypeToSurrealType(schema);
  query.append(surql(` TYPE ${type}` as unknown as TemplateStringsArray));
  query.append(`;\n`);

  if (schema._zod.def.type === "object") {
    for (const [key, value] of Object.entries(schema._zod.def.shape)) {
      query.append(
        queryForField({ name: `${name}.${key}`, table, type: value }),
      );
    }
  }

  return query;
}

export function zodTypeToSurrealType(type: z4.$ZodType) {
  const schema = type as z4.$ZodTypes;
  if (!("_zod" in schema)) {
    throw new Error(
      "Invalid schema provided, make sure you are using zod v4 as zod v3 is currently not supported.",
    );
  }

  const def = schema._zod.def;
  console.log(zodToSexpr(type));

  switch (def.type) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "bigint":
      return "bigint";
    case "boolean":
      return "boolean";
    case "symbol":
      return "symbol";
    case "undefined":
      return "undefined";
    case "null":
      return "null";
    default:
      return "any";
  }
}
