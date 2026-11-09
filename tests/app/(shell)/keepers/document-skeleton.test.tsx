import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ href: undefined as string | undefined }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/keepers/documents/privacy',
}));
vi.mock('@/lib/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation')>()),
  useNavigationState: () => ({ busy: true, href: navigation.href }),
}));

const { KeepersDocumentSkeleton } = await import('@/app/(shell)/keepers/skeleton');

function currentTab(): string | null {
  const tabs = screen.getByRole('navigation', { name: /documents/i });
  return within(tabs).queryByRole('link', { current: 'page' })?.textContent ?? null;
}

describe('the keepers’ document skeleton', () => {
  it.each([
    ['/keepers/documents/about', 'About Us'],
    ['/keepers/documents/privacy', 'Privacy Policy'],
    ['/keepers/documents/code-of-ethics', 'Code of Ethics'],
    ['/keepers/documents/terms?x=1', 'Terms of Use'],
  ])('opens the tab of the document being navigated to, %s', (href, label) => {
    navigation.href = href;
    render(<KeepersDocumentSkeleton />);

    expect(currentTab()).toBe(label);
  });
});
