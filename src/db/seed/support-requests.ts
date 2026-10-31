import { eq, inArray } from 'drizzle-orm';
import { supportReplies } from '../../modules/support/schema/support-replies';
import { supportRequests } from '../../modules/support/schema/support-requests';
import { supportTimeouts } from '../../modules/support/schema/support-timeouts';
import { users } from '../../modules/identity/schema/users';
import { insertStamped } from './idempotent';
import { FIXTURE_USERS } from './standard';
import type { InsertStamps, SeedTransaction } from './types';

// Fake support requests for the `demo` scenario, so the admin Support tab, the account's own requests and the time-out display
// have rows to show. Never in `standard` (cloned for every db test) nor in a reference seed (those run on staging and production).
// Read state does not exist yet, so no reply is marked unread.

const DAY = 24 * 60 * 60 * 1000;
const ISSUES = 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues';

const { A, B, C, D, E, F } = FIXTURE_USERS;

interface SeedRequest {
  id: string;
  sender: string;
  about: 'accessibility' | 'bug' | 'account' | 'compendium' | 'privacy' | 'feedback' | 'question';
  subject: string;
  message: string;
  path: string;
  errorCode?: number;
  /** The error page's digest. */
  errorReference?: string;
  assignedTo?: string;
  /** Shared with the curators. */
  curatorVisible?: boolean;
  issueNumber?: number;
  /** Who resolved it, and how many days before the first run. */
  resolved?: { by: string; daysAgo: number };
  /** Days before the first run: negative is in the past. */
  daysAgo: number;
}

const SUPPORT_REQUESTS: readonly SeedRequest[] = [
  {
    id: '00000000-0000-0000-0005-000000000001',
    sender: A.id,
    about: 'compendium',
    subject: 'Can I add an ingredient that is not in the compendium?',
    message:
      'I grow a few herbs that I cannot find in the compendium. Can I add my own to my coven, or do I have to ask someone to add them first?',
    path: '/compendium',
    daysAgo: 0.2,
  },
  {
    id: '00000000-0000-0000-0005-000000000002',
    sender: B.id,
    about: 'bug',
    subject: 'Ingredients page shows an error and will not load',
    message:
      "I opened my coven's Ingredients page and got a blank page with a server error (500) instead of the list. I reloaded it several times over a few minutes and it fails every time. It worked yesterday.",
    path: '/coven/[coven]/ingredients',
    errorCode: 500,
    daysAgo: 0.9,
  },
  {
    id: '00000000-0000-0000-0005-000000000003',
    sender: C.id,
    about: 'feedback',
    subject: 'Suggestion: spell status chips could say more than colour',
    message:
      'I have trouble with colours, and the Draft and Complete chips on the grimoire look the same to me. Could they say more than colour does?',
    path: '/coven/[coven]/grimoire',
    assignedTo: E.id,
    daysAgo: 1.7,
  },
  {
    id: '00000000-0000-0000-0005-000000000004',
    sender: D.id,
    about: 'account',
    subject: 'Why was my invitation not accepted?',
    message:
      'Someone sent me an invitation to their coven but the link says it cannot be used. I signed in with the same email address it was sent to.',
    path: '/account',
    assignedTo: F.id,
    curatorVisible: true,
    daysAgo: 2.4,
  },
  {
    id: '00000000-0000-0000-0005-000000000005',
    sender: A.id,
    about: 'bug',
    subject: 'Jar quantity goes back after I save it',
    message:
      'I change the amount in a jar from 40 g to 25 g and press Save. It says saved, but when I reload the page it shows 40 g again.',
    path: '/coven/[coven]/ingredients',
    assignedTo: E.id,
    issueNumber: 1301,
    daysAgo: 4.1,
  },
  {
    id: '00000000-0000-0000-0005-000000000006',
    sender: B.id,
    about: 'accessibility',
    subject: 'Cannot reach the compendium filters with the keyboard',
    message:
      'I use the keyboard only. On the compendium page, pressing Tab skips past the filters and I cannot open them, so I cannot narrow the list down.',
    path: '/compendium',
    assignedTo: E.id,
    issueNumber: 1288,
    resolved: { by: E.id, daysAgo: 3 },
    daysAgo: 8.3,
  },
  {
    id: '00000000-0000-0000-0005-000000000007',
    sender: C.id,
    about: 'question',
    subject: 'How do I change my display name?',
    message: 'My name on the members page has a typo in it. Where do I fix it?',
    path: '/coven/[coven]/members',
    assignedTo: F.id,
    curatorVisible: true,
    resolved: { by: F.id, daysAgo: 6 },
    daysAgo: 10.6,
  },
  {
    id: '00000000-0000-0000-0005-000000000008',
    sender: D.id,
    about: 'bug',
    subject: 'Coven page shows not found although I am signed in',
    message:
      "I followed the link to my coven's home page from the My Covens list. I am signed in and a member, but the page says not found (404). Other pages in the coven open normally.",
    path: '/coven/[coven]',
    errorCode: 404,
    curatorVisible: true,
    daysAgo: 5.2,
  },
  {
    id: '00000000-0000-0000-0005-000000000009',
    sender: C.id,
    about: 'bug',
    subject: 'Spell steps go back to their old order after saving',
    message:
      'I moved step 3 above step 2 and saved the spell. The page showed the new order, but when I opened the spell later the steps were back as before.',
    path: '/coven/[coven]/grimoire',
    daysAgo: 13.5,
  },
  {
    id: '00000000-0000-0000-0005-000000000010',
    sender: B.id,
    about: 'privacy',
    subject: 'Can a viewer see a private spell?',
    message:
      'I made a spell private so that only I can read it. Can the viewers in our coven see it anyway?',
    path: '/coven/[coven]/grimoire',
    assignedTo: E.id,
    daysAgo: 0.6,
  },
  {
    id: '00000000-0000-0000-0005-000000000011',
    sender: B.id,
    about: 'bug',
    subject: 'Grimoire will not open, even after Try Again',
    message:
      'My Grimoire showed an error page with a server error (500). I pressed Try Again and it came back with the same page, and it has done so every time since.',
    path: '/coven/[coven]/grimoire',
    errorCode: 500,
    errorReference: '994764113',
    daysAgo: 1.1,
  },
];

