import type { ReactElement, ReactNode } from 'react';
import { PendingLink } from '../../lib/navigation';
import { WORKSPACE_ROLE_ACCESS } from '../MemberList/roles';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import type { PageNavEntry } from '../PageNav/types';
import PageWithNav from '../PageWithNav';
import Skeleton from '../Skeleton';
import SkeletonText from '../Skeleton/text';
import type { CovenHomeProps } from './types';
import { covenPath } from '@/lib/coven-path';

// The page a coven opens on, and its skeleton, drawn from one source so the words, and so the lines
// they wrap to, are the same. Pending draws the same words as plain text with no links, no ids and no
// buttons: it sits in a hidden wrapper, where a link would still be reachable by keyboard and an id
// would repeat the page's own.
const ROLE_NAME = { owner: 'a steward', member: 'a practitioner', viewer: 'an observer' } as const;

// A page section named by its heading; pending it leaves out the ids, which the real page owns.
const Section = ({
  name,
  title,
  pending,
  children,
}: {
  name: string;
  title: ReactNode;
  pending: boolean;
  children: ReactNode;
}): ReactElement => (
  <section
    id={pending ? undefined : `coven-${name}`}
    className="page-frame__section"
    aria-labelledby={pending ? undefined : `coven-${name}-heading`}
  >
    <h2 id={pending ? undefined : `coven-${name}-heading`}>{title}</h2>
    {children}
  </section>
);

const CovenHome = ({
  slug,
  role,
  access,
  name,
  demo,
  pending = false,
  leave,
  rename,
  remove,
}: CovenHomeProps): ReactElement => {
  const { canDelete, canReadMembers, canInvite, canRename } = access;
  const showRename = canRename && !demo;

  // Only the pages the caller can open are listed, so none is a link to a 404. Every role can open
  // Ingredients and the Grimoire; Members is listed only for a role that may read it. The section and
  // its menu entry are built together, so they agree.
  const entries: PageNavEntry[] = [
    { href: '#coven-contents' as const, label: 'Contents' },
    { href: '#coven-membership', label: 'Your Membership' },
    ...(showRename ? [{ href: '#coven-rename' as const, label: 'Rename Coven' }] : []),
    ...(canDelete ? [{ href: '#coven-delete' as const, label: 'Delete Coven' }] : []),
  ];

  const pages = [
    {
      key: 'ingredients',
      label: 'Ingredients',
      description: 'What the coven has in its cupboard, and what it can add from the compendium.',
    },
    {
      key: 'grimoire',
      label: 'Grimoire',
      description: 'What the coven makes: its spells, and the workings it has recorded.',
    },
    ...(canReadMembers
      ? [
          {
            key: 'members',
            label: 'Members',
            description: canInvite
              ? 'Who is in the coven, what each may do, and the invitations still waiting.'
              : 'Who is in the coven and what each may do.',
          },
        ]
      : []),
  ];

  const known = name !== undefined;
  // Pending, every word is a bar of the same width: `bar` wraps a run of text for it.
  const bar = (text: ReactNode): ReactNode =>
    pending ? <SkeletonText>{text}</SkeletonText> : text;
  return (
    <PageWithNav as={pending ? 'div' : 'main'}>
      <PageHeader
        eyebrow={bar('Coven')}
        title={bar(name)}
        pendingTitle={known ? undefined : 2}
        tag={
          demo ? (
            <span className={pending ? 'badge badge--demo badge--pending' : 'badge badge--demo'}>
              {bar('Demo')}
            </span>
          ) : undefined
        }
        lede={
          known ? (
            <>{bar(`You are ${ROLE_NAME[role]} of this coven. ${WORKSPACE_ROLE_ACCESS[role]}`)}</>
          ) : (
            <span className="skeleton-lede skeleton-lede--long">
              <Skeleton shape="line" count={4} quiet />
            </span>
          )
        }
      />
      <PageNav label="On This Page" entries={entries} pending={pending} />
      <Section name="contents" title={bar('Contents')} pending={pending}>
        <ul className="admin-contents__list">
          {pages.map(({ key, label, description }) => (
            <li key={key}>
              {pending ? (
                <span className="admin-contents__name admin-contents__name--pending">
                  {bar(label)}
                </span>
              ) : (
                <PendingLink href={covenPath(slug, key)} aria-describedby={`coven-contents-${key}`}>
                  {label}
                </PendingLink>
              )}
              <span
                id={pending ? undefined : `coven-contents-${key}`}
                className="admin-contents__description"
              >
                {bar(description)}
              </span>
            </li>
          ))}
        </ul>
      </Section>
      {/* Each button says its own refusal under itself. Leave is here, not
          on the members page, because an observer cannot open that page and must
          still be able to go. Delete asks for the permission its service
          checks, never a rank
          (claude-docs/auth/coven-guard.md, "The coven index page"). */}
      <Section name="membership" title={bar('Your Membership')} pending={pending}>
        <div className="form__actions">
          {pending ? <span className="btn btn--pending">{bar('Leave Coven')}</span> : leave}
        </div>
      </Section>
      {showRename && (
        <Section name="rename" title={bar('Rename Coven')} pending={pending}>
          {pending ? <SkeletonText>Name</SkeletonText> : rename}
        </Section>
      )}
      {canDelete && (
        <Section name="delete" title={bar('Delete Coven')} pending={pending}>
          <p>
            {bar(
              'Closes its ingredients and its grimoire to every member, other stewards included.',
            )}
          </p>
          <div className="form__actions">
            {pending ? (
              <span className="btn btn--destructive btn--pending">{bar('Delete Coven')}</span>
            ) : (
              remove
            )}
          </div>
        </Section>
      )}
    </PageWithNav>
  );
};

export default CovenHome;
