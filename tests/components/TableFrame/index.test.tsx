import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TableFrame from '@/components/TableFrame';

// The one frame a sideways-scrolling table sits in: a keyboard user reaches it to scroll it, and hears its name.

describe('TableFrame', () => {
  it('is a named region that takes a Tab stop, holding the table', () => {
    render(
      <TableFrame label="Testwort Measures">
        <table>
          <tbody>
            <tr>
              <td>Testwort</td>
            </tr>
          </tbody>
        </table>
      </TableFrame>,
    );

    const frame = screen.getByRole('region', { name: 'Testwort Measures' });
    expect(frame).toHaveAttribute('tabindex', '0');
    expect(within(frame).getByRole('table')).toBeInTheDocument();
  });
});
