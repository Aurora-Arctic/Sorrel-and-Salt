import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { usePlainProblems } from '../../../src/components/Field';
import type { Failure } from '../../../src/lib/types';

const ORDER = ['first', 'second'] as const;

function Form({ failure = {} }: { failure?: Failure }) {
  const { formRef, shown, edited, refuse } = usePlainProblems(ORDER, failure, {});
  return (
    <form ref={formRef}>
      <input name="first" aria-label="First" onChange={() => edited('first')} />
      <input name="second" aria-label="Second" />
      <p>{shown.first}</p>
      <p>{shown.second}</p>
      <button
        type="button"
        onClick={() => refuse({ second: 'Second is wrong', first: 'First is wrong' })}
      >
        Refuse
      </button>
      <button type="button" onClick={() => refuse({})}>
        Accept
      </button>
    </form>
  );
}

describe('usePlainProblems', () => {
  it('shows what was found and focuses the first field in order', async () => {
    render(<Form />);
    await userEvent.click(screen.getByRole('button', { name: 'Refuse' }));
    expect(screen.getByText('First is wrong')).toBeInTheDocument();
    expect(screen.getByText('Second is wrong')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'First' })).toHaveFocus();
  });

  it('clears a problem when its field is edited', async () => {
    render(<Form />);
    await userEvent.click(screen.getByRole('button', { name: 'Refuse' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'First' }), 'a');
    expect(screen.queryByText('First is wrong')).not.toBeInTheDocument();
    expect(screen.getByText('Second is wrong')).toBeInTheDocument();
  });

  it('answers whether anything was found, and clears the problems when nothing was', async () => {
    render(<Form />);
    await userEvent.click(screen.getByRole('button', { name: 'Refuse' }));
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(screen.queryByText('First is wrong')).not.toBeInTheDocument();
  });

  it('shows and focuses the field the server refused', () => {
    render(<Form failure={{ field: { name: 'second', message: 'Taken' } }} />);
    expect(screen.getByText('Taken')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Second' })).toHaveFocus();
  });
});
