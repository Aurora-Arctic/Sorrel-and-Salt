import type { ICruiseResult } from 'dependency-cruiser';

export const CONFIG: string;
export const DEFAULT_BASE: string;
export const OUTPUT: string;
export function cruiseArguments(base?: string): string[];
export function runCruise(args: string[]): ICruiseResult;
export function affectedGraph(
  result: Pick<ICruiseResult, 'modules'> & {
    summary: Pick<ICruiseResult['summary'], 'totalCruised'>;
  },
  base: string,
): Promise<string>;
