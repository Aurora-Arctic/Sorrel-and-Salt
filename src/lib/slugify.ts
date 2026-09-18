import baseSlugify from 'slugify';

// One slug rule for the whole project, and the `slugify` package rather than a
// regex chain of our own — it already carries the transliteration table the
// hand-rolled version would have grown one character at a time (CLAUDE.md,
// "Port, don't rewrite from memory", and the same instinct one step further:
// don't write from memory what a package already maintains).
//
// The package's charmap maps `&` to "and", so DESIGN.md §6's "Protection &
// Defense" is `protection-and-defense`. That is the package's answer rather
// than ours, which is the point of using it: the alternative was picking
// between dropping the ampersand and expanding it, and then defending the
// choice in every language a folk name might arrive in.
//
// One extension, applied once here because the package's charmap is global:
// `strict` drops an underscore entirely, so `grief_work` would slug to
// `griefwork` — two words silently welded together. Mapping it to a hyphen
// first is what every other separator already does.
baseSlugify.extend({ _: '-' });

/**
 * Turns a display name into the slug stored beside it.
 *
 * `strict` removes what the charmap cannot transliterate rather than passing it
 * through, so an apostrophe closes up (`Cat's Claw` → `cats-claw`) and brackets
 * become separators (`Legal Matters (Civil)` → `legal-matters-civil`).
 *
 * Callers: M4.3's category seed, and — per CLAUDE.md's sweep-task rule, a
 * mechanism landing as early as it can be written and adopted by each later
 * task in its own PR — M4.3a's form vocabulary and M5.6/M5.7's admin mutations,
 * which slug a name an admin has typed.
 *
 * It can return an empty string for a name with nothing slugifiable in it
 * (`'&&&'` is `and`, but `'...'` is `''`). That is the caller's to handle: the
 * seed's names are fixed and covered by test, where an admin mutation has a
 * user it can tell.
 */
export function slugify(name: string): string {
  return baseSlugify(name, { lower: true, strict: true, trim: true });
}
