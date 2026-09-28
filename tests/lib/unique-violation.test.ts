import { describe, expect, it } from 'vitest';
import { violatedUniqueIndex } from '@/lib/unique-violation';

/** What postgres.js throws for SQLSTATE 23505, reduced to the fields read. */
function driverError(constraint: string, code = '23505'): Error {
  return Object.assign(new Error('duplicate key value violates unique constraint'), {
    code,
    constraint_name: constraint,
  });
}

describe('violatedUniqueIndex', () => {
  it('names the index a driver error broke', () => {
    expect(violatedUniqueIndex(driverError('herbs_name_unique'))).toBe('herbs_name_unique');
  });

  // Drizzle rethrows the driver's error as the `cause` of its own query error.
  it('finds it on a wrapping error’s cause', () => {
    const wrapped = Object.assign(new Error('Failed query'), {
      cause: driverError('herbs_name_unique'),
    });

    expect(violatedUniqueIndex(wrapped)).toBe('herbs_name_unique');
  });

  it('answers undefined for any other database error', () => {
    // 23514 is a CHECK violation, which also carries a constraint name.
    expect(violatedUniqueIndex(driverError('herbs_name_not_blank', '23514'))).toBeUndefined();
  });

  it('answers undefined for an error that is not the database’s', () => {
    expect(violatedUniqueIndex(new Error('spell fizzled'))).toBeUndefined();
    expect(violatedUniqueIndex('not an error')).toBeUndefined();
  });
});
