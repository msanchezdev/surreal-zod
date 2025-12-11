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
  type: string;
}

export interface SurrealZodTypeInternals<
  out O = unknown,
  out I = unknown,
  out SurrealInternals extends SurrealZodInternals = SurrealZodInternals,
> extends core.$ZodTypeInternals<O, I> {
  def: core.$ZodTypeInternals<O, I>["def"] & {
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

    // Casting as _surreal.type is built while the schema is initialized
    inst._zod.def.surreal ??= {} as SurrealZodInternals;

    return inst;
  });

//////////////////////////////////////////////////
//////////////////////////////////////////////////
//////////                              //////////
//////////      SurrealZodRecordId      //////////
//////////                              //////////
//////////////////////////////////////////////////
//////////////////////////////////////////////////

export type SurrealZodRecordIdValue =
  | classic.ZodAny
  | classic.ZodUnknown
  | classic.ZodString
  | classic.ZodNumber
  | classic.ZodBigInt
  | classic.ZodObject
  | classic.ZodArray;

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
    innerType: innerType ?? classic.any(),

    surreal: {
      type: "record_id",
    },
  }) as any;
}

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
> extends core.$ZodTypeDef {
  name: Name;
  fields: (Config["dto"] extends true
    ? Omit<NormalizedFields<Name, Fields>, "id"> & {
        id: classic.ZodOptional<NormalizedFields<Name, Fields>["id"]>;
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
    fields.id = recordId(def.name).type(classic.any());
    fieldNames.push("id");
  }

  if (def.dto && !(fields.id?._zod.def.type === "optional")) {
    fields.id = classic.optional(fields.id!);
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
        catchall: classic.never(),
        surreal: {
          ...inst._zod.def.surreal,
          schemafull: true,
        },
      });
    };
    inst.schemaless = () => {
      return inst.clone({
        ...inst._zod.def,
        catchall: classic.unknown(),
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
      while (id?._zod.def.type === "optional") {
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
    catchall: classic.unknown(),

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

export type SurrealZodTypes = SurrealZodRecordId | SurrealZodTable;
