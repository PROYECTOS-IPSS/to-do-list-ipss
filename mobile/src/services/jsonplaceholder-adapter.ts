import { z } from 'zod';

export const JSONPLACEHOLDER_PROVIDER = 'jsonplaceholder' as const;
export const JSONPLACEHOLDER_PROVIDER_NAME = 'JSONPlaceholder' as const;
export const JSONPLACEHOLDER_TODOS_URL = 'https://jsonplaceholder.typicode.com/todos' as const;
export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;
export const DEFAULT_MAX_RECORDS = 200;

const todoSchema = z.object({
  userId: z.number().int(),
  id: z.number().int(),
  title: z.string(),
  completed: z.boolean()
});
const envelopeSchema = z.array(z.unknown());

export type JsonPlaceholderTodo = z.infer<typeof todoSchema>;
export type ImportedTodoPreview = {
  provider: typeof JSONPLACEHOLDER_PROVIDER;
  providerName: typeof JSONPLACEHOLDER_PROVIDER_NAME;
  externalId: string;
  title: string;
  completed: boolean;
  description: null;
};

export type JsonPlaceholderTodosResult = {
  records: ImportedTodoPreview[];
  rejectedCount: number;
  duplicateCount: number;
  truncated: boolean;
};

export type JsonPlaceholderAdapterOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRecords?: number;
  fetchFn?: typeof fetch;
};

export class JsonPlaceholderHttpError extends Error {
  readonly status: number;
  readonly statusCode: number;

  constructor(status: number, message = `JSONPlaceholder request failed (${status}).`) {
    super(message);
    this.name = 'JsonPlaceholderHttpError';
    this.status = status;
    this.statusCode = status;
  }
}

export class JsonPlaceholderValidationError extends Error {
  constructor(message = 'JSONPlaceholder returned invalid data.') {
    super(message);
    this.name = 'JsonPlaceholderValidationError';
  }
}

export class JsonPlaceholderResponseTooLargeError extends Error {
  readonly maxBytes: number;

  constructor(maxBytes: number) {
    super(`JSONPlaceholder response exceeds ${maxBytes} bytes.`);
    this.name = 'JsonPlaceholderResponseTooLargeError';
    this.maxBytes = maxBytes;
  }
}

export class JsonPlaceholderTimeoutError extends Error {
  constructor(message = 'JSONPlaceholder request timed out.') {
    super(message);
    this.name = 'JsonPlaceholderTimeoutError';
  }
}

export class JsonPlaceholderCancelledError extends Error {
  constructor(message = 'JSONPlaceholder request was cancelled.') {
    super(message);
    this.name = 'JsonPlaceholderCancelledError';
  }
}

const bytesOf = (value: string): number => new TextEncoder().encode(value).byteLength;

const asPreview = (todo: JsonPlaceholderTodo): ImportedTodoPreview => ({
  provider: JSONPLACEHOLDER_PROVIDER,
  providerName: JSONPLACEHOLDER_PROVIDER_NAME,
  externalId: String(todo.id),
  title: todo.title,
  completed: todo.completed,
  description: null
});

export async function fetchJsonPlaceholderTodos(options: JsonPlaceholderAdapterOptions = {}): Promise<JsonPlaceholderTodosResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const maxRecords = options.maxRecords ?? DEFAULT_MAX_RECORDS;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) throw new RangeError('timeoutMs must be a non-negative finite number.');
  if (!Number.isInteger(maxResponseBytes) || maxResponseBytes <= 0) throw new RangeError('maxResponseBytes must be a positive integer.');
  if (!Number.isInteger(maxRecords) || maxRecords < 0) throw new RangeError('maxRecords must be a non-negative integer.');

  const controller = new AbortController();
  let timedOut = false;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    cancelled = true;
    controller.abort();
  };
  if (options.signal) {
    if (options.signal.aborted) cancel();
    else options.signal.addEventListener('abort', cancel, { once: true });
  }
  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  try {
    const fetchFn = options.fetchFn ?? fetch;
    const response = await fetchFn(JSONPLACEHOLDER_TODOS_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    if (controller.signal.aborted) throw new Error('aborted');
    if (!response.ok) throw new JsonPlaceholderHttpError(response.status);
    const length = response.headers?.get('content-length');
    if (length && Number.isFinite(Number(length)) && Number(length) > maxResponseBytes) {
      throw new JsonPlaceholderResponseTooLargeError(maxResponseBytes);
    }
    const body = typeof response.text === 'function' ? await response.text() : JSON.stringify(await response.json());
    if (bytesOf(body) > maxResponseBytes) throw new JsonPlaceholderResponseTooLargeError(maxResponseBytes);
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { throw new JsonPlaceholderValidationError('JSONPlaceholder returned malformed JSON.'); }
    const envelope = envelopeSchema.safeParse(parsed);
    if (!envelope.success) throw new JsonPlaceholderValidationError('JSONPlaceholder response must be an array.');

    const records: ImportedTodoPreview[] = [];
    const seen = new Set<string>();
    let rejectedCount = 0;
    let duplicateCount = 0;
    for (const raw of envelope.data) {
      const result = todoSchema.safeParse(raw);
      if (!result.success) { rejectedCount += 1; continue; }
      const externalId = String(result.data.id);
      if (seen.has(externalId)) { rejectedCount += 1; duplicateCount += 1; continue; }
      seen.add(externalId);
      if (records.length < maxRecords) records.push(asPreview(result.data));
    }
    return { records, rejectedCount, duplicateCount, truncated: records.length < seen.size };
  } catch (error) {
    if (error instanceof JsonPlaceholderHttpError || error instanceof JsonPlaceholderValidationError || error instanceof JsonPlaceholderResponseTooLargeError) throw error;
    if (timedOut) throw new JsonPlaceholderTimeoutError();
    if (cancelled || controller.signal.aborted) throw new JsonPlaceholderCancelledError();
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}
