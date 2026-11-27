/**
 * Structured logging. One line per event:
 *   production   JSON, so a log service (Vercel, Datadog, Better Stack…) can search and filter by field
 *   development  readable text, coloured by level
 *
 * Every line has a level, a message and fields. Request logs carry `requestId`, the same id the API
 * returns in the X-Request-Id header and in error responses, so one id leads to every line about a request.
 *
 * Secrets never reach the logs: fields named like passwords, tokens or authorization headers are
 * replaced with "[redacted]", and token query parameters are stripped from URLs.
 * LOG_LEVEL sets the minimum level (default: debug in development, info in production, silent in tests).
 */
export type Level = 'debug' | 'info' | 'warn' | 'error';
export type Fields = Record<string, unknown>;
export type Logger = {
  debug(message: string, fields?: Fields): void;
  info(message: string, fields?: Fields): void;
  warn(message: string, fields?: Fields): void;
  error(message: string, fields?: Fields): void;
  /** A logger that adds `fields` to every line, e.g. the request id. */
  child(fields: Fields): Logger;
};

const ORDER: Record<Level | 'silent', number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
const SECRET_KEY = /pass(word)?|token|secret|authorization|cookie|api[-_]?key|card(number)?|cvc/i;

/** Removes ?token=… and similar from URLs, so reset and confirmation links in a path never get logged. */
export const redactUrl = (url: string) => url.replace(/([?&](?:token|key|secret|password)=)[^&#]*/gi, '$1[redacted]');

/** An Error as plain fields: name, message, PostgreSQL details (code, constraint, table…), stack and causes. */
export function serializeError(error: unknown, depth = 0): Fields {
  if (!(error instanceof Error)) return { value: String(error) };
  const e = error as Error & Record<string, unknown>;
  const fields: Fields = { name: e.name, message: e.message };
  // node-postgres and PGlite errors say exactly which rule failed; keep those, they're the fastest clue.
  for (const key of ['code', 'constraint', 'table', 'column', 'detail', 'severity', 'status']) {
    if (e[key] !== undefined && e[key] !== null && e[key] !== '') fields[key] = e[key];
  }
  if (e.stack) fields.stack = e.stack.split('\n').slice(0, 12).join('\n');
  if (e.cause && depth < 3) fields.cause = serializeError(e.cause, depth + 1);
  return fields;
}

function clean(value: unknown, depth = 0): unknown {
  if (value instanceof Error) return serializeError(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return depth > 4 ? '[…]' : value.slice(0, 50).map((item) => clean(item, depth + 1));
  if (value && typeof value === 'object') {
    if (depth > 4) return '[…]';
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, SECRET_KEY.test(key) ? '[redacted]' : clean(item, depth + 1)]),
    );
  }
  if (typeof value === 'string') return value.length > 4000 ? `${value.slice(0, 4000)}…` : value;
  return value;
}

const COLOURS: Record<Level, string> = { debug: '\x1b[90m', info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m' };

export function createLogger({
  level = (process.env.LOG_LEVEL as Level | 'silent' | undefined) ??
    (process.env.NODE_ENV === 'production' ? 'info' : process.env.NODE_TEST_CONTEXT ? 'silent' : 'debug'),
  json = process.env.NODE_ENV === 'production',
  bindings = {},
  write = (line: string, lvl: Level) => {
    (lvl === 'error' || lvl === 'warn' ? process.stderr : process.stdout).write(`${line}\n`);
  },
}: {
  level?: Level | 'silent';
  json?: boolean;
  bindings?: Fields;
  /** Where each finished line goes. Tests pass their own to read what was logged. */
  write?: (line: string, level: Level) => void;
} = {}): Logger {
  const min = ORDER[level] ?? ORDER.info;
  const log = (lvl: Level, message: string, fields: Fields = {}) => {
    if (ORDER[lvl] < min) return;
    const data = clean({ ...bindings, ...fields }) as Fields;
    if (json) {
      write(JSON.stringify({ time: new Date().toISOString(), level: lvl, msg: message, ...data }), lvl);
      return;
    }
    const { stack, ...rest } = (data.error ?? {}) as Fields;
    const shown = data.error ? { ...data, error: rest } : data;
    const extra = Object.keys(shown).length ? ` ${JSON.stringify(shown)}` : '';
    const time = new Date().toISOString().slice(11, 23);
    write(`${COLOURS[lvl]}${time} ${lvl.toUpperCase().padEnd(5)}\x1b[0m ${message}${extra}${stack ? `\n${stack}` : ''}`, lvl);
  };
  return {
    debug: (message, fields) => log('debug', message, fields),
    info: (message, fields) => log('info', message, fields),
    warn: (message, fields) => log('warn', message, fields),
    error: (message, fields) => log('error', message, fields),
    child: (fields) => createLogger({ level, json, bindings: { ...bindings, ...fields }, write }),
  };
}

/** The app-wide logger. Request handlers use the per-request child on `c.get('log')` instead. */
export const logger = createLogger();
