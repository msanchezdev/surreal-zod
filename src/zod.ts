import { RecordId, type RecordIdValue, type Table } from "surrealdb";
import z4 from "zod/v4";
import * as core from "zod/v4/core";

//////////////////////////////////////////////
//////////////////////////////////////////////
//////////                          //////////
//////////      SurrealZodType      //////////
//////////                          //////////
//////////////////////////////////////////////
//////////////////////////////////////////////

export interface SurrealZodTypeDef extends core.$ZodTypeDef {
  surrealType?: "any" | "boolean" | "string" | "object" | "record_id";
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
  _surreal: true;
}

export interface _SurrealZodType<
  out Internals extends core.$ZodTypeInternals = core.$ZodTypeInternals,
> extends SurrealZodType<any, any, Internals> {}

export const SurrealZodType: core.$constructor<SurrealZodType> =
  core.$constructor("SurrealZodType", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodType.init(inst, def);
    inst._surreal = true;
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

// export interface SurrealZodRecordIdDef<
//   out W extends core.util.EnumLike = core.util.EnumLike,
//   // TODO: Remove support for core types?
//   T extends core.$ZodType | SurrealZodType = core.$ZodType | SurrealZodType,
// > extends SurrealZodTypeDef {
//   type: "record_id";
//   innerType: T;
//   what?: W;
// }

export interface SurrealZodRecordIdDef<
  out W extends { [key: string]: string } = { [key: string]: string },
  // TODO: Remove support for core types?
  T extends core.SomeType = core.SomeType,
> extends SurrealZodTypeDef {
  surrealType: "record_id";
  innerType: T;
  what?: W;
}

export interface SurrealZodRecordIdInternals<
  W extends { [key: string]: string } = { [key: string]: string },
  // TODO: Remove support for core types?
  T extends core.SomeType = core.SomeType,
> extends SurrealZodTypeInternals<RecordId<W[keyof W]>, RecordIdValue> {
  def: SurrealZodRecordIdDef<W, T>;
}

export interface SurrealZodRecordId<
  W extends { [key: string]: string } = { [key: string]: string },
  T extends core.SomeType = core.SomeType,
> extends _SurrealZodType<SurrealZodRecordIdInternals<W, T>> {}

export const SurrealZodRecordId: core.$constructor<SurrealZodRecordId> =
  core.$constructor("SurrealZodRecordId", (inst, def) => {
    // @ts-expect-error - unknown assertion error
    core.$ZodAny.init(inst, def);
    SurrealZodType.init(inst, def);
    inst._surreal = true;
    inst._zod.parse = (payload, _ctx) => {
      if (payload.value instanceof RecordId) {
        if (def.what) {
          if (def.what[payload.value.table.name] === undefined) {
            payload.issues.push({
              code: "invalid_value",
              values: Object.keys(def.what),
              input: payload.value.table.name,
              message: `Expected record table to be one of ${Object.keys(def.what).join(" | ")} but found ${payload.value.table.name}`,
            });
          }
        }
        // } else if (typeof payload.value === "string") {
        //   let tablePart = '';
        //   let idPart = '';
        //   let quote = '';
        //   for (let i = 0; i < payload.value.length; i++) {
        //     const char = payload.value[i];
        //     if (char === '`') {
        //       if (quote === '`') {
        //         tablePart = payload.value.slice(1, i);
        //       } else quote = '`';
        //     }
        //     if (char === ':') {
        //       tablePart = payload.value.slice(0, charIndex);
        //       idPart = payload.value.slice(tablePart.length + 1);
        //       break;
        //     }
        //     tablePart += char;
        //   }
        //   for (const char of payload.value.slice(tablePart.length + 1)) {
        //     idPart += char;
        //   }
        //   if (/^(`|\u27e8)/.test(payload.value)) {
        //     payload.value = new RecordId(payload.value.split(":")[0], payload.value.split(":")[1]);
        //   } else {
        //     payload.issues.push({
        //       code: 'invalid_format',
        //       format: 'record_id',
        //       message: 'Invalid record id format',
        //     });
        //   }
      } else {
        payload.issues.push({
          code: "invalid_type",
          expected: "custom",
          input: payload.value,
        });
      }

      return payload;
    };
    return inst;
  });

export function recordId<const W extends readonly string[]>(
  what?: W,
  innerType?: core.$ZodType | SurrealZodType,
): SurrealZodRecordId<core.util.ToEnum<W[number]>> {
  return new SurrealZodRecordId({
    // Zod would not be happy if we have a custom type here, so we use any
    type: "any",
    surrealType: "record_id",
    what: what
      ? (Object.freeze(Object.fromEntries(what.map((v) => [v, v]))) as any)
      : undefined,
    innerType: innerType ?? any(),
  }) as any;
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
  | SurrealZodRecordId;
