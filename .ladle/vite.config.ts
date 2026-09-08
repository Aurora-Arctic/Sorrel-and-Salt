import { defineConfig } from 'vite';

// Vite overrides Ladle merges into its own config. The only thing that matters
// here is Sass: a component's `@use '../../scss/variables' as *;` must resolve
// in the workshop exactly the way it resolves under `next dev`, or the workshop
// and the app disagree about what a token is.
//
// Next 16 runs dart-sass through sass-loader with no `sassOptions`, which lands
// on the modern API with load paths left empty — resolution is purely relative
// to the importing file (see node_modules/next/dist/compiled/sass-loader). Vite
// 6's Sass default is the same modern compiler with the same empty load paths,
// so parity needs no option set. This block is the single place to keep the two
// aligned if Next ever gains a `sassOptions`; `api` is pinned explicitly so a
// future Vite default flip cannot move the workshop off that shared pipeline.
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
});
