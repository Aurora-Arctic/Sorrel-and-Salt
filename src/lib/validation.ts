import { type ZodType, z } from 'zod';
import { ValidationError } from './errors';
import type { ValidationIssue } from './types';

// The Zod half of MB.43's ValidationError, and the id shape every module
// checks. Kept out of errors.ts so that file stays schema-library-free, and out
// of any one module because every module's schemas raise the same shape
// (claude-docs/validation.md).

/**
 * An id as Postgres's `uuid` type takes it, any version and variant: the
 * seed's fixture ids are written by hand, and `z.uuid()` would refuse them.
 * Compared against a `uuid` column, anything else is a driver error.
 */
export const RowId = z.guid();

/**
 * RowId as a form field takes it: missing and malformed are refused alike, with
 * `message` saying what to choose, since neither is anything the user typed.
 */
export const requiredRowId = (message: string) => z.guid({ error: message });

/** A calendar day, `YYYY-MM-DD`, as a `date` column holds it: no time of day. */
export const CalendarDay = z.iso.date({ error: 'Give the day as YYYY-MM-DD' });

/** Required text: trimmed, and blank is refused — as missing, not as a value. */
export const requiredText = (message: string) =>
  z.string({ error: message }).trim().min(1, { error: message });

/**
 * Optional text: tidied by `format`, trimmed unless it says otherwise, and a
 * blank is an absence rather than an error — '' is what a form sends for a
 * field nobody touched, so it becomes null, which a column's non-blank CHECK
 * accepts. A caller wanting no value as `undefined` instead, such as a filter,
 * maps null itself, so the difference stays at the call site.
 */
export const optionalText = (format: (text: string) => string = (text) => text.trim()) =>
  z
    .string()
    .nullish()
    .transform((value) => {
      if (value == null) return value;
      const formatted = format(value);
      return formatted === '' ? null : formatted;
    });

/**
 * An admin-curated value's own fields, a name and the description the table
 * requires non-blank, each refusal saying the vocabulary's noun — "Give the
 * sign a name". No slug: one is derived from the name by src/lib/slugify.ts,
 * never written beside it, so one in the input is dropped.
 */
export const curatedValueInput = (noun: string) =>
  z.object({
    name: requiredText(`Give the ${noun} a name`),
    description: requiredText(`Describe the ${noun}`),
  });

/** One issue per Zod issue, path and message kept as Zod reported them. */
export function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    // Zod types a path key as `PropertyKey`; a symbol key cannot come from
    // parsed input, and ValidationIssue has no place for one.
    path: issue.path.map((key) => (typeof key === 'symbol' ? String(key) : key)),
    message: issue.message,
  }));
}

/**
 * Parses service input with the schema the form also runs: the parsed value
 * on success, a ValidationError the route maps to `fieldErrors` otherwise.
 */
export function parseInput<Schema extends ZodType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(toValidationIssues(result.error));
  return result.data;
}
