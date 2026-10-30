import { FIXTURE_USERS } from './standard';
import type { SeedWorking } from './types';

const A = FIXTURE_USERS.A.id;
const B = FIXTURE_USERS.B.id;
const C = FIXTURE_USERS.C.id;

// The spells, by the ids `DEMO_SPELLS` gives them.
const HEARTH_WARDING_JAR = '00000000-0000-0000-0002-000000000001';
const HEARTH_FIRE_BLESSING = '00000000-0000-0000-0002-000000000003';
const COLD_HEARTH_CLEANSING = '00000000-0000-0000-0002-000000000004';
const THRESHOLD_SALT_LINE = '00000000-0000-0000-0002-000000000006';
const MUGWORT_SEEING_WASH = '00000000-0000-0000-0002-000000000016';

// The jars, by the ids `DEMO_STOCK` gives them.
const SEA_SALT_JAR = '00000000-0000-0000-0003-000000000011';
const ASH_JAR = '00000000-0000-0000-0003-000000000001';
const MUGWORT_JAR = '00000000-0000-0000-0003-000000000008';

const working = (id: number) => `00000000-0000-0000-0004-${String(id).padStart(12, '0')}`;

const take = (stepPosition: number, jarId: string, quantity: string, shortfall = '0.000') =>
  ({ stepPosition, jarId, quantity, unit: 'g', shortfall }) as const;

/**
 * W's workings, in the block `…0004-…`: complete ones that took from the jars, and drafts that took nothing. Each deduction
 * is what `planDeductions` decides for its spell's steps against the jars as they stood on that day, in date order, and the
 * jars are decremented by it when the working is first written. Mugwort runs short on the second wash, so its shortfall shows.
 */
export const DEMO_WORKINGS: SeedWorking[] = [
  {
    id: working(1),
    spellId: COLD_HEARTH_CLEANSING,
    recorder: A,
    status: 'complete',
    workedOn: '2026-07-18',
    note: 'The first cold snap. The room smelled of nothing but cold stone by morning.',
    visibility: 'workspace',
    participants: [{ userId: A }, { userId: B }],
    deductions: [take(2, SEA_SALT_JAR, '15.000')],
  },
  {
    id: working(2),
    spellId: COLD_HEARTH_CLEANSING,
    recorder: B,
    status: 'complete',
    workedOn: '2026-08-29',
    note: null,
    visibility: 'workspace',
    participants: [],
    deductions: [take(2, SEA_SALT_JAR, '15.000')],
  },
  {
    id: working(3),
    spellId: COLD_HEARTH_CLEANSING,
    recorder: A,
    status: 'complete',
    workedOn: '2026-10-11',
    note: 'For the spare room, before Wren stayed over.',
    visibility: 'private',
    participants: [{ name: 'Wren' }],
    deductions: [take(2, SEA_SALT_JAR, '15.000')],
  },
  {
    id: working(4),
    spellId: COLD_HEARTH_CLEANSING,
    recorder: B,
    status: 'draft',
    workedOn: '2026-10-27',
    note: 'Planned for the attic room, once the windows are fixed.',
    visibility: 'workspace',
    participants: [],
    deductions: [],
  },
  {
    id: working(5),
    spellId: THRESHOLD_SALT_LINE,
    recorder: A,
    status: 'complete',
    workedOn: '2026-09-06',
    note: null,
    visibility: 'workspace',
    participants: [{ userId: B }],
    deductions: [take(1, SEA_SALT_JAR, '30.000')],
  },
  {
    id: working(6),
    spellId: THRESHOLD_SALT_LINE,
    recorder: A,
    status: 'draft',
    workedOn: '2026-10-25',
    note: 'Back door as well this time.',
    visibility: 'private',
    participants: [],
    deductions: [],
  },
  {
    id: working(7),
    spellId: MUGWORT_SEEING_WASH,
    recorder: B,
    status: 'complete',
    workedOn: '2026-08-15',
    note: 'Full moon. The bowl showed the garden wall and then something behind it.',
    visibility: 'workspace',
    participants: [],
    deductions: [take(1, MUGWORT_JAR, '3.000')],
  },
  {
    id: working(8),
    spellId: MUGWORT_SEEING_WASH,
    recorder: A,
    status: 'complete',
    workedOn: '2026-10-02',
    note: 'Used the last of the mugwort. Need more.',
    visibility: 'workspace',
    participants: [{ userId: A }, { name: 'Wren' }],
    deductions: [take(1, MUGWORT_JAR, '1.000', '2.000')],
  },
  {
    id: working(9),
    spellId: HEARTH_FIRE_BLESSING,
    recorder: A,
    status: 'complete',
    workedOn: '2026-09-21',
    note: 'All three of us at the grate.',
    visibility: 'workspace',
    participants: [{ userId: A }, { userId: B }, { userId: C }],
    deductions: [take(2, ASH_JAR, '5.000')],
  },
  {
    id: working(10),
    spellId: HEARTH_WARDING_JAR,
    recorder: A,
    status: 'complete',
    workedOn: '2026-07-04',
    note: null,
    visibility: 'workspace',
    participants: [{ userId: A }, { name: 'Maren' }],
    // Only the sea salt: Black Salt is not in stock, the dust is a custom layer, the ash is in pinches and the jar is in grams, and the rosemary has no amount.
    deductions: [take(2, SEA_SALT_JAR, '30.000')],
  },
  {
    id: working(11),
    spellId: HEARTH_WARDING_JAR,
    recorder: B,
    status: 'draft',
    workedOn: '2026-10-28',
    note: 'A second jar for the cellar door.',
    visibility: 'workspace',
    participants: [],
    deductions: [],
  },
];
