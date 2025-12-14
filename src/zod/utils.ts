import { core } from "zod";
import { SurrealZodType, type SurrealZodInternals } from "./schema";

export type OverrideOutput<
  T extends core.$ZodType,
  O = unknown,
  SurrealInternals extends SurrealZodInternals = SurrealZodInternals,
> = Omit<T, "_zod" | "_output"> & {
  _zod: Omit<T["_zod"], "output" | "def"> & {
    def: T["_zod"]["def"] & {
      surreal: SurrealInternals;
    };
    output: O;
  };
  _output: O;
};
type ZodTrait = {
  _zod: {
    def: any;
    [k: string]: any;
  };
};

export function patch<
  T extends ZodTrait,
  P = unknown,
  I extends core.$ZodIssueBase = never,
>(options: {
  original: core.$constructor<ZodTrait>;
  name: string;

  patchDef?(def: T["_zod"]["def"]): void;

  beforeParse?(
    payload: core.ParsePayload<P>,
    ctx: core.ParseContextInternal<I>,
  ): core.util.MaybeAsync<core.ParsePayload<P> | void>;

  beforeRun?(
    payload: core.ParsePayload<P>,
    ctx: core.ParseContextInternal<I>,
  ): core.util.MaybeAsync<core.ParsePayload<P> | void>;

  /**
   * Executed after a successful parsing and validation.
   */
  onRunSuccess?(result: core.ParsePayload<P>): void;
}): core.$constructor<T> {
  return core.$constructor<T>(options.name, (inst, def) => {
    options.original.init(inst, def);
    // @ts-expect-error - SurrealZodType overrides the type property
    SurrealZodType.init(inst, def);
    options.patchDef?.(def);

    if (options.beforeParse) {
      const originalParse = inst._zod.parse;
      // @ts-expect-error - we are overriding
      inst._zod.parse = (payload, ctx) => {
        const beforeParseResult = options?.beforeParse?.(
          payload as core.ParsePayload<P>,
          ctx as core.ParseContextInternal<I>,
        );
        if (beforeParseResult) {
          return beforeParseResult;
        }

        return originalParse(payload, ctx);
      };
    }

    if (options.beforeRun || options.onRunSuccess) {
      const originalRun = inst._zod.run;
      // @ts-expect-error - we are overriding
      inst._zod.run = (payload, ctx) => {
        const beforeRunResult = options?.beforeRun?.(
          payload as core.ParsePayload<P>,
          ctx as core.ParseContextInternal<I>,
        );
        if (beforeRunResult) {
          return beforeRunResult;
        }

        const result = originalRun(payload, ctx);

        if (result instanceof Promise) {
          return result.then(async (result) => {
            if (!result.issues.length) {
              options?.onRunSuccess?.(result as core.ParsePayload<P>);
            }
            return result;
          });
        }
        if (!result.issues.length) {
          options?.onRunSuccess?.(result as core.ParsePayload<P>);
        }
        return result;
      };

      return inst;
    }
  });
}
