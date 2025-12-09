/** biome-ignore-all lint/suspicious/noExplicitAny: needed for conversion */
/** biome-ignore-all lint/style/noNonNullAssertion: needed for conversion */
import {
  BoundQuery,
  escapeIdent,
  RecordId,
  surql,
  Table,
  type RecordIdValue,
} from "surrealdb";
import * as core from "zod/v4/core";
import * as classic from "zod/v4";
import {
  defineTable,
  inferSurrealType,
  tableToSurql,
  type DefineTableOptions,
  type RemoveTableOptions,
  type TableInfo,
  type TableStructure,
} from "../surql";

//////////////////////////////////////////////
//////////////////////////////////////////////
//////////                          //////////
//////////      SurrealZodType      //////////
//////////                          //////////
//////////////////////////////////////////////
//////////////////////////////////////////////

export interface SurrealZodTypeDef extends core.$ZodTypeDef {
  surrealType?:
    | "any"
    | "unknown"
    | "never"
    | "undefined"
    | "boolean"
    | "string"
    | "number"
    | "object"
    | "record_id"
    | "table";
}

export interface SurrealZodInternals {
  type: string;
}

export interface SurrealZodTypeInternals<
  out O = unknown,
  out I = unknown,
  out SurrealInternals extends SurrealZodInternals = SurrealZodInternals,
> extends core.$ZodTypeInternals<O, I> {
  def: core.$ZodTypeInternals<O, I>["def"] &
    SurrealZodTypeDef & {
      surreal: SurrealInternals;
    };
}

export interface SurrealZodType<
  out O = unknown,
  out I = unknown,
  out Internals extends SurrealZodTypeInternals<
    O,
    I,
    SurrealZodInternals
  > = SurrealZodTypeInternals<O, I, SurrealZodInternals>,
> extends core.$ZodType<O, I, Internals> {
  // base
  clone(def?: Internals["def"], params?: { parent: boolean }): this;

  // parsing
  parse(
    data: unknown,
    params?: core.ParseContext<core.$ZodIssue>,
  ): core.output<this>;
  safeParse(
    data: unknown,
    params?: core.ParseContext<core.$ZodIssue>,
  ): classic.ZodSafeParseResult<core.output<this>>;

  // wrappers
  optional(): SurrealZodOptional<this>;
  nonoptional(): SurrealZodNonOptional<this>;
  nullable(): SurrealZodNullable<this>;
  nullish(): SurrealZodOptional<SurrealZodNullable<this>>;
}

export interface _SurrealZodType<
  Internals extends SurrealZodTypeInternals = SurrealZodTypeInternals,
> extends SurrealZodType<any, any, Internals> {}

export const SurrealZodType: core.$constructor<SurrealZodType> =
  core.$constructor("SurrealZodType", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodType.init(inst, def);
    // Casting as _surreal.type is built while the schema is initialized
    inst._zod.def.surreal ??= {} as SurrealZodInternals;

    // base methods
    inst.clone = (def, params) => core.clone(inst, def, params);

    // parsing
    inst.parse = (data, params) => {
      return core.parse(inst, data, params);
    };
    // inst.safeParse = (data, params) => {
    //   return core.safeParse(inst, data, params);
    // };

    // wrappers
    inst.optional = () => optional(inst);
    inst.nonoptional = () => nonoptional(inst);
    inst.nullable = () => nullable(inst);
    inst.nullish = () => nullish(inst);

    return inst;
  });

/////////////////////////////////////////////
/////////////////////////////////////////////
//////////                         //////////
//////////      SurrealZodAny      //////////
//////////                         //////////
/////////////////////////////////////////////
/////////////////////////////////////////////

export interface SurrealZodAnyInternals extends core.$ZodAnyInternals {
  def: core.$ZodAnyInternals["def"] & {
    surreal: {
      type: "any";
    };
  };
}

export interface SurrealZodAny
  extends _SurrealZodType<SurrealZodAnyInternals> {}

export const SurrealZodAny: core.$constructor<SurrealZodAny> =
  core.$constructor("SurrealZodAny", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodAny.init(inst, def);
    SurrealZodType.init(inst, def);

    // surreal internals
    inst._zod.def.surreal.type = "any";
  });

export function any(): SurrealZodAny {
  return core._any(SurrealZodAny);
}

/////////////////////////////////////////////////
/////////////////////////////////////////////////
//////////                             //////////
//////////      SurrealZodUnknown      //////////
//////////                             //////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////

export interface SurrealZodUnknownInternals extends core.$ZodUnknownInternals {
  def: core.$ZodUnknownInternals["def"] & {
    surreal: {
      type: "unknown";
    };
  };
}

export interface SurrealZodUnknown
  extends _SurrealZodType<SurrealZodUnknownInternals> {}

export const SurrealZodUnknown: core.$constructor<SurrealZodUnknown> =
  core.$constructor("SurrealZodUnknown", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodUnknown.init(inst, def);
    SurrealZodType.init(inst, def);

    // surreal internals
    inst._zod.def.surreal.type = "unknown";
  });

export function unknown(): SurrealZodUnknown {
  return core._unknown(SurrealZodUnknown);
}

///////////////////////////////////////////////
///////////////////////////////////////////////
//////////                           //////////
//////////      SurrealZodNever      //////////
//////////                           //////////
///////////////////////////////////////////////
///////////////////////////////////////////////

export interface SurrealZodNeverInternals extends core.$ZodNeverInternals {
  def: core.$ZodNeverInternals["def"] & {
    surreal: {
      type: "never";
    };
  };
}

