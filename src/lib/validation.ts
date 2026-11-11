import { type ZodType, z } from 'zod';
import { ValidationError } from './errors';
import { type FieldFormat, limitMessage, parseQuantity, tidy, trimEnds } from './formats';
import { QUANTITY_FORMAT_MESSAGE, amountProblem } from './quantity-rule';
import type { ValidationIssue } from './types';

// Apart from errors.ts so that stays schema-library-free (claude-docs/validation.md).

/** Any version and variant: the seed's fixture ids are written by hand, and `z.uuid()` would refuse them. Anything else against a `uuid` column is a driver error. */
export const RowId = z.guid();

/** Missing and malformed are refused alike, with `message` saying what to choose, since neither is anything the user typed. */
export const requiredRowId = (message: string) => z.guid({ error: message });

export const CalendarDay = z.iso.date({ error: 'Give the day as YYYY-MM-DD' });

/** Tidied as the single-line field is on blur; a multiline field passes `trimEnds`, which keeps its line breaks. */
export const requiredText = (message: string, format: FieldFormat = tidy) =>
  z.string({ error: message }).overwrite(format).min(1, { error: message });

/** `requiredText` with at most `limit` characters, refused in the words the form shows (`limitMessage`). */
export const limitedText = (message: string, limit: number, format: FieldFormat = tidy) =>
  requiredText(message, format).max(limit, { error: limitMessage(limit) });

/** '' is what a form sends for an untouched field, so it becomes null, which a non-blank CHECK accepts. A caller wanting `undefined`, such as a filter, maps null itself. */
export const optionalText = (format: FieldFormat = tidy) =>
  z
    .string()
    .nullish()
    .transform((value) => {
      if (value == null) return value;
      const formatted = format(value);
      return formatted === '' ? null : formatted;
    });

/**
 * A stock or recipe amount: a number from 0 to what the columns hold with up to three decimals. Not a CHECK for the
 * negative case, which has something to say. `label` names the field in the messages that need it. The rule is
 * `amountProblem` (quantity-rule.ts), which a client field checks with too.
 */
export const quantity = (label: string) =>
  z.number({ error: QUANTITY_FORMAT_MESSAGE }).check((context) => {
    const problem = amountProblem(context.value, label);
    if (problem) context.issues.push({ code: 'custom', message: problem, input: context.value });
  });

/** `quantity` for the text a form holds: blank is no amount, digits with at most one point, commas dropped as thousands separators. */
export const quantityText = (label: string) =>
  z.string().transform(parseQuantity).pipe(quantity(label).nullable());

/** No slug: it is derived by src/lib/slugify.ts, so one in the input is dropped. */
export const curatedValueInput = (noun: string) =>
  z.object({
    name: requiredText(`Give the ${noun} a name`),
    description: requiredText(`Describe the ${noun}`, trimEnds),
  });

export function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    // Zod types a path key as `PropertyKey`; a symbol key cannot come from
    // parsed input, and ValidationIssue has no place for one.
    path: issue.path.map((key) => (typeof key === 'symbol' ? String(key) : key)),
    message: issue.message,
  }));
}

/** Runs the schema the form also runs; the route maps the ValidationError to `fieldErrors`. */
export function parseInput<Schema extends ZodType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(toValidationIssues(result.error));
  return result.data;
}

/** Narrows rather than parses, for a lookup whose malformed id answers as a missing row would. */
export const isRowId = (value: unknown): value is string => RowId.safeParse(value).success;
