import type { ProbeSet } from '../types';
import { dbClientBoundary } from './db-client-boundary';
import { deleteIsTheBin } from './delete-is-the-bin';
import { jobBoundary } from './job-boundary';
import { loaderBoundary } from './loader-boundary';

export const PROBE_SETS: ProbeSet[] = [
  dbClientBoundary,
  loaderBoundary,
  jobBoundary,
  deleteIsTheBin,
];

export const LINTED_FILES = PROBE_SETS.flatMap((set) => [...set.probes.keys(), ...set.files]);
