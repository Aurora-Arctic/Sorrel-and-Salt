import { isInterfaceType, isObjectType, type GraphQLObjectType } from 'graphql';
import { describe, expect, it } from 'vitest';
import { schema } from '@/graphql/schema';

// The compendium's and a coven's facet counts share one interface, so the two queries select its fields through one fragment.

const INTERFACE = 'IngredientFacetCounts';
const IMPLEMENTERS = ['CompendiumFacets', 'IngredientFacets'];

const objectType = (name: string): GraphQLObjectType => {
  const type = schema.getType(name);
  if (!isObjectType(type)) throw new Error(`${name} is not an object type`);
  return type;
};

/** Each field as `name: Type(args)`, so a name shared with a different type or arguments does not count as shared. */
const signatures = (type: { getFields: GraphQLObjectType['getFields'] }): string[] =>
  Object.values(type.getFields())
    .map((field) => `${field.name}: ${String(field.type)}(${field.args.map(String).join(', ')})`)
    .sort();

describe(INTERFACE, () => {
  it('is implemented by both facet-count types', () => {
    for (const name of IMPLEMENTERS) {
      expect(
        objectType(name)
          .getInterfaces()
          .map((type) => type.name),
        name,
      ).toContain(INTERFACE);
    }
  });

  it('declares exactly the fields the two types share, by name, type and arguments', () => {
    const [compendium, coven] = IMPLEMENTERS.map((name) => signatures(objectType(name)));
    const shared = compendium!.filter((field) => coven!.includes(field));
    // Precondition: the two types share fields, and each has one the other lacks.
    expect(shared.length).toBeGreaterThan(0);
    expect(shared.length).toBeLessThan(compendium!.length);
    expect(shared.length).toBeLessThan(coven!.length);

    const type = schema.getType(INTERFACE);
    expect(isInterfaceType(type)).toBe(true);
    expect(isInterfaceType(type) && signatures(type)).toEqual(shared);
  });
});
