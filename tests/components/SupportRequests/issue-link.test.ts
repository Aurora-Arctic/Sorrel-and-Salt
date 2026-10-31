import { describe, expect, it } from 'vitest';
import { ISSUE_REPOSITORY } from '@/modules/support/validation/support';
import {
  createIssueHref,
  ISSUE_REPOSITORY_NAME,
  issueLabel,
} from '@/components/SupportRequests/issue-link';

// Create Issue opens GitHub's new-issue page with the request written in: no token, no API call.

const REQUEST = {
  id: '0f3c1b52-8d6e-4a54-9a43-2f6f0a1d7c11',
  subject: 'The moon icon is missing',
  message: 'There is no moon on the spell page.',
  path: '/coven/[slug]/grimoire',
};

describe('createIssueHref', () => {
  it('names the repository the issue-address check accepts', () => {
    expect(ISSUE_REPOSITORY_NAME).toBe(ISSUE_REPOSITORY);
  });

  it('opens the new-issue page of that repository', () => {
    const url = new URL(createIssueHref(REQUEST));
    expect(url.origin + url.pathname).toBe(`https://github.com/${ISSUE_REPOSITORY}/issues/new`);
  });

  it('carries the subject as the title, and the message, path and request id in the body', () => {
    const url = new URL(createIssueHref(REQUEST));
    expect(url.searchParams.get('title')).toBe(REQUEST.subject);
    const body = url.searchParams.get('body') ?? '';
    expect(body).toContain(REQUEST.message);
    expect(body).toContain(REQUEST.path);
    expect(body).toContain(REQUEST.id);
  });

  it('leaves the path line out when the sender sent none', () => {
    const url = new URL(createIssueHref({ ...REQUEST, path: null }));
    expect(url.searchParams.get('body')).not.toContain('Page');
  });

  it('is built from the request alone, so a sender cannot reach it', () => {
    const request = {
      ...REQUEST,
      sender: { name: 'Ada Wortley', email: 'ada@example.test' },
    };
    const href = decodeURIComponent(createIssueHref(request).replace(/\+/g, ' '));
    expect(href).not.toContain('Ada Wortley');
    expect(href).not.toContain('ada@example.test');
  });
});

describe('issueLabel', () => {
  it('writes an issue address as repository and number', () => {
    expect(issueLabel('https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/1448')).toBe(
      'Aurora-Arctic/Sorrel-and-Salt#1448',
    );
  });

  it('gives back what it cannot read as an address', () => {
    expect(issueLabel('not an address')).toBe('not an address');
  });
});
