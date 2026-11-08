import type { HelpAudience } from '@/modules/help';

/** What each help audience is called wherever a page or list names it. */
export const HELP_AUDIENCE_LABELS: Record<HelpAudience, string> = {
  public: 'Public',
  staff: 'Staff',
  keeper: 'Keeper',
};
