import type { Page } from '@playwright/test';

export interface GraphqlAnswer {
  data?: Record<string, unknown> | null;
  errors?: { message: string; extensions?: { code?: string } }[];
}

// `page.request` would not carry the session: it reaches Chromium as an extra header on the page (tests/e2e/session.ts, `holdSession`).
export async function graphqlFromPage(
  page: Page,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<GraphqlAnswer> {
  return page.evaluate(
    async ({ query, variables }) => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/graphql-response+json, application/json',
        },
        body: JSON.stringify({ query, variables }),
      });
      return (await response.json()) as GraphqlAnswer;
    },
    { query, variables },
  );
}
