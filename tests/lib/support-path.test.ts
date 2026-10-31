import { describe, expect, it } from 'vitest';
import {
  ISSUE_REPOSITORY,
  SUPPORT_ABOUTS,
  errorCodeOf,
  errorReferenceOf,
  normaliseIssueLink,
  supportAboutOf,
  supportClosedHref,
  supportHref,
} from '@/lib/support-path';
import { supportRequestAbout } from '@/modules/support/schema/support-requests';

describe('supportAboutOf', () => {
  it('reads each about', () => {
    for (const { value } of SUPPORT_ABOUTS) expect(supportAboutOf(value)).toBe(value);
  });

  it('names nothing for a bare, missing or unknown value', () => {
    expect(supportAboutOf('')).toBeUndefined();
    expect(supportAboutOf(null)).toBeUndefined();
    expect(supportAboutOf('billing')).toBeUndefined();
  });
});

describe('errorCodeOf', () => {
  it('reads a three-digit status', () => {
    expect(errorCodeOf('404')).toBe(404);
    expect(errorCodeOf('500')).toBe(500);
  });

  it('refuses anything that is not a status', () => {
    for (const value of [null, '', '4', '40404', '99', '600', '4o4', '-404', '404 ']) {
      expect(errorCodeOf(value)).toBeUndefined();
    }
  });
});

describe('supportHref and supportClosedHref', () => {
  it('opens the dialog over the page and keeps its other parameters', () => {
    expect(supportHref('/coven/x', new URLSearchParams('page=2'), 'bug', 404)).toBe(
      '/coven/x?page=2&support=bug&error=404',
    );
  });

  it('carries no error when none is given, and drops a stale one', () => {
    expect(supportHref('/a', new URLSearchParams('error=500'), 'question')).toBe(
      '/a?support=question',
    );
  });

  it('closes by dropping its own parameters only', () => {
    expect(supportClosedHref('/a', new URLSearchParams('page=2&support=bug&error=404'))).toBe(
      '/a?page=2',
    );
    expect(supportClosedHref('/a', new URLSearchParams('support=bug'))).toBe('/a');
  });
});

describe('SUPPORT_ABOUTS', () => {
  it('offers exactly the values the database enum holds, in its order', () => {
    expect(SUPPORT_ABOUTS.map((about) => about.value)).toEqual(supportRequestAbout.enumValues);
  });
});

describe('errorReferenceOf', () => {
  it('reads a digest and refuses a blank or overlong one', () => {
    expect(errorReferenceOf('abc123')).toBe('abc123');
    expect(errorReferenceOf('  ')).toBeUndefined();
    expect(errorReferenceOf(null)).toBeUndefined();
    expect(errorReferenceOf('x'.repeat(101))).toBeUndefined();
  });

  it('is dropped with the other support parameters when the dialog closes', () => {
    expect(supportClosedHref('/x', new URLSearchParams('support=bug&error=500&ref=abc'))).toBe(
      '/x',
    );
  });
});

describe('normaliseIssueLink', () => {
  const plain = 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/1409';

  it('keeps an issue link as it is', () => {
    expect(normaliseIssueLink(` ${plain} `, ISSUE_REPOSITORY)).toBe(plain);
  });

  it('turns a project-board link into the plain issue link', () => {
    const board =
      'https://github.com/orgs/Aurora-Arctic/projects/1/views/1?pane=issue&itemId=289423269&issue=Aurora-Arctic%7CSorrel-and-Salt%7C1409';
    expect(normaliseIssueLink(board, ISSUE_REPOSITORY)).toBe(plain);
  });

  it('refuses anything else', () => {
    for (const bad of [
      '',
      'not a link',
      'https://github.com/Aurora-Arctic/Other/issues/1',
      'https://github.com/Aurora-Arctic/Sorrel-and-Salt/pull/1',
      'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/1/../../x',
      'https://github.com/orgs/Aurora-Arctic/projects/1/views/1?issue=Aurora-Arctic%7COther%7C1',
      'https://github.com/orgs/Aurora-Arctic/projects/1/views/1?issue=Aurora-Arctic%7CSorrel-and-Salt%7Cx',
      'https://github.com/orgs/Aurora-Arctic/projects/1/views/1',
      'https://example.com/orgs/Aurora-Arctic/projects/1/views/1?issue=Aurora-Arctic%7CSorrel-and-Salt%7C1',
    ]) {
      expect(normaliseIssueLink(bad, ISSUE_REPOSITORY), bad).toBeNull();
    }
  });
});
