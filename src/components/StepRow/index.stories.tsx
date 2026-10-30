import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { type ReactNode, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { StatesGrid } from '../../../.storybook/states-grid';
import { GripIcon } from '../Combobox/icons';
import { ChevronIcon, CrossIcon } from '../IconTip/icons';
import { SelectField, TextField } from '../Field';
import { EditIcon } from '../IngredientForm/icons';
import SafetyNote, { SafetyMark } from '../SafetyNote';
import { UNIT_OPTIONS } from '../StockFields';
import StepRow from '.';
import OneOffBadge from './one-off-badge';

// Render-only; what shows and when is asserted in tests/components/StepRow. The builder's own
// row (SpellBuilder / Spell Builder, With Steps) wires these slots to the spell's form; here the
// slots hold the same fields and buttons with nothing behind them.
const meta = {
  title: 'Grimoire / Step Row',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const List = ({ children }: { children: ReactNode }) => (
  <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>{children}</ol>
);

const NAME = 'Testwort (Dried Leaf)';
const SAFETY = { toxic: true, safetyNotes: 'Keep away from the skin; wash hands after use.' };
// Notes without toxicity: SafetyMark draws Caution rather than Toxic.
const CAUTION = { toxic: false, safetyNotes: 'Strong scent; air the room while working.' };

interface Values {
  quantity: string;
  unit: string;
  body: string;
}

const EditButton = ({ open, onClick }: { open: boolean; onClick: () => void }) => (
  <button
    type="button"
    className={['step-row__edit', open && 'step-row__edit--close'].filter(Boolean).join(' ')}
    aria-label={`${open ? 'Close' : 'Edit'} ${NAME}`}
    aria-expanded={open}
    aria-controls="story-step-fields"
    onClick={onClick}
  >
    {open ? <ChevronIcon /> : <EditIcon />}
  </button>
);

// A card that opens and closes from its pencil or its face, as the builder's does.
function Card({ initiallyOpen, editing }: { initiallyOpen: boolean; editing?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const methods = useForm<Values>({
    defaultValues: { quantity: '2', unit: 'tsp', body: 'Crush it first' },
  });
  const toggle = () => setOpen((was) => !was);
  return (
    <FormProvider {...methods}>
      <List>
        <StepRow
          open={open}
          fieldsId="story-step-fields"
          onToggle={toggle}
          position={2}
          name={NAME}
          icon="botanical"
          summary="2 tsp · Crush it first"
          edit={<EditButton open={open} onClick={toggle} />}
          handle={
            editing ? (
              <button type="button" className="spell-step__handle" aria-label={`Move ${NAME}`}>
                <GripIcon />
              </button>
            ) : undefined
          }
          quantityField={
            <TextField<Values>
              name="quantity"
              label="Quantity"
              labelSuffix={NAME}
              type="number"
              placeholder="Amount"
            />
          }
          unitField={
            <SelectField<Values>
              name="unit"
              label="Unit"
              labelSuffix={NAME}
              options={UNIT_OPTIONS}
            />
          }
          bodyField={
            <TextField<Values>
              name="body"
              label="Instruction"
              labelSuffix={NAME}
              placeholder="Add an instruction"
              multiline
              rows={2}
            />
          }
          actions={
            editing && !open ? (
              <button
                type="button"
                className="step-row__remove"
                aria-label={`Remove ${NAME}`}
                onClick={fn()}
              >
                <CrossIcon />
              </button>
            ) : null
          }
        />
      </List>
    </FormProvider>
  );
}

export const States: Story = {
  render: () => (
    <StatesGrid
      cell="22rem"
      states={{
        'Instruction Only': (
          <List>
            <StepRow position={1} name={null} body="Light the candle" />
          </List>
        ),
        'Ingredient Only': (
          <List>
            <StepRow position={2} name={NAME} icon="botanical" quantity="2" unit="tsp" />
          </List>
        ),
        'Ingredient With Instruction': (
          <List>
            <StepRow
              position={3}
              name={NAME}
              icon="botanical"
              quantity="2"
              unit="tsp"
              body="Crush it first"
            />
          </List>
        ),
        'One-Off Without Amount': (
          <List>
            <StepRow position={4} name="Fixture Candle" badge={<OneOffBadge />} />
          </List>
        ),
        Toxic: (
          <List>
            <StepRow
              position={5}
              name="Mockleaf (Oil)"
              icon="fluid"
              quantity="30"
              unit="ml"
              marks={<SafetyMark {...SAFETY} />}
              note={<p className="meta">Dilute before use</p>}
            />
          </List>
        ),
        'Toxic, Open': (
          <List>
            <StepRow
              open
              fieldsId="story-toxic-fields"
              position={5}
              name="Mockleaf (Oil)"
              icon="fluid"
              marks={<SafetyMark {...SAFETY} />}
              // Level 4 under the grid's level-3 names; the builder's step list puts it at 5.
              note={<SafetyNote level={4} compact {...SAFETY} />}
            />
          </List>
        ),
        'Caution, Open': (
          <List>
            <StepRow
              open
              fieldsId="story-caution-fields"
              position={6}
              name="Testmoss (Dried)"
              icon="botanical"
              marks={<SafetyMark {...CAUTION} />}
              note={<SafetyNote level={4} compact {...CAUTION} />}
            />
          </List>
        ),
        Folded: <Card initiallyOpen={false} />,
        Unfolded: <Card initiallyOpen />,
        Editing: <Card initiallyOpen={false} editing />,
      }}
    />
  ),
};
