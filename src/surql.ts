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
import type {
  SurrealZodNonOptional,
  SurrealZodNullable,
  SurrealZodObject,
  SurrealZodOptional,
  SurrealZodRecordId,
  SurrealZodTable,
  SurrealZodTableNormal,
  SurrealZodTableRelation,
  SurrealZodType,
  SurrealZodTypes,
} from "./zod/schema";

export type ZodTypeName = z4.$ZodType["_zod"]["def"]["type"];
export type SurrealZodTypeName = SurrealZodType["_zod"]["def"]["type"];

/////////////////////////////////////
/////////////////////////////////////
//////////                 //////////
//////////      Table      //////////
//////////                 //////////
/////////////////////////////////////
/////////////////////////////////////

export function tableToSurql(
  table: SurrealZodTable,
  statement: "define",
  defineOptions?: DefineTableOptions,
): BoundQuery<[undefined]>;
export function tableToSurql(
  table: SurrealZodTable,
  statement: "remove",
  removeOptions?: RemoveTableOptions,
): BoundQuery<[undefined]>;
export function tableToSurql(
  table: SurrealZodTable,
  statement: "info",
): BoundQuery<[TableInfo]>;
export function tableToSurql(
  table: SurrealZodTable,
  statement: "structure",
): BoundQuery<[TableStructure]>;
export function tableToSurql(
  table: SurrealZodTable,
  statement: "define" | "info" | "structure" | "remove",
  options?: DefineTableOptions | RemoveTableOptions,
): BoundQuery<[TableInfo | TableStructure]> {
  if (statement === "define") {
    return defineTable(table, options as DefineTableOptions);
  }
  if (statement === "info") {
    return infoTable(table);
  }
  if (statement === "structure") {
    return structureTable(table);
  }
  if (statement === "remove") {
    return removeTable(table, options as RemoveTableOptions);
  }
  throw new Error(`Invalid statement: ${statement}`);
}

export type RemoveTableOptions = {
  /**
   * What to do if the table is missing.
   * - "ignore": Ignore the error and continue.
   * - "error": Throw an error if the table is missing.
   * @default "error"
   */
  missing?: "ignore" | "error";
};

export function removeTable(
  table: SurrealZodTable,
  options?: RemoveTableOptions,
): BoundQuery<[undefined]> {
  const name = table._zod.def.name;
  const query = surql`REMOVE TABLE`;
  const removeOptions = options as RemoveTableOptions;
  if (removeOptions?.missing === "ignore") {
    query.append(" IF EXISTS");
  }
  query.append(` ${escapeIdent(name)}`);
  query.append(";");
  return query;
}

export interface TableInfo {
  events: Record<string, string>;
  fields: Record<string, string>;
  indexes: Record<string, string>;
  lives: Record<string, string>;
  tables: Record<string, string>;
}

export function infoTable(table: SurrealZodTable): BoundQuery<[TableInfo]> {
  const name = table._zod.def.name;
  const query = surql`INFO FOR TABLE`;
  query.append(` ${escapeIdent(name)}`);
  query.append(";");
  return query;
}

export interface TableStructure {
  events: unknown[];
  fields: FieldStructure[];
  indexes: unknown[];
  lives: unknown[];
  tables: unknown[];
}

export interface FieldStructure {
  name: string;
  kind: string;
  permissions: {
    create: boolean;
    select: boolean;
    update: boolean;
  };
  readonly: boolean;
  what: string;
}

export function structureTable(
  table: SurrealZodTable,
): BoundQuery<[TableStructure]> {
  const name = table._zod.def.name;
  const query = surql`INFO FOR TABLE`;
  query.append(` ${escapeIdent(name)}`);
  query.append(" STRUCTURE;");
  return query;
}

export type DefineTableOptions = {
  exists?: "ignore" | "error" | "overwrite";
  fields?: boolean;
};