export interface SurrealZodNever
  extends _SurrealZodType<SurrealZodNeverInternals> {}

export const SurrealZodNever: core.$constructor<SurrealZodNever> =
  core.$constructor("SurrealZodNever", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodNever.init(inst, def);
    SurrealZodType.init(inst, def);

    // surreal internals
    inst._zod.def.surreal.type = "never";
  });

export function never(params?: string | core.$ZodNeverParams): SurrealZodNever {
  return core._never(SurrealZodNever, params);
}

///////////////////////////////////////////////////
///////////////////////////////////////////////////
//////////                               //////////
//////////      SurrealZodUndefined      //////////
//////////                               //////////
///////////////////////////////////////////////////
///////////////////////////////////////////////////

export interface SurrealZodUndefinedInternals
  extends core.$ZodUndefinedInternals {
  def: core.$ZodUndefinedInternals["def"] & {
    surreal: {
      type: "undefined";
    };
  };
}

export interface SurrealZodUndefined
  extends _SurrealZodType<SurrealZodUndefinedInternals> {}

export const SurrealZodUndefined: core.$constructor<SurrealZodUndefined> =
  core.$constructor("SurrealZodUndefined", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodUndefined.init(inst, def);
    SurrealZodType.init(inst, def);

    // surreal internals
    inst._zod.def.surreal.type = "undefined";
  });

function _undefined(
  params?: string | core.$ZodUndefinedParams,
): SurrealZodUndefined {
  return core._undefined(SurrealZodUndefined, params);
}
export { _undefined as undefined };

//////////////////////////////////////////////
//////////////////////////////////////////////
//////////                          //////////
//////////      SurrealZodNull      //////////
//////////                          //////////
//////////////////////////////////////////////
//////////////////////////////////////////////

export interface SurrealZodNullInternals extends core.$ZodNullInternals {
  def: core.$ZodNullInternals["def"] & {
    surreal: {
      type: "null";
    };
  };
}

export interface SurrealZodNull
  extends _SurrealZodType<SurrealZodNullInternals> {}

export const SurrealZodNull: core.$constructor<SurrealZodNull> =
  core.$constructor("SurrealZodNull", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodNull.init(inst, def);
    SurrealZodType.init(inst, def);

    // surreal internals
    inst._zod.def.surreal.type = "null";
  });

function _null(params?: string | core.$ZodNullParams): SurrealZodNull {
  return core._null(SurrealZodNull, params);
}
export { _null as null };

/////////////////////////////////////////////////
/////////////////////////////////////////////////
//////////                             //////////
//////////      SurrealZodBoolean      //////////
//////////                             //////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////

export interface SurrealZodBooleanInternals extends core.$ZodBooleanInternals {
  def: core.$ZodBooleanInternals["def"] & {
    surreal: {
      type: "boolean";
    };
  };
}
export interface SurrealZodBoolean
  extends _SurrealZodType<SurrealZodBooleanInternals> {}

export const SurrealZodBoolean: core.$constructor<SurrealZodBoolean> =
  core.$constructor("SurrealZodBoolean", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodBoolean.init(inst, def);
    SurrealZodType.init(inst, def);

    // surreal internals
    inst._zod.def.surreal.type = "boolean";
  });

export function boolean(
  params?: string | core.$ZodBooleanParams,
): SurrealZodBoolean {
  return core._boolean(SurrealZodBoolean, params);
}

////////////////////////////////////////////////
////////////////////////////////////////////////
//////////                            //////////
//////////      SurrealZodString      //////////
//////////                            //////////
////////////////////////////////////////////////
////////////////////////////////////////////////

export interface SurrealZodStringInternals
  extends core.$ZodStringInternals<string> {
  def: core.$ZodStringInternals<string>["def"] & {
    surreal: {
      type: "string";
    };
  };
}

export interface SurrealZodString
  extends _SurrealZodType<SurrealZodStringInternals> {}

export const SurrealZodString: core.$constructor<SurrealZodString> =
  core.$constructor("SurrealZodString", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodString.init(inst, def);
    SurrealZodType.init(inst, def);

    // surreal internals
    inst._zod.def.surreal.type = "string";
  });

export function string(
  params?: string | core.$ZodStringParams,
): SurrealZodString {
  return core._string(SurrealZodString, params);
}

////////////////////////////////////////////////
////////////////////////////////////////////////
//////////                            //////////
//////////      SurrealZodNumber      //////////
//////////                            //////////
////////////////////////////////////////////////
////////////////////////////////////////////////

export interface SurrealZodNumberInternals extends core.$ZodNumberInternals {
  def: core.$ZodNumberInternals["def"] & {
    surreal: {
      type: "number";
    };
  };
}

export interface SurrealZodNumber
  extends _SurrealZodType<SurrealZodNumberInternals> {}

export const SurrealZodNumber: core.$constructor<SurrealZodNumber> =
  core.$constructor("SurrealZodNumber", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodNumber.init(inst, def);
    SurrealZodType.init(inst, def);

    // surreal internals
    inst._zod.def.surreal.type = "number";
  });

export function number(
  params?: string | core.$ZodNumberParams,
): SurrealZodNumber {
  return core._number(SurrealZodNumber, params);
}

////////////////////////////////////////////////
////////////////////////////////////////////////
//////////                            //////////
//////////      SurrealZodBigInt      //////////
//////////                            //////////
////////////////////////////////////////////////
////////////////////////////////////////////////

export interface SurrealZodBigIntInternals extends core.$ZodBigIntInternals {
  def: core.$ZodBigIntInternals["def"] & {
    surreal: {
      type: "bigint";
    };
  };
}

