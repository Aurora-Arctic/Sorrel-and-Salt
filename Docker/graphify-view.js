// Added to graphify's map page by graphify-views.py, which sets VIEW_FILES
// (each folder's file count) above it and calls the two functions below from
// graphify's own script: the first before the layout runs, the second after.

// One colour per group, picked to stay apart on both themes. graphify's
// palette has ten, so with eighteen groups two modules would share one.
const VIEW_PALETTE = [
  '#e6194b',
  '#3cb44b',
  '#ffe119',
  '#4363d8',
  '#f58231',
  '#911eb4',
  '#42d4f4',
  '#f032e6',
  '#bfef45',
  '#fabed4',
  '#469990',
  '#dcbeff',
  '#9a6324',
  '#aaffc3',
  '#808000',
  '#ffd8b1',
  '#a9a9a9',
  '#b03060',
];
const viewColour = (cid) => VIEW_PALETTE[cid] || `hsl(${(cid * 137.5) % 360}, 65%, 55%)`;

const VIEW_ANCHOR = 'anchor:';
const VIEW_LINE = { width: 0.5, opacity: 0.25 };
// How far the settled map is stretched. Stretching after the layout, rather
// than pushing the dots apart during it, keeps each module together.
const VIEW_STRETCH = 3.33;
const VIEW_SIZE_KEY = 'graphify-view-size';
const isLine = (e) => !String(e.id).startsWith(VIEW_ANCHOR);

// Called from graphify's page script, so nothing in this file uses it.
// eslint-disable-next-line no-unused-vars
function viewBeforeNetwork(nodesDS, edgesDS) {
  LEGEND.forEach((c) => {
    c.color = viewColour(c.cid);
  });
  RAW_NODES.forEach((n) => {
    const colour = viewColour(n.community);
    n.color = {
      background: colour,
      border: colour,
      highlight: { background: colour, border: '#ffffff' },
    };
  });

  // Each group gets an unseen dot, and an unseen line from it to each of the
  // group's folders, so a module's folders settle together. They are drawn
  // invisibly rather than hidden, because the layout ignores hidden dots.
  // Groups start round a circle so the layout need not pull them apart.
  const groups = [...new Set(RAW_NODES.map((n) => n.community))];
  const radius = 80 * groups.length;
  const centre = {};
  groups.forEach((cid, i) => {
    const angle = (2 * Math.PI * i) / groups.length;
    centre[cid] = { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
  nodesDS.update(
    RAW_NODES.map((n, i) => ({
      id: n.id,
      color: n.color,
      x: centre[n.community].x + 15 * Math.sqrt(i % 50) * Math.cos(i),
      y: centre[n.community].y + 15 * Math.sqrt(i % 50) * Math.sin(i),
    })),
  );
  const unseen = { background: 'rgba(0,0,0,0)', border: 'rgba(0,0,0,0)' };
  nodesDS.add(
    groups.map((cid) => ({
      id: VIEW_ANCHOR + cid,
      ...centre[cid],
      label: '',
      size: 1,
      borderWidth: 0,
      chosen: false,
      color: { ...unseen, highlight: unseen, hover: unseen },
    })),
  );
  edgesDS.add(
    RAW_NODES.map((n) => ({
      id: VIEW_ANCHOR + n.id,
      from: VIEW_ANCHOR + n.community,
      to: n.id,
      length: 60,
      width: 0,
      selectionWidth: 0,
      hoverWidth: 0,
      chosen: false,
      arrows: { to: { enabled: false } },
      color: {
        color: 'rgba(0,0,0,0)',
        highlight: 'rgba(0,0,0,0)',
        hover: 'rgba(0,0,0,0)',
        opacity: 0,
      },
    })),
  );
  // A link between two modules is drawn but does not pull, so it cannot
  // drag one module into another.
  const group = Object.fromEntries(RAW_NODES.map((n) => [n.id, n.community]));
  edgesDS.update(
    edgesDS.get({ filter: isLine }).map((e) => ({
      id: e.id,
      physics: group[e.from] === group[e.to],
      width: VIEW_LINE.width,
      color: { inherit: 'from', opacity: VIEW_LINE.opacity },
    })),
  );
}

// eslint-disable-next-line no-unused-vars
function viewAfterNetwork(network, nodesDS, edgesDS) {
  const lines = () => edgesDS.get({ filter: isLine });

  network.once('stabilizationIterationsDone', () => {
    network.setOptions({ physics: { enabled: false } });
    const pos = network.getPositions();
    for (const [id, p] of Object.entries(pos))
      network.moveNode(id, p.x * VIEW_STRETCH, p.y * VIEW_STRETCH);
    network.fit();
  });

  // Selecting a dot fades every dot and line not touching it.
  function focus(id) {
    if (id === undefined || id === null || !nodesDS.get(id)) return clear();
    const near = new Set(network.getConnectedNodes(id).concat([id]));
    nodesDS.update(RAW_NODES.map((n) => ({ id: n.id, opacity: near.has(n.id) ? 1 : 0.12 })));
    edgesDS.update(
      lines().map((e) => {
        const touches = e.from === id || e.to === id;
        return {
          id: e.id,
          width: touches ? 1.5 : VIEW_LINE.width,
          color: { inherit: 'from', opacity: touches ? 1 : 0.03 },
        };
      }),
    );
  }
  function clear() {
    nodesDS.update(RAW_NODES.map((n) => ({ id: n.id, opacity: 1 })));
    edgesDS.update(
      lines().map((e) => ({
        id: e.id,
        width: VIEW_LINE.width,
        color: { inherit: 'from', opacity: VIEW_LINE.opacity },
      })),
    );
  }
  // graphify's search and neighbour links select through selectNodes, which
  // fires no event, so the fade hooks it rather than listening.
  const select = network.selectNodes.bind(network);
  network.selectNodes = (ids, highlightEdges) => {
    select(ids, highlightEdges);
    focus(ids[0]);
  };
  network.on('click', (params) => {
    if (params.nodes.length) focus(params.nodes[0]);
    else clear();
  });

  // Dot size by connections (graphify's) or by file count.
  const byLinks = Object.fromEntries(RAW_NODES.map((n) => [n.id, n.size]));
  const maxFiles = Math.max(1, ...Object.values(VIEW_FILES));
  const byFiles = (id) => 8 + 32 * Math.sqrt((VIEW_FILES[id] || 0) / maxFiles);
  const wrap = document.createElement('div');
  wrap.id = 'size-wrap';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'Dot size');
  wrap.innerHTML =
    '<span>Dot size</span>' +
    '<button type="button" data-size="links">Connections</button>' +
    '<button type="button" data-size="files">Files</button>';
  document.getElementById('theme-wrap').after(wrap);
  function size(by) {
    nodesDS.update(
      RAW_NODES.map((n) => ({ id: n.id, size: by === 'files' ? byFiles(n.id) : byLinks[n.id] })),
    );
    wrap
      .querySelectorAll('button')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === by)));
    try {
      localStorage.setItem(VIEW_SIZE_KEY, by);
    } catch {
      // Storage may be blocked; the view still works.
    }
  }
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) size(b.dataset.size);
  });
  let saved = null;
  try {
    saved = localStorage.getItem(VIEW_SIZE_KEY);
  } catch {
    // Storage may be blocked; the view still works.
  }
  size(saved === 'files' ? 'files' : 'links');
}
