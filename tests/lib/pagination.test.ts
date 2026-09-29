import { describe, expect, it } from 'vitest';
import { InvalidCursor } from '@/lib/errors';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type PageEntry,
  type PageRequest,
  decodeCursor,
  encodeCursor,
  pageSize,
  resolvePage,
} from '@/lib/pagination';

const ID = '0f9c2b1e-6a51-4c3f-9d7e-2b8a4e1c5d60';

/** `count` rows keyed `k000`, `k001`, …, as a repository page would return them. */
function rows(count: number, from = 0): PageEntry<{ n: number }>[] {
  return Array.from({ length: count }, (_, index) => {
    const n = from + index;
    return { cursor: { key: [`k${String(n).padStart(3, '0')}`], id: ID }, node: { n } };
  });
}

describe('page size', () => {
  it('is 25 when the client names none', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(25);
    expect(pageSize({})).toBe(25);
  });

  it('is what the client asked for, up to 100', () => {
    expect(MAX_PAGE_SIZE).toBe(100);
    expect(pageSize({ first: 1 })).toBe(1);
    expect(pageSize({ first: 100 })).toBe(100);
    expect(pageSize({ last: 40 })).toBe(40);
  });

  // Silently: the clamp is an answer, not a refusal.
  it('is 100 when the client asks for more, without an error', () => {
    expect(pageSize({ first: 101 })).toBe(100);
    expect(pageSize({ first: 10_000 })).toBe(100);
    expect(pageSize({ last: 10_000 })).toBe(100);
  });

  it('refuses a negative size', () => {
    expect(() => pageSize({ first: -1 })).toThrow(/non-negative/);
    expect(() => pageSize({ last: -1 })).toThrow(/non-negative/);
  });
});

describe('cursor', () => {
  it('round-trips a sort key and an id', () => {
    const cursor = { key: ['2026-09-27 02:46:12.457123+00'], id: ID };

    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it('round-trips a key of several parts, in order', () => {
    const cursor = { key: ['-0.6666667', "Cat's Claw"], id: ID };

    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it('encodes the sort key and id and nothing positional', () => {
    const decoded: unknown = JSON.parse(
      Buffer.from(encodeCursor({ key: ['Testwort'], id: ID }), 'base64url').toString('utf8'),
    );

    expect(decoded).toEqual({ k: ['Testwort'], i: ID });
  });

  it('refuses a cursor that is not one of its own', () => {
    const forged = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

    for (const cursor of [
      '',
      'not base64 at all!',
      Buffer.from('OffsetConnection:25').toString('base64'),
      forged(25),
      forged(null),
      forged({ k: ['Testwort'] }),
      forged({ k: ['Testwort'], i: 7 }),
      forged({ k: ['Testwort'], i: '' }),
      // The single-part shape before MB.104, a key with no parts, and a part that is not text.
      forged({ k: 'Testwort', i: ID }),
      forged({ k: [], i: ID }),
      forged({ k: ['Testwort', 7], i: ID }),
      forged({ k: ['Testwort', null], i: ID }),
    ]) {
      expect(() => decodeCursor(cursor), cursor).toThrow(InvalidCursor);
    }
  });
});

describe('resolvePage', () => {
  it('asks for one row more than the page, so the extra says whether another follows', async () => {
    let asked: PageRequest | undefined;
    await resolvePage({ first: 10 }, (request) => {
      asked = request;
      return rows(0);
    });

    expect(asked).toEqual({ limit: 11, inverted: false });
  });

  it('asks for 101 at most, whatever the client named', async () => {
    let asked: PageRequest | undefined;
    await resolvePage({ first: 10_000 }, (request) => {
      asked = request;
      return rows(0);
    });

    expect(asked?.limit).toBe(MAX_PAGE_SIZE + 1);
  });

  it('trims the extra row and reports the next page', async () => {
    const page = await resolvePage({ first: 3 }, () => rows(4));

    expect(page.edges.map((edge) => edge.node.n)).toEqual([0, 1, 2]);
    expect(page.pageInfo).toMatchObject({ hasNextPage: true, hasPreviousPage: false });
    expect(decodeCursor(page.pageInfo.endCursor as string)).toEqual({ key: ['k002'], id: ID });
  });

  it('reports the last page when no extra row came back', async () => {
    const page = await resolvePage({ first: 3 }, () => rows(2));

    expect(page.edges).toHaveLength(2);
    expect(page.pageInfo.hasNextPage).toBe(false);
  });

  it('decodes `after` for the fetch, and never passes the raw string on', async () => {
    let asked: PageRequest | undefined;
    const after = encodeCursor({ key: ['k002'], id: ID });
    const page = await resolvePage({ first: 3, after }, (request) => {
      asked = request;
      return rows(1, 3);
    });

    expect(asked).toEqual({ after: { key: ['k002'], id: ID }, limit: 4, inverted: false });
    expect(page.pageInfo.hasPreviousPage).toBe(true);
  });

  // Walking backwards the fetch returns nearest-first; the page reads in order.
  it('reverses an inverted page back into sort order', async () => {
    let asked: PageRequest | undefined;
    const before = encodeCursor({ key: ['k010'], id: ID });
    const page = await resolvePage({ last: 3, before }, (request) => {
      asked = request;
      return rows(4, 6).reverse();
    });

    expect(asked).toMatchObject({ before: { key: ['k010'], id: ID }, limit: 4, inverted: true });
    expect(page.edges.map((edge) => edge.node.n)).toEqual([7, 8, 9]);
    expect(page.pageInfo).toMatchObject({ hasNextPage: true, hasPreviousPage: true });
  });

  it('carries what an entry holds beside its cursor and node onto the edge', async () => {
    const page = await resolvePage({ first: 2 }, () =>
      rows(2).map((entry) => ({ ...entry, score: entry.node.n / 10 })),
    );

    expect(page.edges.map(({ node, score }) => [node.n, score])).toEqual([
      [0, 0],
      [1, 0.1],
    ]);
    expect(typeof page.edges[0].cursor).toBe('string');
  });

  it('refuses a malformed cursor before fetching anything', async () => {
    let fetched = false;
    const attempt = resolvePage({ after: 'garbage' }, () => {
      fetched = true;
      return rows(0);
    });

    await expect(attempt).rejects.toThrow(InvalidCursor);
    expect(fetched).toBe(false);
  });

  it('gives an empty page null cursors', async () => {
    const page = await resolvePage({}, () => rows(0));

    expect(page.edges).toEqual([]);
    expect(page.pageInfo).toEqual({
      startCursor: null,
      endCursor: null,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
});
