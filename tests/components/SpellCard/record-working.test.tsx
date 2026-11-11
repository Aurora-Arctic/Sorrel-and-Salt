import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  beginPress,
  focusOn,
  pointTo,
  setReadyState,
  stubIdle,
  waitForLoads,
  watchLoads,
} from '../../support/preload';
import { renderWithQuery } from '../../support/render-with-query';

// The date field's calendar is kept out of the compendium's and a coven's first-load scripts, and starts
// loading before Record a Working opens: once the page is idle, and when a person points at, focuses or
// begins to press the card's Record a Working (claude-docs/components/spell-card.md, "Contracts").

const DATE_PICKER = ['react-day-picker', 'react-day-picker/locale'];

async function renderRecordWorking() {
  const loaded = watchLoads(DATE_PICKER);
  const { default: CardRecordWorking } = await import('@/components/SpellCard/record-working');
  renderWithQuery(
    <CardRecordWorking
      workspaceId="00000000-0000-4000-8000-000000000001"
      spellId="00000000-0000-4000-8000-000000000002"
      spellName="Fixture Working"
      spellVisibility="workspace"
      recorder={{ userId: 'u1', name: 'Testa Owner' }}
    />,
  );
  // Effects that start a load on mount have run, so an empty count below means nothing started it.
  await act(async () => {});
  return {
    loaded,
    record: screen.getByRole('button', { name: 'Record a Working of Fixture Working' }),
  };
}

describe('Record a Working on a spell card, before its dialog opens', () => {
  it('loads none of the date field at first, and starts it once the page has loaded and is idle', async () => {
    const idle = stubIdle();
    setReadyState('complete');
    const { loaded } = await renderRecordWorking();
    expect(loaded()).toEqual([]);

    idle.runIdle();
    await waitForLoads(loaded, expect.arrayContaining(['react-day-picker']));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    ['the pointer reaches', pointTo],
    ['the focus reaches', focusOn],
    ['a press begins on', beginPress],
  ])('starts loading the date field when %s Record a Working', async (_intent, intend) => {
    // The idle callback never runs, so only the intent can start the load.
    stubIdle();
    setReadyState('complete');
    const { loaded, record } = await renderRecordWorking();
    expect(loaded()).toEqual([]);

    intend(record);
    await waitForLoads(loaded, expect.arrayContaining(['react-day-picker']));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
