import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import { adjacencyGraphs, dictionary as common } from '@zxcvbn-ts/language-common';
import { dictionary as english, translations } from '@zxcvbn-ts/language-en';
import type { PasswordStrength } from './types';

type Warnings = typeof translations.warnings;

// zxcvbn's English warnings run to 63 characters and wrap in the sign-in card, whose text line is
// 224px wide at 320px; these are short enough that "Very Weak. " and the longest of them fit one line.
// Typed against the library's keys, so a key it adds fails the type check.
export const SHORT_WARNINGS: Warnings = {
  straightRow: 'A keyboard row.',
  keyPattern: 'A keyboard pattern.',
  simpleRepeat: 'A repeat.',
  extendedRepeat: 'A repeat.',
  sequences: 'A sequence.',
  recentYears: 'A year.',
  dates: 'A date.',
  topTen: 'A common password.',
  topHundred: 'A common password.',
  common: 'A common password.',
  similarToCommon: 'Like a common one.',
  wordByItself: 'A single word.',
  namesByThemselves: 'A name.',
  commonNames: 'A name.',
  userInputs: 'Personal details.',
  pwned: 'Found in a breach.',
};

// The dictionaries are most of the weight, so this module is imported only once someone types a
// new password (./meter.tsx), never with the page.
const factory = new ZxcvbnFactory({
  translations: { ...translations, warnings: SHORT_WARNINGS },
  graphs: adjacencyGraphs,
  dictionary: { ...common, ...english },
});

/** zxcvbn's estimate of a password: guidance for the person choosing it, never a reason to refuse it. */
export function passwordStrength(password: string): PasswordStrength {
  const { score, feedback } = factory.check(password);
  return { score, warning: feedback.warning ?? undefined };
}
