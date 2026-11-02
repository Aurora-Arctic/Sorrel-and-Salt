import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden } from '@/lib/errors';
import type { PageRequest } from '@/lib/types';
import {
  addSupportInternalNote,
  countSupportViews,
  listSupportRequests,
  repliesForRequests,
} from '@/modules/support';
import type { SupportView } from '@/lib/support-path';
import { A, C, D, E, F, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';

// The admin page's six views by direct call: the statuses and assignment each returns, the Needs Staff order, a curator's
// scope in the counts, and what an internal note leaves out.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate support_replies, support_timeouts, support_requests cascade`;
  await sql`delete from invitations where kind = 'card'`;
});

const PAGE: PageRequest = { limit: 101, inverted: false };
const HOUR = 3_600_000;
const ago = (hours: number) => new Date(Date.now() - hours * HOUR);

interface Seed {
  status?: 'open' | 'waiting_on_sender' | 'resolved' | 'closed';
  by?: string;
  assignedTo?: string | null;
  curatorVisible?: boolean;
  activity?: Date;
}

async function seed(subject: string, options: Seed = {}): Promise<string> {
  const by = options.by ?? C.id;
  const [row] = await sql`
    insert into support_requests ${sql({
      about: 'bug',
      subject,
      message: 'It sticks.',
      path: '',
      status: options.status ?? 'open',
      assigned_to: options.assignedTo ?? null,
      curator_visible: options.curatorVisible ?? false,
      last_sender_activity_at: options.activity ?? new Date(),
      created_by: by,
      updated_by: by,
    })} returning id`;
  return row!.id as string;
}

async function card(userId: string) {
  await sql`insert into invitations ${sql({
    token_hash: `hash-${Math.random()}`,
    kind: 'card',
    accepted_at: new Date(),
    accepted_by: userId,
    created_by: A.id,
    updated_by: A.id,
  })}`;
}

const subjectsIn = async (view: SupportView, session = asUser(E)) =>
  (await listSupportRequests(session, { view }, PAGE)).map(({ node }) => node.subject);

describe('the six views', () => {
  it('returns each its own statuses and assignment', async () => {
    await seed('open-mine', { assignedTo: E.id });
    await seed('open-other', { assignedTo: F.id });
    await seed('open-none');
    await seed('waiting', { status: 'waiting_on_sender' });
    await seed('resolved', { status: 'resolved' });
    await seed('closed', { status: 'closed' });

    expect((await subjectsIn('needs_staff')).sort()).toEqual([
      'open-mine',
      'open-none',
      'open-other',
    ]);
    expect(await subjectsIn('mine')).toEqual(['open-mine']);
    expect(await subjectsIn('unassigned')).toEqual(['open-none']);
    expect(await subjectsIn('waiting')).toEqual(['waiting']);
    expect(await subjectsIn('resolved')).toEqual(['resolved']);
    expect(await subjectsIn('closed')).toEqual(['closed']);
  });

  it('counts each view the same as its list holds', async () => {
    await seed('open-mine', { assignedTo: E.id });
    await seed('open-none');
    await seed('waiting', { status: 'waiting_on_sender' });
    await seed('closed', { status: 'closed' });

    expect(await countSupportViews(asUser(E), {})).toEqual({
      needs_staff: 2,
      mine: 1,
      unassigned: 1,
      waiting: 1,
      resolved: 0,
      closed: 1,
    });
  });

  it('counts a curator’s views over what they may read, and refuses anyone else', async () => {
    await seed('shared', { curatorVisible: true });
    await seed('assigned', { assignedTo: F.id });
    await seed('assigned-elsewhere', { assignedTo: E.id });
    await seed('hidden');
    // The precondition: an admin sees all four.
    expect((await countSupportViews(asUser(E), {})).needs_staff).toBe(4);

    const counts = await countSupportViews(asUser(F), {});
    expect(counts.needs_staff).toBe(2);
    expect(counts.mine).toBe(1);
    expect(counts.unassigned).toBe(1);
    expect(await failureOf(countSupportViews(asUser(C), {}))).toBeInstanceOf(Forbidden);
  });
});

describe('the Needs Staff order', () => {
  it('is the oldest sender activity first, whatever the sender’s tier', async () => {
    await card(D.id);
    await seed('ordinary-old', { by: C.id, activity: ago(10) });
    await seed('ordinary-older', { by: C.id, activity: ago(20) });
    await seed('beta-new', { by: D.id, activity: ago(1) });
    await seed('beta-old', { by: D.id, activity: ago(15) });

    expect(await subjectsIn('needs_staff')).toEqual([
      'ordinary-older',
      'beta-old',
      'ordinary-old',
      'beta-new',
    ]);
  });
});

describe('the beta-tester filter', () => {
  it('narrows a view to requests from beta testers, and the counts follow it', async () => {
    await card(D.id);
    await seed('beta-open', { by: D.id });
    await seed('beta-closed', { by: D.id, status: 'closed' });
    await seed('ordinary-open', { by: C.id });
    // The preconditions: both senders have requests in the view before the filter.
    expect(await subjectsIn('needs_staff')).toEqual(
      expect.arrayContaining(['beta-open', 'ordinary-open']),
    );

    const only = await listSupportRequests(
      asUser(E),
      { view: 'needs_staff', senderGroup: 'beta_tester' },
      PAGE,
    );
    expect(only.map(({ node }) => node.subject)).toEqual(['beta-open']);

    const counts = await countSupportViews(asUser(E), { senderGroup: 'beta_tester' });
    expect(counts.needs_staff).toBe(1);
    expect(counts.closed).toBe(1);
    expect((await countSupportViews(asUser(E), {})).needs_staff).toBe(2);
  });

  it('applies inside a curator’s scope', async () => {
    await card(D.id);
    await seed('beta-shared', { by: D.id, curatorVisible: true });
    await seed('beta-hidden', { by: D.id });
    await seed('ordinary-shared', { by: C.id, curatorVisible: true });

    const rows = await listSupportRequests(
      asUser(F),
      { view: 'needs_staff', senderGroup: 'beta_tester' },
      PAGE,
    );
    expect(rows.map(({ node }) => node.subject)).toEqual(['beta-shared']);
  });
});

describe('an internal note', () => {
  it('is kept from the sender, shown to staff, and leaves the status alone', async () => {
    const id = await seed('Jar');
    await addSupportInternalNote(asUser(E), id, 'Check the logs.');

    const [forSender] = await repliesForRequests(asUser(C), [id]);
    expect(forSender).toEqual([]);
    const [forStaff] = await repliesForRequests(asUser(E), [id]);
    expect(forStaff.map((reply) => reply.visibility)).toEqual(['internal']);
    expect(await subjectsIn('needs_staff')).toEqual(['Jar']);
  });
});
