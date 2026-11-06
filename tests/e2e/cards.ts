import type { Page } from '@playwright/test';

/** The day Expires On opens on, 90 days from today (UTC), as the batch table's Expires column prints it: "2027-01-28". */
export function defaultExpiryDay(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 90))
    .toISOString()
    .slice(0, 10);
}

/**
 * Waits for the mint's answer and gives each card's link as the dialog draws it into a code: the site's origin, `/i/` and the token.
 * Start it before pressing Mint Cards; the tokens are answered this once.
 */
export async function mintedLinks(page: Page): Promise<string[]> {
  const response = await page.waitForResponse(
    (r) =>
      r.url().includes('/api/graphql') &&
      (r.request().postData() ?? '').includes('createInvitationCards'),
  );
  const body = (await response.json()) as {
    data: { createInvitationCards: { tokens: string[] } };
  };
  const origin = new URL(page.url()).origin;
  return body.data.createInvitationCards.tokens.map((token) => `${origin}/i/${token}`);
}
