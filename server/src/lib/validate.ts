import type { Context } from 'hono';
import { z } from 'zod';
import { ApiError } from './errors.ts';
import { EMAIL_PATTERN } from '../shared.ts';

/** Turns zod issues into the `validation_failed` error, with one message per field. */
function validationError(issues: z.core.$ZodIssue[]) {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  return new ApiError(422, 'validation_failed', issues[0]?.message ?? 'Please check the details and try again.', { fields });
}

/** Parses and validates the JSON body. Invalid JSON is a 400; a body that fails `schema` is a 422. */
export async function readBody<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new ApiError(400, 'invalid_json', 'The request body must be valid JSON.');
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw validationError(result.error.issues);
  return result.data;
}

/** Validates query parameters the same way. */
export function readQuery<T extends z.ZodType>(c: Context, schema: T): z.infer<T> {
  const result = schema.safeParse(c.req.query());
  if (!result.success) throw validationError(result.error.issues);
  return result.data;
}

// Reusable field schemas. Messages match the storefront's forms.
export const fields = {
  name: (what: string) => z.string().trim().min(1, `Enter a ${what}`).max(100),
  email: () =>
    z
      .string({ error: 'Enter your email address' })
      .trim()
      .toLowerCase()
      .min(1, 'Enter your email address')
      .max(254)
      .regex(EMAIL_PATTERN, 'Enter a valid email, like name@example.com'),
  optionalText: (max = 200) =>
    z
      .string()
      .trim()
      .max(max)
      .nullish()
      .transform((value) => value || null),
};
