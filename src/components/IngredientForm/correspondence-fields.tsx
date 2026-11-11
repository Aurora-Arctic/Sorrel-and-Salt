import type { ReactElement, ReactNode } from 'react';
import { ListField, MultiSelectField } from './fields';
import { LookupListField, useCelestialBodySuggestions, useZodiacSuggestions } from './suggestions';
import { ELEMENT_OPTIONS } from './options';
import type { ListFieldName, MultiSelectFieldName, VariantPath } from './types';
import { FIELD_NOUNS } from './values';

type CorrespondenceField = 'elements' | 'celestialBodies' | 'zodiacSigns' | 'colors';

type CorrespondenceFieldsProps = {
  workspaceId: string | null;
  /** The path the four fields sit under in the form, such as a variant's `variants.0`. */
  prefix?: VariantPath;
  /** Suggest only from the compendium's curated values, as a compendium entry does. */
  pickOnly?: boolean;
  hints?: Partial<Record<CorrespondenceField, string>>;
  /** What sits beside each field's label; the lists hand it a function to announce with. */
  action?: (field: CorrespondenceField, announce?: (message: string) => void) => ReactNode;
};

/**
 * An ingredient's correspondences: its elements, celestial bodies, zodiac signs and colours, in the
 * order they are shown in the entry form, the cupboard form and a variant's card.
 */
const CorrespondenceFields = ({
  workspaceId,
  prefix,
  pickOnly,
  hints,
  action,
}: CorrespondenceFieldsProps): ReactElement => {
  const at = (field: CorrespondenceField): string => (prefix ? `${prefix}.${field}` : field);
  // The path is one of the two shapes the field types name, built from a field and an optional variant.
  const listAt = (field: CorrespondenceField) => at(field) as ListFieldName;
  const beside = (field: CorrespondenceField) =>
    action && ((announce: (message: string) => void) => action(field, announce));
  return (
    <>
      {/* Several at once, in the order chosen; none chosen is the answer "none", so there is no
          None to choose. */}
      <MultiSelectField
        name={at('elements') as MultiSelectFieldName}
        label={FIELD_NOUNS.elements.label}
        hint={hints?.elements}
        placeholder="Add an element"
        options={ELEMENT_OPTIONS}
        action={action?.('elements')}
      />
      {/* Each list but the colours suggests, from the curated vocabularies where there are some
          and from this coven and the compendium otherwise (claude-docs/components/ingredient-form.md,
          "Suggestion lists"). */}
      <LookupListField
        workspaceId={workspaceId}
        useSuggestions={useCelestialBodySuggestions}
        name={listAt('celestialBodies')}
        ordered
        pickOnly={pickOnly}
        legend={FIELD_NOUNS.celestialBodies.label}
        entry="Celestial Body"
        hint={hints?.celestialBodies}
        placeholder="Add a body"
        action={beside('celestialBodies')}
      />
      <LookupListField
        workspaceId={workspaceId}
        useSuggestions={useZodiacSuggestions}
        name={listAt('zodiacSigns')}
        ordered
        pickOnly={pickOnly}
        legend={FIELD_NOUNS.zodiacSigns.label}
        entry="Zodiac Sign"
        hint={hints?.zodiacSigns}
        placeholder="Add a sign"
        action={beside('zodiacSigns')}
      />
      <ListField
        name={listAt('colors')}
        ordered
        legend={FIELD_NOUNS.colors.label}
        entry="Colour"
        hint={hints?.colors}
        placeholder="Add a colour"
        action={beside('colors')}
      />
    </>
  );
};

export default CorrespondenceFields;
