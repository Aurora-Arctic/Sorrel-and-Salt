import { describe, expect, it } from 'vitest';
import { untilSessionLookupsAnswer } from './e2e/database';

// After a reclone the slot server's postgres pool can hold a failed connect and refuse every query until its
// reconnect backoff runs out, up to 20 s, so the warm-up has to outwait that rather than give up after a few bursts.

const SERVER = 'http://localhost:8999';
const LOOKUP_MS = 20;

/** A clock that only moves when a lookup takes time or the warm-up sleeps. */
function fakeClock() {
  let now = 0;
  const clock = {
    sleeps: 0,
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
    sleep: async (ms: number) => {
      clock.sleeps++;
      now += ms;
    },
  };
  return clock;
}

/** A slot server that answers 500 until `recoversAt` on the fake clock, then 200. */
function server(clock: ReturnType<typeof fakeClock>, recoversAt: number) {
  let calls = 0;
  const request = async () => {
    calls++;
    clock.advance(LOOKUP_MS);
    return new Response(null, { status: clock.now() < recoversAt ? 500 : 200 });
  };
  return { request, calls: () => calls };
}

describe('untilSessionLookupsAnswer', () => {
  it('outwaits a server that fails every lookup for 16 s, then answers', async () => {
    const clock = fakeClock();
    const slot = server(clock, 16_000);

    await expect(untilSessionLookupsAnswer(SERVER, slot.request, clock)).resolves.toBeUndefined();

    // Preconditions: the server did fail first, and the wait reached past its recovery.
    expect(clock.now()).toBeGreaterThanOrEqual(16_000);
    expect(clock.sleeps).toBeGreaterThan(0);
  });

  it('gives up once its deadline, past the pool backoff cap of 20 s, has gone by', async () => {
    const clock = fakeClock();
    const slot = server(clock, Number.POSITIVE_INFINITY);

    await expect(untilSessionLookupsAnswer(SERVER, slot.request, clock)).rejects.toThrow(Error);

    expect(clock.now()).toBeGreaterThan(20_000);
    expect(clock.now()).toBeLessThan(40_000);
  });

  it('returns at once when the first burst answers', async () => {
    const clock = fakeClock();
    const slot = server(clock, 0);

    await untilSessionLookupsAnswer(SERVER, slot.request, clock);

    expect(slot.calls()).toBe(10);
    expect(clock.sleeps).toBe(0);
  });
});
