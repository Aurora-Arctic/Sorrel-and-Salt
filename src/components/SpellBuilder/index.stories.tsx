import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import { ShellFrame } from '../../../.storybook/shell-frame';
import { setInputValue, submitForm, useSteps } from '../../../.storybook/press';
import { Reopenable } from '../../../.storybook/reopenable';
import SpellDialog from './spell-dialog';
import type { SpellBuilderSpell } from './types';

// Render-only; behaviour is asserted in tests/components/SpellBuilder. The
// builder talks to the network only on Save, so nothing is mocked: a save in
// the workshop fails into the notice. The TanStack Query client comes from the
// workshop's global provider (.storybook/components.tsx).
const meta = {
  title: 'Grimoire / Spell Builder',
} satisfies Meta;
export default meta;
// The dropdown story's `state` arg is the node it draws (see its argTypes mapping).
type Story = StoryObj<{ state?: ReactNode }>;

const SAVED: SpellBuilderSpell = {
  id: 'fixture-spell',
  revision: 3,
  title: 'Fixture Working',
  intent: 'To see clearly',
  jarDescription: '4 oz',
  sealWaxColor: 'Blue',
  moonPhase: 'Waxing Gibbous',
  dayOfWeek: 'Monday',
  note: null,
  visibility: 'workspace',
};

// In its wide dialog over the grimoire, as the Grimoire's tabs open it under `?new=spell-<slug>` or
// `?edit=<id>` (src/components/SpellBuilder/spell-dialog.tsx), so the workshop shows
// what the app shows. Close closes it, with Open Again to look once more.
const Page = ({
  steps = [],
  spell,
}: {
  steps?: readonly (() => void)[];
  spell?: SpellBuilderSpell;
}) => {
  useSteps(steps);
  return (
    <ShellFrame area="coven" open="/coven/fixture-coven/grimoire">
      <Reopenable>
        {() => (
          <SpellDialog
            workspaceId="fixture-coven"
            covenSlug="fixture-coven"
            closeHref={'/coven/fixture-coven/grimoire' as Route}
            opened={spell ? { spell } : {}}
            canCreate
          />
        )}
      </Reopenable>
    </ShellFrame>
  );
};

const typeTitle = () => {
  const input = document.querySelector<HTMLInputElement>('input[name="title"]');
  if (input) setInputValue(input, 'Fixture Working');
};

// Turning Share With the Coven on for a private spell, which asks before it shares.
const pickCoven = () =>
  document.querySelector<HTMLInputElement>('input[name="visibility"][value="workspace"]')?.click();

const BUILDER_STATES: Record<string, ReactNode> = {
  // The usual visit: every field empty, nothing to save until one holds something.
  Empty: <Page />,
  'Title Typed': <Page steps={[typeTitle]} />,
  // A saved spell, as its Edit opens it: its values, nothing to
  // save yet. Its moon phase is one of the eight, so the box draws its icon.
  'Saved Spell': <Page spell={SAVED} />,
  // Its author alone sees it, so the visibility control is still open (M10.13);
  // the saved spell above is the coven's, its control shut with the reason.
  'Private Spell': <Page spell={{ ...SAVED, visibility: 'private' }} />,
  'Share Question': <Page spell={{ ...SAVED, visibility: 'private' }} steps={[pickCoven]} />,
  // A moon phase saved before the list existed: its words, with no icon.
  'Phase Outside the List': <Page spell={{ ...SAVED, moonPhase: 'Dark' }} />,
  // The workshop reaches no server, so the save fails into the notice.
  'Refused After Saving': <Page steps={[typeTitle, () => submitForm('form.form')]} />,
};

export const States: Story = {
  args: { state: 'Empty' },
  argTypes: {
    state: { control: 'select', options: Object.keys(BUILDER_STATES), mapping: BUILDER_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
