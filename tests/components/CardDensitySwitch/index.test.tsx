import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CardDensitySwitch from '@/components/CardDensitySwitch';

const html = document.documentElement;

describe('CardDensitySwitch', () => {
  beforeEach(() => {
    html.removeAttribute('data-card-density');
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup(); // unmount first, so clearing the attribute reaches no mounted switch
    html.removeAttribute('data-card-density');
    vi.restoreAllMocks();
  });

  it('is on when nothing says otherwise', () => {
    render(<CardDensitySwitch />);
    expect(screen.getByRole('switch', { name: 'Compact' })).toBeChecked();
  });

  it('starts off when the page already carries a stored regular choice', () => {
    html.setAttribute('data-card-density', 'regular');
    render(<CardDensitySwitch />);
    expect(screen.getByRole('switch', { name: 'Compact' })).not.toBeChecked();
  });

  it('turning it off sets the attribute and the stored choice, and turning it on clears the attribute', () => {
    render(<CardDensitySwitch />);
    const control = screen.getByRole('switch', { name: 'Compact' });

    fireEvent.click(control);
    expect(html.getAttribute('data-card-density')).toBe('regular');
    expect(window.localStorage.getItem('card-density')).toBe('regular');

    fireEvent.click(control);
    expect(html.hasAttribute('data-card-density')).toBe(false);
    expect(window.localStorage.getItem('card-density')).toBe('compact');
  });

  it('still applies the choice for the page view when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<CardDensitySwitch />);
    fireEvent.click(screen.getByRole('switch', { name: 'Compact' }));
    expect(html.getAttribute('data-card-density')).toBe('regular');
  });

  it('follows a change made to the attribute elsewhere', async () => {
    render(<CardDensitySwitch />);
    html.setAttribute('data-card-density', 'regular');
    expect(
      await screen.findByRole('switch', { name: 'Compact', checked: false }),
    ).toBeInTheDocument();
  });
});
