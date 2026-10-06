import { describe, expect, it } from 'vitest';
import {
  foreignKeyStatements,
  shippedMigrationStatements,
  statementsOfMigrationContaining,
} from './migrations';

// The positive cases are what make an empty result from the schema tests mean
// "no such key shipped" rather than "the pattern cannot match drizzle-kit's SQL".
describe('foreignKeyStatements', () => {
  const DRIZZLE_KIT =
    'ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_planet_planets_id_fk" FOREIGN KEY ("planet") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;';

  it('finds a foreign key in the shape drizzle-kit emits', () => {
    expect(foreignKeyStatements([DRIZZLE_KIT], 'ingredients', 'planets')).toEqual([DRIZZLE_KIT]);
  });

  it('finds an unqualified, hand-written one', () => {
    const statement =
      'alter table ingredients add foreign key (zodiac) references zodiac_signs (id)';

    expect(foreignKeyStatements([statement], 'ingredients', 'zodiac_signs')).toEqual([statement]);
  });

  it('finds an inline reference in the CREATE TABLE', () => {
    const statement =
      'CREATE TABLE "ingredients" (\n\t"planet" uuid REFERENCES "planets"("id")\n);';

    expect(foreignKeyStatements([statement], 'ingredients', 'planets')).toEqual([statement]);
  });

  it('ignores a key on another table, or onto another table', () => {
    const onto = DRIZZLE_KIT.replace('"public"."planets"', '"public"."users"');
    const from = DRIZZLE_KIT.replace('"ingredients"', '"ingredient_categories"');
    const prefix = DRIZZLE_KIT.replace('"public"."planets"', '"public"."planets_archive"');

    expect(foreignKeyStatements([onto, from, prefix], 'ingredients', 'planets')).toEqual([]);
  });

  it('reads the shipped migrations as statements, without their comments', () => {
    const statements = shippedMigrationStatements();

    expect(statements.length).toBeGreaterThan(0);
    expect(statements.filter((statement) => /^\s*--/m.test(statement))).toEqual([]);
    // A real key from 0001, so the reader and the matcher agree on the files as shipped.
    expect(foreignKeyStatements(statements, 'accounts', 'users')).toHaveLength(1);
  });
});

describe('statementsOfMigrationContaining', () => {
  it('reads the first migration holding the marker, as statements without their comments', () => {
    // 0016 attaches the trigger and carries comments between its statements.
    const statements = statementsOfMigrationContaining(
      'CREATE OR REPLACE FUNCTION set_updated_at()',
    );

    expect(statements[0]).toMatch(/^CREATE OR REPLACE FUNCTION set_updated_at\(\)/);
    expect(statements.filter((statement) => /^\s*--/m.test(statement))).toEqual([]);
  });

  it('throws, naming the marker, when no migration holds it', () => {
    expect(() => statementsOfMigrationContaining('no such statement')).toThrow('no such statement');
  });
});