export function defineTable(
  schema: SurrealZodTable,
  options?: DefineTableOptions,
): BoundQuery<[undefined, ...undefined[]]> {
  const def = schema._zod.def;
  const surreal = schema._zod.def.surreal;
  const table = new Table(def.name);

  const query = surql`DEFINE TABLE`;

  if (options?.exists === "ignore") {
    query.append(" IF NOT EXISTS");
  } else if (options?.exists === "overwrite") {
    query.append(" OVERWRITE");
  }
  // Looks like passing Table instance is not supported yet
  query.append(` ${escapeIdPart(table.name)}`);
  query.append(` TYPE ${surreal.tableType.toUpperCase()}`);

  if (isRelationTable(schema)) {
    const fromTables = schema._zod.def.fields.in._zod.def.table;
    if (fromTables) {
      query.append(` FROM ${fromTables.map(escapeIdent).join(" | ")}`);
    }
    const toTables = schema._zod.def.fields.out._zod.def.table;
    if (toTables) {
      query.append(` TO ${toTables.map(escapeIdent).join(" | ")}`);
    }
  }

  if (surreal.drop) {
    query.append(" DROP");
  }

  if (surreal.schemafull) {
    query.append(" SCHEMAFULL");
  } else {
    query.append(" SCHEMALESS");
  }

  if (surreal.comment) {
    query.append(surql` COMMENT ${surreal.comment}`);
  }

  query.append(";\n");

  if (options?.fields) {
    for (const [fieldName, fieldSchema] of Object.entries(def.fields)) {
      query.append(
        defineField(
          fieldName,
          table.name,
          fieldName === "id"
            ? (fieldSchema as SurrealZodRecordId)._zod.def.innerType
            : fieldSchema,
          {
            exists: options.exists,
            schemafull: surreal.schemafull,
          },
        ),
      );
    }
  }

  return query;
}

export function isNormalTable(
  table: SurrealZodTable,
): table is SurrealZodTableNormal {
  return table._zod.def.surreal.tableType === "normal";
}

export function isRelationTable(
  table: SurrealZodTable,
): table is SurrealZodTableRelation {
  return table._zod.def.surreal.tableType === "relation";
}

export interface ZodToSurqlOptions<S extends z4.$ZodObject> {
  table: string | Table;
  schemafull?: boolean;
  exists?: "ignore" | "error" | "overwrite";
  drop?: boolean;
  comment?: string;
  schema: S;
}

export type DefineFieldOptions = {
  exists?: "ignore" | "error" | "overwrite";
  schemafull?: boolean;
};

function defineField(
  name: string,
  table: string,
  schema: SurrealZodType,
  options?: DefineFieldOptions,
) {
  // const context: ZodSurrealTypeContext = {
  //   name,
  //   table,
  //   rootSchema: schema,
  //   children: [],
  //   asserts: [],
  //   transforms: [],
  // };
  const query = surql`DEFINE FIELD`;

  if (options?.exists === "ignore") {
    query.append(" IF NOT EXISTS");
  } else if (options?.exists === "overwrite") {
    query.append(" OVERWRITE");
  }

  query.append(` ${name} ON TABLE ${escapeIdent(table)}`);

  const context: ZodSurrealTypeContext = {
    type: new Set(),
    depth: 0,
    children: [],
    flexible: false,
  };
  query.append(` TYPE ${inferSurrealType(schema, context)}`);
  if (options?.schemafull && context.flexible) {
    query.append(" FLEXIBLE");
  }

  // if (options.exists === "ignore") {
  //   query.append(" IF NOT EXISTS");
  // } else if (options.exists === "overwrite") {
  //   query.append(" OVERWRITE");
  // }

  // query.append(` ${name} ON TABLE ${table.name}`);

  // const type =
  //   name === "id"
  //     ? inferSurrealType(
  //         (schema as unknown as SurrealZodRecordId)._zod.def.innerType,
  //         [],
  //         context,
  //       )
  //     : inferSurrealType(schema, [], context);

  // query.append(` TYPE ${type}`);

  // if (context.default) {
  //   query.append(
  //     context.default.always
  //       ? ` DEFAULT ALWAYS ${JSON.stringify(context.default.value)}`
  //       : ` DEFAULT ${JSON.stringify(context.default.value)}`,
  //   );
  // }

  // if (context.transforms.length > 0) {
  //   query.append(` VALUE {\n`);
  //   for (const transform of context.transforms) {
  //     query.append(
  //       dedent.withOptions({ alignValues: true })`
  //         //
  //             ${transform}\n`.slice(3),
  //     );
  //   }
  //   query.append(`}`);
  // }

  // if (context.asserts.length > 0) {
  //   query.append(` ASSERT {\n`);
  //   for (const assert of context.asserts) {
  //     query.append(
  //       dedent.withOptions({ alignValues: true })`
  //         //
  //             ${assert}\n`.slice(3),
  //     );
  //   }
  //   query.append(`}`);
  // }

  query.append(`;\n`);

  if (context.children.length > 0) {
    for (const { name: childName, type: childType } of context.children) {
      query.append(
        defineField(
          `${escapeIdent(name)}.${escapeIdent(childName)}`,
          table,
          childType as SurrealZodType,
          {
            exists: options?.exists,
          },
        ),
      );
    }
  }

  return query;
}

