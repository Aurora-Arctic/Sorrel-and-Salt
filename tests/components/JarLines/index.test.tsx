import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import JarLines from '@/components/JarLines';
import type { JarLine } from '@/components/JarLines/types';

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

  it('writes the quantity and unit', () => {
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
    expect(within(out).getByRole('button', { name: 'Out of Stock' })).toBeInTheDocument();
    expect(within(ok).queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps a jar held without a quantity, with no badge', () => {
    render(<JarLines jars={[jar({ id: 'a', form: 'resin', quantity: null, unit: null })]} />);
    expect(lines()).toHaveLength(1);
    expect(within(lines()[0]).queryByRole('button')).not.toBeInTheDocument();
  });

  it('hides the dot from assistive technology and leaves a spoken comma', () => {
    render(<JarLines jars={[jar({ id: 'a', form: 'oil' })]} />);
    expect(lines()[0].querySelector('span[aria-hidden="true"]')).toHaveTextContent('·');
    expect(lines()[0]).toHaveTextContent(',');
  });
});
