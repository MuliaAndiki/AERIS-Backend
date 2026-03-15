import { AppContext } from "@/contex/appContex";

export function HttpResponse(c: AppContext) {
  return {
    ok: (data?: any, message = "OK") =>
      c.json?.({ status: 200, message, data }, 200),
    created: (data?: any, message = "Created") =>
      c.json?.({ status: 201, message, data }, 201),
    accepted: (data?: any, message = "Accepted") =>
      c.json?.({ status: 202, message, data }, 202),
    noContent: (message = "No Content") =>
      c.json?.({ status: 204, message }, 204),
    badRequest: (message = "Bad Request") =>
      c.json?.({ status: 400, message }, 400),
    unauthorized: (message = "Unauthorized") =>
      c.json?.({ status: 401, message }, 401),
    forbidden: (message = "Forbidden") =>
      c.json?.({ status: 403, message }, 403),
    notFound: (message = "Not Found") =>
      c.json?.({ status: 404, message }, 404),
    conflict: (message = "Conflict") => c.json?.({ status: 409, message }, 409),
    unprocessable: (message = "Unprocessable Entity") =>
      c.json?.({ status: 422, message }, 422),
    tooManyRequests: (message = "Too Many Requests") =>
      c.json?.({ status: 429, message }, 429),
    internalError: (error?: unknown) =>
      c.json?.(
        {
          status: 500,
          message: "Internal Server Error",
          error: error instanceof Error ? error.message : error,
        },
        500,
      ),
    notImplemented: (message = "Not Implemented") =>
      c.json?.({ status: 501, message }, 501),
    badGateway: (message = "Bad Gateway") =>
      c.json?.({ status: 502, message }, 502),
    serviceUnavailable: (message = "Service Unavailable") =>
      c.json?.({ status: 503, message }, 503),
  };
}

export function ErrorHandling(c: AppContext, error: unknown) {
  console.error(error);
  return HttpResponse(c).internalError(error);
}
