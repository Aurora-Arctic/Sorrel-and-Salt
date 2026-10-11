// The Deities page's action where the address names no tab's, which Next
// asks a slot for on a full load it cannot match (Next's `default.js`):
// none, rather than an error. Every tab has its own slot page, so a tab
// switch never keeps the previous tab's action.
export default function NoAction() {
  return null;
}
