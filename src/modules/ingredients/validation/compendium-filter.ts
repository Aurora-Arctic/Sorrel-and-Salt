import { z } from 'zod';

// The compendium list's filter as the `compendium` query receives it, parsed
// by the service because the browser is not the only caller. Zod only, like
// every validation file: the form's side of the search box loads it too
// (claude-docs/validation.md, "Where the schemas live").

/** Optional text: trimmed, and blank is an absence — no filter — rather than a value. */
const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value ? value : undefined));

/**
 * An id as Postgres's `uuid` type takes it, any version and variant: the
 * seed's fixture ids are written by hand, and `z.uuid()` would refuse them.
 */
export const RowId = z.guid();

export const CompendiumFilter = z.object({
  search: optionalText,
  categoryIds: z
    .array(RowId)
    .nullish()
    .transform((ids) => (ids && ids.length > 0 ? ids : undefined)),
  form: optionalText,
});

export type CompendiumFilterInput = z.input<typeof CompendiumFilter>;
export type CompendiumFilter = z.output<typeof CompendiumFilter>;