interface SeedReply {
  id: string;
  requestId: string;
  by: string;
  body: string;
  /** Days before the first run. */
  daysAgo: number;
}

const [, , , R4, R5, R6, R7, , , R10] = SUPPORT_REQUESTS.map((request) => request.id);

const SUPPORT_REPLIES: readonly SeedReply[] = [
  {
    id: '00000000-0000-0000-0005-000000000101',
    requestId: R4,
    by: F.id,
    body: 'Thanks for writing. I am looking at your invitation now and will tell you what I find.',
    daysAgo: 2.1,
  },
  {
    id: '00000000-0000-0000-0005-000000000102',
    requestId: R5,
    by: E.id,
    body: 'I can see the same thing here. I have opened an issue for it and will update you when it is fixed.',
    daysAgo: 3.8,
  },
  {
    id: '00000000-0000-0000-0005-000000000103',
    requestId: R6,
    by: E.id,
    body: 'Thank you for telling us. I have passed this on and added it to our list of fixes.',
    daysAgo: 7.9,
  },
  {
    id: '00000000-0000-0000-0005-000000000104',
    requestId: R6,
    by: E.id,
    body: 'This is fixed now. You should be able to tab into the filters. Please tell us if it still does not work for you.',
    daysAgo: 3.1,
  },
  {
    id: '00000000-0000-0000-0005-000000000105',
    requestId: R7,
    by: F.id,
    body: 'Open your account page and change the name there. The members page will show the new name straight away.',
    daysAgo: 6.2,
  },
  {
    id: '00000000-0000-0000-0005-000000000106',
    requestId: R10,
    by: E.id,
    body: 'No. A private spell can only be read by the person who wrote it, whatever role the others hold.',
    daysAgo: 0.3,
  },
];

interface SeedTimeout {
  id: string;
  userId: string;
  /** Days from the first run: negative is in the past. */
  untilInDays: number;
  /** Days before the first run. */
  daysAgo: number;
  liftedDaysAgo?: number;
  note: string;
}

