import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import { adjacencyGraphs, dictionary as common } from '@zxcvbn-ts/language-common';
import { dictionary as english, translations } from '@zxcvbn-ts/language-en';
import type { PasswordStrength } from './types';

// The dictionaries are most of the weight, so this module is imported only once someone types a
// new password (./meter.tsx), never with the page.
const factory = new ZxcvbnFactory({
  translations,
  graphs: adjacencyGraphs,
  dictionary: { ...common, ...english },
});

/** zxcvbn's estimate of a password: guidance for the person choosing it, never a reason to refuse it. */
export function passwordStrength(password: string): PasswordStrength {
  const { score, feedback } = factory.check(password);
  return { score, warning: feedback.warning ?? undefined };
}
