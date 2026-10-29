import { builder } from '../../../graphql/builder';

/**
 * A user as a co-member reads them: the id and the display name through `usersById`. A type of its own rather than
 * `User`, whose email a scope guards (claude-docs/auth/display-names.md, "Display names").
 */
export const CoMemberRef = builder.objectRef<{ id: string }>('CoMember').implement({
  description: 'A user as a co-member sees them: an id and a display name, never an email address.',
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.string({
      nullable: true,
      description: 'Null for anyone the viewer has never shared a coven with.',
      resolve: ({ id }, _args, { loaders }) => loaders.usersById.load(id),
    }),
  }),
});
