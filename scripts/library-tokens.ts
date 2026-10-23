// Entry for the library build's stylesheet (vite.components.config.ts). A
// stylesheet cannot be a build entry by itself, so this imports the global one,
// which holds the theme tokens every component's Sass module reads.
import '../src/app/globals.scss';
