export type AppErrorCode =
  | "business_rule"
  | "conflict"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "unauthenticated"
  | "unexpected"
  | "validation";

export type AppError = {
  code: AppErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
  key?: string;
  params?: Record<string, string | number>;
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export const success = <T>(value: T): Result<T> => ({ ok: true, value });
export const failure = (
  code: AppErrorCode,
  message: string,
  fieldErrors?: Record<string, string>,
  key?: string,
  params?: Record<string, string | number>,
): Result<never> => ({
  ok: false,
  error: {
    code,
    ...(fieldErrors ? { fieldErrors } : {}),
    message,
    ...(key ? { key } : {}),
    ...(params ? { params } : {}),
  },
});
