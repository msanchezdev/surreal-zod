/** biome-ignore-all lint/suspicious/noExplicitAny: needed for conversion */
/** biome-ignore-all lint/style/noNonNullAssertion: needed for conversion */
import {
  BoundQuery,
  escapeIdent,
  RecordId,
  type RecordIdValue,
} from "surrealdb";
import * as core from "zod/v4/core";
import * as classic from "zod/v4";
import {
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

export interface SurrealZodInternals {
  type: "any" | "record_id" | "table" | "uuid" | "string" | "datetime";
}

export interface SurrealZodTypeDef<
  out Internals extends SurrealZodInternals = SurrealZodInternals,
> extends core.$ZodTypeDef {
  surreal: Internals;
}

export interface SurrealZodTypeInternals<
  out O = unknown,
  out I = unknown,
  out SurrealInternals extends SurrealZodInternals = SurrealZodInternals,
> extends core.$ZodTypeInternals<O, I> {
  def: SurrealZodTypeDef<SurrealInternals>;
}

export interface SurrealZodType<
  out O = unknown,
  out I = unknown,
  out Internals extends SurrealZodTypeInternals<
    O,
    I,
    SurrealZodInternals
  > = SurrealZodTypeInternals<O, I, SurrealZodInternals>,
> extends Omit<classic.ZodType<O, I, Internals>, "type"> {}

export interface _SurrealZodType<
  Internals extends SurrealZodTypeInternals = SurrealZodTypeInternals,
> extends SurrealZodType<any, any, Internals> {}

export const SurrealZodType: core.$constructor<SurrealZodType> =
  core.$constructor("SurrealZodType", (inst, def) => {
    // @ts-expect-error - we will be overriding the type property
    classic.ZodType.init(inst, def);
    // @ts-expect-error - we will be overriding the type property
    delete inst.type;

    inst._zod.def.surreal ??= {
      type: "any",
    };

    return inst;
  });

//////////////////////////////////////////////////
//////////////////////////////////////////////////
//////////                              //////////
//////////      SurrealZodRecordId      //////////
//////////                              //////////
//////////////////////////////////////////////////
//////////////////////////////////////////////////

export type SurrealZodRecordIdValue = classic.ZodType<RecordIdValue, unknown>;

export type inferRecordIdValue<Id extends SurrealZodRecordIdValue> =
  Id extends {
    _zod: {
      output: any;
    };
  }
    ? Id["_zod"]["output"]
    : RecordIdValue;

export type inferRecordIdTable<T extends SurrealZodRecordId<string, any>> =
  T extends SurrealZodRecordId<infer N> ? N : never;

export interface SurrealZodRecordIdDef<
  Table extends string = string,
  Id extends SurrealZodRecordIdValue = SurrealZodRecordIdValue,
> extends core.$ZodTypeDef {
  innerType: Id;
  table?: Table[];

  surreal: {
    type: "record_id";
  };
}

export interface SurrealZodRecordIdInternals<
  Table extends string = string,
  Id extends SurrealZodRecordIdValue = SurrealZodRecordIdValue,
> extends SurrealZodTypeInternals<
    RecordId<Table, inferRecordIdValue<Id>>,
    unknown
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

  /** @alias id */
  type<NewType extends SurrealZodRecordIdValue>(
    innerType: NewType,
  ): SurrealZodRecordId<Table, NewType>;
  /** @alias value */
  id<NewType extends SurrealZodRecordIdValue>(
    innerType: NewType,
  ): SurrealZodRecordId<Table, NewType>;
  /** @alias type */
  value<NewType extends SurrealZodRecordIdValue>(
    innerType: NewType,
  ): SurrealZodRecordId<Table, NewType>;
}

function normalizeRecordIdDef(def: SurrealZodRecordIdDef) {
  const { type, context } = inferSurrealType(def.innerType);
  const isValid = Array.from(context.type).every(
    (option) =>
      ["any", "string", "number", "int", "array", "object"].includes(option) ||
      option.startsWith("array<") ||
      option.startsWith("[") ||
      option.startsWith("{") ||
      option.startsWith("'") ||
      option.startsWith('"') ||
      /^\d+(\.\d+)?f?$/.test(option),
  );

  if (!isValid) {
    throw new Error(`${type} is not valid as a RecordId's value`);
  }

  return {
    ...def,
  };
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
    inst.id = inst.type;
    inst.value = inst.type;

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
        // @ts-expect-error - Issues dont know about surreal types
        payload.issues.push({
          code: "invalid_type",
          expected: "record_id",
        });
      }

      return payload;
    };

    return inst;
  });

