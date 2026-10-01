import type { EMAIL_THEMES } from '@/emails/theme';

/** A theme the mail carries, and so a mixin the site's Sass must have. */
export type Theme = keyof typeof EMAIL_THEMES;
