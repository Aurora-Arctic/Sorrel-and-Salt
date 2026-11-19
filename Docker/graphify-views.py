"""Writes two views of src/ from graphify's full graph, both grouped by folder.

- <out>/view/graph.html, a map: one dot per folder, with lines for the calls
  and imports between folders.
- <out>/wiki/, a wiki: one page per folder, listing its files and functions,
  the folders it uses and is used by, and the test files that reach into it.

A folder is a module's part (modules/grimoire/services), a component, a route
up to three folders deep, or a folder of lib/, db/ and the rest. The groups
are folders rather than graphify's clusters, so their names never change
between rebuilds. The full graph, which the MCP server reads, is left as it is.

Usage: python graphify-views.py <graph.json> <out dir>
"""

import html
import json
import re
import shutil
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

# graphify's map has no settings for its layout or look, so the generated
# copy is patched: text in graphify's page, and what replaces it. The layout
# runs at a normal scale, where each module's pull holds its folders
# together, and graphify-view.js spreads it out once it settles. The last
# three hand the page to graphify-view.js, which adds the colours, the
# grouping, the fade, and the dot-size toggle.
PATCHES = {
    "gravitationalConstant: -60,": "gravitationalConstant: -120,",
    "springLength: 120,": "springLength: 200,",
    "avoidOverlap: 0.8,": "avoidOverlap: 1,",
    "stabilization: { iterations: 200,": "stabilization: { iterations: 600,",
    "smooth: { type: 'continuous', roundness: 0.2 }": "smooth: false",
    "font: n.font,": "font: { ...n.font, size: 12 },",
    "const neighborIds = network.getConnectedNodes(nodeId);":
        "const neighborIds = network.getConnectedNodes(nodeId).filter(id => !String(id).startsWith(VIEW_ANCHOR));",
    "const container = document.getElementById('graph');":
        "viewBeforeNetwork(nodesDS, edgesDS);\nconst container = document.getElementById('graph');",
    "// Theme toggle": "viewAfterNetwork(network, nodesDS, edgesDS);\n\n// Theme toggle",
}

VIEW_JS = Path(__file__).with_name("graphify-view.js")
VIEW_CSS = """
#size-wrap { display: flex; align-items: center; gap: 4px; padding: 8px 12px; border-bottom: 1px solid var(--border); font-size: 11px; color: var(--text-2); }
#size-wrap span { margin-right: 4px; }
#size-wrap button { flex: 1; background: var(--bg); color: var(--text-2); border: 1px solid var(--input-border); border-radius: 4px; padding: 3px 0; font-size: 11px; cursor: pointer; }
#size-wrap button:hover { color: var(--text); }
#size-wrap button[aria-pressed="true"] { background: #4E79A7; border-color: #4E79A7; color: #fff; }
"""

# Links that mean one piece of code uses another. graphify's "contains",
# "method" and "declares" only say where code is written.
USES = {
    "calls", "indirect_call", "imports", "imports_from", "re_exports",
    "references", "dynamic_import", "inherits",
}

# The most calls a wiki page lists between two folders, so a page stays readable.
MAX_CALLS = 15


def area_of(path: str) -> str | None:
    parts = path.split("/")[:-1]  # the file's folder
    if not parts or parts[0] != "src" or len(parts) < 2:
        return None
    top, rest = parts[1], parts[1:]
    if top == "components":
        return "/".join(rest[:2])
    if top == "modules":
        return "/".join(rest[:3])
    if top == "app":
        return "/".join(rest[:4])
    return "/".join(rest[:2])


def group_of(area: str) -> str:
    parts = area.split("/")
    if parts[0] == "modules" and len(parts) > 1:
        return f"modules/{parts[1]}"
    if parts[0] == "app" and len(parts) > 1 and parts[1].startswith("("):
        return f"app/{parts[1]}"
    return parts[0]


def line_of(node: dict) -> int:
    match = re.match(r"L(\d+)", node.get("source_location") or "")
    return int(match.group(1)) if match else 0


