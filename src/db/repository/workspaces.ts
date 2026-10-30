import { and, eq } from 'drizzle-orm';
import { workspaces } from '../../modules/coven/schema/workspaces';
import { notSoftDeleted } from './predicates';
import { selectOne } from './select';

/**
 * The live demo coven, or none where the seed has not run. A read that takes no proof: it names the one coven every account is
 * seated in, so no caller holds a membership to show, and the index's export list is pinned.
 */
export function findDemoWorkspace(): Promise<typeof workspaces.$inferSelect | undefined> {
  return selectOne(workspaces, and(notSoftDeleted(workspaces), eq(workspaces.demo, true)));
}
