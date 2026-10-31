import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LocalTime from '@/components/LocalTime';

const AT = new Date('2026-10-30T23:05:00.000Z');

describe('LocalTime', () => {
  it('prints the minute in the zone given and carries the full instant', () => {
    render(<LocalTime at={AT} timeZone="Asia/Tokyo" />);

    expect(screen.getByText('2026-10-31 8:05 am')).toHaveAttribute(
      'datetime',
      '2026-10-30T23:05:00.000Z',
    );
  });

  it('prints UTC on the server, whatever zone is asked for', () => {
    expect(renderToString(<LocalTime at={AT} timeZone="Asia/Tokyo" />)).toContain(
      '2026-10-30 11:05 pm',
    );
  });
});