// D has a time-out in force and an earlier one an admin lifted, C one that has run out, and B one an admin lifted early.
const SUPPORT_TIMEOUTS: readonly SeedTimeout[] = [
  {
    id: '00000000-0000-0000-0005-000000000201',
    userId: D.id,
    untilInDays: 3,
    daysAgo: 1,
    note: 'Sent the same message four times in an hour.',
  },
  {
    id: '00000000-0000-0000-0005-000000000202',
    userId: C.id,
    untilInDays: -8,
    daysAgo: 12,
    note: 'Sent several requests that had nothing to do with the site.',
  },
  {
    id: '00000000-0000-0000-0005-000000000203',
    userId: B.id,
    untilInDays: 5,
    daysAgo: 9,
    liftedDaysAgo: 8.5,
    note: 'Timed out by mistake.',
  },
  {
    id: '00000000-0000-0000-0005-000000000204',
    userId: D.id,
    untilInDays: -16,
    daysAgo: 21,
    liftedDaysAgo: 19,
    note: 'Asked the same question in three requests in one day.',
  },
];

/**
 * Writes the requests, their replies and the time-outs, each only when missing by its fixed id. A request is stamped by its
 * sender, a reply and a time-out by the staff member who wrote it, and then given a time in the past, since the stamp is "now".
 * Assumes the actor is published and the fixture users exist.
 */
export async function seedSupportRequests(tx: SeedTransaction): Promise<void> {
  const now = Date.now();
  const ago = (days: number) => new Date(now - days * DAY);

  const wanted = [
    ...SUPPORT_REQUESTS.map((r) => r.sender),
    ...SUPPORT_REPLIES.map((r) => r.by),
    ...SUPPORT_TIMEOUTS.flatMap((t) => [t.userId, E.id]),
  ];
  const people = await tx.select({ id: users.id }).from(users).where(inArray(users.id, wanted));
  if (people.length < new Set(wanted).size) {
    throw new Error('The support seed needs the standard fixture users.');
  }

  // Each table is written once per author, since a stamp names one author, and the rows it inserts are dated afterwards.
  async function writeMissing<
    T extends typeof supportRequests | typeof supportReplies | typeof supportTimeouts,
    W extends { id: string },
  >(
    table: T,
    items: readonly W[],
    authorOf: (item: W) => string,
    toRow: (item: W) => Omit<T['$inferInsert'], 'id' | InsertStamps>,
    createdAt: (item: W) => Date,
  ) {
    const present = new Set(
      (
        await tx
          .select({ id: table.id })
          .from(table as typeof supportRequests)
          .where(
            inArray(
              table.id,
              items.map((item) => item.id),
            ),
          )
      ).map((row) => row.id),
    );
    const missing = items.filter((item) => !present.has(item.id));
    for (const author of new Set(missing.map(authorOf))) {
      const own = missing.filter((item) => authorOf(item) === author);
      await insertStamped(
        tx,
        table,
        own.map((item) => ({ id: item.id, ...toRow(item) }) as never),
        { userId: author },
      );
      for (const item of own) {
        await tx
          .update(table)
          .set({ createdAt: createdAt(item) } as never)
          .where(eq(table.id, item.id));
      }
    }
  }

  await writeMissing(
    supportRequests,
    SUPPORT_REQUESTS,
    (r) => r.sender,
    (r) => ({
      about: r.about,
      subject: r.subject,
      message: r.message,
      path: r.path,
      errorCode: r.errorCode ?? null,
      errorReference: r.errorReference ?? null,
      status: r.resolved ? ('resolved' as const) : ('open' as const),
      assignedTo: r.assignedTo ?? null,
      curatorVisible: r.curatorVisible ?? false,
      issueUrl: r.issueNumber ? `${ISSUES}/${r.issueNumber}` : null,
      resolvedBy: r.resolved?.by ?? null,
      resolvedAt: r.resolved ? ago(r.resolved.daysAgo) : null,
    }),
    (r) => ago(r.daysAgo),
  );

  await writeMissing(
    supportReplies,
    SUPPORT_REPLIES,
    (r) => r.by,
    (r) => ({ requestId: r.requestId, body: r.body }),
    (r) => ago(r.daysAgo),
  );

  await writeMissing(
    supportTimeouts,
    SUPPORT_TIMEOUTS,
    () => E.id,
    (t) => ({
      userId: t.userId,
      until: new Date(now + t.untilInDays * DAY),
      note: t.note,
      liftedAt: t.liftedDaysAgo === undefined ? null : ago(t.liftedDaysAgo),
    }),
    (t) => ago(t.daysAgo),
  );
}
