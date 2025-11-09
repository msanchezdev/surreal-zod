// import type * as z3 from 'zod/v3'
import type * as z4 from "zod/v4/core";

export function zodToSexpr(schema: z4.$ZodType) {
  if ("_zod" in schema) {
    return zod4ToSexpr(schema);
  }

  throw new Error("Zod 3 not yet supported");
}

function zod4ToSexpr(_schema: z4.$ZodType, depth = 0): string {
  const indent = "  ".repeat(depth);
  const childIndent = "  ".repeat(depth + 1);

  const schema = _schema as z4.$ZodTypes;
  const def = schema._zod.def;
  const checks = def.checks ?? [];
  if ("check" in def) {
    checks.push(schema as z4.$ZodCheck);
  }
  const type = def.type;

  if (type === "object") {
    return `(object)`;
  }

  // Primitives

  if (type === "string") {
    const constraints = formatChecks(checks);
    return constraints.length > 0 ? `(string [${constraints}])` : `(string)`;
  }

  if (type === "number") {
    // const constraints = formatChecks(checks);
    // return constraints.length > 0 ? `(number [${constraints}])` : `(number)`;
    return `(number)`;
  }

  if (type === "optional") {
    const inner = zod4ToSexpr(def.innerType, depth + 1);
    return `(optional ${inner})`;
  }
  if (type === "nullable") {
    const inner = zod4ToSexpr(def.innerType, depth + 1);
    return `(nullable ${inner})`;
  }

  if (type === "bigint") {
    return `(bigint)`;
  }

  if (type === "boolean") {
    return `(boolean)`;
  }

  if (type === "symbol") {
    return `(symbol)`;
  }

  if (type === "undefined") {
    return `(undefined)`;
  }

  if (type === "null") {
    return `(null)`;
  }

  // console.log("unknown type", def);

  // if (type === "number") {
  //   const constraints = formatChecks(checks);
  //   return constraints.length > 0 ? `(number [${constraints}])` : `(number)`;
  // }

  return `(unknown-type ${type || "?"})`;
}

function breakLine(sexpr: string, depth: number) {
  // return sexpr.length > 80
  //   ? `\n${"  ".repeat(depth)}${sexpr}\n${"  ".repeat(depth)}`
  //   : sexpr;
  return sexpr;
}

function formatChecks(checks: z4.$ZodCheck[]) {
  return checks.map((check) => formatCheck(check)).join(" ");
}

function formatCheck(_check: z4.$ZodCheck) {
  const check = _check as z4.$ZodChecks;
  const def = check._zod.def;
  switch (def.check) {
    case "min_length":
      return `min:${def.minimum}`;
    case "max_length":
      return `max:${def.maximum}`;
    case "length_equals":
      return `length:${def.length}`;
    case "string_format":
      return parseStringFormat(check);
    // case "bigint_format":
    //   return `bigint_format=${def.format}`;
    // case "number_format":
    //   return `number_format=${def.format}`;
    case "greater_than":
      return `${def.inclusive ? ">=" : ">"}${def.value}`;
    case "less_than":
      return `${def.inclusive ? "<=" : "<"}${def.value}`;
    // case "max_size":
    //   return `max_size=${def.maximum}`;
    // case "min_size":
    //   return `min_size=${def.minimum}`;
    // case "mime_type":
    //   return `mime_type=${def.mime}`;
    // case "multiple_of":
    //   return `multiple_of=${def.value}`;
    // case "size_equals":
    //   return `size_equals=${def.size}`;
    // case undefined: {
    //   return `[unknown ${inspect(def, { colors: true })}]`;
    // }
    default:
      return `[${def.check} ?]`;
  }
}

function parseStringFormat(_check: z4.$ZodCheck) {
  const check = _check as z4.$ZodStringFormatChecks;
  const def = check._zod.def;

  const coerce = "coerce" in def ? `coerce:${def.coerce} ` : "";

  if (def.format === "starts_with") {
    return `starts_with:"${def.prefix}"`;
  } else if (def.format === "ends_with") {
    return `ends_with:"${def.suffix}"`;
  } else if (def.format === "includes") {
    return `includes:"${def.includes}"`;
  } else if (def.format === "regex") {
    return `regex:${def.pattern}`;
  } else if (def.format === "uuid") {
    return `format:uuid${def.version || ""}`;
  } else if (def.format === "xid") {
    return `format:xid`;
  }

  return `${coerce}format:${def.format}`;
}

function zodObjectToSexpr(schema: z4.$ZodObject, level = 0) {
  if (!("_zod" in schema)) {
    throw new Error(
      "Invalid schema provided, make sure you are using zod v4 as zod v3 is currently not supported.",
    );
  }
  const def = schema._zod.def;
  let sexpr = `(${def.type}${def.checks ? ` ${formatChecks(def.checks)}` : ""}`;

  for (const [propName, propSchema] of Object.entries(def.shape)) {
    sexpr += `${zod4ToSexpr(propSchema, level + 1, propName)}\n`;
  }

  sexpr += ")";

  return sexpr;
}