type ZodSurrealTypeContext = {
  // name: string;
  // table: Table;
  // rootSchema: z4.$ZodType;
  // children: ZodSurrealChildType[];
  // asserts: string[];
  // transforms: string[];
  // default?: { value: any; always: boolean };
  type: Set<string>;
  depth: number;
  children: ZodSurrealChildType[];
  flexible: boolean;
};
type ZodSurrealChildType = { name: string; type: z4.$ZodType };

export function inferSurrealType(
  type: SurrealZodType,
  context: ZodSurrealTypeContext,
): string {
  const schema = type as SurrealZodTypes;
  if (!("_zod" in schema)) {
    throw new Error(
      "Invalid schema provided, make sure you are using zod v4 as zod v3 is currently not supported.",
    );
  }

  // if ("surreal" in schema._zod.def) {
  //   return schema._zod.def.surreal.type;
  // } else {
  //   throw new Error(
  //     // @ts-expect-error - zod core not supported
  //     `Invalid surreal schema provided. Received ${schema._zod.def.type}`,
  //   );
  // }

  const def = schema._zod.def;
  const childIndent = "  ".repeat(context.depth + 1);
  // const checks = getChecks(schema);
  // parseChecks(context.name, checks, context, def.type);
  // console.log(zodToSexpr(type));

  switch (def.surreal?.type ?? def.type) {
    case "any":
    case "unknown": {
      context.type.add("any");
      break;
    }
    case "never":
    case "undefined": {
      context.type.add("none");
      break;
    }
    case "optional": {
      inferSurrealType(
        (type as SurrealZodOptional)._zod.def.innerType,
        context,
      );
      context.type.add("none");
      break;
    }
    case "nonoptional": {
      inferSurrealType(
        (type as SurrealZodNonOptional)._zod.def.innerType,
        context,
      );

      if (context.type.size > 1 && context.type.has("none")) {
        context.type.delete("none");
      }
      break;
    }
    case "null": {
      context.type.add("null");
      break;
    }
    case "nullable": {
      inferSurrealType(
        (type as SurrealZodNullable)._zod.def.innerType,
        context,
      );
      context.type.add("null");
      break;
    }
    case "boolean": {
      context.type.add("bool");
      break;
    }
    case "string": {
      context.type.add("string");
      break;
    }
    case "bigint":
    case "number": {
      context.type.add("number");
      break;
    }
    case "object": {
      const _schema = schema as SurrealZodObject;
      const shape = _schema._zod.def.shape;
      const catchall = _schema._zod.def.catchall;
      const isStrict = catchall?._zod.traits.has("$ZodNever");
      const isLoose = catchall?._zod.traits.has("$ZodUnknown");

      // buggy syntax
      // if (isStrict) {
      //   let type = "{";
      //   if (Object.keys(shape).length > 0) {
      //     type += "\n";
      //   }
      //   for (const [key, value] of Object.entries(shape)) {
      //     const childContext: ZodSurrealTypeContext = {
      //       type: new Set(),
      //       depth: context.depth + 1,
      //       children: [],
      //     };
      //     type += `${childIndent}${escapeIdent(key)}: ${inferSurrealType(value, childContext)},\n`;
      //   }
      //   type += "}";
      //   context.type.add(type);
      //   break;
      // }

      context.type.add("object");
      if (isLoose) context.flexible = true;
      for (const [key, value] of Object.entries(shape)) {
        context.children.push({ name: key, type: value });
      }
      break;
    }
    case "record_id": {
      const table = (def as SurrealZodRecordId["_zod"]["def"]).table;
      if (table) {
        context.type.add(`record<${table.map(escapeIdent).join(" | ")}>`);
      } else {
        context.type.add("record");
      }
      break;
    }
    case "table": {
      throw new Error("Table type cannot be used as a field type");
    }
  }

  if (context.type.has("any")) {
    return "any";
  }

  return Array.from(context.type).join(" | ");
}

