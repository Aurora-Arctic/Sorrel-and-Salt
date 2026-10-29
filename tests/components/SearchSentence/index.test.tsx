import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSearchSentence } from '@/components/IngredientSearch/sentence';
import SearchSentence from '@/components/SearchSentence';
import type { SearchSentenceProps } from '@/components/SearchSentence/types';

// The sentence above a list that says what it is searching for: a closed
// one-line disclosure once a search has settled, typed out as the loading animation while
// one is on its way, with the finished sentence given once to a status region
// (claude-docs/components/search-sentence.md).

const sentence = (query = 'testwort') =>
  buildSearchSentence({
    filter: { query, categories: ['warding'], elements: ['water'], toxic: 'not_toxic' },
    labels: { categories: { warding: 'Testwarding' }, elements: { water: 'Testwater' } },
    total: 3,
  });

// Two categories, so the sentence holds a joining word ("and") between two values.
const joined = () =>
  buildSearchSentence({
    filter: { categories: ['warding', 'mending'] },
    labels: { categories: { warding: 'Testwarding', mending: 'Testmending' } },
    total: 3,
  });

const BARE = buildSearchSentence({ filter: {}, total: 3 });

const PROPS: SearchSentenceProps = { sentence: sentence(), query: 'testwort', pending: false };

const status = () => screen.getByRole('status');
const disclosure = (hidden = false) => screen.getByRole('group', { hidden });
const summary = () => disclosure().querySelector('summary') as HTMLElement;

// Stands the system's motion preference in: the setup reports "reduce".
function stubMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

// Time passes a frame at a time, each in its own act, so the effects a tick sets up run before the next.
function pass(ms: number) {
  for (let at = 0; at < ms; at += 16) act(() => vi.advanceTimersByTime(16));
}

