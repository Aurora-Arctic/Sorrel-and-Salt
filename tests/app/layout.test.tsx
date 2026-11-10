import { describe, expect, it, vi } from 'vitest';
import { SITE_NAME, SITE_TITLE_NAME } from '@/lib/site';

// next/font is a build-time transform Vitest does not run.
vi.mock('@/app/fonts', () => ({ body: { variable: '' }, display: { variable: '' } }));

const { metadata } = await import('@/app/layout');

describe('root layout metadata', () => {
  it('names the application with the site name', () => {
    expect(metadata.applicationName).toBe(SITE_NAME);
  });

  it('titles a page with the site title name, alone or after the page’s own title', () => {
    expect(metadata.title).toEqual({
      default: SITE_TITLE_NAME,
      template: `%s | ${SITE_TITLE_NAME}`,
    });
  });
});
