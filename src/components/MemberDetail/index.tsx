import type { ReactElement } from 'react';
import Day from '../Day';
import RemoveMemberControl from '../MemberList/remove-control';
import RoleControl from '../MemberList/role-control';
import { workspaceRoleLabel } from '../MemberList/roles';
import CovenAccessPanel from './coven-access-panel';
import type { MemberDetailProps } from './types';
import '../UserDetail/index.scss';
import './index.scss';

// The body of the modal over `/coven/[slug]/members` on a member: the row's facts, and for a steward the role change,
// the pause on their access to the coven and their removal (claude-docs/components/member-detail.md). Laid out as the
// user modal is, on its classes; render-only, the page deciding what the viewer may do.

const MemberDetail = ({
  workspaceId,
  member,
  currentUserId,
  canChangeRoles = false,
  canPause = false,
  canRemove = false,
  onRemoved,
}: MemberDetailProps): ReactElement => (
  <div className="user-detail">
    {/* One level below the modal's own title, an h2. */}
    <section aria-labelledby="member-detail-membership" className="user-detail__section">
      <h3 id="member-detail-membership" className="user-detail__title">
        Membership
      </h3>
      {/* The address is the heading's, under the name, so it is not repeated. */}
      <dl className="user-detail__facts">
        <div>
          <dt>Role</dt>
          <dd className="user-detail__value">
            <span className="user-detail__role">
              {member.role === 'owner' ? (
                <strong>{workspaceRoleLabel(member.role)}</strong>
              ) : (
                workspaceRoleLabel(member.role)
              )}
            </span>
            {/* Keyed by the role: the refresh after a change mounts a fresh control offering the others. */}
            {canChangeRoles && (
              <RoleControl
                key={member.role}
                workspaceId={workspaceId}
                userId={member.userId}
                name={member.name}
                currentRole={member.role}
                inModal
              />
            )}
          </dd>
        </div>
        <div>
          <dt>Joined</dt>
          <dd>
            <Day at={member.joinedAt} />
          </dd>
        </div>
        {member.invitedBy && (
          <div>
            <dt>Invited By</dt>
            <dd>{member.invitedBy}</dd>
          </div>
        )}
        {member.updatedBy && member.updatedAt && (
          <div>
            <dt>Updated</dt>
            <dd>
              by <strong>{member.updatedBy}</strong> on <Day at={member.updatedAt} />
            </dd>
          </div>
        )}
      </dl>
    </section>
    {/* Not on a steward: a steward's access is never paused. */}
    {canPause && member.role !== 'owner' && (
      <section aria-label="Coven Access" className="user-detail__section">
        <CovenAccessPanel
          workspaceId={workspaceId}
          userId={member.userId}
          name={member.name}
          standing={member.paused ?? null}
        />
      </section>
    )}
    {/* Not on your own: leaving is the coven page's, for every role. */}
    {canRemove && member.userId !== currentUserId && (
      <div className="user-detail__actions">
        <RemoveMemberControl
          workspaceId={workspaceId}
          userId={member.userId}
          name={member.name}
          inModal
          onSent={onRemoved}
        />
      </div>
    )}
  </div>
);

export default MemberDetail;
