import fs from 'node:fs';

// Appends one step output to $GITHUB_OUTPUT. The random delimiter lets the
// value span lines.
export function setOutput(name, value) {
  const delim = `ghadelim_${Math.random().toString(36).slice(2)}`;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delim}\n${value}\n${delim}\n`);
}
