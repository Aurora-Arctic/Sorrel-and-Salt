import { dayInUtc, printedDateOf } from '../utc';

/** One card front's words: the headline, the brighter tagline, and the two muted lines beneath it. */
export interface FrontCopy {
  headline: string;
  tagline: string;
  howTo: string;
  admits: string;
}

// Nine texts, one per card on a sheet, so no two cards on a sheet read the same.
export const FRONT_COPY: readonly FrontCopy[] = [
  {
    headline: 'The Kettle Is On',
    tagline: 'Pour yourself a cup.',
    howTo: 'Scan the code, sign in, and start a coven of your own.',
    admits: 'This card admits one. Invite your coven to the table.',
  },
  {
    headline: 'Something Is Brewing',
    tagline: 'Lean in. Breathe deep.',
    howTo: 'Scan the code, sign in, and begin a grimoire for the things you make.',
    admits: 'This card admits one. Gather a coven yourself, by invitation.',
  },
  {
    headline: 'Salt the Threshold',
    tagline: 'Then step over it.',
    howTo: 'Scan the code, sign in, and protect a coven of your own.',
    admits: 'This card admits one. You hold the door for the rest.',
  },
  {
    headline: 'By Moon & Measure',
    tagline: 'Keep what you gather.',
    howTo: 'Scan the code, sign in, and keep note of your enchantments.',
    admits: 'This card admits one. The rest arrive on your invitation.',
  },
  {
    headline: 'Enter Softly',
    tagline: 'The door opens for one.',
    howTo: "Scan the code, sign in, and begin a grimoire of your coven's secrets.",
    admits: 'Once you are in, open the door for whomever you like.',
  },
  {
    headline: 'Light the Candle',
    tagline: 'The others will find their way.',
    howTo: 'Scan the code, sign in, and keep a grimoire to read it with.',
    admits: 'This card admits one. Call the rest in from the dark.',
  },
  {
    headline: 'Knock Three Times',
    tagline: 'You are welcome in.',
    howTo: 'Scan the code, sign in, and begin a grimoire of your own.',
    admits: 'This card admits one. Open as others knock.',
  },
  {
    headline: 'Follow the Smoke',
    tagline: 'It leads somewhere warm.',
    howTo: 'Scan the code, sign in, and keep a grimoire by the hearth.',
    admits: 'This card admits one. Bring others in from the cold.',
  },
  {
    headline: 'Read the Leaves',
    tagline: "They say you're expected.",
    howTo: 'Scan the code, sign in, and keep a grimoire of what you brew.',
    admits: 'This card admits one. Brew a pot for the rest.',
  },
];

export const WORDMARK = 'Sorrel & Salt';
export const SITE_ADDRESS = 'sorrelandsalt.com';
export const BACK_LEDE =
  'A shared grimoire for a coven or a household: the ingredients you keep, the stock in your jars, and the spells you make from them.';
export const BACK_NOTE = 'By invitation only.';

// The day the card was minted to last through, in UTC so the card reads the same wherever the PDF is made.
export function validUntil(expiresAt: Date): string {
  return `Valid until ${dayInUtc(printedDateOf(expiresAt))}`;
}