export function recordId<
  const W extends string | string[],
  I extends SurrealZodRecordIdValue = SurrealZodRecordIdValue,
>(
  what?: W,
  innerType?: I,
): SurrealZodRecordId<W extends string ? W : W[number], I> {
  return new SurrealZodRecordId({
    // Zod would not be happy if we have a custom type here, so we use any
    type: "any",
    table: what ? (Array.isArray(what) ? what : [what]) : undefined,
    innerType: innerType ?? classic.any(),

    surreal: {
      type: "record_id",
    },
  }) as any;
}

///////////////////////////////////////////////
///////////////////////////////////////////////
//////////                           //////////
//////////      SurrealZodTable      //////////
//////////                           //////////
///////////////////////////////////////////////
///////////////////////////////////////////////

export type SurrealZodTableFields = {
  [key: string]: core.$ZodType;
};

export type SurrealZodTableRelationFields = {
  [K in "in" | "out"]?: SurrealZodRecordId<string, SurrealZodRecordIdValue>;
} & {
  [key: string]: core.$ZodType;
};

/**
 * Normalizes the fields of a table schema to include the id field if it is not present.
 * If the id field is present, it will be normalized using the table name and the inner type.
 */
type NormalizedIdField<
  TableName extends string,
  Fields extends SurrealZodTableFields,
  FieldName extends string,
> = {
  [K in keyof Fields | FieldName]: K extends FieldName
    ? Fields extends { [P in FieldName]: infer F }
      ? F extends SurrealZodRecordId<any, infer T>
        ? SurrealZodRecordId<TableName, T>
        : F extends SurrealZodRecordIdValue
          ? SurrealZodRecordId<TableName, F>
          : SurrealZodRecordId<TableName>
      : SurrealZodRecordId<TableName>
    : K extends keyof Fields
      ? Fields[K]
      : never;
};

export type NormalizedFields<
  TableName extends string = string,
  Fields extends SurrealZodTableFields = {},
> = NormalizedIdField<TableName, Fields, "id">;

export type SetConfig<Key extends string, Value> = {
  [key in Key]: Value;
};
export type MergeConfig<
  A extends Partial<SurrealZodTableConfig>,
  B extends Partial<SurrealZodTableConfig>,
> = Omit<A, keyof B> & B;
export type SurrealZodTableConfigSchemafull = SetConfig<"catchall", {}>;
export type SurrealZodTableConfigSchemaless = SetConfig<
  "catchall",
  Record<string, unknown>
>;
export type SurrealZodTableConfig = {
  catchall: any;
  dto: boolean;
};

/**
 * Helper type that makes the id field optional for DTO mode.
 * Uses [IsDto] extends [true] to avoid distributive conditionals.
 */
type ApplyDtoToFields<
  NormFields extends SurrealZodTableFields,
  IsDto extends boolean,
> = [IsDto] extends [true]
  ? Omit<NormFields, "id"> & { id: classic.ZodOptional<NormFields["id"]> }
  : NormFields;

/**
 * Precomputed fields type that combines normalization and DTO transformation.
 * Uses a single NormalizedFields computation to avoid redundant type expansion.
 */
type TableDefFields<
  Name extends string,
  Fields extends SurrealZodTableFields,
  Config extends SurrealZodTableConfig,
> = ApplyDtoToFields<NormalizedFields<Name, Fields>, Config["dto"]> &
  Config["catchall"];

export interface SurrealZodTableDef<
  Name extends string = string,
  Fields extends SurrealZodTableFields = {},
  Config extends SurrealZodTableConfig = SurrealZodTableConfig,
