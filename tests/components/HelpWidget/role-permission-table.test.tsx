import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RolePermissionTable, {
  HIDDEN_STATEMENTS,
  STATEMENT_LABELS,
} from '@/components/HelpWidget/role-permission-table';
import { WORKSPACE_ROLE_LABELS } from '@/components/UserDetail/roles';
import { WORKSPACE_STATEMENTS, rolePermits } from '@/modules/coven';

// Each cell is the access check's own answer: the table asks `rolePermits` for every statement and every role.

type Resource = keyof typeof WORKSPACE_STATEMENTS;

const statements = (Object.keys(WORKSPACE_STATEMENTS) as Resource[]).flatMap((resource) =>
  WORKSPACE_STATEMENTS[resource].map((action) => ({ resource, action })),
);
const hidden = (resource: Resource, action: string) =>
  HIDDEN_STATEMENTS.some((each) => each.resource === resource && each.action === action);
const shown = statements.filter(({ resource, action }) => !hidden(resource, action));

describe('RolePermissionTable', () => {
  it('heads a column for each coven role, Steward first', () => {
    render(<RolePermissionTable />);

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers.slice(1)).toEqual(WORKSPACE_ROLE_LABELS.map(({ label }) => label));
  });

  it('hides only statements the access check knows, holding workspace.update until a coven can be renamed', () => {
    for (const { resource, action } of HIDDEN_STATEMENTS) {
      expect(WORKSPACE_STATEMENTS[resource] as readonly string[]).toContain(action);
    }
    expect(HIDDEN_STATEMENTS).toEqual([{ resource: 'workspace', action: 'update' }]);
  });

  it('has a row for every statement the access check knows but the hidden ones, and none for those', () => {
    render(<RolePermissionTable />);

    const rows = screen.getAllByRole('rowheader').map((cell) => cell.textContent);
    expect(rows).toEqual(
      shown.map(
        ({ resource, action }) => (STATEMENT_LABELS[resource] as Record<string, string>)[action],
      ),
    );
    for (const { resource, action } of HIDDEN_STATEMENTS) {
      const label = (STATEMENT_LABELS[resource] as Record<string, string>)[action];
      expect(screen.queryByRole('rowheader', { name: label })).toBeNull();
    }
  });

  it.each(shown)('marks $resource $action as rolePermits answers it for each role', (statement) => {
    render(<RolePermissionTable />);

    const label = (STATEMENT_LABELS[statement.resource] as Record<string, string>)[
      statement.action
    ];
    const row = screen.getByRole('rowheader', { name: label }).closest('tr') as HTMLElement;
    const cells = within(row).getAllByRole('cell');
    WORKSPACE_ROLE_LABELS.forEach(({ value }, index) => {
      const allowed = rolePermits(value, { [statement.resource]: [statement.action] });
      expect(cells[index]).toHaveTextContent(allowed ? 'Yes' : 'No');
    });
  });

  it('gives an observer no write and a steward every statement', () => {
    render(<RolePermissionTable />);

    // The preconditions the per-cell test rests on: the roles differ, so a table drawn from one role would fail it.
    expect(
      statements.every(({ resource, action }) => rolePermits('owner', { [resource]: [action] })),
    ).toBe(true);
    expect(rolePermits('viewer', { spell: ['create'] })).toBe(false);
    expect(rolePermits('member', { spell: ['create'] })).toBe(true);
  });
});
