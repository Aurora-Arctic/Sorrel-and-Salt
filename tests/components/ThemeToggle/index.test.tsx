import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ThemeToggle from '@/components/ThemeToggle';

// Ported from resume-2026; the aria-label and the Tooltip wrapper changed, the
// rest carries over.
// jsdom's `matchMedia` always answers `false` — the "system asks for neither"
// case — so a light system needs a stub.
const stubLightSystemPreference = (): void => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(prefers-color-scheme: light)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('switches to light mode on click, setting the attribute and storage', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle light and dark mode' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('theme')).toBe('light');
  });

  it('switches back to dark mode on a second click, resetting the attribute', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });

  it('updates aria-pressed to reflect the current mode, light when mounted already in light mode', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    const { unmount } = render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Toggle light and dark mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    unmount();
    document.documentElement.setAttribute('data-theme', 'dark');

    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });

    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  // Three theme states, not two: dark by default, a light *system* preference
  // that never stamps `data-theme`, and a stored choice. The current theme is
  // resolved as the stylesheet resolves it: attribute, then media query, then
  // dark.
  describe('on a light system with no stored choice', () => {
    beforeEach(() => {
      document.documentElement.removeAttribute('data-theme');
      stubLightSystemPreference();
    });

    it('switches to dark on the first click, not to the light already showing', () => {
      render(<ThemeToggle />);

      fireEvent.click(screen.getByRole('button', { name: 'Toggle light and dark mode' }));

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(window.localStorage.getItem('theme')).toBe('dark');
    });

    it('reports aria-pressed as true on mount', () => {
      render(<ThemeToggle />);

      expect(screen.getByRole('button', { name: 'Toggle light and dark mode' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
  });

  // Nothing stored and no light preference is dark, so the first click goes light.
  it('switches to light on the first click when nothing is stored and the system asks for neither', () => {
    document.documentElement.removeAttribute('data-theme');
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle light and dark mode' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