export interface SurrealZodBigInt
  extends _SurrealZodType<SurrealZodBigIntInternals> {}

export const SurrealZodBigInt: core.$constructor<SurrealZodBigInt> =
  core.$constructor("SurrealZodBigInt", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodBigInt.init(inst, def);
    SurrealZodType.init(inst, def);

    // surreal internals
    inst._zod.def.surreal.type = "bigint";
  });

export function bigint(
  params?: string | core.$ZodBigIntParams,
): SurrealZodBigInt {
  return core._bigint(SurrealZodBigInt, params);
}

////////////////////////////////////////////////
////////////////////////////////////////////////
//////////                            //////////
//////////      SurrealZodObject      //////////
//////////                            //////////
////////////////////////////////////////////////
////////////////////////////////////////////////

export interface SurrealZodObjectInternals<
  // @ts-expect-error - unknown assertion error
  out Shape extends core.$ZodShape = core.$ZodLooseShape,
  out Config extends core.$ZodObjectConfig = core.$strip,
> extends core.$ZodObjectInternals<
    Shape,
    Config
  > /*, core.$ZodObject<Shape, Config> */ {
  def: core.$ZodObjectInternals<Shape, Config>["def"] & {
    surreal: {
      type: "object";
      flexible: boolean;
    };
  };
}

export interface SurrealZodObject<
  // @ts-expect-error - unknown assertion error
  out Shape extends core.$ZodShape = core.$ZodLooseShape,
  out Config extends core.$ZodObjectConfig = core.$strip,
> extends _SurrealZodType<SurrealZodObjectInternals<Shape, Config>> {
  loose(): this;
  /**
   * @alias loose
   */
  flexible(): this;
  strict(): this;

  extend<U extends core.$ZodLooseShape>(
    shape: U,
  ): SurrealZodObject<core.util.Extend<Shape, U>, Config>;
  safeExtend<U extends core.$ZodLooseShape>(
    shape: classic.SafeExtendShape<Shape, U> &
      Partial<Record<keyof Shape, core.SomeType>>,
  ): SurrealZodObject<core.util.Extend<Shape, U>, Config>;
}

export const SurrealZodObject: core.$constructor<SurrealZodObject> =
  core.$constructor("SurrealZodObject", (inst, def) => {
    // TODO: Inline implementation and use core instead
    // @ts-expect-error - unknown assertion error
    core.$ZodObject.init(inst, def);
    SurrealZodType.init(inst, def);

    // surreal internals
    inst._zod.def.surreal.type = "object";
    // inst._zod.def.surreal.flexible = false;

    inst.loose = () =>
      inst.clone({
        ...def,
        catchall: unknown(),
      });
    inst.flexible = inst.loose;

    inst.strict = () =>
      inst.clone({
        ...def,
        catchall: never(),
      });

    inst.extend = (incoming: any) => core.util.extend(inst, incoming);
    inst.safeExtend = (incoming: any) => core.util.safeExtend(inst, incoming);
  });

export function object<
  T extends core.$ZodLooseShape = Partial<Record<never, core.SomeType>>,
>(
  shape?: T,
  params?: string | core.$ZodObjectParams,
): SurrealZodObject<core.util.Writeable<T>, core.$strip> {
  const def: core.$ZodObjectDef = {
    type: "object",
    shape: shape ?? {},
    ...core.util.normalizeParams(params),
  };

  return new SurrealZodObject({
    ...def,
    surreal: {
      type: "object",
      flexible: false,
    },
  }) as any;
}

//////////////////////////////////////////////////
//////////////////////////////////////////////////
//////////                              //////////
//////////      SurrealZodRecordId      //////////
//////////                              //////////
//////////////////////////////////////////////////
//////////////////////////////////////////////////

export type SurrealZodRecordIdValue =
  | SurrealZodAny
  // | core.$ZodAny
  | SurrealZodUnknown
  // | core.$ZodUnknown
  | SurrealZodString
  // | core.$ZodString
  | SurrealZodNumber
  // | core.$ZodNumber
  | SurrealZodBigInt
  // | core.$ZodBigInt
  | SurrealZodObject;
// | core.$ZodObject
// | SurrealZodArray
// | core.$ZodArray;

export interface SurrealZodRecordIdDef<
  Table extends string = string,
  Id extends SurrealZodRecordIdValue = SurrealZodRecordIdValue,
> extends SurrealZodTypeDef {
  innerType: Id;
  table?: Table[];

  surreal: {
    type: "record_id";
  };
}

export type RecordIdValueOutput<Id extends SurrealZodRecordIdValue> =
  Id extends {
    _zod: {
      output: any;
    };
  }
    ? Id["_zod"]["output"]
    : RecordIdValue;

export interface SurrealZodRecordIdInternals<
  Table extends string = string,
  Id extends SurrealZodRecordIdValue = SurrealZodRecordIdValue,
> extends SurrealZodTypeInternals<
    RecordId<Table, RecordIdValueOutput<Id>>,
    RecordIdValue
  > {
  def: SurrealZodRecordIdDef<Table, Id>;
}

export interface SurrealZodRecordId<
  Table extends string = string,
  Id extends SurrealZodRecordIdValue = SurrealZodRecordIdValue,
> extends _SurrealZodType<SurrealZodRecordIdInternals<Table, Id>> {
  anytable(): SurrealZodRecordId<string, Id>;

  table<NewTable extends string | string[]>(
    table: NewTable,
  ): SurrealZodRecordId<
    NewTable extends string ? NewTable : NewTable[number],
    Id
  >;

  type<NewType extends SurrealZodRecordIdValue>(
    innerType: NewType,
  ): SurrealZodRecordId<Table, NewType>;
}

