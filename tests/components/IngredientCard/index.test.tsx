import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IngredientCard from '@/components/IngredientCard';
import { StockBadge } from '@/components/StockBadge';

// M8.14 (claude-docs/components/ingredient-card.md): the card is presentational,
// so each case is its props in and what rendered out. The names, forms and
// notes are the test's own data; every badge is asserted by its presence in
// the state that shows it and its absence otherwise, never by its wording.

const HREF = '/compendium/ingredients/testwort-testalis';
const LEAF = {
  form: 'testleaf',
  formChoice: { group: { icon: 'botanical' as const } },
  safetyNotes: '',
  toxic: false,
};
const OIL = { form: 'testoil', safetyNotes: 'Fixture oil caution.', toxic: false };
const BASE = { href: HREF, label: 'Fixture Testwort', kind: 'compendium' as const };

const mark = (container: HTMLElement, name: string) => container.querySelector(`.badge--${name}`);

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

  it('shows the formal name and every form on the secondary line, an icon before each form', () => {
    const { container } = render(
      <IngredientCard {...BASE} formalName="Fixtura testalis" variants={[LEAF, OIL]} />,
    );

    const line = container.querySelector('.ingredient-card__secondary') as HTMLElement;
    expect(line).toHaveTextContent('Fixtura testalis');
    expect(line).toHaveTextContent('Testleaf');
    expect(line).toHaveTextContent('Testoil');
    const forms = line.querySelectorAll('.ingredient-card__form');
    expect(forms).toHaveLength(2);
    for (const form of forms) {
      expect(form.firstElementChild?.tagName.toLowerCase()).toBe('svg');
    }
  });

  it('leaves the secondary line out for an entry with no formal name and no forms', () => {
    const { container } = render(<IngredientCard {...BASE} formalName={null} variants={[]} />);

    expect(container.querySelector('.ingredient-card__secondary')).toBeNull();
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
      expect(mark(clean.container, 'safety')).toBeNull();
      clean.unmount();

      const entry = render(<IngredientCard {...BASE} toxic />);
      expect(mark(entry.container, 'safety')).not.toBeNull();
      entry.unmount();

      const form = render(<IngredientCard {...BASE} variants={[LEAF, { ...OIL, toxic: true }]} />);
      expect(mark(form.container, 'safety')).not.toBeNull();
    });
  });

  describe('the cupboard marks', () => {
    it("shows Local on a coven's own entry and no status", () => {
      const { container } = render(<IngredientCard {...BASE} kind="own" />);

      expect(mark(container, 'local')).not.toBeNull();
      expect(screen.queryAllByRole('status')).toHaveLength(0);
    });

    it('shows none on a compendium entry the cupboard does not hold', () => {
      const { container } = render(<IngredientCard {...BASE} kind="compendium" />);

      expect(container.querySelector('.badges')).toBeNull();
      expect(screen.queryAllByRole('status')).toHaveLength(0);
    });

    it('shows the held mark, and Annotated once a field is overridden', () => {
      const held = render(<IngredientCard {...BASE} kind="cupboard" />);
      expect(screen.getAllByRole('status')).toHaveLength(1);
      held.unmount();

      render(<IngredientCard {...BASE} kind="cupboard" annotated />);
      expect(screen.getAllByRole('status')).toHaveLength(2);
    });

    it('shows the retired mark in place of the held one', () => {
      const { container } = render(<IngredientCard {...BASE} kind="cupboard" retired />);

      expect(screen.getAllByRole('status')).toHaveLength(1);
      expect(mark(container, 'retired')).not.toBeNull();
      expect(mark(container, 'low-stock')).toBeNull();
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
      expect(within(jars).getAllByRole('button')).toHaveLength(1);
      expect(jars.querySelectorAll('.badge--out-of-stock')).toHaveLength(1);
      expect(jars.querySelectorAll('.badge')).toHaveLength(2);
    });

    it('renders nothing for the slot when the caller passes none', () => {
      const { container } = render(<IngredientCard {...BASE} />);

      expect(container.querySelector('.stock-badge')).toBeNull();
    });
  });
});