> extends core.$ZodTypeDef {
  name: Name;
  fields: TableDefFields<Name, Fields, Config>;
  catchall?: core.$ZodType;
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
> extends SurrealZodTypeInternals<
    core.$InferObjectOutput<Fields, Config["catchall"]>
  > {
  def: SurrealZodTableDef<Name, Fields, Config>;
}

export type TableKind = "any" | "normal" | "relation";

type RelationMethods<
  Name extends string,
  Fields extends SurrealZodTableFields,
  Config extends SurrealZodTableConfig,
> = {
  from<
    NewFrom extends
      | string
      | string[]
      | SurrealZodRecordId<string, SurrealZodRecordIdValue>,
  >(
    from: NewFrom,
  ): SurrealZodTable<
    Name,
    Omit<Fields, "in"> & { in: toRecordId<NewFrom> },
    Config,
    "relation"
  >;

  to<
    NewTo extends
      | string
      | string[]
      | SurrealZodRecordId<string, SurrealZodRecordIdValue>,
  >(
    to: NewTo,
  ): SurrealZodTable<
    Name,
    Omit<Fields, "out"> & { out: toRecordId<NewTo> },
    Config,
    "relation"
  >;

  in: RelationMethods<Name, Fields, Config>["from"];
  out: RelationMethods<Name, Fields, Config>["to"];
};

type MaybeRelationMethods<
  Kind extends TableKind,
  Name extends string,
  Fields extends SurrealZodTableFields,
  Config extends SurrealZodTableConfig,
> = Kind extends "relation" ? RelationMethods<Name, Fields, Config> : {};

type TableMask<Keys extends PropertyKey, Kind extends TableKind> = {
  [K in Exclude<
    Keys,
    "id" | (Kind extends "relation" ? "in" | "out" : never)
  >]?: true;
} & {
  id?: boolean;
} & (Kind extends "relation"
    ? {
        in?: boolean;
        out?: boolean;
      }
    : {});

export type SurrealZodTable<
  Name extends string = string,
  Fields extends SurrealZodTableFields = {},
  Config extends SurrealZodTableConfig = MergeConfig<
    SurrealZodTableConfig,
    SurrealZodTableConfigSchemaless
  >,
  Kind extends TableKind = "any",
> = _SurrealZodType<
  SurrealZodTableInternals<
    Name,
    ApplyDtoToFields<NormalizedFields<Name, Fields>, Config["dto"]>,
    Config
  >
> &
  MaybeRelationMethods<Kind, Name, Fields, Config> & {
    name<NewName extends string>(
      name: NewName,
    ): SurrealZodTable<NewName, Fields, Config, Kind>;
    fields<
      NewFields extends Kind extends "relation"
        ? SurrealZodTableRelationFields
        : SurrealZodTableFields,
    >(
      fields: NewFields,
    ): SurrealZodTable<
      Name,
      Kind extends "relation"
        ? {
            [K in "in" | "out" as K extends keyof NewFields
              ? K
              : never]: NewFields[K];
          } & {
            [K in "in" | "out" as K extends keyof NewFields
              ? never
              : K extends keyof Fields
                ? K
                : never]: Fields[K];
          } & Omit<NewFields, "in" | "out">
        : NewFields,
      Config,
      Kind
    >;
    schemafull(): SurrealZodTable<
      Name,
      Fields,
      MergeConfig<Config, SurrealZodTableConfigSchemafull>,
      Kind
    >;
    schemaless(): SurrealZodTable<
      Name,
      Fields,
      MergeConfig<Config, SurrealZodTableConfigSchemaless>,
      Kind
    >;

    any(): SurrealZodTable<Name, Fields, Config, "any">;
    normal(): SurrealZodTable<Name, Fields, Config, "normal">;
    relation(): SurrealZodTable<
      Name,
      {
        [K in "in" | "out"]: Fields[K] extends SurrealZodRecordId
          ? Fields[K]
          : SurrealZodRecordId<string, SurrealZodRecordIdValue>;
      } & Omit<Fields, "in" | "out">,
      Config,
      "relation"
    >;

    drop(): SurrealZodTable<Name, Fields, Config, Kind>;
    nodrop(): SurrealZodTable<Name, Fields, Config, Kind>;
    comment(comment: string): SurrealZodTable<Name, Fields, Config, Kind>;

    record(): SurrealZodTable<
      Name,
      Fields,
      Config,
      Kind
    >["_zod"]["def"]["fields"]["id"];
    dto(): classic.ZodObject<
      Omit<Fields, "id"> & { id: classic.ZodOptional<Fields["id"]> },
      {
        in: Config["catchall"];
        out: Config["catchall"];
      }
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

    // object methods

    extend<
      ExtraFields extends Kind extends "relation"
        ? SurrealZodTableRelationFields
        : SurrealZodTableFields,
    >(
      extraFields: ExtraFields,
    ): SurrealZodTable<
      Name,
      core.util.Extend<Fields, ExtraFields>,
      Config,
      Kind
    >;

    safeExtend<
      ExtraFields extends Kind extends "relation"
        ? SurrealZodTableRelationFields
        : SurrealZodTableFields,
    >(
      shape: classic.SafeExtendShape<Fields, ExtraFields> &
        Partial<Record<keyof Fields, core.SomeType>>,
    ): SurrealZodTable<
      Name,
      core.util.Extend<Fields, ExtraFields>,
      Config,
      Kind
    >;

    pick<M extends TableMask<keyof Fields, Kind>>(
      mask: M,
    ): M extends { id: false }
      ? classic.ZodObject<
          core.util.Flatten<
            Pick<Fields, Extract<Exclude<keyof Fields, "id">, keyof M>>
          >,
          {
            out: Config["catchall"];
            in: Config["catchall"];
          }
        >
      : SurrealZodTable<
          Name,
          core.util.Flatten<
            Pick<Fields, Extract<keyof Fields, keyof M | "id">>
          >,
          Config,
          Kind
        >;

    omit<M extends TableMask<keyof Fields, Kind>>(
      mask: M,
    ): M extends { id: true }
      ? classic.ZodObject<
          core.util.Flatten<Omit<Fields, Extract<keyof Fields, keyof M>>>,
          {
            in: Config["catchall"];
            out: Config["catchall"];
          }
        >
      : SurrealZodTable<
          Name,
          core.util.Flatten<Omit<Fields, Extract<keyof Fields, keyof M>>>,
          Config,
          Kind
        >;

    /**
     * @returns a table schema that is partial for all fields, except for `id`
     */
    partial(): SurrealZodTable<
      Name,
      {
        [k in keyof Fields]: classic.ZodOptional<Fields[k]>;
      },
      Config,
      Kind
    >;

    /**
     * @returns an object schema that is partial for all fields, including `id`.
     * This is equivalent to calling `.dto().partial()`
     */
    partial(mask: true): classic.ZodObject<
      core.util.Flatten<{
        [k in keyof Fields | "id"]: k extends "id"
          ? Fields["id"] extends SurrealZodRecordId<infer N, infer I>
            ? classic.ZodOptional<SurrealZodRecordId<N, I>>
            : classic.ZodOptional<
                SurrealZodRecordId<Name, SurrealZodRecordIdValue>
              >
          : classic.ZodOptional<Fields[k]>;
      }>,
      {
        out: Config["catchall"];
        in: Config["catchall"];
      }
    >;

    /**
     * @returns an object schema that is partial for the fields specified in
     * the mask, if id is specified in the mask, it will be marked as optional
     * and an object schema will be returned instead of a table schema.
     */
    partial<M extends TableMask<keyof Fields, Kind>>(
      mask?: M,
    ): M extends { id: true }
      ? classic.ZodObject<
          core.util.Flatten<{
            [k in keyof Fields | "id"]: k extends keyof M
              ? k extends "id"
                ? Fields["id"] extends SurrealZodRecordId<infer N, infer I>
                  ? classic.ZodOptional<SurrealZodRecordId<N, I>>
                  : classic.ZodOptional<
                      SurrealZodRecordId<Name, SurrealZodRecordIdValue>
                    >
                : classic.ZodOptional<Fields[k]>
              : Fields[k];
          }>,
          {
            out: Config["catchall"];
            in: Config["catchall"];
          }
        >
      : SurrealZodTable<
          Name,
          {
            [k in keyof Fields]: k extends keyof M
              ? classic.ZodOptional<Fields[k]>
              : Fields[k];
          },
          Config,
          Kind
        >;

    required(): SurrealZodTable<
      Name,
      {
        [k in keyof Fields]: classic.ZodNonOptional<Fields[k]>;
      },
      Config,
      Kind
    >;
    required<M extends core.util.Mask<keyof Fields>>(
      mask: M,
    ): SurrealZodTable<
      Name,
      {
        [k in keyof Fields]: k extends keyof M
          ? classic.ZodNonOptional<Fields[k]>
          : Fields[k];
      },
      Config,
      Kind
    >;
  };

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
      // @ts-expect-error: field not index-checked on final.value, doesnt matter
      final.value[field] = undefined;
    }
  } else {
    // @ts-expect-error: field not index-checked on final.value, doesnt matter
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
  const fields: Record<string, core.$ZodType> = {};
  const fieldNames = Object.keys(def.fields);
  if (!def.fields.id) {
    fields.id = recordId(def.name).type(classic.any());
    fieldNames.push("id");
  } else if (def.fields.id._zod.traits.has("$ZodOptional")) {
    if (
      !def.dto ||
      !(def.fields.id._zod.def.innerType instanceof SurrealZodRecordId)
    ) {
      throw new Error(
        "Invalid table definition: When using .dto() we try to make the id field optional, " +
          "the inner type must be a SurrealZodRecordId but it is not. This is supposed to " +
          "be impossible, likely an internal library error. Please open an issue at " +
          "https://github.com/msanchezdev/surreal-zod/issues with a minimal reproduction.",
      );
    }
    fields.id = def.fields.id;
  } else if (def.fields.id instanceof SurrealZodRecordId) {
    const base = def.fields.id.table(def.name);
    fields.id = def.dto ? classic.optional(base) : base;
  } else {
    const base = recordId(def.name).type(def.fields.id);
    fields.id = def.dto ? classic.optional(base) : base;
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
      if (inst._zod.def.surreal.tableType === "relation") {
        fields = {
          in: inst._zod.def.fields.in ?? recordId().type(classic.any()),
          out: inst._zod.def.fields.out ?? recordId().type(classic.any()),
          ...fields,
        };
      }

      return inst.clone({
        ...inst._zod.def,
        // @ts-expect-error - id may or may not be provided
        fields,
      }) as any;
    };
    // @ts-expect-error - type defined conditionally
    inst.from = (from) => {
      if (inst._zod.def.surreal.tableType !== "relation") {
        throw new Error("Cannot call .from() on a non-relation table");
      }

      return inst.clone({
        ...inst._zod.def,
        fields: {
          ...inst._zod.def.fields,
          in: from instanceof SurrealZodRecordId ? from : recordId(from),
        },
      }) as any;
    };
    // @ts-expect-error - type defined conditionally
    inst.to = (to) => {
      if (inst._zod.def.surreal.tableType !== "relation") {
        throw new Error("Cannot call .to() on a non-relation table");
      }

      return inst.clone({
        ...inst._zod.def,
        fields: {
          ...inst._zod.def.fields,
          out: to instanceof SurrealZodRecordId ? to : recordId(to),
        },
      }) as any;
    };
    // @ts-expect-error - type defined conditionally
    inst.in = inst.from;
    // @ts-expect-error - type defined conditionally
    inst.out = inst.to;

    inst.any = () => {
      return inst.clone({
        ...inst._zod.def,
        surreal: {
          ...inst._zod.def.surreal,
          tableType: "any",
        },
      }) as any;
    };
    inst.normal = () => {
      return inst.clone({
        ...inst._zod.def,
        surreal: {
          ...inst._zod.def.surreal,
          tableType: "normal",
        },
      }) as any;
    };
    inst.relation = () => {
      return inst.clone({
        ...inst._zod.def,
        fields: {
          in: recordId().type(classic.any()),
          out: recordId().type(classic.any()),
          ...inst._zod.def.fields,
        },
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
      }) as any;
    };
    inst.schemafull = () => {
      return inst.clone({
        ...inst._zod.def,
        catchall: classic.never(),
        surreal: {
          ...inst._zod.def.surreal,
          schemafull: true,
        },
      }) as any;
    };
    inst.schemaless = () => {
      return inst.clone({
        ...inst._zod.def,
        catchall: classic.unknown(),
        surreal: {
          ...inst._zod.def.surreal,
          schemafull: false,
        },
      }) as any;
    };
    inst.drop = () => {
      return inst.clone({
        ...inst._zod.def,
        surreal: {
          ...inst._zod.def.surreal,
          drop: true,
        },
      }) as any;
    };
    inst.nodrop = () => {
      return inst.clone({
        ...inst._zod.def,
        surreal: {
          ...inst._zod.def.surreal,
          drop: false,
        },
      }) as any;
    };
    inst.record = () => inst._zod.def.fields.id;
    inst.dto = () => {
      return new classic.ZodObject({
        type: "object",
        shape: {
          ...inst._zod.def.fields,
          id: classic.optional(inst._zod.def.fields.id),
        },
        catchall: inst._zod.def.catchall,
      }) as any;
    };
    // @ts-expect-error - overloaded
    inst.toSurql = (statement = "define", options) =>
      // @ts-expect-error - overloaded
      tableToSurql(inst, statement, options);

    // @ts-expect-error - false-positive
    inst.extend = (extraFields) => {
      if (!core.util.isPlainObject(extraFields)) {
        throw new Error("Invalid input to extend: expected a plain object");
      }

      const checks = inst._zod.def.checks;
      const hasChecks = checks && checks.length > 0;
      if (hasChecks) {
        throw new Error(
          "Table schemas containing refinements cannot be extended. Use `.safeExtend()` instead.",
        );
      }

      const mergedDef = core.util.mergeDefs(inst._zod.def, {
        get fields() {
          const fields = { ...inst._zod.def.fields, ...extraFields };
          core.util.assignProp(this, "fields", fields); // self-caching
          return fields;
        },
        checks: [],
      });

      return core.clone(inst, mergedDef);
    };

    // @ts-expect-error - false-positive
    inst.safeExtend = (extraFields) => {
      if (!core.util.isPlainObject(extraFields)) {
        throw new Error("Invalid input to safeExtend: expected a plain object");
      }
      const def = {
        ...inst._zod.def,
        get fields() {
          const fields = { ...inst._zod.def.fields, ...extraFields };
          core.util.assignProp(this, "fields", fields); // self-caching
          return fields;
        },
        checks: inst._zod.def.checks,
      } as any;
      return core.clone(inst, def);
    };

    inst.pick = (mask) => {
      const currDef = inst._zod.def;

      const def = core.util.mergeDefs(inst._zod.def, {
        get fields() {
          const newFields: Record<string, unknown> = {};
          for (const key in mask) {
            if (!(key in currDef.fields)) {
              throw new Error(`Unrecognized key: "${key}"`);
            }
            if (!mask[key]) continue;
            newFields[key] = currDef.fields[key]!;
          }

          core.util.assignProp(this, "fields", newFields); // self-caching
          return newFields;
        },
        checks: [],
      });

      if ("id" in mask && mask.id === false) {
        return new classic.ZodObject({
          type: "object",
          shape: def.fields,
          catchall: def.catchall,
        }) as any;
      }

      return core.clone(inst, def) as any;
    };

    inst.omit = (mask) => {
      const currDef = inst._zod.def;

      const def = core.util.mergeDefs(inst._zod.def, {
        get fields() {
          const newFields: Record<string, unknown> = { ...currDef.fields };
          for (const key in mask) {
            if (!(key in currDef.fields)) {
              throw new Error(`Unrecognized key: "${key}"`);
            }
            if (!(mask as any)[key]) continue;

            delete newFields[key];
          }
          core.util.assignProp(this, "fields", newFields); // self-caching
          return newFields;
        },
        checks: [],
      });

      if ("id" in mask && mask.id === true) {
        return new classic.ZodObject({
          type: "object",
          shape: def.fields,
          catchall: def.catchall,
        }) as any;
      }

      return core.clone(inst, def) as any;
    };

    inst.partial = (mask?: Record<string, boolean> | boolean) => {
      const def = core.util.mergeDefs(inst._zod.def, {
        get fields() {
          const oldFields = inst._zod.def.fields;
          const fields: Record<string, unknown> = { ...oldFields };

          if (typeof mask === "object") {
            for (const key in mask) {
              if (!(key in oldFields)) {
                throw new Error(`Unrecognized key: "${key}"`);
              }
              if (!(mask as any)[key]) continue;
              // if (oldShape[key]!._zod.optin === "optional") continue;
              fields[key] = classic.ZodOptional
                ? new classic.ZodOptional({
                    type: "optional",
                    innerType: oldFields[key]! as any,
                  })
                : oldFields[key]!;
            }
          } else {
            for (const key in oldFields) {
              if (key === "id" && mask !== true) continue;

              // if (oldShape[key]!._zod.optin === "optional") continue;
              fields[key] = classic.ZodOptional
                ? new classic.ZodOptional({
                    type: "optional",
                    innerType: oldFields[key]! as any,
                  })
                : oldFields[key]!;
            }
          }

          core.util.assignProp(this, "fields", fields); // self-caching
          return fields;
        },
        checks: [],
      });

      if (
        mask === true ||
        (typeof mask === "object" && "id" in mask && mask.id === true)
      ) {
        return new classic.ZodObject({
          type: "object",
          shape: def.fields,
          catchall: def.catchall,
        }) as any;
      }

      return core.clone(inst, def) as any;
    };

    inst.required = (mask?: Record<string, boolean>) => {
      const def = core.util.mergeDefs(inst._zod.def, {
        get fields() {
          const oldFields = inst._zod.def.fields;
          const fields: Record<string, unknown> = { ...oldFields };

          if (mask) {
            for (const key in mask) {
              if (!(key in fields)) {
                throw new Error(`Unrecognized key: "${key}"`);
              }
              if (!(mask as any)[key]) continue;
              if (key === "id") continue;
              // overwrite with non-optional
              fields[key] = new classic.ZodNonOptional({
                type: "nonoptional",
                innerType: oldFields[key]! as any,
              });
            }
          } else {
            for (const key in oldFields) {
              if (key === "id") continue;

              // overwrite with non-optional
              fields[key] = new classic.ZodNonOptional({
                type: "nonoptional",
                innerType: oldFields[key]! as any,
              });
            }
          }

          core.util.assignProp(this, "fields", fields); // self-caching
          return fields;
        },
        checks: [],
      });

      return core.clone(inst, def) as any;
    };

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
    catchall: classic.unknown(),
    dto: false,

    surreal: {
      type: "table",
      tableType: "any",
      schemafull: false,
      drop: false,
      comment: undefined,
    },
  }) as SurrealZodTable<Name>;
}