// function getChecks(_schema: z4.$ZodType | SurrealZodType) {
//   const schema = _schema as z4.$ZodTypes | SurrealZodTypes;
//   const checks = schema._zod.def.checks ?? [];
//   if ("check" in schema._zod.def) {
//     checks.unshift(schema as z4.$ZodCheck);
//   }
//   return checks;
// }

// function parseChecks(
//   name: string,
//   checks: z4.$ZodCheck[],
//   context: ZodSurrealTypeContext,
//   type: ZodTypeName | SurrealZodTypeName,
// ) {
//   for (const check of checks) {
//     const { transform, assert } = parseCheck(name, check, type);
//     if (transform) {
//       context.transforms.push(transform);
//     }
//     if (assert) {
//       context.asserts.push(assert);
//     }
//   }
// }

// export const checkMap = {
//   never(name: string) {
//     return `THROW 'Field "${name}" must never be present'`;
//   },
//   min_length(name: string, value: number, type: ZodTypeName) {
//     if (type === "array") {
//       return `$value.len() >= ${value} || { THROW 'Field "${name}" must have at least ${value} ${value === 1 ? "item" : "items"}' };`;
//     }

//     if (type === "string") {
//       return `$value.len() >= ${value} || { THROW 'Field "${name}" must be at least ${value} ${value === 1 ? "character" : "characters"} long' };`;
//     }

//     throw new Error(`Invalid type: ${type}`);
//   },
//   max_length(name: string, value: number, type: ZodTypeName) {
//     if (type === "array") {
//       return `$value.len() <= ${value} || { THROW 'Field "${name}" must have at most ${value} ${value === 1 ? "item" : "items"}' };`;
//     }

//     if (type === "string") {
//       return `$value.len() <= ${value} || { THROW 'Field "${name}" must be at most ${value} ${value === 1 ? "character" : "characters"} long' };`;
//     }

//     throw new Error(`Invalid type: ${type}`);
//   },
//   greater_than(name: string, value: z4.util.Numeric, inclusive: boolean) {
//     return `$value ${inclusive ? ">=" : ">"} ${value} || { THROW 'Field "${name}" must be greater than ${inclusive ? "or equal to" : ""} ${value}' };`;
//   },
//   less_than(name: string, value: z4.util.Numeric, inclusive: boolean) {
//     return `$value ${inclusive ? "<=" : "<"} ${value} || { THROW 'Field "${name}" must be less than ${inclusive ? "or equal to" : ""} ${value}' };`;
//   },
//   length_equals(name: string, value: number, type: ZodTypeName = "string") {
//     if (type === "array") {
//       return `$value.len() == ${value} || { THROW 'Field "${name}" must have exactly ${value} ${value === 1 ? "item" : "items"}' };`;
//     }

