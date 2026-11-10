/**
 * The label `options` give `value`, as a summary or a table says a choice:
 * "Botanical" for `botanical`. A value the options lack is said as itself,
 * so a closed set grown on the server is never shown blank.
 */
export const labelOf = (
  options: readonly { value: string; label: string }[],
  value: string,
): string => options.find((option) => option.value === value)?.label ?? value;
