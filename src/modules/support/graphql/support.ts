import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { definedArgs, sessionOf } from '../../../graphql/context-helpers';
import { UserRef } from '../../identity';
import { supportRequestKind, supportRequestStatus } from '../schema/support-requests';
import {
  assignSupportRequest,
  getSupportRequest,
  listSupportRequests,
  resolveSupportRequest,
  setSupportRequestCuratorVisible,
  setSupportRequestIssueUrl,
} from '../services/staff';
import { getMySupportRequest, listMySupportRequests } from '../services/own';
import { replyToSupportRequest } from '../services/reply';
import { sendSupportRequest } from '../services/send';
import { liftSupportTimeout, timeOutSupportSender } from '../services/timeouts';
import type { SupportReplyRow, SupportRequestRow, SupportTimeoutRow } from '../types';
import { MESSAGE_MAX_LENGTH, PATH_MAX_LENGTH, SUBJECT_MAX_LENGTH } from '../validation/support';

const SupportKindEnum = builder.enumType('SupportKind', {
  description: 'What a support request is about.',
  values: supportRequestKind.enumValues,
});

const SupportStatusEnum = builder.enumType('SupportStatus', {
  values: supportRequestStatus.enumValues,
});

const SupportReplyRef = builder.objectRef<SupportReplyRow>('SupportReply').implement({
  description: 'A reply from staff to a support request.',
  fields: (t) => ({
    id: t.exposeID('id'),
    body: t.exposeString('body'),
    author: t.field({
      type: UserRef,
      nullable: true,
      description: 'Who wrote the reply; null if no live account holds the id.',
      resolve: (row, _args, { loaders }) => loaders.usersOnRequests.load(row.createdBy),
    }),
    audit: t.field({ type: AuditInfo, resolve: (row) => row }),
  }),
});

const SupportTimeoutRef = builder.objectRef<SupportTimeoutRow>('SupportTimeout').implement({
  description: 'A bar on a user sending support requests until `until`, unless lifted sooner.',
  fields: (t) => ({
    id: t.exposeID('id'),
    userId: t.exposeID('userId'),
    until: t.expose('until', { type: 'DateTime' }),
    note: t.exposeString('note', { nullable: true }),
    liftedAt: t.expose('liftedAt', { type: 'DateTime', nullable: true }),
    audit: t.field({ type: AuditInfo, resolve: (row) => row }),
  }),
});

const SupportRequestRef = builder.objectRef<SupportRequestRow>('SupportRequest').implement({
  description:
    'A request for help from the support form. A sender reads their own; a curator reads those marked for curators or assigned to them; an admin reads all.',
  fields: (t) => ({
    id: t.exposeID('id'),
    kind: t.expose('kind', { type: SupportKindEnum }),
    subject: t.exposeString('subject'),
    message: t.exposeString('message'),
    path: t.string({
      nullable: true,
      description:
        'The page the sender was on, with a coven’s slug replaced; null when none was sent.',
      resolve: (row) => row.path || null,
    }),
    errorCode: t.exposeInt('errorCode', { nullable: true }),
    status: t.expose('status', { type: SupportStatusEnum }),
    sender: t.field({
      type: UserRef,
      nullable: true,
      resolve: (row, _args, { loaders }) => loaders.usersOnRequests.load(row.createdBy),
    }),
    assignedTo: t.field({
      type: UserRef,
      nullable: true,
      resolve: (row, _args, { loaders }) =>
        row.assignedTo ? loaders.usersOnRequests.load(row.assignedTo) : null,
    }),
    curatorVisible: t.exposeBoolean('curatorVisible'),
    issueUrl: t.exposeString('issueUrl', { nullable: true }),
    resolvedBy: t.field({
      type: UserRef,
      nullable: true,
      resolve: (row, _args, { loaders }) =>
        row.resolvedBy ? loaders.usersOnRequests.load(row.resolvedBy) : null,
    }),
    resolvedAt: t.expose('resolvedAt', { type: 'DateTime', nullable: true }),
    replies: t.field({
      type: [SupportReplyRef],
      description: 'Oldest first.',
      resolve: (row, _args, { loaders }) => loaders.repliesByRequest.load(row.id),
    }),
    timeouts: t.field({
      type: [SupportTimeoutRef],
      description: 'The sender’s time-outs, past and active, newest first. Site admins only.',
      authScopes: { admin: true },
      resolve: (row, _args, { loaders }) => loaders.timeoutsBySender.load(row.createdBy),
    }),
    audit: t.field({ type: AuditInfo, resolve: (row) => row }),
  }),
});

const SupportRequestInput = builder.inputType('SupportRequestInput', {
  fields: (t) => ({
    kind: t.field({ type: SupportKindEnum, required: true }),
    subject: t.string({
      required: true,
      description: `1 to ${SUBJECT_MAX_LENGTH} characters.`,
    }),
    message: t.string({
      required: true,
      description: `1 to ${MESSAGE_MAX_LENGTH} characters.`,
    }),
    path: t.string({
      required: false,
      description: `The page the sender was on, at most ${PATH_MAX_LENGTH} characters; a coven's slug is replaced when it is stored.`,
    }),
    errorCode: t.int({
      required: false,
      description: 'The HTTP status of the error page, if any.',
    }),
  }),
});