//     if (type === "string") {
//       return `$value.len() == ${value} || { THROW 'Field "${name}" must be exactly ${value} ${value === 1 ? "character" : "characters"} long' };`;
//     }

//     throw new Error(`Invalid type: ${type}`);
//   },

//   string_format: {
//     email: (name: string) => {
//       const regex =
//         /^[A-Za-z0-9'_+-]+(?:\.[A-Za-z0-9'_+-]+)*@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
//       return `string::matches($value, ${regex}) || { THROW "Field '${name}' must be a valid email address" };`;
//     },
//     url: (
//       name: string,
//       def?: Pick<z4.$ZodCheckURLParams, "hostname" | "protocol" | "normalize">,
//     ) => {
//       return dedent`
//         LET $url = {
//             scheme: parse::url::scheme($value),
//             host: parse::url::host($value),
//             domain: parse::url::domain($value),
//             path: parse::url::path($value),
//             port: parse::url::port($value),
//             query: parse::url::query($value),
//             hash: parse::url::fragment($value),
//         };
//         $url.scheme || { THROW "Field '${name}' must be a valid URL" };
//         ${
//           def?.hostname
//             ? `($url.host ?? "").matches(${def.hostname}) || { THROW "Field '${name}' must match hostname ${def.hostname.toString().replace(/\\/g, "\\\\")}" };`
//             : ""
//         }
//         ${
//           def?.protocol
//             ? `($url.scheme ?? "").matches(${def.protocol}) || { THROW "Field '${name}' must match protocol ${def.protocol.toString().replace(/\\/g, "\\\\")}" };`
//             : ""
//         }
//         $url.scheme + "://" + ($url.host ?? "") + (
//             IF $url.port && (
//                 ($url.scheme == "http" && $url.port != 80) ||
//                 ($url.scheme == "https" && $url.port != 443)
//             ) { ":" + <string>$url.port } ?? ""
//         )
//         + ($url.path ?? "")
//         + (IF $url.query { "?" + $url.query } ?? "")
//         + (IF $url.fragment { "#" + $url.fragment } ?? "");
//       `;
//     },
//   },
// };

// function parseCheck(
//   name: string,
//   _check: z4.$ZodCheck,
//   type: ZodTypeName,
// ): { transform?: string; assert?: string } {
//   const check = _check as z4.$ZodChecks;
//   const def = check._zod.def;
//   switch (def.check) {
//     case "min_length":
//       return { assert: checkMap.min_length(name, def.minimum, type) };
//     case "max_length":
//       return { assert: checkMap.max_length(name, def.maximum, type) };
//     case "greater_than":
//       return { assert: checkMap.greater_than(name, def.value, def.inclusive) };
//     case "less_than":
//       return { assert: checkMap.less_than(name, def.value, def.inclusive) };
//     case "length_equals":
//       return { assert: checkMap.length_equals(name, def.length, type) };
//     case "string_format":
//       return assertionForStringFormat(name, check);
//     default:
//       return { assert: `THROW 'Unknown check: ${def.check}';` };
//   }
// }

// // Remove look-around, look-behind, and look-ahead as they are not supported by SurrealDB
// function assertionForStringFormat(
//   name: string,
//   _check: z4.$ZodCheck,
// ): { transform?: string; assert?: string } {
//   const check = _check as z4.$ZodStringFormatChecks;
//   const def = check._zod.def;

//   switch (def.format) {
//     case "email": {
//       return { assert: checkMap.string_format.email(name) };
//     }
//     case "url": {
//       const code = checkMap.string_format.url(name, def);
//       return def.normalize ? { transform: code } : { assert: code };
//     }
//     default:
//       return { assert: `THROW 'Unsupported string format: ${def.format}';` };
//   }
// }
