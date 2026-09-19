import { describe, expect, it } from 'vitest';
import { applyAudit, auditColumns, auditStampColumns } from '@/db/audit';

const session = { userId: '11111111-1111-1111-1111-111111111111' };
const impostor = { userId: '99999999-9999-9999-9999-999999999999' };

describe('applyAudit', () => {
  it('stamps created_at/created_by and updated_at/updated_by on insert', () => {
    const result = applyAudit('insert', { name: 'Rosemary' }, session);

    expect(result.name).toBe('Rosemary');
    expect(result.createdBy).toBe(session.userId);
    expect(result.updatedBy).toBe(session.userId);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('leaves created_at/created_by untouched on update', () => {
    const result = applyAudit('update', { name: 'Sage' }, session);

    expect(result.name).toBe('Sage');
    expect(result.updatedBy).toBe(session.userId);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('createdBy');
  });

  it('sets only deleted_at/deleted_by on soft delete', () => {
    const result = applyAudit('delete', {}, session);

    expect(result.deletedBy).toBe(session.userId);
    expect(result.deletedAt).toBeInstanceOf(Date);
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('createdBy');
    expect(result).not.toHaveProperty('updatedAt');
    expect(result).not.toHaveProperty('updatedBy');
  });

  it('ignores audit ids in the payload in favour of the session', () => {
    const result = applyAudit(
      'insert',
      {
        name: 'Thyme',
        createdBy: impostor.userId,
        updatedBy: impostor.userId,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
      session,
    );

    expect(result.createdBy).toBe(session.userId);
    expect(result.updatedBy).toBe(session.userId);
    expect(result.createdAt).not.toEqual(new Date(0));
    expect(result.updatedAt).not.toEqual(new Date(0));
  });

  it('ignores a deleted_by id in the payload on soft delete', () => {
    const result = applyAudit('delete', { deletedBy: impostor.userId }, session);

    expect(result.deletedBy).toBe(session.userId);
  });
});

// The six-column set is the four-column one plus two, so the two cannot drift (MB.34).
describe('the two audit column sets', () => {
  it('defines auditColumns as the stamp columns plus the two delete columns', () => {
    expect(Object.keys(auditStampColumns)).toEqual([
      'createdAt',
      'createdBy',
      'updatedAt',
      'updatedBy',
    ]);
    expect(Object.keys(auditColumns)).toEqual([
      ...Object.keys(auditStampColumns),
      'deletedAt',
      'deletedBy',
    ]);
  });

  it('shares one definition of every stamp column, so the two cannot drift', () => {
    for (const name of Object.keys(auditStampColumns) as (keyof typeof auditStampColumns)[]) {
      expect(auditColumns[name]).toBe(auditStampColumns[name]);
    }
  });
});
