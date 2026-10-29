import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import SearchSentence from '.';

// Render-only; behaviour is asserted in tests/components/SearchSentence. Invented
// values. The search buttons stand in for a list's navigation: `pending` is
// true until the "results" come back.
const meta = {
  title: 'Ingredients / Search Sentence',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const FULL = (query: string) =>
  buildSearchSentence({
    filter: {
      query,
      categories: ['warding', 'mending'],
      forms: ['oil', 'tincture'],
      deities: ['testa'],
      zodiac: ['scorpio'],
      celestialBodies: ['sun', 'mars'],
      elements: ['water'],
      toxic: 'not_toxic',
    },
    labels: {
      categories: { warding: 'Testwarding', mending: 'Testmending' },
      forms: { oil: 'Test Oil', tincture: 'Test Tincture' },
      deities: { testa: 'Testa' },
      zodiac: { scorpio: 'Scorpio' },
      celestialBodies: { sun: 'Sun', mars: 'Mars' },
      elements: { water: 'Testwater' },
    },
    total: 12,
  });

const TERMS = ['testwort', 'fixtura', 'testmint'];

function Searching({ wait, filtered = true }: { wait: number; filtered?: boolean }) {
  const [term, setTerm] = useState(TERMS[0]!);
  const [pending, setPending] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const search = (next: string) => {
    setTerm(next);
    setPending(true);
    timer.current = window.setTimeout(() => setPending(false), wait);
  };
  const sentence = filtered
    ? FULL(term)
    : buildSearchSentence({ filter: { query: term }, total: 12 });
  return (
    <div style={{ maxWidth: '48rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn"
          disabled={pending}
          onClick={() => search(TERMS[(TERMS.indexOf(term) + 1) % TERMS.length]!)}
        >
          New Search
        </button>
        <button type="button" className="btn" disabled={pending} onClick={() => search(term)}>
          Search Again
        </button>
      </div>
      <SearchSentence sentence={sentence} query={term} pending={pending} />
    </div>
  );
}

// One control chooses the state; each starts its own search on load and the control
// remounts it (claude-docs/workshop.md, rule 5). Settled: one closed line. Slow
// Search: results return after four seconds. Fast Search: before the clauses finish
// typing. Nothing To Open: a search term and no filter, so a plain line.
const STATES: Record<string, ReactNode> = {
  Settled: <Searching wait={600} />,
  'Slow Search': <Searching wait={4000} />,
  'Fast Search': <Searching wait={600} />,
  'Nothing To Open': <Searching wait={1500} filtered={false} />,
};

export const States: Story = {
  args: { state: 'Settled' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
