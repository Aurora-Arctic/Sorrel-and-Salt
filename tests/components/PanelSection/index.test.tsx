import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PanelSection from '@/components/PanelSection';

// One section of a page drawn on a panel, named by its own heading, as the account tabs draw theirs.

describe('PanelSection', () => {
  it('is a region named by its heading, at the id a link to the section points at', () => {
    render(
      <PanelSection id="account-name" title="Name">
        <p>Form</p>
      </PanelSection>,
    );
    const region = screen.getByRole('region', { name: 'Name' });
    expect(region).toHaveAttribute('id', 'account-name');
    expect(within(region).getByRole('heading', { level: 2, name: 'Name' })).toBeInTheDocument();
    expect(within(region).getByText('Form')).toBeInTheDocument();
  });

  it('says what the section is for beneath its heading when given a lede', () => {
    render(
      <PanelSection id="account-name" title="Name" lede="The name shown for you.">
        <div />
      </PanelSection>,
    );
    expect(
      within(screen.getByRole('region', { name: 'Name' })).getByText('The name shown for you.'),
    ).toBeInTheDocument();
  });

  it('draws no lede when given none, so a form’s own status line can say it', () => {
    render(
      <PanelSection id="account-email" title="Email">
        <div />
      </PanelSection>,
    );
    expect(
      within(screen.getByRole('region', { name: 'Email' })).queryByRole('paragraph'),
    ).not.toBeInTheDocument();
  });

  it('gives two sections on one page their own names', () => {
    render(
      <>
        <PanelSection id="account-name" title="Name">
          <div />
        </PanelSection>
        <PanelSection id="account-email" title="Email">
          <div />
        </PanelSection>
      </>,
    );
    expect(screen.getByRole('region', { name: 'Name' })).toHaveAttribute('id', 'account-name');
    expect(screen.getByRole('region', { name: 'Email' })).toHaveAttribute('id', 'account-email');
  });
});
