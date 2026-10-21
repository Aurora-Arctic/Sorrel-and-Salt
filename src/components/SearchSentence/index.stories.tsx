import type { Story } from '@ladle/react';
import { useEffect, useRef, useState } from 'react';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import SearchSentence from '.';

// Render-only; behaviour is asserted in tests/components/SearchSentence. Invented
// values (M12.4). The search buttons stand in for a list's navigation: `pending` is
// true until the "results" come back.
export default {
  title: 'Admin / Search Sentence',
};

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

// Settled: one closed line; press it to open the clauses.
export const Settled: Story = () => <Searching wait={600} />;

// New Search types the sentence out; the results come back after four seconds.
export const SlowSearch: Story = () => <Searching wait={4000} />;

// The results come back before the clauses are typed: they finish at a faster pace.
export const FastSearch: Story = () => <Searching wait={600} />;

// A search term and no filter: nothing to open, so a plain line.
export const NothingToOpen: Story = () => <Searching wait={1500} filtered={false} />;