function normalizeRecordIdDef(def: SurrealZodRecordIdDef) {
  const invalidType = getInvalidRecordIdValueSchema(def.innerType);
  if (invalidType) {
    throw new Error(`${invalidType} is not valid as a RecordId's value`);
  }

  return {
    ...def,
  };
}

function getInvalidRecordIdValueSchema(schema: core.$ZodType) {
  const def = schema._zod.def;
  switch (def.type) {
    case "any":
    case "string":
    case "number":
      return "";
    default:
      return def.type;
  }
}

export const SurrealZodRecordId: core.$constructor<SurrealZodRecordId> =
  core.$constructor("SurrealZodRecordId", (inst, def) => {
    SurrealZodType.init(inst, def);

    // surreal internals
    inst._zod.def.surreal.type = "record_id";
    const normalized = normalizeRecordIdDef(def);

    inst.anytable = () => {
      return inst.clone({
        ...def,
        table: undefined,
      }) as any;
    };

    inst.table = (table) => {
      return inst.clone({
        ...inst._zod.def,
        table: Array.isArray(table) ? table : [table],
      }) as any;
    };

    inst.type = (innerType) => {
      return inst.clone({
        ...inst._zod.def,
        innerType,
      }) as any;
    };

    inst._zod.parse = (payload, ctx) => {
      if (payload.value instanceof RecordId) {
        if (
          normalized.table &&
          !normalized.table.includes(payload.value.table.name)
        ) {
          payload.issues.push({
            code: "invalid_value",
            values: normalized.table,
            input: payload.value.table.name,
            message:
              normalized.table.length > 1
                ? `Expected RecordId's table to be one of ${normalized.table.map(escapeIdent).join(" | ")} but found ${payload.value.table.name}`
                : `Expected RecordId's table to be ${normalized.table[0]} but found ${payload.value.table.name}`,
          });
        }

        const schema = normalized.innerType._zod;
        const result = schema.run({ value: payload.value.id, issues: [] }, ctx);

        if (result instanceof Promise) {
          return result.then((result) => {
            if (result.issues.length) {
              payload.issues.push(
                ...core.util.prefixIssues("id", result.issues),
              );
            }
            payload.value = new RecordId(
              payload.value.table.name,
              result.value as any,
            );
            return payload;
          });
        } else if (result.issues.length) {
          payload.issues.push(...core.util.prefixIssues("id", result.issues));
        }
        payload.value = new RecordId(
          payload.value.table.name,
          result.value as any,
        );
      } else {
        payload.issues.push({
          code: "invalid_type",
          // TODO: Surreal specific issues
          expected: "custom",
          input: payload.value,
        });
      }

      return payload;
    };

    return inst;
  });

export function recordId<const W extends string | string[]>(
  what?: W,
  innerType?: SurrealZodRecordIdValue,
): SurrealZodRecordId<W extends string ? W : W[number]> {
  return new SurrealZodRecordId({
    // Zod would not be happy if we have a custom type here, so we use any
    type: "any",
    table: what ? (Array.isArray(what) ? what : [what]) : undefined,
    innerType: innerType ?? any(),

    surreal: {
      type: "record_id",
    },
  }) as any;
}

const t = recordId("user", string());
type t = classic.infer<typeof t>;

export type inferRecordIdTable<T extends SurrealZodRecordId<string, any>> =
  T extends SurrealZodRecordId<infer N> ? N : never;

///////////////////////////////////////////////
///////////////////////////////////////////////
//////////                           //////////
//////////      SurrealZodTable      //////////
//////////                           //////////
///////////////////////////////////////////////
///////////////////////////////////////////////

export type SurrealZodTableFields = {
  [key: string]: SurrealZodType;
};

/**
 * Normalizes the fields of a table schema to include the id field if it is not present.
 * If the id field is present, it will be normalized using the table name and the inner type.
 */
type NormalizedIdField<
  TableName extends string,
  Fields extends SurrealZodTableFields,
  FieldName extends string,
> = Fields extends {
  [K in FieldName]: SurrealZodType;
}
  ? Fields[FieldName] extends SurrealZodRecordId<infer _N, infer T>
    ? Omit<Fields, FieldName> & {
        [K in FieldName]: SurrealZodRecordId<TableName, T>;
      }
    : Fields[FieldName] extends SurrealZodRecordIdValue
      ? Omit<Fields, FieldName> & {
          [K in FieldName]: SurrealZodRecordId<TableName, Fields[FieldName]>;
        }
      : Omit<Fields, FieldName> & {
          [K in FieldName]: SurrealZodRecordId<TableName>;
        }
  : Fields & {
      [K in FieldName]: SurrealZodRecordId<TableName>;
    };

export type NormalizedFields<
  TableName extends string = string,
  Fields extends SurrealZodTableFields = {},
> = core.util.Prettify<NormalizedIdField<TableName, Fields, "id">>;

type SetConfig<Key extends string, Value> = {
  [key in Key]: Value;
};
type MergeConfig<
  A extends Partial<SurrealZodTableConfig>,
  B extends Partial<SurrealZodTableConfig>,
> = core.util.Prettify<Omit<A, keyof B> & B>;
type SurrealZodTableConfigSchemafull = SetConfig<"catchall", {}>;
type SurrealZodTableConfigSchemaless = SetConfig<
  "catchall",
  Record<string, SurrealZodType>
