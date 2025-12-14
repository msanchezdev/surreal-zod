import { DateTime, Uuid } from "surrealdb";
import {
  ZodGUID as OriginalZodGUID,
  ZodUUID as OriginalZodUUID,
  ZodDate as OriginalZodDate,
  core,
} from "zod/v4";
import { patch, type OverrideOutput } from "./utils";

// guid
export type ZodGUID = SurrealZodGUID;

export interface SurrealZodGUID
  extends OverrideOutput<OriginalZodGUID, Uuid, { type: "uuid" }> {}

export const SurrealZodGUID = patch<SurrealZodGUID>({
  original: OriginalZodGUID,
  name: "SurrealZodGUID",
  patchDef(def) {
    def.surreal.type = "uuid";
  },
  beforeRun(payload) {
    if (payload.value instanceof Uuid) {
      return payload;
    }
  },
  onRunSuccess(result) {
    result.value = new Uuid(result.value as string);
  },
});

export function guid(params?: string | core.$ZodGUIDParams) {
  return new SurrealZodGUID({
    type: "string",
    check: "string_format",
    format: "guid",
    ...core.util.normalizeParams(params),
    surreal: {
      type: "uuid",
    },
  });
}

// uuid

export type ZodUUID = SurrealZodUUID;

export interface SurrealZodUUID
  extends OverrideOutput<OriginalZodUUID, Uuid, { type: "uuid" }> {}

export const SurrealZodUUID = patch<SurrealZodUUID>({
  original: OriginalZodUUID,
  name: "SurrealZodUUID",
  patchDef(def) {
    def.surreal.type = "uuid";
  },
  beforeRun(payload) {
    if (payload.value instanceof Uuid) {
      return payload;
    }
  },
  onRunSuccess(result) {
    result.value = new Uuid(result.value as string);
  },
});

export function uuid(params?: string | core.$ZodUUIDParams) {
  return new SurrealZodUUID({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...core.util.normalizeParams(params),
    surreal: {
      type: "uuid",
    },
  });
}

// uuidv4
export function uuidv4(params?: string | core.$ZodUUIDv4Params) {
  return new SurrealZodUUID({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...core.util.normalizeParams(params),
    surreal: {
      type: "uuid",
    },
  });
}

// uuidv6
export function uuidv6(params?: string | core.$ZodUUIDv6Params) {
  return new SurrealZodUUID({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...core.util.normalizeParams(params),
    surreal: {
      type: "uuid",
    },
  });
}

// uuidv7
export function uuidv7(params?: string | core.$ZodUUIDv7Params) {
  return new SurrealZodUUID({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...core.util.normalizeParams(params),
    surreal: {
      type: "uuid",
    },
  });
}

// date

export type ZodDate = SurrealZodDate;

export interface SurrealZodDate
  extends OverrideOutput<OriginalZodDate, Date, { type: "datetime" }> {}

export const SurrealZodDate = patch<SurrealZodDate>({
  original: OriginalZodDate,
  name: "SurrealZodDate",
  patchDef(def) {
    def.surreal.type = "datetime";
  },
  beforeParse(payload) {
    if (payload.value instanceof DateTime) {
      payload.value = payload.value.toDate();
    }
  },
  onRunSuccess(result) {
    if (!(result.value instanceof Date)) {
      result.value = new Date(result.value as string);
    }
  },
});

export function date(params?: string | core.$ZodDateParams) {
  return new SurrealZodDate({
    type: "date",
    ...core.util.normalizeParams(params),
    surreal: {
      type: "datetime",
    },
  });
}
