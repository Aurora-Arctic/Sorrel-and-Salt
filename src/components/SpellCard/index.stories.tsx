import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import { route } from '../../../.storybook/route';
import SpellCard, { SpellCardFilters } from '.';
import type { SpellCardProps } from './types';
import './index.stories.scss';

// Render-only; what shows and when is asserted in tests/components/SpellCard. Recording a
// working and the More menu's writes are not answered here: their own stories answer them.
const meta = {
  title: 'Grimoire / Spell Card',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const CATEGORIES = [
  {
    category: { id: 'c1', name: 'Protection' },
    group: { colorDark: '#7aa7d9', colorLight: '#1f4f8a' },
  },
  {
    category: { id: 'c2', name: 'Clarity' },
    group: { colorDark: '#c9a3e0', colorLight: '#6b2f8a' },
  },
];

const LAST_EDIT = { by: 'Testa Fixture', at: '2026-10-20T10:00:00Z' };

const BASE = {
  id: 'story',
  title: 'Hearth Warding Jar',
  intent: 'To keep the house and everyone under its roof safe through the winter.',
  status: 'complete' as const,
  visibility: 'workspace' as const,
  categories: CATEGORIES,
};

// Everything the grimoire's list gives a member who may record, edit and delete: the title
// link, the made count, the last edit (its tip opens on hover), and the foot's Quick Look eye,
// Record a Working, the Edit pencil and the More menu, whose items are Duplicate and Delete.
const LISTED = {
  href: route('/coven/fixture-coven/grimoire/story'),
  lookHref: route('/coven/fixture-coven/grimoire?spell=story'),
  editHref: route('/coven/fixture-coven/grimoire?edit=story'),
  recordWorking: { workspaceId: 'fixture-coven', recorderId: 'u1' },
  more: {
    workspaceId: 'fixture-coven',
    covenSlug: 'fixture-coven',
    deletedHref: route('/coven/fixture-coven/grimoire'),
    canDuplicate: true,
    canDelete: true,
  },
  lastEdit: LAST_EDIT,
  workingCount: 3,
} satisfies Partial<SpellCardProps>;

// Every state of the card in one grid. The cell is the grimoire's narrowest column.
// The burn filter of the smouldering edge rides along, so hovering any card shows it.
// Held is the hovered look drawn with no pointer, for a touch screen and a still screenshot.
// The two Compact cells are the look the grimoire's Compact switch turns on: the list's
// `data-density` attribute is all it takes.
export const States: Story = {
  render: () => (
    <>
      <SpellCardFilters />
      <StatesGrid
        cell="22rem"
        states={{
          Complete: <SpellCard {...BASE} id="complete" />,
          'As Listed': <SpellCard {...BASE} {...LISTED} id="listed" />,
          'Viewer, As Listed': (
            <SpellCard
              {...BASE}
              id="viewer"
              href={LISTED.href}
              lookHref={LISTED.lookHref}
              lastEdit={LAST_EDIT}
              workingCount={1}
            />
          ),
          Draft: <SpellCard {...BASE} id="draft" status="draft" title="Dreaming Sachet" />,
          Private: <SpellCard {...BASE} id="private" visibility="private" />,
          'Private Draft': (
            <SpellCard
              {...BASE}
              id="private-draft"
              status="draft"
              visibility="private"
              title="Dreaming Sachet"
            />
          ),
          Untitled: <SpellCard {...BASE} id="untitled" status="draft" title={null} />,
          'No Intent': <SpellCard {...BASE} id="no-intent" intent={null} />,
          'No Categories': <SpellCard {...BASE} id="no-categories" categories={[]} />,
          'Made Once': <SpellCard {...BASE} id="made-once" workingCount={1} />,
          'Made Several Times': <SpellCard {...BASE} id="made-several" workingCount={3} />,
          Edited: <SpellCard {...BASE} id="edited" lastEdit={LAST_EDIT} />,
          'Heading Level 3': <SpellCard {...BASE} id="level-3" level={3} />,
          'Long Title': (
            <SpellCard
              {...BASE}
              id="long"
              title="A Very Long Spell Title for Banishing the Damp from Grandmother's Cellar"
            />
          ),
          Held: (
            <div className="spell-card-story-held">
              <SpellCard {...BASE} id="held" lastEdit={LAST_EDIT} />
            </div>
          ),
          'Hover It': <SpellCard {...BASE} id="hover" lastEdit={LAST_EDIT} />,
          Compact: (
            <div data-density="compact">
              <SpellCard {...BASE} {...LISTED} id="compact-listed" />
            </div>
          ),
          'Compact Private Draft': (
            <div data-density="compact">
              <SpellCard
                {...BASE}
                id="compact-private-draft"
                status="draft"
                visibility="private"
                title="Dreaming Sachet"
                lastEdit={LAST_EDIT}
              />
            </div>
          ),
        }}
      />
    </>
  ),
};
