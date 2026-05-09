export type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  on?: (event: string, callback: (...args: any[]) => void) => void;
};

export type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  write: (chunk: string) => void;
  end: () => void;
};

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function sendJson(res: ApiResponse, statusCode: number, body: unknown) {
  res.status(statusCode).json(body);
}

export function methodGuard(req: ApiRequest, methods: string[]) {
  const method = req.method ?? "GET";
  if (!methods.includes(method)) {
    throw new HttpError(405, `Method ${method} is not allowed.`);
  }
}

export async function readJson<T>(req: ApiRequest): Promise<T> {
  if (req.body && typeof req.body === "object") return req.body as T;
  if (typeof req.body === "string") return JSON.parse(req.body) as T;

  if (!req.on) return {} as T;

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on?.("data", (chunk) => chunks.push(chunk));
    req.on?.("end", resolve);
    req.on?.("error", reject);
  });

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

export function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function handleApi(
  res: ApiResponse,
  handler: () => Promise<void>,
) {
  try {
    await handler();
  } catch (error) {
    if (error instanceof HttpError) {
      sendJson(res, error.statusCode, { error: error.message });
      return;
    }
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Internal server error.",
    });
  }
}