builder.queryField('mySupportRequests', (t) =>
  t.pagedConnection({
    type: SupportRequestRef,
    description: 'The signed-in account’s own support requests, newest first.',
    authScopes: { signedIn: true },
    resolve: (_root, _args, page, context) => listMySupportRequests(sessionOf(context), page),
  }),
);

builder.queryField('supportRequests', (t) =>
  t.pagedConnection({
    type: SupportRequestRef,
    description:
      'The support requests the viewer may read, open ahead of resolved and newest first within each. A curator reads those marked for curators or assigned to them; an admin reads all.',
    args: {
      kind: t.arg({ type: SupportKindEnum, required: false }),
      status: t.arg({ type: SupportStatusEnum, required: false }),
      errorCode: t.arg.int({ required: false }),
    },
    authScopes: { curator: true },
    resolve: (_root, { kind, status, errorCode }, page, context) =>
      listSupportRequests(sessionOf(context), definedArgs({ kind, status, errorCode }), page),
  }),
);

builder.queryField('mySupportRequest', (t) =>
  t.field({
    type: SupportRequestRef,
    description: 'One of the signed-in account’s own support requests.',
    args: { id: t.arg.id({ required: true }) },
    authScopes: { signedIn: true },
    resolve: (_root, { id }, context) => getMySupportRequest(sessionOf(context), id),
  }),
);

builder.queryField('supportRequest', (t) =>
  t.field({
    type: SupportRequestRef,
    description: 'One support request the viewer may read.',
    args: { id: t.arg.id({ required: true }) },
    authScopes: { curator: true },
    resolve: (_root, { id }, context) => getSupportRequest(sessionOf(context), id),
  }),
);

builder.mutationField('sendSupportRequest', (t) =>
  t.field({
    type: SupportRequestRef,
    description:
      'Sends a support request. Needs a verified address; refused while the sender is timed out or after ten requests in 24 hours.',
    args: { input: t.arg({ type: SupportRequestInput, required: true }) },
    authScopes: { signedIn: true },
    resolve: (_root, { input }, context) =>
      sendSupportRequest(sessionOf(context), definedArgs(input)),
  }),
);

builder.mutationField('replyToSupportRequest', (t) =>
  t.field({
    type: SupportReplyRef,
    description:
      'Replies to a request and mails its sender that a reply is waiting. An admin may reply to any request, a curator to one assigned to them.',
    args: { requestId: t.arg.id({ required: true }), body: t.arg.string({ required: true }) },
    authScopes: { curator: true },
    resolve: (_root, { requestId, body }, context) =>
      replyToSupportRequest(sessionOf(context), requestId, body, context.support),
  }),
);

builder.mutationField('assignSupportRequest', (t) =>
  t.field({
    type: SupportRequestRef,
    description: 'Assigns a request to a curator or an admin, or to no one. Site admins only.',
    args: { id: t.arg.id({ required: true }), assigneeId: t.arg.id({ required: false }) },
    authScopes: { admin: true },
    resolve: (_root, { id, assigneeId }, context) =>
      assignSupportRequest(sessionOf(context), id, assigneeId ?? null),
  }),
);

builder.mutationField('setSupportRequestCuratorVisible', (t) =>
  t.field({
    type: SupportRequestRef,
    description: 'Shows a request to curators, or hides it from them. Site admins only.',
    args: { id: t.arg.id({ required: true }), visible: t.arg.boolean({ required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { id, visible }, context) =>
      setSupportRequestCuratorVisible(sessionOf(context), id, visible),
  }),
);

builder.mutationField('resolveSupportRequest', (t) =>
  t.field({
    type: SupportRequestRef,
    description:
      'Marks a request resolved. An admin may on any request, a curator on one assigned to them.',
    args: { id: t.arg.id({ required: true }) },
    authScopes: { curator: true },
    resolve: (_root, { id }, context) => resolveSupportRequest(sessionOf(context), id),
  }),
);

builder.mutationField('setSupportRequestIssueUrl', (t) =>
  t.field({
    type: SupportRequestRef,
    description:
      'Links a request to an issue on the project’s GitHub repository, or clears the link with null. Site admins only.',
    args: { id: t.arg.id({ required: true }), issueUrl: t.arg.string({ required: false }) },
    authScopes: { admin: true },
    resolve: (_root, { id, issueUrl }, context) =>
      setSupportRequestIssueUrl(sessionOf(context), id, issueUrl ?? null),
  }),
);

builder.mutationField('timeOutSupportSender', (t) =>
  t.field({
    type: SupportTimeoutRef,
    description: 'Bars a user from sending support requests until `until`. Site admins only.',
    args: {
      userId: t.arg.id({ required: true }),
      until: t.arg({ type: 'DateTime', required: true }),
      note: t.arg.string({ required: false }),
    },
    authScopes: { admin: true },
    resolve: (_root, { userId, until, note }, context) =>
      timeOutSupportSender(sessionOf(context), userId, until, note),
  }),
);

builder.mutationField('liftSupportTimeout', (t) =>
  t.field({
    type: SupportTimeoutRef,
    description: 'Ends a time-out now. Site admins only.',
    args: { id: t.arg.id({ required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { id }, context) => liftSupportTimeout(sessionOf(context), id),
  }),
);
