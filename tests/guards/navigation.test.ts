import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

import { fromRoot } from '../support/paths';

// M12.33's guard (claude-docs/design-decisions/m12.33-plan.md): the site
// navigates through `usePendingNavigation` or `PendingLink`, so the page bar
// and the skeletons follow every move. A bare `router.push`, `replace` or
// `refresh` moves the page with no signal, so a later task that adds one
// fails here, in its own diff. Next's `<Link>` is not covered.
//
// The baseline is today's offenders, counted by call. Lanes C and D move
// them onto the hook and take their entries out; a count that no longer
// matches fails too, so the list can only shrink.

const ROUTER_CALL = /\b\w*[rR]outer\.(?:push|replace|refresh)\b/g;
const MECHANISM = 'src/lib/navigation/';

/** File to the number of bare router calls it may still hold, with why. */
const BASELINE: Record<string, { calls: number; reason: string }> = {
  'src/components/ListFrame/index.tsx': {
    calls: 2,
    reason: 'owns a navigation transition; moves onto the hook',
  },
  'src/components/TabbedPage/tab-switch.tsx': {
    calls: 1,
    reason: 'owns a navigation transition; moves onto the hook',
  },
  'src/components/Modal/route-modal-provider.tsx': {
    calls: 1,
    reason: 'owns a navigation transition; moves onto the hook',
  },
  'src/components/Modal/route-modal.tsx': {
    calls: 2,
    reason: 'closes a route modal with replace and refresh',
  },
  'src/components/WorkspaceSwitcher/index.tsx': {
    calls: 1,
    reason: 'coven switch; moves onto the hook with the coven target',
  },
  'src/components/AppShell/add-ingredient-button.tsx': {
    calls: 3,
    reason: 'bare pushes after choosing a destination',
  },
  'src/components/IngredientSearch/search-box.tsx': {
    calls: 2,
    reason: 'bare pushes from the search box',
  },
  'src/components/IngredientEntry/cupboard-actions.tsx': {
    calls: 3,
    reason: 'refresh after a stock change, push to the new entry',
  },
  'src/components/IngredientEntry/entry-dialog.tsx': {
    calls: 3,
    reason: 'replace and refresh after a save or delete',
  },
  'src/components/IngredientEntry/link-to-compendium.tsx': {
    calls: 1,
    reason: 'push after linking an entry',
  },
  'src/components/CupboardEntryForm/index.tsx': { calls: 1, reason: 'refresh after a save' },
  'src/components/CreateWorkspaceForm/index.tsx': {
    calls: 2,
    reason: 'push and refresh after creating a coven',
  },
  'src/components/DeleteWorkspaceButton/index.tsx': {
    calls: 2,
    reason: 'replace and refresh after a delete',
  },
  'src/components/LeaveWorkspaceButton/index.tsx': {
    calls: 2,
    reason: 'replace and refresh after leaving',
  },
  'src/components/LeaveWorkspaceButton/owner-exit.tsx': {
    calls: 2,
    reason: 'replace and refresh after an owner leaves',
  },
  'src/components/ReceivedInvitations/accept-control.tsx': {
    calls: 2,
    reason: 'push and refresh after accepting',
  },
  'src/components/InvitationAcceptance/index.tsx': {
    calls: 1,
    reason: 'push to the landing page after accepting',
  },
  'src/components/InviteDialog/index.tsx': {
    calls: 1,
    reason: 'refresh after an invitation is sent',
  },
  'src/components/UserList/confirmed-action.tsx': {
    calls: 1,
    reason: 'refresh after a confirmed action',
  },
  'src/components/UserList/pause-control.tsx': { calls: 1, reason: 'refresh after a pause' },
  'src/app/(shell)/admin/compendium/compendium-dialog.tsx': {
    calls: 2,
    reason: 'replace and refresh after a save',
  },
};

function bareCalls(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const file of inject('repoFiles')) {
    if (!/^src\/.*\.tsx?$/.test(file) || file.startsWith(MECHANISM)) continue;
    const found = readFileSync(fromRoot(file), 'utf8').match(ROUTER_CALL)?.length ?? 0;
    if (found > 0) counts.set(file, found);
  }
  return counts;
}

describe('M12.33: the site navigates through one mechanism', () => {
  const found = bareCalls();

  it('finds the baseline calls, so a clean result is not an empty scan', () => {
    expect(found.size).toBeGreaterThan(0);
  });

  it('holds no bare router call beyond the baseline', () => {
    const extra = [...found]
      .filter(([file, calls]) => calls > (BASELINE[file]?.calls ?? 0))
      .map(([file, calls]) => `${file}: ${calls} calls, ${BASELINE[file]?.calls ?? 0} allowed`);
    expect(extra).toEqual([]);
  });

  it('lists no baseline entry that no longer matches a call', () => {
    const stale = Object.entries(BASELINE)
      .filter(([file, { calls }]) => (found.get(file) ?? 0) < calls)
      .map(([file, { calls }]) => `${file}: ${found.get(file) ?? 0} calls, ${calls} listed`);
    expect(stale).toEqual([]);
  });
});