>;
type SurrealZodTableConfig = {
  catchall: any;
  dto: boolean;
};

export interface SurrealZodTableDef<
  Name extends string = string,
  Fields extends SurrealZodTableFields = {},
  Config extends SurrealZodTableConfig = SurrealZodTableConfig,
> extends SurrealZodTypeDef {
  name: Name;
  fields: (Config["dto"] extends true
    ? Omit<NormalizedFields<Name, Fields>, "id"> & {
        id: SurrealZodOptional<NormalizedFields<Name, Fields>["id"]>;
      }
    : NormalizedFields<Name, Fields>) &
    Config["catchall"];
  catchall?: SurrealZodType;
  dto: Config["dto"];

  surreal: {
    type: "table";
    tableType: "any" | "normal" | "relation";
    schemafull: boolean;
    drop: boolean;
    comment?: string;
  };
}

export interface SurrealZodTableInternals<
  Name extends string = string,
  Fields extends SurrealZodTableFields = {},
  Config extends SurrealZodTableConfig = MergeConfig<
    SurrealZodTableConfig,
    SurrealZodTableConfigSchemaless
  >,
> extends SurrealZodTypeInternals {
  def: SurrealZodTableDef<Name, Fields, Config>;
}

export interface SurrealZodTable<
  Name extends string = string,
  Fields extends SurrealZodTableFields = {},
  Config extends SurrealZodTableConfig = MergeConfig<
    SurrealZodTableConfig,
    SurrealZodTableConfigSchemaless
  >,
> extends _SurrealZodType<SurrealZodTableInternals<Name, Fields, Config>> {
  // type specific, must be overriden in super types
  name<NewName extends string>(name: NewName): SurrealZodTable<NewName, Fields>;
  fields<NewFields extends SurrealZodTableFields>(
    fields: NewFields,
  ): SurrealZodTable<Name, NewFields, Config>;
  schemafull(): SurrealZodTable<
    Name,
    Fields,
    MergeConfig<Config, SurrealZodTableConfigSchemafull>
  >;
  schemaless(): SurrealZodTable<
    Name,
    Fields,
    MergeConfig<Config, SurrealZodTableConfigSchemaless>
  >;

  // super type changing
  any(): SurrealZodTable<Name, Fields, Config>;
  normal(): SurrealZodTableNormal<Name, Fields, Config>;
  relation(): SurrealZodTableRelation<
    Name,
    SurrealZodRecordId<string, SurrealZodRecordIdValue>,
    SurrealZodRecordId<string, SurrealZodRecordIdValue>,
    Fields,
    Config
  >;

  drop(): this;
  nodrop(): this;
  comment(comment: string): this;

  record(): this["_zod"]["def"]["fields"]["id"];
  dto(): SurrealZodTable<
    Name,
    Fields,
    MergeConfig<Config, SetConfig<"dto", true>>
  >;
  entity(): SurrealZodTable<
    Name,
    Fields,
    MergeConfig<Config, SetConfig<"dto", false>>
  >;

  toSurql(
    statement?: "define",
    options?: DefineTableOptions,
  ): BoundQuery<[undefined]>;
  toSurql(
    statement: "remove",
    options?: RemoveTableOptions,
  ): BoundQuery<[undefined]>;
  toSurql(statement: "info"): BoundQuery<[TableInfo]>;
  toSurql(statement: "structure"): BoundQuery<[TableStructure]>;
}

function handleFieldResult(
  result: core.ParsePayload,
  final: core.ParsePayload,
  field: PropertyKey,
  input: Record<PropertyKey, unknown>,
) {
  if (result.issues.length) {
    final.issues.push(...core.util.prefixIssues(field, result.issues));
  }

  if (result.value === undefined) {
    if (field in input) {
      // @ts-expect-error: field not index-checked on final.value
      final.value[field] = undefined;
    }
  } else {
    // @ts-expect-error: field not index-checked on final.value
    final.value[field] = result.value;
  }
}

function handleCatchall(
  promises: Promise<any>[],
  input: Record<PropertyKey, unknown>,
  payload: core.ParsePayload,
  ctx: core.ParseContext,
  def: ReturnType<typeof normalizeTableDef>,
  inst: SurrealZodTable,
) {
  const unrecognized: string[] = [];
  const known = def.fieldNamesSet;
  const _catchall = def.catchall!._zod;
  const type = _catchall.def.type;
  for (const field in input) {
    if (known.has(field)) continue;
    if (type === "never") {
      unrecognized.push(field);
      continue;
    }

    const result = _catchall.run({ value: input[field], issues: [] }, ctx);
    if (result instanceof Promise) {
      promises.push(
        result.then((result) =>
          handleFieldResult(result, payload, field, input),
        ),
      );
    } else {
      handleFieldResult(result, payload, field, input);
    }
  }

  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst,
    });
  }

  if (!promises.length) return payload;
  return Promise.all(promises).then(() => payload);
}

function normalizeTableDef(def: SurrealZodTableDef) {
  const fields: Record<string, SurrealZodType> = {};
  const fieldNames = Object.keys(def.fields);

  if (def.fields.id) {
    if (def.fields.id instanceof SurrealZodRecordId) {
      fields.id = def.fields.id.table(def.name);
    } else {
      fields.id = recordId(def.name).type(def.fields.id);
    }
  } else {
    fields.id = recordId(def.name).type(any());
    fieldNames.push("id");
  }

  if (def.dto && !(fields.id instanceof SurrealZodOptional)) {
    fields.id = optional(fields.id!);
  }

  for (const field of fieldNames) {
    if (field === "id") continue;
    // if (!def.fields[field]?._zod.traits.has("SurrealZodType")) {
    //   throw new Error(
    //     `Invalid field definition for "${field}": expected a Surreal Zod schema`,
    //   );
    // }
    fields[field] = def.fields[field];
  }

  return {
    ...def,
    fields,
    fieldNames,
    fieldNamesSet: new Set(fieldNames),
  };
}

