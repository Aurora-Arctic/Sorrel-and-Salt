import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';
import { entryDetail } from '../../../support/entry-detail';

// The public entry page (M8.19; MB.80). The cached read and the viewer are
// mocked, since what they decide is their own tests'. Here: which outcome of
// the read becomes which response, and who is offered Edit.

const notFound = vi.fn(() => {
  throw new Error('not-found');
});
const permanentRedirect = vi.fn((_to: string) => {
  throw new Error('redirected');
});
vi.mock('next/navigation', () => ({ notFound, permanentRedirect }));

const viewerIfSignedIn = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerIfSignedIn }));

const readCompendiumEntry = vi.fn();
vi.mock('@/modules/ingredients', () => ({ readCompendiumEntry }));

const { default: Page, generateMetadata } =
  await import('@/app/(public)/compendium/ingredients/[slug]/page');

const SLUG = 'testwort-fixtura-testalis';
const params = (slug = SLUG) => ({ params: Promise.resolve({ slug }) });
const shellOf = (canCurate: boolean) => ({
  viewer: { name: 'Fixture Curator', canCurate },
  workspaces: [],
});
const entryRead = (movedAway: { name: string; slug: string } | null = null) => ({
  kind: 'entry' as const,
  detail: entryDetail(),
  movedAway,
});

const show = async () => render(await Page(params()));
const edits = () => screen.queryAllByRole('link', { name: /edit/i });

beforeEach(() => {
  vi.clearAllMocks();
  viewerIfSignedIn.mockResolvedValue(null);
  readCompendiumEntry.mockResolvedValue(entryRead());
});

describe('the compendium entry page', () => {
  it('reads the entry named by the address', async () => {
    await show();

    expect(readCompendiumEntry).toHaveBeenCalledWith(SLUG);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Testwort');
  });

  it('answers 404 when there is no such entry', async () => {
    readCompendiumEntry.mockRejectedValue(new NotFound('ingredient'));

    await expect(Page(params('nothing-here'))).rejects.toThrow('not-found');
    expect(readCompendiumEntry).toHaveBeenCalledWith('nothing-here');
    expect(notFound).toHaveBeenCalledOnce();
    expect(permanentRedirect).not.toHaveBeenCalled();
  });

  it('answers 308 to the current address when the slug has moved', async () => {
    readCompendiumEntry.mockResolvedValue({ kind: 'moved', slug: 'testwort-renamed' });

    await expect(Page(params('testwort-old'))).rejects.toThrow('redirected');
    expect(permanentRedirect).toHaveBeenCalledOnce();
    expect(permanentRedirect).toHaveBeenCalledWith('/compendium/ingredients/testwort-renamed');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('rethrows a failure that is not a missing entry', async () => {
    readCompendiumEntry.mockRejectedValue(new Error('database down'));

    await expect(Page(params())).rejects.toThrow('database down');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('offers a signed-out visitor no Edit', async () => {
    await show();

    expect(viewerIfSignedIn).toHaveBeenCalled();
    expect(edits()).toHaveLength(0);
  });

  it('offers a signed-in viewer who cannot curate no Edit', async () => {
    viewerIfSignedIn.mockResolvedValue(shellOf(false));
    await show();

    expect(edits()).toHaveLength(0);
  });

  it('offers a curator Edit, to the admin screen on this entry', async () => {
    viewerIfSignedIn.mockResolvedValue(shellOf(true));
    await show();

    const [link] = edits();
    const target = new URL(link!.getAttribute('href')!, 'http://fixture.test');
    expect(edits()).toHaveLength(1);
    expect(target.pathname).toBe('/admin/compendium');
    expect(target.searchParams.get('edit')).toBe(SLUG);
  });

  it('links the entry an old address now points at', async () => {
    readCompendiumEntry.mockResolvedValue(entryRead({ name: 'Oldwort', slug: 'testwort-old' }));
    await show();

    expect(screen.getByRole('status')).toHaveTextContent('Oldwort');
    expect(screen.getByRole('link', { name: 'Oldwort' })).toHaveAttribute(
      'href',
      '/compendium/ingredients/testwort-old',
    );
  });
});

describe('the compendium entry page title', () => {
  it('is the entry name alone', async () => {
    expect(await generateMetadata(params())).toEqual({ title: 'Testwort' });
  });

  it('is empty for an address that renders no page', async () => {
    readCompendiumEntry.mockResolvedValue({ kind: 'moved', slug: 'testwort-renamed' });
    expect(await generateMetadata(params())).toEqual({});

    readCompendiumEntry.mockRejectedValue(new NotFound('ingredient'));
    expect(await generateMetadata(params())).toEqual({});
  });
});
