import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HelpViewLink from '@/components/HelpArticleForm/view-link';

// The edit page's eye link to the row's own reader page, drawn only where that page opens: a reader finder admits a shown
// article whose guide, if it has one, is shown too, and nothing else (claude-docs/components/help-article-form.md).

const guide = { kind: 'article', audience: 'public', slug: 'testwort-basics', shown: true };

describe('HelpViewLink', () => {
  it('links a shown public guide to its page under /help', () => {
    render(<HelpViewLink article={guide} parent={null} />);

    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      '/help/testwort-basics',
    );
  });

  it('links a shown guide, which has a page of its own as an article does', () => {
    render(<HelpViewLink article={{ ...guide, kind: 'guide' }} parent={null} />);

    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      '/help/testwort-basics',
    );
  });

  it('links a shown sub page beneath its shown guide', () => {
    render(
      <HelpViewLink
        article={{ ...guide, slug: 'testwort-roots' }}
        parent={{ slug: 'testwort-basics', shown: true }}
      />,
    );

    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      '/help/testwort-basics/testwort-roots',
    );
  });

  it('links a staff guide to its page under /help/staff', () => {
    render(<HelpViewLink article={{ ...guide, audience: 'staff' }} parent={null} />);

    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      '/help/staff/testwort-basics',
    );
  });

  it('draws nothing for a hidden article, whose page is a 404', () => {
    render(<HelpViewLink article={{ ...guide, shown: false }} parent={null} />);

    expect(screen.queryByRole('link', { name: 'View' })).not.toBeInTheDocument();
  });

  it('draws nothing for a shown sub page under a hidden guide, which hides it', () => {
    render(
      <HelpViewLink
        article={{ ...guide, slug: 'testwort-roots' }}
        parent={{ slug: 'testwort-basics', shown: false }}
      />,
    );

    expect(screen.queryByRole('link', { name: 'View' })).not.toBeInTheDocument();
  });

  it('draws nothing for an FAQ entry or a glossary term, which have no page of their own', () => {
    const { rerender } = render(<HelpViewLink article={{ ...guide, kind: 'faq' }} parent={null} />);
    expect(screen.queryByRole('link', { name: 'View' })).not.toBeInTheDocument();

    rerender(<HelpViewLink article={{ ...guide, kind: 'term' }} parent={null} />);
    expect(screen.queryByRole('link', { name: 'View' })).not.toBeInTheDocument();
  });
});