export const SurrealZodTable: core.$constructor<SurrealZodTable> =
  core.$constructor("SurrealZodTable", (inst, def) => {
    SurrealZodType.init(inst, def);

    const normalized = normalizeTableDef(def);
    // @ts-expect-error - through normalization id is always present
    inst._zod.def.fields = normalized.fields;
    const catchall = normalized.catchall;

    inst.name = (name) => {
      return inst.clone({
        ...inst._zod.def,
        name,
      }) as any;
    };
    inst.fields = (fields) => {
      return inst.clone({
        ...inst._zod.def,
        // @ts-expect-error - id may or may not be provided
        fields,
      }) as any;
    };
    inst.any = () => {
      return inst.clone({
        ...inst._zod.def,
        surreal: {
          ...inst._zod.def.surreal,
          tableType: "any",
        },
      });
    };
    inst.normal = () => {
      return new SurrealZodTableNormal({
        ...inst._zod.def,
        surreal: {
          ...inst._zod.def.surreal,
          tableType: "normal",
        },
      });
    };
    inst.relation = () => {
      // @ts-expect-error - id set in constructor
      return new SurrealZodTableRelation({
        ...inst._zod.def,
        // fields: {
        //   in: recordId().type(any()),
        //   out: recordId().type(any()),
        //   ...def.fields,
        // },
        surreal: {
          ...inst._zod.def.surreal,

          tableType: "relation",
        },
      }) as any;
    };
    inst.comment = (comment) => {
      return inst.clone({
        ...inst._zod.def,
        surreal: {
          ...inst._zod.def.surreal,
          comment,
        },
      });
    };
    inst.schemafull = () => {
      return inst.clone({
        ...inst._zod.def,
        catchall: never(),
        surreal: {
          ...inst._zod.def.surreal,
          schemafull: true,
        },
      });
    };
    inst.schemaless = () => {
      return inst.clone({
        ...inst._zod.def,
        catchall: unknown(),
        surreal: {
          ...inst._zod.def.surreal,
          schemafull: false,
        },
      });
    };
    inst.drop = () => {
      return inst.clone({
        ...inst._zod.def,
        surreal: {
          ...inst._zod.def.surreal,
          drop: true,
        },
      });
    };
    inst.nodrop = () => {
      return inst.clone({
        ...inst._zod.def,
        surreal: {
          ...inst._zod.def.surreal,
          drop: false,
        },
      });
    };
    // @ts-expect-error - through normalization id is always present
    inst.record = () => normalized.fields.id;
    inst.dto = () => {
      return inst.clone({
        ...inst._zod.def,
        dto: true,
      }) as any;
    };
    inst.entity = () => {
      let id: any = normalized.fields.id;
      while (id && id instanceof SurrealZodOptional) {
        id = id.unwrap();
      }

      return inst.clone({
        ...inst._zod.def,
        dto: false,
        fields: {
          ...normalized.fields,
          id,
        },
      }) as any;
    };
    // @ts-expect-error - overloaded
    inst.toSurql = (statement = "define", options) =>
      // @ts-expect-error - overloaded
      tableToSurql(inst, statement, options);

    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;

      if (!core.util.isObject(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst,
        });
        return payload;
      }

      payload.value = {};
      const promises: Promise<any>[] = [];
      const fields = normalized.fields;

      for (const field of normalized.fieldNames) {
        const schema = fields[field]!;
        const result = schema._zod.run(
          { value: input[field], issues: [] },
          ctx,
        );
        if (result instanceof Promise) {
          promises.push(
            result.then((result) => {
              handleFieldResult(result, payload, field, input);
            }),
          );
        } else {
          handleFieldResult(result, payload, field, input);
        }
      }

      if (!catchall) {
        return promises.length
          ? Promise.all(promises).then(() => payload)
          : payload;
      }

      return handleCatchall(promises, input, payload, ctx, normalized, inst);
    };

    return inst;
  });

export function table<Name extends string = string>(name: Name) {
  return new SurrealZodTable({
    type: "any",
    name,
    // @ts-expect-error - id set in constructor
    fields: {},
    catchall: unknown(),

    surreal: {
      type: "table",
      tableType: "any",
      schemafull: false,
      drop: false,
      comment: undefined,
    },
  }) as SurrealZodTable<Name>;
}

/////////////////////////////////////////////////////
/////////////////////////////////////////////////////
//////////                                 //////////
//////////      SurrealZodTableNormal      //////////
//////////                                 //////////
/////////////////////////////////////////////////////
/////////////////////////////////////////////////////

export interface SurrealZodTableNormal<
  Name extends string = string,
  Fields extends SurrealZodTableFields = {},
  Config extends SurrealZodTableConfig = MergeConfig<
    SurrealZodTableConfig,
    SurrealZodTableConfigSchemaless
  >,
