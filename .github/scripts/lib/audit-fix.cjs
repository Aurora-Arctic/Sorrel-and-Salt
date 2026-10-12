// The "Fix available" cell of audit-comment.cjs's package table. npm's
// `fixAvailable` object names what `npm audit fix --force` would install, and
// when no patched release exists that can be an older major than the one
// installed (@graphql-codegen/cli 7.4.4 → 3.2.0, for braces' advisory). That
// is a downgrade, not a fix, so it reads as a No.
const semver = require('semver');

/**
 * @param fixAvailable npm audit's `fixAvailable`: a boolean, or the
 *   `{ name, version, isSemVerMajor }` it would install.
 * @param installedVersion the installed version of `fixAvailable.name`, from
 *   the lockfile; without it the suggestion is taken at its word.
 */
function fixCell(fixAvailable, installedVersion) {
  if (fixAvailable === true) return 'Yes';
  if (!fixAvailable || typeof fixAvailable !== 'object') return 'No';

  const { name, version, isSemVerMajor } = fixAvailable;
  if (installedVersion && semver.valid(installedVersion) && semver.lt(version, installedVersion)) {
    return `No — downgrade only (${name}@${version})`;
  }
  return `Yes (${name}@${version}${isSemVerMajor ? ', major' : ''})`;
}

module.exports = { fixCell };
