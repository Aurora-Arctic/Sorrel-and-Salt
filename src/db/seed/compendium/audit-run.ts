import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AuditReport } from '../types';
import { auditCompendium, flaggedCandidates, wikiKey } from './audit';
import { applyAudit } from './audit-apply';
import {
  applyResolutions,
  resolveCitations,
  type PageLookup,
  type Resolution,
  type ResolveReport,
} from './audit-resolve';
import { loadCompendium } from './load';

// The attribution audit's reading and writing: the fetched Wikipedia
// pages from disk, the compendium through the seed's own loader, and, on
// `apply` alone, each flagged file written back. `report` writes nothing.

/**
 * The fetched Wikipedia pages under `dirs`, by `wikiKey(title)`: each `<Title>.wikitext` opens with `TITLE:`, `REVID:`, `PERMALINK:` and
 * `FETCHED:` lines and a `----` line. A page is found by its `TITLE:` and by its file name both.
 */
export function readWikiPages(dirs: readonly string[]): Map<string, string> {
  const pages = new Map<string, string>();
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.wikitext')) continue;
      const raw = readFileSync(join(dir, name), 'utf8');
      const split = /^----\r?$/m.exec(raw);
      const header = split ? raw.slice(0, split.index) : '';
      const body = split ? raw.slice(split.index + split[0].length) : raw;
      const title = /^TITLE:\s*(.+)$/m.exec(header)?.[1];
      pages.set(wikiKey(name.slice(0, -'.wikitext'.length)), body);
      if (title) pages.set(wikiKey(title), body);
    }
  }
  return pages;
}

/** Every `<base>/*\/wiki` folder that exists: the shard folders the seed lanes fetched into. */
export function shardWikiDirs(base: string): string[] {
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(base, entry.name, 'wiki'))
    .filter((dir) => existsSync(dir));
}

export interface AuditRunOptions {
  /** The compendium folder. */
  root: string;
  wiki: ReadonlyMap<string, string>;
  mode: 'report' | 'apply';
  /** On `apply`, write the candidates that name no other formal name too. */
  includeUnnamed?: boolean;
}

export interface AuditRunResult {
  report: AuditReport;
  /** The files `apply` changed, relative to the root; empty on `report`. */
  changed: string[];
  /** Why a file could not be read or written; the loader's issues stop the run. */
  issues: string[];
}

/** The audit over the files under `root`, and on `apply` the flagged files written back. */
export function runAudit(options: AuditRunOptions): AuditRunResult {
  const loaded = loadCompendium(options.root);
  if (loaded.issues.length > 0) {
    return {
      report: { files: 0, citations: 0, candidates: [], stated: [] },
      changed: [],
      issues: loaded.issues,
    };
  }
  const report = auditCompendium(loaded, options.wiki);
  const changed: string[] = [];
  const issues: string[] = [];
  if (options.mode === 'apply') {
    const byPath = new Map<string, typeof report.candidates>();
    for (const candidate of flaggedCandidates(report, { includeUnnamed: options.includeUnnamed })) {
      byPath.set(candidate.path, [...(byPath.get(candidate.path) ?? []), candidate]);
    }
    for (const [path, candidates] of byPath) {
      const file = join(options.root, path);
      const text = readFileSync(file, 'utf8');
      const result = applyAudit(path, text, candidates);
      if ('issue' in result) issues.push(result.issue);
      else if (result.text !== text) {
        writeFileSync(file, result.text);
        changed.push(path);
      }
    }
  }
  return { report, changed, issues };
}

export interface ResolveRunOptions {
  /** The compendium folder. */
  root: string;
  lookup: PageLookup;
  /** The fetched Wikipedia pages, read for a taxobox naming an entry's own article. */
  wiki?: ReadonlyMap<string, string>;
  /** Settle and report, writing no file. */
  dryRun?: boolean;
}

export interface ResolveRunResult extends ResolveReport {
  /** The files written, relative to the root. */
  changed: string[];
  issues: string[];
}

/** `--resolve` over the files under `root`: each resolvable citation written back as `resolved`. */
export function runResolve(options: ResolveRunOptions): ResolveRunResult {
  const loaded = loadCompendium(options.root);
  if (loaded.issues.length > 0) {
    return { resolutions: [], unresolved: [], changed: [], issues: loaded.issues };
  }
  const report = resolveCitations(loaded, options.lookup, options.wiki);
  const byPath = new Map<string, Resolution[]>();
  for (const resolution of report.resolutions) {
    byPath.set(resolution.path, [...(byPath.get(resolution.path) ?? []), resolution]);
  }
  const changed: string[] = [];
  const issues: string[] = [];
  for (const [path, resolutions] of byPath) {
    const file = join(options.root, path);
    const text = readFileSync(file, 'utf8');
    const result = applyResolutions(path, text, resolutions);
    if ('issue' in result) issues.push(result.issue);
    else if (result.text !== text) {
      if (!options.dryRun) writeFileSync(file, result.text);
      changed.push(path);
    }
  }
  return { ...report, changed, issues };
}