> extends SurrealZodTable<Name, Fields, Config> {
  // override base methods
  name<NewName extends string>(
    name: NewName,
  ): SurrealZodTableNormal<NewName, Fields, Config>;
  fields<NewFields extends SurrealZodTableFields>(
    fields: NewFields,
  ): SurrealZodTableNormal<Name, NewFields, Config>;
  schemafull(): SurrealZodTableNormal<
    Name,
    Fields,
    MergeConfig<Config, SurrealZodTableConfigSchemafull>
  >;
  schemaless(): SurrealZodTableNormal<
    Name,
    Fields,
    MergeConfig<Config, SurrealZodTableConfigSchemaless>
  >;

  dto(): SurrealZodTableNormal<
    Name,
    Fields,
    MergeConfig<Config, SetConfig<"dto", true>>
  >;
  entity(): SurrealZodTableNormal<
    Name,
    Fields,
    MergeConfig<Config, SetConfig<"dto", false>>
  >;
}

export const SurrealZodTableNormal: core.$constructor<SurrealZodTableNormal> =
  core.$constructor("SurrealZodTableNormal", (inst, def) => {
    SurrealZodTable.init(inst, def);
  });

export function normalTable<Name extends string = string>(
  name: Name,
): SurrealZodTableNormal<Name> {
  return table(name).normal();
}

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
//////////                                   //////////
//////////      SurrealZodTableRelation      //////////
//////////                                   //////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

export interface SurrealZodTableRelation<
  Name extends string = string,
  From extends SurrealZodRecordId<
    string,
    SurrealZodRecordIdValue
  > = SurrealZodRecordId<string, SurrealZodRecordIdValue>,
  To extends SurrealZodRecordId<
    string,
    SurrealZodRecordIdValue
  > = SurrealZodRecordId<string, SurrealZodRecordIdValue>,
  Fields extends SurrealZodTableFields = {},
  Config extends SurrealZodTableConfig = MergeConfig<
    SurrealZodTableConfig,
    SurrealZodTableConfigSchemaless
  >,
> extends SurrealZodTable<
    Name,
    NormalizedIdField<
      inferRecordIdTable<To>,
      NormalizedIdField<
        inferRecordIdTable<From>,
        Fields & {
          in: From;
          out: To;
        },
        "in"
      >,
      "out"
    >,
    Config
  > {
  name<NewName extends string>(
    name: NewName,
  ): SurrealZodTableRelation<NewName, From, To, Fields, Config>;
  fields<NewFields extends SurrealZodTableFields>(
    fields: NewFields,
  ): SurrealZodTableRelation<Name, From, To, NewFields, Config>;
  schemafull(): SurrealZodTableRelation<
    Name,
    From,
    To,
    Fields,
    MergeConfig<Config, SurrealZodTableConfigSchemafull>
  >;
  schemaless(): SurrealZodTableRelation<
    Name,
    From,
    To,
    Fields,
    MergeConfig<Config, SurrealZodTableConfigSchemaless>
  >;

  from<
    NewFrom extends
      | string
      | string[]
      | SurrealZodRecordId<string, SurrealZodRecordIdValue>,
  >(
    from: NewFrom,
  ): SurrealZodTableRelation<
    Name extends string ? Name : Name[number],
    toRecordId<NewFrom>,
    To,
    Fields,
    MergeConfig<Config, SurrealZodTableConfigSchemafull>
  >;
  to<
    NewTo extends
      | string
      | string[]
      | SurrealZodRecordId<string, SurrealZodRecordIdValue>,
  >(
    to: NewTo,
  ): SurrealZodTableRelation<
    Name extends string ? Name : Name[number],
    From,
    toRecordId<NewTo>,
    Fields,
    MergeConfig<Config, SurrealZodTableConfigSchemafull>
  >;
  in<
    NewFrom extends
      | string
      | string[]
      | SurrealZodRecordId<string, SurrealZodRecordIdValue>,
  >(
    from: NewFrom,
  ): SurrealZodTableRelation<
    Name extends string ? Name : Name[number],
    toRecordId<NewFrom>,
    To,
    Fields,
    MergeConfig<Config, SurrealZodTableConfigSchemafull>
  >;
  out<
    NewTo extends
      | string
      | string[]
      | SurrealZodRecordId<string, SurrealZodRecordIdValue>,
  >(
    to: NewTo,
  ): SurrealZodTableRelation<
    Name extends string ? Name : Name[number],
    From,
    toRecordId<NewTo>,
    Fields,
    MergeConfig<Config, SurrealZodTableConfigSchemafull>
  >;

  dto(): SurrealZodTableRelation<
    Name,
    From,
    To,
    Fields,
    MergeConfig<Config, SetConfig<"dto", true>>
  >;
  entity(): SurrealZodTableRelation<
    Name,
    From,
    To,
    Fields,
    MergeConfig<Config, SetConfig<"dto", false>>
  >;
}

type toRecordId<
  T extends
    | string
    | string[]
    | SurrealZodRecordId<string, SurrealZodRecordIdValue>,
> = T extends string
  ? T extends SurrealZodRecordId<infer N, infer I>
    ? SurrealZodRecordId<N, I>
    : SurrealZodRecordId<T>
  : T extends string[]
    ? SurrealZodRecordId<T[number]>
    : T extends SurrealZodRecordId<string, SurrealZodRecordIdValue>
      ? T
      : never;

