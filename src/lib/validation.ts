import type { ZodType, z } from 'zod';
import { ValidationError, type ValidationIssue } from './errors';

// The Zod half of MB.43's ValidationError. Kept out of errors.ts so that file
// stays schema-library-free, and out of any one module because every module's
// schemas raise the same shape (claude-docs/validation.md).

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
