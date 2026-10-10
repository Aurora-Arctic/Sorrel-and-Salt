import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ForbiddenPage from '@/app/forbidden';

// Next renders this file, with a 403, wherever `forbidden()` is thrown — today
// only by the `/admin` guard (claude-docs/auth/admin-guard.md, "The admin guard").

describe('the forbidden page', () => {
  it('is the not-authorized page, inside the main landmark', () => {
    render(<ForbiddenPage />);

    expect(
      within(screen.getByRole('main')).getByRole('heading', { level: 1, name: 'Not Authorized' }),
    ).toBeInTheDocument();
  });
});
