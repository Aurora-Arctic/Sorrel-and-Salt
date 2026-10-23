// Fork of lib/preview-gen-storybook.mjs as a thin wrapper (reason in config.json libOverrides):
// a preview for a story module that imports .storybook/mock-api starts the fake fetch worker and
// runs the story's (and meta's) `beforeEach` before it renders, as Storybook's msw loader does.
// compose() never runs beforeEach. Other previews are untouched.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generatePreviewSource as base } from '../../.ds-sync/lib/preview-gen-storybook.mjs';

const HARNESS = `
import { startMockWorker } from '@ds-stories/.storybook/mock-api';
function composeMocked(S: any, key: string) {
  const Inner: any = compose(S, key);
  const meta: any = S.default ?? {};
  const st: any = S[key];
  const hooks: any[] = ([] as any[]).concat(meta.beforeEach ?? [], (st && st.beforeEach) ?? []);
  return function Mocked() {
    const [ready, setReady] = React.useState(false);
    React.useEffect(() => {
      let off = false;
      (async () => {
        const w: any = await startMockWorker();
        for (const h of hooks) await h({ msw: { use: (...a: any[]) => w.use(...a) }, args: { ...(meta.args ?? {}), ...((st && st.args) ?? {}) } });
        if (!off) setReady(true);
      })();
      return () => { off = true; };
    }, []);
    return ready ? React.createElement(Inner) : null;
  };
}
`;

export function generatePreviewSource(c, opts) {
  const src = base(c, opts);
  if (!src) return src;
  const files = new Set([c.storySrc, ...(c.storyIds ?? []).map((s) => s.storySrc)].filter(Boolean));
  const uses = [...files].some((f) => {
    try {
      return /mock-api/.test(readFileSync(resolve(f), 'utf8'));
    } catch {
      return false;
    }
  });
  if (!uses) return src;
  return src.replace(/= (\/\* .*? \*\/ )compose\(/g, '= $1composeMocked(') + HARNESS;
}
