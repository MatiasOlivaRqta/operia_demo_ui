import { failure, success, type AppErrorCode, type Result } from "@/lib/result";

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    fieldErrors?: Record<string, string | string[]>;
  };
};

type RequestOptions = Readonly<{
  body?: unknown;
  headers?: Record<string, string>;
  redirectOnUnauthorized?: boolean;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  signal?: AbortSignal;
}>;

const knownErrorCodes = new Set<AppErrorCode>([
  "business_rule",
  "conflict",
  "forbidden",
  "not_found",
  "rate_limited",
  "unauthenticated",
  "validation",
  "unexpected",
]);

function redirectForUnauthorized(): void {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.dispatchEvent(new Event("operia:unauthorized"));
  }
}

function validationFields(
  fields: Record<string, string | string[]> | undefined,
): Record<string, string> | undefined {
  if (!fields) return undefined;
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      Array.isArray(value) ? (value[0] ?? "") : value,
    ]),
  );
}

export async function requestApi<T>(
  path: string,
  options: RequestOptions = {},
): Promise<Result<T>> {
  let response: Response;
  try {
    const documentLocale = typeof document === "undefined" ? "es" : document.documentElement.lang;
    const locale = documentLocale === "en" ? "en" : "es";
    response = await fetch(`/api${path.startsWith("/") ? path : `/${path}`}`, {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
      headers: {
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        "Accept-Language": locale,
        ...options.headers,
      },
      method: options.method ?? "GET",
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    return failure(
      "business_rule",
      "No pudimos conectar con el servicio. Revisá tu conexión e intentá de nuevo.",
      undefined,
      "errors.network",
    );
  }

  if (response.status === 401) {
    if (options.redirectOnUnauthorized !== false) redirectForUnauthorized();
    return failure(
      "unauthenticated",
      "La sesión no es válida o expiró.",
      undefined,
      "errors.sessionInvalid",
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    const rawCode = body?.error?.code;
    const knownCode = rawCode !== undefined && knownErrorCodes.has(rawCode as AppErrorCode);
    const code: AppErrorCode = knownCode ? (rawCode as AppErrorCode) : "business_rule";
    const message =
      !knownCode || code === "unexpected"
        ? "No pudimos completar la solicitud."
        : (body?.error?.message ??
          (code === "forbidden" ? "" : "No pudimos completar la solicitud."));
    const key =
      !knownCode || code === "unexpected"
        ? "errors.requestFailed"
        : code === "forbidden" && !body?.error?.message
          ? "errors.forbidden"
          : undefined;
    const result = failure(code, message, validationFields(body?.error?.fieldErrors), key);
    if (response.status === 503 && !result.ok) {
      return { ok: false, error: { ...result.error, status: response.status } };
    }
    return result;
  }

  if (response.status === 204) return success(undefined as T);
  try {
    return success((await response.json()) as T);
  } catch {
    return failure(
      "business_rule",
      "El servicio devolvió una respuesta inválida.",
      undefined,
      "errors.invalidResponse",
    );
  }
}

export async function postApi<T>(
  path: string,
  body?: unknown,
  options: Omit<RequestOptions, "body" | "method"> = {},
): Promise<Result<T>> {
  return requestApi<T>(path, { ...options, body, method: "POST" });
}