export const SurrealZodTableRelation: core.$constructor<SurrealZodTableRelation> =
  core.$constructor("SurrealZodTableRelation", (inst, def) => {
    SurrealZodTable.init(inst, def);

    inst.from = (from) => {
      return new SurrealZodTableRelation({
        ...def,
        fields: {
          ...def.fields,
          in: from instanceof SurrealZodRecordId ? from : recordId(from),
        },
      }) as any;
    };
    inst.to = (to) => {
      return new SurrealZodTableRelation({
        ...def,
        fields: {
          ...def.fields,
          out: to instanceof SurrealZodRecordId ? to : recordId(to),
        },
      }) as any;
    };
    inst.in = inst.from;
    inst.out = inst.to;

    inst.fields = (fields) => {
      return new SurrealZodTableRelation({
        ...def,
        fields: {
          ...def.fields,
          ...fields,
        },
      }) as any;
    };

    return inst;
  });

export function relationTable<Name extends string = string>(
  name: Name,
): SurrealZodTableRelation<Name> {
  return table(name).relation();
}

//////////////////////////////////////////////////
//////////////////////////////////////////////////
//////////                              //////////
//////////      SurrealZodOptional      //////////
//////////                              //////////
//////////////////////////////////////////////////
//////////////////////////////////////////////////

export interface SurrealZodOptionalDef<
  T extends SurrealZodType = SurrealZodType,
> extends core.$ZodOptionalDef<T> {
  innerType: T;

  surreal: {
    type: "optional";
  };
}

export interface SurrealZodOptionalInternals<
  T extends SurrealZodType = SurrealZodType,
> extends core.$ZodOptionalInternals<T> {
  def: SurrealZodOptionalDef<T>;
}

export interface SurrealZodOptional<T extends SurrealZodType = SurrealZodType>
  extends _SurrealZodType<SurrealZodOptionalInternals<T>> {
  unwrap(): T;
}

export const SurrealZodOptional: core.$constructor<SurrealZodOptional> =
  core.$constructor("SurrealZodOptional", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodOptional.init(inst, def);
    SurrealZodType.init(inst, def);

    inst.unwrap = () => {
      return inst._zod.def.innerType;
    };
  });

export function optional<T extends SurrealZodType = SurrealZodType>(
  innerType: T,
): SurrealZodOptional<T> {
  return new SurrealZodOptional({
    type: "optional",
    innerType,

    surreal: {
      type: "optional",
    },
  }) as any;
}

/////////////////////////////////////////////////////
/////////////////////////////////////////////////////
//////////                                 //////////
//////////      SurrealZodNonOptional      //////////
//////////                                 //////////
/////////////////////////////////////////////////////
/////////////////////////////////////////////////////

export interface SurrealZodNonOptionalDef<
  T extends SurrealZodType = SurrealZodType,
> extends core.$ZodNonOptionalDef<T> {
  innerType: T;

  surreal: {
    type: "nonoptional";
  };
}

export interface SurrealZodNonOptionalInternals<
  T extends SurrealZodType = SurrealZodType,
> extends core.$ZodNonOptionalInternals<T> {
  def: SurrealZodNonOptionalDef<T>;
}

export interface SurrealZodNonOptional<
  T extends SurrealZodType = SurrealZodType,
> extends _SurrealZodType<SurrealZodNonOptionalInternals<T>> {}

export const SurrealZodNonOptional: core.$constructor<SurrealZodNonOptional> =
  core.$constructor("SurrealZodNonOptional", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodNonOptional.init(inst, def);
    SurrealZodType.init(inst, def);
  });

export function nonoptional<T extends SurrealZodType = SurrealZodType>(
  innerType: T,
): SurrealZodNonOptional<T> {
  return new SurrealZodNonOptional({
    type: "nonoptional",
    innerType,

    surreal: {
      type: "nonoptional",
    },
  }) as any;
}

//////////////////////////////////////////////////
//////////////////////////////////////////////////
//////////                              //////////
//////////      SurrealZodNullable      //////////
//////////                              //////////
//////////////////////////////////////////////////
//////////////////////////////////////////////////

export interface SurrealZodNullableDef<
  T extends SurrealZodType = SurrealZodType,
> extends core.$ZodNullableDef<T> {
  innerType: T;

  surreal: {
    type: "nullable";
  };
}

export interface SurrealZodNullableInternals<
  T extends SurrealZodType = SurrealZodType,
> extends core.$ZodNullableInternals<T> {
  def: SurrealZodNullableDef<T>;
}

export interface SurrealZodNullable<T extends SurrealZodType = SurrealZodType>
  extends _SurrealZodType<SurrealZodNullableInternals<T>> {}

export const SurrealZodNullable: core.$constructor<SurrealZodNullable> =
  core.$constructor("SurrealZodNullable", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodNullable.init(inst, def);
    SurrealZodType.init(inst, def);
  });

export function nullable<T extends SurrealZodType = SurrealZodType>(
  innerType: T,
): SurrealZodNullable<T> {
  return new SurrealZodNullable({
    type: "nullable",
    innerType,

    surreal: {
      type: "nullable",
    },
  }) as any;
}

/////////////////////////////////////////////////
/////////////////////////////////////////////////
//////////                             //////////
//////////      SurrealZodNullish      //////////
//////////                             //////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////

export function nullish<T extends SurrealZodType = SurrealZodType>(
  innerType: T,
): SurrealZodOptional<SurrealZodNullable<T>> {
  return optional(nullable(innerType));
}

export type SurrealZodTypes =
  | SurrealZodAny
  | SurrealZodUnknown
  | SurrealZodNever
  | SurrealZodUndefined
  | SurrealZodOptional
  | SurrealZodNonOptional
  | SurrealZodNull
  | SurrealZodNullable
  | SurrealZodBoolean
  | SurrealZodString
  | SurrealZodNumber
  | SurrealZodBigInt
  | SurrealZodObject

  // Surreal Specific Types
  | SurrealZodRecordId
  | SurrealZodTable;
