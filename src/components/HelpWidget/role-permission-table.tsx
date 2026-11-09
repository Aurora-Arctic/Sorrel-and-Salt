import type { ReactElement } from 'react';
import { WORKSPACE_STATEMENTS, rolePermits } from '@/modules/coven';
import { WORKSPACE_ROLE_LABELS } from '../UserDetail/roles';
import { Mark } from '../UserList/marks';

// Who may do what in a coven, each cell asked of the access check itself (claude-docs/components/help-pages.md,
// "Widgets"). The labels are keyed by the statements, so a statement added to the check fails to compile here.

type Statements = typeof WORKSPACE_STATEMENTS;

export const STATEMENT_LABELS: {
  readonly [R in keyof Statements]: Readonly<Record<Statements[R][number], string>>;
} = {
  ingredient: {
    read: 'See the Ingredients',
    create: 'Add an Ingredient',
    update: 'Change an Ingredient',
    delete: 'Delete an Ingredient',
  },
  inventory: { read: 'See the Stock', update: 'Add, Change or Throw Out a Jar' },
  spell: {
    read: 'Read the Grimoire',
    create: 'Write a Spell',
    update: 'Change a Spell',
    delete: 'Delete a Spell',
  },
  working: {
    read: 'See the Workings',
    create: 'Record a Working',
    update: 'Change a Working',
    delete: 'Delete a Working',
  },
  member: {
    read: 'See the Members',
    readEmail: 'See a Member’s Email Address',
    invite: 'Invite Someone',
    update: 'Change a Member’s Role',
    remove: 'Remove a Member',
    pause: 'Pause a Member',
  },
  workspace: {
    read: 'Open the Coven',
    update: 'Rename the Coven',
    delete: 'Delete the Coven',
  },
};

/** A statement of the access check, by its resource and action. */
type Statement = {
  [R in keyof Statements]: { resource: R; action: Statements[R][number] };
}[keyof Statements];

/** Statements no screen offers, left out of the table so it lists nothing a reader cannot do. */
export const HIDDEN_STATEMENTS: readonly Statement[] = [];

const hidden = (resource: string, action: string): boolean =>
  HIDDEN_STATEMENTS.some((each) => each.resource === resource && each.action === action);

const RolePermissionTable = (): ReactElement => (
  <figure className="figure help-widget">
    <div className="data-table-frame">
      <table className="data-table">
        <caption className="visually-hidden">What Each Role May Do</caption>
        <thead>
          <tr>
            <th scope="col">Action</th>
            {WORKSPACE_ROLE_LABELS.map(({ label }) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(Object.keys(STATEMENT_LABELS) as (keyof Statements)[]).flatMap((resource) =>
            Object.entries(STATEMENT_LABELS[resource])
              .filter(([action]) => !hidden(resource, action))
              .map(([action, label]) => (
                <tr key={`${resource}.${action}`}>
                  <th scope="row">{label}</th>
                  {WORKSPACE_ROLE_LABELS.map(({ value }) => {
                    const allowed = rolePermits(value, { [resource]: [action] });
                    return (
                      <td key={value}>
                        <Mark value={allowed} label={allowed ? 'Yes' : 'No'} />
                      </td>
                    );
                  })}
                </tr>
              )),
          )}
        </tbody>
      </table>
    </div>
    <figcaption>
      Read from the coven&rsquo;s own access check. A private spell is its writer&rsquo;s alone,
      whatever the role.
    </figcaption>
  </figure>
);

export default RolePermissionTable;
