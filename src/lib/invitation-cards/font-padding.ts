// A TrueType font rewritten with every glyph padded to four bytes and a long `loca`, which the
// subsetter in `@pdf-lib/fontkit` needs: it misplaces glyphs whose data has an odd length.
// The outlines, metrics and every other table are kept byte for byte.

const TABLE_RECORD = 16;
const DIRECTORY = 12;

interface Table {
  tag: string;
  data: Uint8Array;
}

function tagAt(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

function padded(length: number): number {
  return (length + 3) & ~3;
}

function checksum(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 4) {
    const word =
      i + 4 <= bytes.length
        ? view.getUint32(i)
        : [0, 1, 2, 3].reduce((w, k) => (w << 8) | (bytes[i + k] ?? 0), 0) >>> 0;
    sum = (sum + word) >>> 0;
  }
  return sum;
}

function readTables(bytes: Uint8Array): { version: number; tables: Table[] } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(4);
  const tables: Table[] = [];
  for (let i = 0; i < count; i += 1) {
    const record = DIRECTORY + i * TABLE_RECORD;
    const offset = view.getUint32(record + 8);
    const length = view.getUint32(record + 12);
    tables.push({ tag: tagAt(view, record), data: bytes.slice(offset, offset + length) });
  }
  return { version: view.getUint32(0), tables };
}

function rebuildGlyphs(glyf: Uint8Array, loca: Uint8Array, longLoca: boolean, numGlyphs: number) {
  const view = new DataView(loca.buffer, loca.byteOffset, loca.byteLength);
  const offsetOf = (i: number) => (longLoca ? view.getUint32(i * 4) : view.getUint16(i * 2) * 2);
  const glyphs: Uint8Array[] = [];
  for (let i = 0; i < numGlyphs; i += 1) glyphs.push(glyf.subarray(offsetOf(i), offsetOf(i + 1)));
  const out = new Uint8Array(glyphs.reduce((sum, glyph) => sum + padded(glyph.length), 0));
  const newLoca = new Uint8Array((numGlyphs + 1) * 4);
  const locaView = new DataView(newLoca.buffer);
  let at = 0;
  glyphs.forEach((glyph, i) => {
    locaView.setUint32(i * 4, at);
    out.set(glyph, at);
    at += padded(glyph.length);
  });
  locaView.setUint32(numGlyphs * 4, at);
  return { glyf: out, loca: newLoca };
}

export function padGlyphs(bytes: Uint8Array): Uint8Array {
  const { version, tables } = readTables(bytes);
  const find = (tag: string) => {
    const table = tables.find((t) => t.tag === tag);
    if (!table) throw new Error(`The font has no ${tag} table`);
    return table;
  };
  const head = find('head');
  const headView = new DataView(head.data.buffer, head.data.byteOffset, head.data.byteLength);
  const maxp = find('maxp');
  const numGlyphs = new DataView(maxp.data.buffer, maxp.data.byteOffset).getUint16(4);
  const glyf = find('glyf');
  const loca = find('loca');
  const rebuilt = rebuildGlyphs(glyf.data, loca.data, headView.getInt16(50) === 1, numGlyphs);
  glyf.data = rebuilt.glyf;
  loca.data = rebuilt.loca;
  headView.setInt16(50, 1);
  headView.setUint32(8, 0);

  tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  const headerLength = DIRECTORY + tables.length * TABLE_RECORD;
  const total = tables.reduce((sum, table) => sum + padded(table.data.length), headerLength);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  const entrySelector = Math.floor(Math.log2(tables.length));
  const searchRange = 2 ** entrySelector * 16;
  view.setUint32(0, version);
  view.setUint16(4, tables.length);
  view.setUint16(6, searchRange);
  view.setUint16(8, entrySelector);
  view.setUint16(10, tables.length * 16 - searchRange);
  let at = headerLength;
  let headOffset = 0;
  tables.forEach((table, i) => {
    const record = DIRECTORY + i * TABLE_RECORD;
    for (let k = 0; k < 4; k += 1) view.setUint8(record + k, table.tag.charCodeAt(k));
    view.setUint32(record + 4, checksum(table.data));
    view.setUint32(record + 8, at);
    view.setUint32(record + 12, table.data.length);
    out.set(table.data, at);
    if (table.tag === 'head') headOffset = at;
    at += padded(table.data.length);
  });
  view.setUint32(headOffset + 8, (0xb1b0afba - checksum(out)) >>> 0);
  return out;
}
