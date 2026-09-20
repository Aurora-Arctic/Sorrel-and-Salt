import { describe, expect, it } from 'vitest';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { makeSpell, spellColumns } from './spell';

const MUGWORT = '44444444-4444-4444-4444-444444444444';

// The layers carry this factory's real work: `num_nonnulls(ingredient_id,
// name) = 1` and `spell_ingredients_form_only_on_custom` would both reject a
// merged `ingredientId` beside the default's custom name and form.

describe('makeSpell', () => {
  it('builds a whole spell with no arguments', () => {
    const spell = makeSpell();

    expect(spell.title).toBe('Hearth Warding Jar');
    expect(spell.workspaceId).toBe(WORKSPACE_W_ID);
  });

  // A draft until something says otherwise, and the fixture is not that.
  it('opens as a draft', () => {
    expect(makeSpell().status).toBe('draft');
  });

  // The shared default, so a test that never mentions visibility is not
  // quietly about a private spell (M10.3).
  it('opens visible to the whole coven', () => {
    expect(makeSpell().visibility).toBe('workspace');
  });

  it('takes the private visibility a test states', () => {
    expect(makeSpell({ visibility: 'private' }).visibility).toBe('private');
  });

  it('keeps every field the override does not name', () => {
    const spell = makeSpell({ intent: 'Keep the lane quiet' });

    expect(spell.intent).toBe('Keep the lane quiet');
    expect(spell.title).toBe('Hearth Warding Jar');
  });

  it('intends exactly the categories the override names', () => {
    expect(makeSpell({ categories: ['Warding'] }).categories).toEqual(['Warding']);
  });

  describe('its layers', () => {
    // A custom layer needs no ingredient inserted first.
    it('stacks one custom layer by default', () => {
      const [layer, ...rest] = makeSpell().layers;

      expect(rest).toEqual([]);
      expect(layer.ingredientId).toBeNull();
      expect(layer.name).toBe('Fixture Ash');
      expect(layer.form).toBe('ash');
    });

    // The position in the array, 1-based as the seed writes it.
    it('numbers each layer by its position in the stack', () => {
      const spell = makeSpell({ layers: [{}, {}, {}] });

      expect(spell.layers.map((layer) => layer.layerOrder)).toEqual([1, 2, 3]);
    });

    // `spell_ingredients_spell_id_custom_name_unique` folds Salt onto salt
    // within one jar.
    it('gives each defaulted layer a name of its own', () => {
      const names = makeSpell({ layers: [{}, {}, {}] }).layers.map((layer) => layer.name);

      expect(new Set(names).size).toBe(3);
    });

    it('fills in what a layer override leaves unsaid', () => {
      const [layer] = makeSpell({ layers: [{ note: 'crushed, not ground' }] }).layers;

      expect(layer.note).toBe('crushed, not ground');
      expect(layer.quantity).toBe('1.000');
      expect(layer.unit).toBe('pinch');
    });

    // A linked layer carries neither a name nor a form of its own.
    it('turns a layer that names an ingredient into a linked one', () => {
      const [layer] = makeSpell({ layers: [{ ingredientId: MUGWORT }] }).layers;

      expect(layer.ingredientId).toBe(MUGWORT);
      expect(layer.name).toBeNull();
      expect(layer.form).toBeNull();
    });

    it('leaves a name the layer override states, so a test can write a row the check rejects', () => {
      const [layer] = makeSpell({
        layers: [{ ingredientId: MUGWORT, name: 'Fixture Ash' }],
      }).layers;

      expect(layer.ingredientId).toBe(MUGWORT);
      expect(layer.name).toBe('Fixture Ash');
    });

    it('gives each fixture its own stack', () => {
      const first = makeSpell();
      const second = makeSpell();

      first.layers[0].note = 'edited';

      expect(second.layers[0].note).toBeNull();
    });
  });
});

describe('spellColumns', () => {
  it('names each field the way the database spells it', () => {
    const columns = spellColumns(makeSpell({ jarSize: '4 oz jar' }));

    expect(columns.jar_size).toBe('4 oz jar');
    expect(columns.workspace_id).toBe(WORKSPACE_W_ID);
    expect(columns.seal_wax_color).toBeNull();
  });

  // Both are other tables' rows.
  it('leaves out the categories and the layers', () => {
    const columns = spellColumns(makeSpell());

    expect(columns).not.toHaveProperty('categories');
    expect(columns).not.toHaveProperty('layers');
  });

  it('carries no audit columns', () => {
    for (const column of ['created_by', 'created_at', 'updated_by', 'updated_at']) {
      expect(spellColumns(makeSpell())).not.toHaveProperty(column);
    }
  });
});
