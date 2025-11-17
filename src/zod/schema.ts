import {
  escapeIdent,
  RecordId,
  Surreal,
  type RecordIdValue,
  type Table,
} from "surrealdb";
import z4, { normalize } from "zod/v4";
import * as core from "zod/v4/core";

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
    | "boolean"
    | "string"
    | "object"
    | "record_id"
    | "table";
}

export interface SurrealZodTypeInternals<out O = unknown, out I = unknown>
  extends core.$ZodTypeInternals<O, I> {
  def: SurrealZodTypeDef;
}

export interface SurrealZodType<
  out O = unknown,
  out I = unknown,
  out Internals extends SurrealZodTypeInternals<O, I> = SurrealZodTypeInternals<
    O,
    I
  >,
> extends core.$ZodType<O, I, Internals> {
  _surreal: {};
}

export interface _SurrealZodType<
  Internals extends core.$ZodTypeInternals = core.$ZodTypeInternals,
> extends SurrealZodType<any, any, Internals> {}

export const SurrealZodType: core.$constructor<SurrealZodType> =
  core.$constructor("SurrealZodType", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodType.init(inst, def);
    inst._surreal = {};

    inst;

    return inst;
  });

/////////////////////////////////////////////
/////////////////////////////////////////////
//////////                         //////////
//////////      SurrealZodAny      //////////
//////////                         //////////
/////////////////////////////////////////////
/////////////////////////////////////////////

export interface SurrealZodAny extends _SurrealZodType<core.$ZodAnyInternals> {}

