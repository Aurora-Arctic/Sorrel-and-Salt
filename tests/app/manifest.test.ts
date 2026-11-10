import { describe, expect, it } from 'vitest';
import manifest from '@/app/manifest';
import { SITE_NAME } from '@/lib/site';

describe('web app manifest', () => {
  it('names the site in full, short name included', () => {
    expect(manifest()).toMatchObject({ name: SITE_NAME, short_name: SITE_NAME, start_url: '/' });
  });
});