export function normalTable<Name extends string = string>(name: Name) {
  return table(name).normal();
}

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
//////////                                   //////////
//////////      SurrealZodTableRelation      //////////
//////////                                   //////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

// export interface SurrealZodTableRelation<
//   Name extends string = string,
//   From extends SurrealZodRecordId<
//     string,
//     SurrealZodRecordIdValue
//   > = SurrealZodRecordId<string, SurrealZodRecordIdValue>,
//   To extends SurrealZodRecordId<
//     string,
//     SurrealZodRecordIdValue
//   > = SurrealZodRecordId<string, SurrealZodRecordIdValue>,
//   Fields extends SurrealZodTableFields = {},
//   Config extends SurrealZodTableConfig = MergeConfig<
//     SurrealZodTableConfig,
//     SurrealZodTableConfigSchemaless
//   >,
// > extends Omit<
//     SurrealZodTable<
//       Name,
//       Omit<Fields, "in" | "out"> & {
//         in: From;
//         out: To;
//       },
//       Config
//     >,
//     "name" | "fields" | "schemafull" | "schemaless" | "dto" | "entity"
//   > {
// }

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

// export const SurrealZodTableRelation: core.$constructor<SurrealZodTableRelation> =
//   core.$constructor("SurrealZodTableRelation", (inst, def) => {
//     // @ts-expect-error - false-positive
//     SurrealZodTable.init(inst, def);

//     inst.fields = (fields) => {
//       return new SurrealZodTableRelation({
//         ...def,
//         fields: {
//           ...def.fields,
//           ...fields,
//         },
//       }) as any;
//     };

//     return inst;
//   });

// export function relationTable<Name extends string = string>(
//   name: Name,
// ): SurrealZodTableRelation<Name> {
//   return table(name).relation();
// }

export type SurrealZodTypes = SurrealZodRecordId | SurrealZodTable;