export const SurrealZodAny: core.$constructor<SurrealZodAny> =
  core.$constructor("SurrealZodAny", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodAny.init(inst, def);
    SurrealZodType.init(inst, def);
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

export interface SurrealZodUnknown
  extends _SurrealZodType<core.$ZodUnknownInternals> {}

export const SurrealZodUnknown: core.$constructor<SurrealZodUnknown> =
  core.$constructor("SurrealZodUnknown", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodUnknown.init(inst, def);
    SurrealZodType.init(inst, def);
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

export interface SurrealZodNever
  extends _SurrealZodType<core.$ZodNeverInternals> {}

export const SurrealZodNever: core.$constructor<SurrealZodNever> =
  core.$constructor("SurrealZodNever", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodNever.init(inst, def);
    SurrealZodType.init(inst, def);
  });

export function never(params?: string | core.$ZodNeverParams): SurrealZodNever {
  return core._never(SurrealZodNever, params);
}

/////////////////////////////////////////////////
/////////////////////////////////////////////////
//////////                             //////////
//////////      SurrealZodBoolean      //////////
//////////                             //////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////

export interface SurrealZodBoolean
  extends _SurrealZodType<core.$ZodBooleanInternals> {}
export const SurrealZodBoolean: core.$constructor<SurrealZodBoolean> =
  core.$constructor("SurrealZodBoolean", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodBoolean.init(inst, def);
    SurrealZodType.init(inst, def);
    // const originalDefault = inst.default;
    // inst.default = (defaultValue?: any) => {
    //   if (typeof defaultValue === "function") {
    //     throw new TypeError(
    //       "Functions for default values are not supported in surreal-zod",
    //     );
    //   }
    //   return originalDefault(defaultValue);
    // };
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

export interface SurrealZodString
  extends _SurrealZodType<core.$ZodStringInternals<string>> {}
export const SurrealZodString: core.$constructor<SurrealZodString> =
  core.$constructor("SurrealZodString", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodString.init(inst, def);
    SurrealZodType.init(inst, def);
  });

export function string(
  params?: string | core.$ZodStringParams,
): SurrealZodString {
  return core._string(SurrealZodString, params);
}

////////////////////////////////////////////////
////////////////////////////////////////////////
//////////                            //////////
//////////      SurrealZodObject      //////////
//////////                            //////////
////////////////////////////////////////////////
////////////////////////////////////////////////

export interface SurrealZodObject<
  // @ts-expect-error - unknown assertion error
  out Shape extends core.$ZodShape = core.$ZodLooseShape,
  out Config extends core.$ZodObjectConfig = core.$strip,
> extends _SurrealZodType<core.$ZodObjectInternals<Shape, Config>>,
    core.$ZodObject<Shape, Config> {}

export const SurrealZodObject: core.$constructor<SurrealZodObject> =
  core.$constructor("SurrealZodObject", (inst, def) => {
    // TODO: Inline implementation and use core instead
    // @ts-expect-error - unknown assertion error
    z4.ZodObject.init(inst, def);
    SurrealZodType.init(inst, def);
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

  return new SurrealZodObject(def) as any;
}

//////////////////////////////////////////////////
//////////////////////////////////////////////////
//////////                              //////////
//////////      SurrealZodRecordId      //////////
//////////                              //////////
//////////////////////////////////////////////////
//////////////////////////////////////////////////

export type SurrealZodRecordIdValue =
  | core.$ZodAny
  | core.$ZodUnknown
  | core.$ZodString
  | core.$ZodNumber
  | core.$ZodObject
  | core.$ZodArray;
// | core.$ZodObject;

export interface SurrealZodRecordIdDef<
  Table extends string = string,
  Id extends SurrealZodRecordIdValue = SurrealZodRecordIdValue,
> extends SurrealZodTypeDef {
  surrealType: "record_id";
  innerType: Id;
  table?: Table[];
}

export type SurrealZodRecordIdValueOutput<T> = T extends {
  _zod: {
    output: any;
  };
}
  ? T["_zod"]["output"]
  : RecordIdValue;

export interface SurrealZodRecordIdInternals<
  Table extends string = string,
  Id extends SurrealZodRecordIdValue = SurrealZodRecordIdValue,
> extends SurrealZodTypeInternals<
    RecordId<Table, SurrealZodRecordIdValueOutput<Id>>,
    RecordIdValue
  > {
  def: SurrealZodRecordIdDef<Table, Id>;
}

export interface SurrealZodRecordId<
  Table extends string = string,
  Id extends SurrealZodRecordIdValue = SurrealZodRecordIdValue,
> extends _SurrealZodType<SurrealZodRecordIdInternals<Table, Id>> {
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

export const SurrealZodRecordId: core.$constructor<SurrealZodRecordId> =
  core.$constructor("SurrealZodRecordId", (inst, def) => {
    SurrealZodType.init(inst, def);
    inst._surreal = true;

    inst.table = (table) => {
      return new SurrealZodRecordId({
        ...def,
        table: Array.isArray(table) ? table : [table],
      }) as any;
    };

    inst.type = (innerType) => {
      return new SurrealZodRecordId({
        ...def,
        innerType,
      }) as any;
    };

    inst._zod.parse = (payload, ctx) => {
      if (payload.value instanceof RecordId) {
        if (def.table && !def.table.includes(payload.value.table.name)) {
          payload.issues.push({
            code: "invalid_value",
            values: def.table,
            input: payload.value.table.name,
            message:
              def.table.length > 1
                ? `Expected RecordId's table to be one of ${def.table.map(escapeIdent).join(" | ")} but found ${payload.value.table.name}`
                : `Expected RecordId's table to be ${def.table[0]} but found ${payload.value.table.name}`,
          });
        }

        if (def.innerType) {
          const schema = def.innerType._zod;
          const result = schema.run(
            { value: payload.value.id, issues: [] },
            ctx,
          );

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
        }
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
    surrealType: "record_id",
    table: what ? (Array.isArray(what) ? what : [what]) : undefined,
    innerType: innerType ?? any(),
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
  readonly [key: string]: SurrealZodType;
};

/**
 * Normalizes the fields of a table schema to include the id field if it is not present.
 * If the id field is present, it will be normalized using the table name and the inner type.
 */
export type NormalizedFields<
  Name extends string = string,
  Fields extends SurrealZodTableFields = SurrealZodTableFields,
> = Fields extends {
  id: SurrealZodType;
}
  ? Fields["id"] extends SurrealZodRecordId<infer _N, infer T>
    ? Omit<Fields, "id"> & {
        id: SurrealZodRecordId<Name, T>;
      }
    : Fields["id"] extends SurrealZodRecordIdValue
      ? Omit<Fields, "id"> & {
          id: SurrealZodRecordId<Name, Fields["id"]>;
        }
      : Omit<Fields, "id"> & {
          id: SurrealZodRecordId<Name>;
        }
  : Fields & {
      id: SurrealZodRecordId<Name>;
    };

export interface SurrealZodTableDef<
  Name extends string = string,
  Fields extends SurrealZodTableFields = SurrealZodTableFields,
> extends SurrealZodTypeDef {
  surrealType: "table";
  name: Name;
  fields: NormalizedFields<Name, Fields>;
  comment?: string;
  catchall?: SurrealZodType;
}

export interface SurrealZodTableInternals<
  Name extends string = string,
  Fields extends SurrealZodTableFields = SurrealZodTableFields,
> extends SurrealZodTypeInternals {
  def: SurrealZodTableDef<Name, Fields>;
}

export interface SurrealZodTable<
  out Name extends string = string,
  out Fields extends SurrealZodTableFields = SurrealZodTableFields,
> extends _SurrealZodType<SurrealZodTableInternals<Name, Fields>> {
  name<NewName extends string>(name: NewName): SurrealZodTable<NewName, Fields>;
  fields<NewFields extends SurrealZodTableFields>(
    fields: NewFields,
  ): SurrealZodTable<Name, NewFields>;
  comment(comment: string): this;
  schemafull(): this;
  schemaless(): this;
  record(): this["_zod"]["def"]["fields"]["id"];
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
  // biome-ignore lint/style/noNonNullAssertion: already asserted
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
  const fields = Object.keys(def.fields);
  for (const field of fields) {
    if (!def.fields[field]?._zod.traits.has("SurrealZodType")) {
      throw new Error(
        `Invalid field definition for "${field}": expected a Surreal Zod schema`,
      );
    }
  }

  if (def.fields.id) {
    if (def.fields.id instanceof SurrealZodRecordId) {
      def.fields.id = def.fields.id.table(def.name);
    } else {
      def.fields.id = recordId(def.name).type(def.fields.id);
    }
  }

  return {
    ...def,
    fields: def.fields,
    fieldNames: fields,
    fieldNamesSet: new Set(fields),
  };
}

export const SurrealZodTable: core.$constructor<SurrealZodTable> =
  core.$constructor("SurrealZodTable", (inst, def) => {
    SurrealZodType.init(inst, def);

    const normalized = core.util.cached(() => normalizeTableDef(def));
    const catchall = def.catchall;
    let value: typeof normalized.value;

    inst.name = (name) => {
      return new SurrealZodTable({
        ...def,
        name,
        // biome-ignore lint/suspicious/noExplicitAny: false-positive
      }) as any;
    };
    inst.fields = (fields) => {
      return new SurrealZodTable({
        ...def,
        fields: {
          id: recordId(def.name),
          ...fields,
        },
        // biome-ignore lint/suspicious/noExplicitAny: false-positive
      }) as any;
    };
    inst.comment = (comment) => {
      return new SurrealZodTable({
        ...def,
        comment,
      });
    };
    inst.schemafull = () => {
      return new SurrealZodTable({
        ...def,
        catchall: never(),
      });
    };
    inst.schemaless = () => {
      return new SurrealZodTable({
        ...def,
        catchall: unknown(),
      });
    };
    inst.record = () => normalized.value.fields.id;

    inst._zod.parse = (payload, ctx) => {
      value ??= normalized.value;
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
      const fields = value.fields;

      for (const field of value.fieldNames) {
        // biome-ignore lint/style/noNonNullAssertion: bounds already checked
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

      return handleCatchall(
        promises,
        input,
        payload,
        ctx,
        normalized.value,
        inst,
      );
    };

    return inst;
  });

export function table<Name extends string = string>(name: Name) {
  return new SurrealZodTable({
    type: "any",
    surrealType: "table",
    name,
    fields: {
      id: recordId(name),
    },
    catchall: unknown(),
  }) as SurrealZodTable<Name>;
}

// export interface $SurrealZodRecordIdDef extends $ZodTypeDef {
//   type: "recordId";
// }

// export interface _SurrealZodRecordId extends z4._$ZodType {}

// /** @internal */
// export const _SurrealZodRecordId: z4.$constructor<_SurrealZodRecordId> =
// //   z4.$constructor("SurrealZodRecordId", (inst, def) => {});
// export interface $SurrealZodRecordIdInternals extends $ZodTypeInternals {}

// export interface $SurrealZodRecordId<
//   T extends string = string,
//   V extends RecordIdValue = RecordIdValue,
// > extends $ZodType {
//   _zod: $SurrealZodRecordIdInternals;
// }
// // export const recordId = <S extends z4.$ZodType>(schema: S) => {};

// export type $SurrealZodTypes = $ZodString | $ZodNumber | $ZodObject;
// export type $SurrealZodTypeName = $SurrealZodTypes["_zod"]["def"]["type"];

export type SurrealZodTypes =
  | SurrealZodAny
  | SurrealZodBoolean
  | SurrealZodString
  | SurrealZodObject
  | SurrealZodRecordId
  | SurrealZodTable;
