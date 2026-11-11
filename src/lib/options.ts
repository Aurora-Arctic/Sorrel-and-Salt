type Keyed<K extends string> = readonly ({ label: string } & Record<K, string>)[];

/**
 * The label the option whose `key` holds `value` gives, as a summary or a table says a choice:
 * "Botanical" for `botanical`. With no fallback a value the options lack is said as itself, so a
 * closed set grown on the server is never shown blank; with one, a missing value or a value
 * the options lack gives the fallback. An option's own empty label is kept.
 */
export function labelByKey<K extends string>(options: Keyed<K>, key: K, value: string): string;
export function labelByKey<K extends string>(
  options: Keyed<K>,
  key: K,
  value: string | undefined,
  fallback: string,
): string;
export function labelByKey<K extends string>(
  options: Keyed<K>,
  key: K,
  value: string | undefined,
  fallback?: string,
): string {
  return options.find((option) => option[key] === value)?.label ?? fallback ?? value ?? '';
}

/** The label `options` give `value`; see `labelByKey`. */
export const labelOf = (
  options: readonly { value: string; label: string }[],
  value: string,
): string => labelByKey(options, 'value', value);