describe('SearchSentence', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('gives the finished sentence to a status region, naming the search and every chosen value, with no links', () => {
    render(<SearchSentence {...PROPS} />);

    expect(status()).toHaveTextContent('testwort');
    expect(status()).toHaveTextContent('testwarding');
    expect(status()).toHaveTextContent('testwater');
    expect(within(status()).queryAllByRole('link')).toHaveLength(0);
  });

  it('is a closed disclosure, the search term in its line, that a press opens and shuts', () => {
    render(<SearchSentence {...PROPS} />);

    expect(disclosure()).not.toHaveAttribute('open');
    expect(disclosure()).toHaveTextContent('testwort');

    fireEvent.click(summary());
    expect(disclosure()).toHaveAttribute('open');

    fireEvent.click(summary());
    expect(disclosure()).not.toHaveAttribute('open');
  });

  it('is plain text, with nothing to open, when no filter is chosen', () => {
    render(<SearchSentence sentence={BARE} query="" pending={false} />);

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(within(status()).queryAllByRole('link')).toHaveLength(0);
    expect(status().textContent).not.toBe('');
  });

  it('draws its clauses in the server markup, closed, so the disclosure opens before any script runs', () => {
    const html = renderToString(<SearchSentence {...PROPS} />);

    expect(html).toContain('testwarding');
    expect(html).toContain('<details');
    expect(html).not.toMatch(/<details[^>]*\sopen/);
  });

  it('reads the joining word between two values, spaced, in the status region and the opened line', () => {
    render(<SearchSentence sentence={joined()} query="" pending={false} />);

    expect(status()).toHaveTextContent('in the testwarding and testmending categories');
    fireEvent.click(summary());
    expect(disclosure()).toHaveTextContent('in the testwarding and testmending categories');
  });

  it('types the joining word out with the rest of the sentence', () => {
    stubMotion(false);
    vi.useFakeTimers();
    const props: SearchSentenceProps = { sentence: joined(), query: '', pending: false };
    const { rerender } = render(<SearchSentence {...props} />);

    rerender(<SearchSentence {...props} pending />);
    pass(3000);

    expect(disclosure(true)).toHaveTextContent('in the testwarding and testmending categories');
    expect(status()).toBeEmptyDOMElement();
  });

  describe('while a search is on its way', () => {
    it('hides the typed line from assistive technology and holds the status region empty until the search returns', () => {
      const { rerender } = render(<SearchSentence {...PROPS} />);
      expect(status().textContent).not.toBe('');

      rerender(<SearchSentence {...PROPS} pending />);

      expect(screen.queryByRole('group')).not.toBeInTheDocument();
      expect(disclosure(true)).toHaveAttribute('aria-hidden', 'true');
      expect(status()).toBeEmptyDOMElement();
    });

    it('settles back to the closed disclosure, and gives the sentence to the status region once, when reduced motion is asked for', () => {
      vi.useFakeTimers();
      const { rerender } = render(<SearchSentence {...PROPS} />);
      const heard = new Set<string>();
      const listen = () => {
        if (status().textContent) heard.add(status().textContent as string);
      };

      rerender(<SearchSentence {...PROPS} pending />);
      pass(100);
      listen();
      expect(status()).toBeEmptyDOMElement();

      rerender(<SearchSentence {...PROPS} sentence={sentence('testwurz')} query="testwurz" />);
      for (let tick = 0; tick < 10; tick += 1) {
        pass(16);
        listen();
      }

      // No hold and no slide: the line is the settled one at once.
      expect(disclosure()).not.toHaveAttribute('open');
      expect(disclosure()).not.toHaveAttribute('aria-hidden');
      expect(disclosure()).toHaveTextContent('testwurz');
      expect(status()).toHaveTextContent('testwurz');
      expect([...heard]).toHaveLength(1);
    });

    it('types the sentence, keeps its text in view through the hold, then shuts, when motion is allowed', () => {
      stubMotion(false);
      vi.useFakeTimers();
      const { rerender } = render(<SearchSentence {...PROPS} />);

      rerender(<SearchSentence {...PROPS} pending />);
      pass(3000);
      // Still searching: typed out, open, hidden, and the status region still quiet.
      expect(disclosure(true)).toHaveAttribute('aria-hidden', 'true');
      expect(disclosure(true)).toHaveAttribute('open');
      expect(disclosure(true)).toHaveTextContent('testwarding');
      expect(status()).toBeEmptyDOMElement();

      rerender(<SearchSentence {...PROPS} />);
      pass(500);
      // The search came back: the sentence is announced while the line is still held open.
      expect(status()).toHaveTextContent('testwarding');
      expect(disclosure(true)).toHaveAttribute('open');

      // The count retyped, the hold, then the slide: the line settles closed and is readable.
      pass(3000);
      expect(disclosure()).not.toHaveAttribute('open');
      expect(disclosure()).not.toHaveAttribute('aria-hidden');
    });

    // The term the line shows at each tick, "" while it has none, each change recorded once. It
    // follows "matching " in the first line and runs up to the clauses beneath ("in the ..."), whose
    // text is in the page whole, typed or not, or to the space before the visually hidden label.
    function watchTerm(ticks: number): string[] {
      const seen: string[] = [];
      for (let tick = 0; tick < ticks; tick += 1) {
        const term =
          /matching (.*?)(?= |in the)/.exec(disclosure(true).textContent ?? '')?.[1] ?? '';
        if (seen[seen.length - 1] !== term) seen.push(term);
        pass(16);
      }
      return seen;
    }

    it('wipes the old term and types the new one a character at a time when the term changes', () => {
      stubMotion(false);
      vi.useFakeTimers();
      const { rerender } = render(<SearchSentence {...PROPS} />);

      // The list names the new term from the moment its search starts, as the filter row does.
      const next: SearchSentenceProps = {
        sentence: sentence('mossbell'),
        query: 'mossbell',
        pending: true,
      };
      rerender(<SearchSentence {...next} />);
      const seen = watchTerm(200);

      expect(seen[0]).toBe('testwort');
      expect(seen).toContain('');
      const typed = seen.slice(seen.indexOf('') + 1);
      expect(typed).toEqual(['m', 'mo', 'mos', 'moss', 'mossb', 'mossbe', 'mossbel', 'mossbell']);
    });

    it('keeps a term that did not change in view, never retyping it, while the rest of the line is retyped', () => {
      stubMotion(false);
      vi.useFakeTimers();
      const { rerender } = render(<SearchSentence {...PROPS} />);

      // The same term under another filter: only the clauses change.
      const other = buildSearchSentence({
        filter: { query: 'testwort', categories: ['mending'] },
        labels: { categories: { mending: 'Testmending' } },
        total: 3,
      });
      rerender(<SearchSentence sentence={other} query="testwort" pending />);
      const seen = watchTerm(200);

      expect(disclosure(true)).toHaveTextContent('testmending');
      expect(seen).toEqual(['testwort']);
    });

    it('switches straight to the new term, with nothing typed, when reduced motion is asked for', () => {
      vi.useFakeTimers();
      const { rerender } = render(<SearchSentence {...PROPS} />);

      const next: SearchSentenceProps = {
        sentence: sentence('mossbell'),
        query: 'mossbell',
        pending: true,
      };
      rerender(<SearchSentence {...next} />);
      const seen = watchTerm(10);
      rerender(<SearchSentence {...next} pending={false} />);
      pass(100);

      // A term is only ever whole or gone: no tick shows part of one.
      expect(seen.every((term) => ['testwort', '', 'mossbell'].includes(term))).toBe(true);
      expect(seen[seen.length - 1]).toBe('mossbell');
      expect(disclosure()).toHaveTextContent('matching mossbell');
      expect(status()).toHaveTextContent('mossbell');
    });
  });
});
