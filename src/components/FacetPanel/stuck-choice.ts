/**
 * Whether a choice chip is stuck: one of its options counts zero, so every matching row shares a
 * single value and the chip cannot narrow. A stuck chip rests on Any, is disabled and says why in
 * its chip hint; `what` finishes the sentence ("entry has the same review mark"). `holds` is false
 * where a held setting keeps the chip usable, so it is never stuck.
 */
export const stuckChoice = (
  choices: ReadonlyArray<{ count: number }> | undefined,
  what: string,
  holds = false,
): { stuck: boolean; hint: string | undefined } => {
  const stuck = !holds && (choices?.some((choice) => choice.count === 0) ?? false);
  return {
    stuck,
    hint: stuck ? `Every matching ${what}, so this filter cannot narrow further.` : undefined,
  };
};
