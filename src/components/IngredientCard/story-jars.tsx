import JarLines from '../JarLines';
import type { JarLine } from '../JarLines/types';

const JARS = {
  leaf: {
    id: 'leaf',
    form: 'dried leaf',
    icon: 'botanical',
    quantity: 6,
    unit: 'g',
    threshold: 10,
  },
  oil: { id: 'oil', form: 'oil', icon: 'fluid', quantity: 0, unit: 'ml', threshold: 10 },
} satisfies Record<string, JarLine>;

// Jar lines for the card stories, drawn by the one component the Ingredients page uses
// (JarLines), so no story keeps its own copy of the markup. A jar may only name a form on its
// own card's forms line, so a card that lacks one of the two passes `jars` for the ones it has.
export const Jars = ({ jars = ['leaf', 'oil'] }: { jars?: readonly ('leaf' | 'oil')[] }) => (
  <JarLines jars={jars.map((key) => JARS[key])} />
);