def write_atomically(path: Path, text: str) -> None:
    tmp = path.with_name(f".{path.name}.tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


class Graph:
    def __init__(self, graph: dict) -> None:
        self.nodes = {node["id"]: node for node in graph["nodes"]}
        self.links = graph.get("links", graph.get("edges", []))
        self.area_by_id = {}
        self.sizes = Counter()
        for node_id, node in self.nodes.items():
            area = area_of(node.get("source_file") or "")
            if area:
                self.area_by_id[node_id] = area
                self.sizes[area] += 1
        self.groups = sorted({group_of(area) for area in self.sizes})


def write_map(g: Graph, out: Path) -> None:
    weights = Counter()
    for link in g.links:
        a, b = g.area_by_id.get(link["source"]), g.area_by_id.get(link["target"])
        if a and b and a != b:
            weights[(a, b)] += 1

    nodes = [
        {
            "id": area,
            "label": area,
            "file_type": "code",
            "source_file": f"src/{area}",
            "community": g.groups.index(group_of(area)),
            "community_name": group_of(area),
        }
        for area in sorted(g.sizes)
    ]
    links = [
        {"source": a, "target": b, "relation": "depends_on", "confidence": "EXTRACTED", "weight": float(n)}
        for (a, b), n in sorted(weights.items())
    ]

    out.mkdir(parents=True, exist_ok=True)
    view = {"directed": True, "multigraph": False, "graph": {}, "nodes": nodes, "links": links}
    (out / "graph.json").write_text(json.dumps(view), encoding="utf-8")
    labels = {str(i): name for i, name in enumerate(g.groups)}
    (out / ".graphify_labels.json").write_text(json.dumps(labels), encoding="utf-8")

    subprocess.run(
        ["graphify", "export", "html", "--graph", str(out / "graph.json")],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    page = out / "graph.html"
    text = page.read_text(encoding="utf-8")
    for old, new in PATCHES.items():
        if old not in text:
            sys.exit(f"graphify's map changed; update PATCHES: {old!r} not found")
        text = text.replace(old, new)
    files = defaultdict(set)
    for node_id, area in g.area_by_id.items():
        files[area].add(g.nodes[node_id]["source_file"])
    counts = json.dumps({area: len(paths) for area, paths in files.items()})
    script = f"<style>{VIEW_CSS}</style>\n<script>\nconst VIEW_FILES = {counts};\n{VIEW_JS.read_text(encoding='utf-8')}</script>\n"
    if text.count("<script>") < 1:
        sys.exit("graphify's map changed; no <script> to add graphify-view.js before")
    text = text.replace("<script>", script + "<script>", 1)
    write_atomically(page, text)
    print(f"map: {len(nodes)} folders, {len(links)} links")


# --- The wiki ---------------------------------------------------------------

STYLE = """
:root { --bg: #fbfaf7; --text: #24221f; --muted: #6b665e; --line: #e3dfd7;
  --accent: #6b4fa0; --chip: #f0ece4; }
@media (prefers-color-scheme: dark) { :root { --bg: #16151a; --text: #e8e5df;
  --muted: #9c978e; --line: #2e2c33; --accent: #b59cf0; --chip: #242229; } }
body { margin: 0; background: var(--bg); color: var(--text);
  font: 15px/1.55 system-ui, sans-serif; }
main { max-width: 960px; margin: 0 auto; padding: 24px 16px 64px; }
a { color: var(--accent); text-decoration: none; } a:hover { text-decoration: underline; }
h1 { font-size: 1.6rem; margin: 0 0 4px; word-break: break-word; }
h2 { font-size: 1.1rem; margin: 32px 0 8px; padding-bottom: 4px; border-bottom: 1px solid var(--line); }
h3 { font-size: 0.95rem; margin: 18px 0 4px; }
code, .mono { font: 13px/1.5 ui-monospace, Menlo, monospace; }
.muted { color: var(--muted); } .crumbs { font-size: 0.9rem; margin-bottom: 16px; }
ul { padding-left: 20px; margin: 4px 0; } li { margin: 2px 0; }
.chip { display: inline-block; background: var(--chip); border-radius: 4px;
  padding: 0 6px; margin: 2px 4px 2px 0; font-size: 13px; }
details > summary { cursor: pointer; } input[type=search] { width: 100%;
  box-sizing: border-box; padding: 8px 10px; font: inherit; color: var(--text);
  background: var(--bg); border: 1px solid var(--line); border-radius: 6px; }
.group { margin-top: 20px; } .group h3 { margin-bottom: 2px; }
"""


def page_name(area: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "-", area).strip("-") + ".html"


def wrap(title: str, body: str) -> str:
    return (
        "<!doctype html><html lang='en'><head><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width, initial-scale=1'>"
        f"<title>{html.escape(title)}</title><style>{STYLE}</style></head>"
        f"<body><main>{body}</main></body></html>"
    )


def write_wiki(g: Graph, out: Path) -> None:
    files = defaultdict(lambda: defaultdict(list))  # area -> file -> symbols
    for node_id, node in g.nodes.items():
        area = g.area_by_id.get(node_id)
        if area and node.get("_callable"):
            files[area][node["source_file"]].append(node)
        elif area:
            files[area].setdefault(node["source_file"], [])

    uses = defaultdict(lambda: defaultdict(list))  # area -> used area -> calls
    tested = defaultdict(lambda: defaultdict(set))  # area -> test file -> names
    for link in g.links:
        if link.get("relation") not in USES:
            continue
        source, target = g.nodes.get(link["source"]), g.nodes.get(link["target"])
        b = g.area_by_id.get(link["target"])
        if not source or not target or not b:
            continue
        a = g.area_by_id.get(link["source"])
        if a and a != b:
            uses[a][b].append((source["label"], target["label"]))
        elif not a and (source.get("source_file") or "").startswith("tests/"):
            tested[b][source["source_file"]].add(target["label"])

    used_by = defaultdict(dict)
    for a, targets in uses.items():
        for b, calls in targets.items():
            used_by[b][a] = calls

    names = {area: page_name(area) for area in g.sizes}
    if len(set(names.values())) != len(names):
        sys.exit("two folders map to the same wiki page name")

    def link_to(area: str) -> str:
        return f"<a class='mono' href='{names[area]}'>{html.escape(area)}</a>"

    def call_list(calls: list) -> str:
        shown = Counter(calls).most_common(MAX_CALLS)
        items = "".join(
            f"<li class='mono'>{html.escape(s)} → {html.escape(t)}"
            + (f" <span class='muted'>×{n}</span>" if n > 1 else "")
            + "</li>"
            for (s, t), n in shown
        )
        more = len(set(calls)) - len(shown)
        tail = f"<li class='muted'>and {more} more</li>" if more > 0 else ""
        return f"<ul>{items}{tail}</ul>"

    def folder_section(title: str, pairs: dict, empty: str) -> str:
        if not pairs:
            return f"<h2>{title}</h2><p class='muted'>{empty}</p>"
        rows = "".join(
            f"<details><summary>{link_to(other)} <span class='muted'>"
            f"({len(calls)} link{'s' if len(calls) != 1 else ''})</span></summary>"
            f"{call_list(calls)}</details>"
            for other, calls in sorted(pairs.items(), key=lambda kv: -len(kv[1]))
        )
        return f"<h2>{title} <span class='muted'>({len(pairs)} folders)</span></h2>{rows}"

    tmp = out.with_name(f".{out.name}.tmp")
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True)

    for area in sorted(g.sizes):
        file_html = ""
        for path in sorted(files[area]):
            symbols = sorted(files[area][path], key=line_of)
            chips = "".join(
                f"<span class='chip mono'>{html.escape(s['label'])}"
                f" <span class='muted'>L{line_of(s)}</span></span>"
                for s in symbols
            )
            file_html += f"<h3 class='mono'>{html.escape(path)}</h3><div>{chips or '<span class=muted>No functions.</span>'}</div>"

        tests = tested.get(area, {})
        test_html = (
            "".join(
                f"<li><span class='mono'>{html.escape(path)}</span> "
                f"<span class='muted'>uses {html.escape(', '.join(sorted(used)[:8]))}"
                f"{' …' if len(used) > 8 else ''}</span></li>"
                for path, used in sorted(tests.items())
            )
            if tests
            else ""
        )

        body = (
            f"<div class='crumbs'><a href='index.html'>Wiki</a> · "
            f"{html.escape(group_of(area))}</div>"
            f"<h1 class='mono'>src/{html.escape(area)}</h1>"
            f"<p class='muted'>{len(files[area])} files · {g.sizes[area]} graph nodes</p>"
            f"<h2>Files</h2>{file_html}"
            + folder_section("Uses", uses.get(area, {}), "Uses no other folder in src/.")
            + folder_section("Used by", used_by.get(area, {}), "No other folder in src/ uses it.")
            + f"<h2>Tested by <span class='muted'>({len(tests)} files)</span></h2>"
            + (f"<ul>{test_html}</ul>" if tests else "<p class='muted'>No test file reaches into it.</p>")
        )
        (tmp / names[area]).write_text(wrap(f"src/{area}", body), encoding="utf-8")

    groups = defaultdict(list)
    for area in sorted(g.sizes):
        groups[group_of(area)].append(area)
    index = "".join(
        f"<div class='group'><h3>{html.escape(group)}</h3><ul>"
        + "".join(
            f"<li data-name='{html.escape(area)}'>{link_to(area)} <span class='muted'>"
            f"{len(files[area])} files · uses {len(uses.get(area, {}))} · "
            f"used by {len(used_by.get(area, {}))} · tested by {len(tested.get(area, {}))}</span></li>"
            for area in areas
        )
        + "</ul></div>"
        for group, areas in sorted(groups.items())
    )
    search = (
        "<input type='search' placeholder='Filter folders' aria-label='Filter folders' "
        "oninput=\"const q=this.value.toLowerCase();document.querySelectorAll('li[data-name]')"
        ".forEach(li=>li.hidden=!li.dataset.name.toLowerCase().includes(q));"
        "document.querySelectorAll('.group').forEach(d=>d.hidden="
        "!d.querySelector('li[data-name]:not([hidden])'))\">"
    )
    body = (
        "<h1>Sorrel &amp; Salt code wiki</h1>"
        f"<p class='muted'>One page per folder of src/, {len(g.sizes)} in all, built from "
        "graphify's graph and rebuilt with it. Also: <a href='../view/graph.html'>the map</a> · "
        "<a href='../GRAPH_TREE.html'>the folder tree</a></p>"
        f"{search}{index}"
    )
    (tmp / "index.html").write_text(wrap("Code wiki", body), encoding="utf-8")

    if out.exists():
        shutil.rmtree(out)
    tmp.replace(out)
    print(f"wiki: {len(g.sizes) + 1} pages")


def main(graph_path: str, out_dir: str) -> None:
    g = Graph(json.loads(Path(graph_path).read_text(encoding="utf-8")))
    out = Path(out_dir)
    write_map(g, out / "view")
    write_wiki(g, out / "wiki")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
