import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RoleTip from '@/components/RoleTip';

// A role's name with the tip that says what it may do (claude-docs/components/role-tip.md).

describe('RoleTip', () => {
  it('names the role, and opens a tooltip holding what the role may do when its button takes focus', () => {
    render(<RoleTip label="Fixture Keeper" description="Keeps the fixtures." emphasis />);
    expect(screen.getByText('Fixture Keeper').tagName).toBe('STRONG');
    const button = screen.getByRole('button', { name: 'About Fixture Keeper' });
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(tip).toHaveTextContent('Keeps the fixtures.');
    expect(button).toHaveAttribute('aria-describedby', tip.id);
    expect(tip).toHaveAttribute('aria-hidden', 'true');

    fireEvent.focus(button);
    expect(screen.getByRole('tooltip')).toHaveAttribute('aria-hidden', 'false');
  });

  it('draws a plain role without emphasis', () => {
    render(<RoleTip label="Fixture Reader" description="Reads the fixtures." />);
    expect(screen.getByText('Fixture Reader').tagName).toBe('SPAN');
  });
});
