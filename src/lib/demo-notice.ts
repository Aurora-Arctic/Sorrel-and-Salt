import type { WorkspaceRole } from '@/modules/coven';

// The two sentences the demo coven's notice says: to an observer or practitioner, and to a steward (a site
// admin). One module because the coven layout and the spell preview pane, which covers the layout,
// both draw them.
export const DEMO_NOTICE =
  'This is a demo coven, so you can see how Sorrel & Salt works. You can look at everything and change nothing. A coven of your own starts with an invitation from someone who has one.';
export const DEMO_OWNER_NOTICE =
  'You are a steward of this coven as a Keeper: what you change here is what every new account sees.';

/** The notice a coven page shows its viewer: none outside the demo coven, and in it one for its stewards and one for everyone else. */
export function demoNoticeOf(
  workspace: { demo: boolean },
  role: WorkspaceRole,
): string | undefined {
  if (!workspace.demo) return undefined;
  return role === 'owner' ? DEMO_OWNER_NOTICE : DEMO_NOTICE;
}
