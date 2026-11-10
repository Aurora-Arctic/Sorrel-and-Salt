// A phone number as the person types it, for Field's mask and the schema that checks it. Pure and
// client-safe. The `min` metadata is the smallest build; it is enough to lay out and to validate.

import { AsYouType, isValidPhoneNumber } from 'libphonenumber-js/min';
import type { FieldFormat, FieldMask } from './formats';

/** The country a number without a "+" is read in; the app is used mostly by US staff. */
const DEFAULT_COUNTRY = 'US';

/** What a phone number may hold. Text with anything else (a letter) is left as typed for the schema to refuse. */
const PHONE_CHARACTERS = /^[\d\s()+.-]*$/;

/** What the schema says about a number it cannot read: it says what to do and shows how. */
export const PHONE_MESSAGE = 'Enter a phone number, like (202) 555-0123';

/** A number laid out as it is typed: "2025550123" is "(202) 555-0123", and "+44 7700 900123" keeps its UK form. */
export const formatPhoneNumber: FieldFormat = (text) =>
  PHONE_CHARACTERS.test(text) ? new AsYouType(DEFAULT_COUNTRY).input(text) : text;

/** Whether the text is a real number, read in the US unless it starts with "+". */
export const isPhoneNumber = (text: string): boolean => isValidPhoneNumber(text, DEFAULT_COUNTRY);

/** Field's `mask` for a phone number. */
export const phoneMask: FieldMask = {
  format: formatPhoneNumber,
  isSignificant: (character) => /[\d+]/.test(character),
};
