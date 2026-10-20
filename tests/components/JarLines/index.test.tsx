import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import JarLines from '@/components/JarLines';
import type { JarLine } from '@/components/JarLines/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

// The jar lines of a card (claude-docs/components/jar-lines.md). Fixture forms are invented.
const jar = (extra: Partial<JarLine> & Pick<JarLine, 'id' | 'form'>): JarLine => ({
  icon: null,
  quantity: 6,
  unit: 'g',
  threshold: 10,
  ...extra,
});

const lines = () => within(screen.getByRole('list')).getAllByRole('listitem');

describe('JarLines', () => {
  it('draws one item per jar, the form through formLabel', () => {
    render(
      <JarLines jars={[jar({ id: 'a', form: 'dried testleaf' }), jar({ id: 'b', form: 'oil' })]} />,
    );
    expect(lines()).toHaveLength(2);
    expect(lines()[0]).toHaveTextContent('Dried Testleaf');
  });

  it('writes the quantity and unit, and draws nothing for no jars', () => {
    render(<JarLines jars={[jar({ id: 'a', form: 'oil', quantity: 40, unit: 'ml' })]} />);
    expect(lines()[0]).toHaveTextContent('40 ml');
  });

  it('flags a low jar and an out jar, each on its own line, and a stocked jar not at all', () => {
    render(
      <JarLines
        jars={[
          jar({ id: 'low', form: 'one', quantity: 6 }),
          jar({ id: 'out', form: 'two', quantity: 0 }),
          jar({ id: 'ok', form: 'three', quantity: 40 }),
        ]}
      />,
    );
    const [low, out, ok] = lines();
    expect(within(low).getByRole('button', { name: /low stock/i })).toBeInTheDocument();
    expect(within(out).queryByRole('button')).not.toBeInTheDocument();
    // The badge's words are the only rendering of an out jar (rule 2's exception).
    expect(out).toHaveTextContent(/out of stock/i);
    expect(within(ok).queryByRole('button')).not.toBeInTheDocument();
    expect(ok).not.toHaveTextContent(/stock/i);
  });

  it('keeps a jar held without a quantity, with no badge', () => {
    render(<JarLines jars={[jar({ id: 'a', form: 'resin', quantity: null, unit: null })]} />);
    expect(lines()).toHaveLength(1);
    expect(within(lines()[0]).queryByRole('button')).not.toBeInTheDocument();
    expect(lines()[0]).not.toHaveTextContent(/stock/i);
  });

  it('hides the dot from assistive technology and leaves a spoken comma', () => {
    render(<JarLines jars={[jar({ id: 'a', form: 'oil' })]} />);
    expect(lines()[0].querySelector('span[aria-hidden="true"]')).toHaveTextContent('·');
    expect(lines()[0]).toHaveTextContent(',');
  });

  describe('Edit Stock', () => {
    const jars = [
      jar({ id: 'a', form: 'oil' }),
      jar({ id: 'b', form: 'dried leaf', quantity: null, unit: null }),
    ];
    const edit = { workspaceId: 'w1', ingredient: 'Rosemary' };

    it('puts an Edit button on each jar line, named for its ingredient and form', () => {
      render(<JarLines jars={jars} edit={edit} />);

      const [oil, leaf] = lines();
      expect(within(oil).getByRole('button', { name: 'Edit Stock, Rosemary, Oil' })).toBeVisible();
      expect(
        within(leaf).getByRole('button', { name: 'Edit Stock, Rosemary, Dried Leaf' }),
      ).toBeVisible();
    });

    it('draws no Edit button where it is not given the means to edit', () => {
      render(<JarLines jars={jars} />);

      expect(screen.queryByRole('button', { name: /^Edit/ })).toBeNull();
    });

    it('opens the dialog for the jar of that line only', () => {
      render(<JarLines jars={jars} edit={edit} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit Stock, Rosemary, Dried Leaf' }));

      const dialog = screen.getByRole('dialog', { name: 'Edit Stock, Rosemary, Dried Leaf' });
      expect(within(dialog).getByRole('spinbutton', { name: 'Quantity' })).toHaveValue(null);
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
    });
  });
});
