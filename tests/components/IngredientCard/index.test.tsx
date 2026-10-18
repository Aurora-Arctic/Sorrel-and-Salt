import type { Route } from 'next';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IngredientCard from '@/components/IngredientCard';
import { StockBadge } from '@/components/StockBadge';

// M8.14 (claude-docs/components/ingredient-card.md): the card is presentational,
// so each case is its props in and what rendered out. The names, forms and
// notes are the test's own data. Marks are found by their exact text and
// asserted by presence or absence, never by what the words say.

const HREF = '/compendium/ingredients/testwort-testalis' as Route;
const LEAF = {
  form: 'testleaf',
  formChoice: { group: { icon: 'botanical' as const } },
  safetyNotes: '',
  toxic: false,
};
const OIL = { form: 'testoil', safetyNotes: 'Fixture oil caution.', toxic: false };
const ROOT = { form: 'testroot', safetyNotes: '', toxic: false };
const BASE = { href: HREF, label: 'Fixture Testwort', kind: 'compendium' as const };

const toxicMark = () => screen.queryByText('Toxic', { exact: true });
const localMark = () => screen.queryByText('Local', { exact: true });
const heldMark = () => screen.queryByText('From the Compendium', { exact: true });
const retiredMark = () => screen.queryByText('No Longer in the Compendium', { exact: true });

describe('IngredientCard', () => {
  it('has one link, the name, to the entry page', () => {
    render(<IngredientCard {...BASE} formalName="Fixtura testalis" variants={[LEAF, OIL]} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Fixture Testwort');
    expect(links[0]).toHaveAttribute('href', HREF);
  });

  it('names the card by the heading holding the link, at the level asked', () => {
    render(<IngredientCard {...BASE} level={3} />);

    expect(screen.getByRole('heading', { level: 3 })).toContainElement(screen.getByRole('link'));
  });

  // The icon before each form is aria-hidden, so the role tree cannot see it;
  // FormIcon's own tests cover which icon draws.
  it('shows the formal name and every form on the secondary line', () => {
    render(<IngredientCard {...BASE} formalName="Fixtura testalis" variants={[LEAF, ROOT]} />);

    expect(screen.getByText('Fixtura testalis')).toBeInTheDocument();
    expect(screen.getByText('Testleaf')).toBeInTheDocument();
    expect(screen.getByText('Testroot')).toBeInTheDocument();
  });

  it('separates the items with a dot hidden from assistive technology', () => {
    render(<IngredientCard {...BASE} formalName="Fixtura testalis" variants={[LEAF, ROOT]} />);

    // Three items, two separators.
    const dots = screen.getAllByText(/·/);
    expect(dots).toHaveLength(2);
    for (const dot of dots) expect(dot).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows no formal name and no forms for an entry with neither', () => {
    render(<IngredientCard {...BASE} formalName={null} variants={[]} />);

    expect(screen.queryByText('Fixtura testalis')).toBeNull();
    expect(screen.queryByText('Testleaf')).toBeNull();
  });

  describe('safety', () => {
    it('shows the caution when the ingredient or a listed form has notes, and not otherwise', () => {
      const none = render(<IngredientCard {...BASE} variants={[LEAF]} />);
      expect(screen.queryByRole('region')).toBeNull();
      none.unmount();

      const own = render(<IngredientCard {...BASE} safetyNotes="Fixture caution." />);
      expect(screen.getByRole('region')).toHaveTextContent('Fixture caution.');
      own.unmount();

      render(<IngredientCard {...BASE} variants={[OIL]} />);
      expect(screen.getByRole('region')).toHaveTextContent('Fixture oil caution.');
    });

    it('sets the caution one heading level below the name', () => {
      render(<IngredientCard {...BASE} level={2} safetyNotes="Fixture caution." />);

      expect(screen.getByRole('region')).toContainElement(
        screen.getByRole('heading', { level: 3 }),
      );
    });

    it('shows the toxic mark for the entry or any listed form, and not otherwise', () => {
      const clean = render(<IngredientCard {...BASE} variants={[LEAF]} />);
      expect(toxicMark()).toBeNull();
      clean.unmount();

      const entry = render(<IngredientCard {...BASE} toxic />);
      expect(toxicMark()).toBeInTheDocument();
      entry.unmount();

      render(<IngredientCard {...BASE} variants={[LEAF, { ...OIL, toxic: true }]} />);
      expect(toxicMark()).toBeInTheDocument();
    });
  });

  describe('the cupboard marks', () => {
    it("shows Local on a coven's own entry and no status", () => {
      render(<IngredientCard {...BASE} kind="own" />);

      expect(localMark()).toBeInTheDocument();
      expect(screen.queryAllByRole('status')).toHaveLength(0);
    });

    it('shows none on a compendium entry the cupboard does not hold', () => {
      render(<IngredientCard {...BASE} kind="compendium" />);

      expect(localMark()).toBeNull();
      expect(heldMark()).toBeNull();
      expect(retiredMark()).toBeNull();
      expect(toxicMark()).toBeNull();
      expect(screen.queryAllByRole('status')).toHaveLength(0);
    });

    it('shows the held mark, and Annotated once a field is overridden', () => {
      const held = render(<IngredientCard {...BASE} kind="cupboard" />);
      expect(heldMark()).toBeInTheDocument();
      expect(screen.getAllByRole('status')).toHaveLength(1);
      held.unmount();

      render(<IngredientCard {...BASE} kind="cupboard" annotated />);
      expect(screen.getAllByRole('status')).toHaveLength(2);
    });

    it('shows the retired mark in place of the held one', () => {
      render(<IngredientCard {...BASE} kind="cupboard" retired />);

      expect(screen.getAllByRole('status')).toHaveLength(1);
      expect(retiredMark()).toBeInTheDocument();
      expect(heldMark()).toBeNull();
    });
  });

  describe('the jar-line slot', () => {
    it('renders what the caller passes, M9.8 stock badges included, inside the card', () => {
      render(
        <IngredientCard {...BASE} kind="own">
          <ul aria-label="Jars">
            <li>
              <StockBadge quantity={6} threshold={10} unit="g" />
            </li>
            <li>
              <StockBadge quantity={0} threshold={10} unit="g" />
            </li>
            <li>
              <StockBadge quantity={50} threshold={10} unit="g" />
            </li>
          </ul>
        </IngredientCard>,
      );

      const jars = screen.getByRole('list', { name: 'Jars' });
      // Low is a button, Out is plain text, and a healthy jar draws nothing.
      expect(within(jars).getAllByRole('button', { name: /^Low Stock/ })).toHaveLength(1);
      expect(within(jars).getAllByText('Out of Stock')).toHaveLength(1);
    });

    it('renders nothing for the slot when the caller passes none', () => {
      render(<IngredientCard {...BASE} />);

      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByText('Out of Stock')).toBeNull();
    });
  });
});
