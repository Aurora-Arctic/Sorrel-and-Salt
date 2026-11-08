import type { HelpAudience } from '@/modules/help';

/** What each help audience is called wherever a page or list names it. */
export const HELP_AUDIENCE_LABELS: Record<HelpAudience, string> = {
  public: 'Public',
  staff: 'Staff',
  keeper: 'Keeper',
};

/** The guides' order of audiences: the keepers' Guides bar reads Public, then Staff, then Keeper, once each. */
export const HELP_AUDIENCE_RANK: Record<HelpAudience, number> = { public: 0, staff: 1, keeper: 2 };

/** Top-level guides by audience, then in their order within it: how the keepers' Guides bar lists them. */
export const byAudience = <Guide extends { audience: HelpAudience }>(
  guides: readonly Guide[],
): Guide[] =>
  [...guides].sort((a, b) => HELP_AUDIENCE_RANK[a.audience] - HELP_AUDIENCE_RANK[b.audience]);
