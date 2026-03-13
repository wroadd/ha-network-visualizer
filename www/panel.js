/**
 * Zigbee & Z-Wave Network Visualizer Panel
 * Home Assistant Custom Panel
 *
 * Data sources:
 *  - Zigbee2MQTT: via HA WebSocket API (MQTT sensor states + zigbee2mqtt/bridge/devices, networkmap)
 *  - Z-Wave JS: via HA WebSocket API (zwave_js/get_nodes, zwave_js/network_statistics)
 *
 * Requires: D3.js v7 (loaded dynamically)
 */

const VERSION = "1.0.0";

// ─── Styles ────────────────────────────────────────────────────────────────

const STYLES = `
  :host {
    display: block;
    width: 100%;
    height: 100%;
    font-family: var(--primary-font-family, 'Inter', sans-serif);
    color: var(--primary-text-color, #e1e1e1);
    background: var(--primary-background-color, #111827);
    --accent-zigbee: #22d3ee;
    --accent-zwave: #a78bfa;
    --accent-coord: #f59e0b;
    --accent-router: #34d399;
    --accent-end: #94a3b8;
    --accent-ok: #22c55e;
    --accent-warn: #f59e0b;
    --accent-error: #ef4444;
    --surface: #1e293b;
    --surface-2: #0f172a;
    --border: rgba(255,255,255,0.08);
    --text-muted: #64748b;
    --text-sm: 11px;
    --text-base: 13px;
    --radius: 10px;
    --transition: 0.2s cubic-bezier(0.4,0,0.2,1);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .panel {
    display: grid;
    grid-template-rows: 52px 1fr;
    height: 100dvh;
    overflow: hidden;
    background: var(--surface-2);
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 20px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    z-index: 20;
  }
  .header-logo svg { flex-shrink: 0; }
  .header-title {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--primary-text-color, #e1e1e1);
  }
  .header-subtitle {
    font-size: var(--text-sm);
    color: var(--text-muted);
    margin-top: 1px;
  }
  .header-spacer { flex: 1; }
  .header-actions { display: flex; gap: 8px; align-items: center; }

  .btn {
    display: flex; align-items: center; gap: 5px;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--primary-text-color, #e1e1e1);
    transition: background var(--transition), border-color var(--transition);
  }
  .btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.18); }
  .btn.primary { background: rgba(34,211,238,0.12); border-color: var(--accent-zigbee); color: var(--accent-zigbee); }
  .btn.primary:hover { background: rgba(34,211,238,0.22); }

  .tab-bar {
    display: flex;
    gap: 2px;
    background: var(--surface-2);
    border-radius: 7px;
    padding: 2px;
    border: 1px solid var(--border);
  }
  .tab {
    padding: 4px 12px;
    border-radius: 5px;
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background var(--transition), color var(--transition);
    color: var(--text-muted);
    border: none;
    background: none;
  }
  .tab.active { background: var(--surface); color: var(--primary-text-color, #e1e1e1); }
  .tab.zigbee.active { color: var(--accent-zigbee); }
  .tab.zwave.active { color: var(--accent-zwave); }

  .status-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--accent-error);
    flex-shrink: 0;
  }
  .status-dot.connected { background: var(--accent-ok); }
  .status-dot.loading { background: var(--accent-warn); animation: pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

  /* ── Main content ── */
  .content {
    display: grid;
    grid-template-columns: 260px 1fr 300px;
    overflow: hidden;
    height: 100%;
  }

  /* ── Left sidebar: device list ── */
  .device-list {
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .device-list-header {
    padding: 12px 14px 8px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .device-list-header h3 { font-size: var(--text-sm); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .device-count { font-size: var(--text-sm); color: var(--text-muted); background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 999px; }

  .search-input {
    margin: 8px 10px;
    padding: 6px 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: var(--text-sm);
    color: var(--primary-text-color, #e1e1e1);
    width: calc(100% - 20px);
    outline: none;
  }
  .search-input:focus { border-color: var(--accent-zigbee); }

  .device-scroll { overflow-y: auto; flex: 1; overscroll-behavior: contain; }

  .device-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 12px;
    cursor: pointer;
    border-bottom: 1px solid var(--border);
    transition: background var(--transition);
    position: relative;
  }
  .device-item:hover { background: rgba(255,255,255,0.04); }
  .device-item.selected { background: rgba(34,211,238,0.07); }
  .device-item.zwave { }
  .device-item.zwave.selected { background: rgba(167,139,250,0.07); }

  .device-icon {
    width: 26px; height: 26px;
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
    flex-shrink: 0;
  }
  .device-icon.coordinator { background: rgba(245,158,11,0.18); color: var(--accent-coord); }
  .device-icon.router { background: rgba(52,211,153,0.18); color: var(--accent-router); }
  .device-icon.end-device { background: rgba(148,163,184,0.12); color: var(--accent-end); }
  .device-icon.zwave-controller { background: rgba(167,139,250,0.18); color: var(--accent-zwave); }
  .device-icon.zwave-node { background: rgba(167,139,250,0.10); color: var(--accent-zwave); }

  .device-info { flex: 1; min-width: 0; }
  .device-name { font-size: var(--text-sm); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .device-meta { font-size: 10px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .lqi-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 4px;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .lqi-good { background: rgba(34,197,94,0.15); color: var(--accent-ok); }
  .lqi-warn { background: rgba(245,158,11,0.15); color: var(--accent-warn); }
  .lqi-bad  { background: rgba(239,68,68,0.15);  color: var(--accent-error); }

  /* ── Graph area ── */
  .graph-area {
    position: relative;
    overflow: hidden;
    background: var(--surface-2);
  }

  .graph-canvas {
    width: 100%;
    height: 100%;
  }

  .graph-controls {
    position: absolute;
    bottom: 16px;
    right: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .graph-btn {
    width: 32px; height: 32px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--primary-text-color, #e1e1e1);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    transition: background var(--transition);
  }
  .graph-btn:hover { background: rgba(255,255,255,0.1); }

  .legend {
    position: absolute;
    top: 12px;
    left: 12px;
    background: rgba(15,23,42,0.85);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 10px;
    backdrop-filter: blur(8px);
  }
  .legend-row {
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 4px;
  }
  .legend-row:last-child { margin-bottom: 0; }
  .legend-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }
  .legend-line {
    width: 16px; height: 2px; flex-shrink: 0; border-radius: 1px;
  }

  .tooltip {
    position: absolute;
    pointer-events: none;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: var(--text-sm);
    z-index: 100;
    min-width: 160px;
    max-width: 240px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    opacity: 0;
    transition: opacity 0.15s;
  }
  .tooltip.visible { opacity: 1; }
  .tooltip-title { font-weight: 600; margin-bottom: 6px; }
  .tooltip-row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px; color: var(--text-muted); }
  .tooltip-row span:last-child { color: var(--primary-text-color, #e1e1e1); font-variant-numeric: tabular-nums; }

  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; gap: 12px; color: var(--text-muted);
  }
  .empty-state svg { opacity: 0.3; }
  .empty-state p { font-size: var(--text-sm); }

  /* ── Right panel: details + log ── */
  .detail-panel {
    background: var(--surface);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .detail-tabs {
    display: flex;
    border-bottom: 1px solid var(--border);
  }
  .detail-tab {
    flex: 1;
    padding: 10px 6px;
    font-size: var(--text-sm);
    font-weight: 500;
    text-align: center;
    cursor: pointer;
    color: var(--text-muted);
    border-bottom: 2px solid transparent;
    transition: color var(--transition), border-color var(--transition);
    background: none; border-top: none; border-left: none; border-right: none;
  }
  .detail-tab.active { color: var(--accent-zigbee); border-bottom-color: var(--accent-zigbee); }
  .detail-tab.zwave-tab.active { color: var(--accent-zwave); border-bottom-color: var(--accent-zwave); }

  .detail-scroll { overflow-y: auto; flex: 1; overscroll-behavior: contain; padding: 12px; }

  .detail-section { margin-bottom: 16px; }
  .detail-section h4 {
    font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--text-muted); margin-bottom: 8px;
  }
  .detail-kv { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 5px; font-size: var(--text-sm); }
  .detail-kv .key { color: var(--text-muted); }
  .detail-kv .val { font-weight: 500; font-variant-numeric: tabular-nums; text-align: right; word-break: break-all; }

  .lqi-bar-wrap { margin-top: 4px; }
  .lqi-bar-bg { height: 5px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
  .lqi-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }

  /* ── Log viewer ── */
  .log-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .log-header h3 { font-size: var(--text-sm); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .log-scroll {
    flex: 1; overflow-y: auto; overscroll-behavior: contain;
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
    font-size: 10px;
    padding: 6px 0;
  }
  .log-entry {
    padding: 2px 12px;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.5;
    border-left: 2px solid transparent;
  }
  .log-entry:hover { background: rgba(255,255,255,0.03); }
  .log-entry.info { color: #94a3b8; }
  .log-entry.warning { color: var(--accent-warn); border-left-color: var(--accent-warn); }
  .log-entry.error { color: var(--accent-error); border-left-color: var(--accent-error); }
  .log-entry.debug { color: #475569; }
  .log-time { color: #334155; margin-right: 6px; }
  .log-source { color: #7c3aed; margin-right: 6px; }

  /* ── Stats bar ── */
  .stats-bar {
    display: flex; gap: 1px;
    border-bottom: 1px solid var(--border);
    background: var(--border);
    flex-shrink: 0;
  }
  .stat-cell {
    flex: 1;
    padding: 8px 10px;
    background: var(--surface);
    text-align: center;
  }
  .stat-value { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1; }
  .stat-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 3px; }
  .stat-value.zigbee { color: var(--accent-zigbee); }
  .stat-value.zwave  { color: var(--accent-zwave); }
  .stat-value.router { color: var(--accent-router); }
  .stat-value.coord  { color: var(--accent-coord); }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

  /* ── Responsive: hide right panel on narrow ── */
  @media (max-width: 900px) {
    .content { grid-template-columns: 220px 1fr; }
    .detail-panel { display: none; }
  }
  @media (max-width: 600px) {
    .content { grid-template-columns: 1fr; }
    .device-list { display: none; }
  }
`;

// ─── D3 force graph renderer ────────────────────────────────────────────────

class NetworkGraph {
  constructor(svg, onNodeClick) {
    this.svg = svg;
    this.onNodeClick = onNodeClick;
    this.simulation = null;
    this.nodes = [];
    this.links = [];
    this._zoom = null;
    this._g = null;
  }

  init(width, height) {
    const svg = d3.select(this.svg);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    // defs: arrow markers, glow filter
    const defs = svg.append("defs");

    // glow filter for coordinator
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // arrow for link direction
    defs.append("marker")
      .attr("id", "arrow-z2m").attr("viewBox", "0 -4 8 8").attr("refX", 18).attr("refY", 0)
      .attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
      .append("path").attr("d", "M0,-4L8,0L0,4").attr("fill", "rgba(34,211,238,0.6)");

    defs.append("marker")
      .attr("id", "arrow-zwave").attr("viewBox", "0 -4 8 8").attr("refX", 18).attr("refY", 0)
      .attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
      .append("path").attr("d", "M0,-4L8,0L0,4").attr("fill", "rgba(167,139,250,0.6)");

    // zoom behaviour
    this._zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => { this._g.attr("transform", event.transform); });
    svg.call(this._zoom);

    this._g = svg.append("g");
    this.width = width;
    this.height = height;
  }

  update(nodes, links) {
    if (!this._g) return;
    this.nodes = nodes;
    this.links = links;

    const g = this._g;
    g.selectAll("*").remove();

    if (nodes.length === 0) return;

    // Stop previous simulation
    if (this.simulation) this.simulation.stop();

    this.simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.lqi ? Math.max(60, 200 - d.lqi * 0.6) : 100).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2))
      .force("collision", d3.forceCollide(24))
      .alphaDecay(0.025);

    // Links
    const link = g.append("g").attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", d => d.network === "zigbee" ? "rgba(34,211,238,0.35)" : "rgba(167,139,250,0.35)")
      .attr("stroke-width", d => d.lqi ? Math.max(1, Math.min(4, d.lqi / 60)) : 1.5)
      .attr("marker-end", d => d.network === "zigbee" ? "url(#arrow-z2m)" : "url(#arrow-zwave)");

    // Link LQI labels
    const linkLabel = g.append("g").attr("class", "link-labels")
      .selectAll("text")
      .data(links.filter(d => d.lqi != null))
      .join("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-family", "monospace")
      .attr("fill", d => d.lqi > 180 ? "rgba(34,197,94,0.8)" : d.lqi > 90 ? "rgba(245,158,11,0.8)" : "rgba(239,68,68,0.8)")
      .text(d => d.lqi);

    // Node groups
    const node = g.append("g").attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", d => `node node-${d.network || ""}`)
      .style("cursor", "pointer")
      .call(d3.drag()
        .on("start", (event, d) => {
          if (!event.active) this.simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d) => {
          if (!event.active) this.simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        }))
      .on("click", (event, d) => { event.stopPropagation(); this.onNodeClick(d); });

    // Node circles
    node.append("circle")
      .attr("r", d => {
        if (d.type === "coordinator" || d.type === "zwave-controller") return 18;
        if (d.type === "router") return 13;
        return 9;
      })
      .attr("fill", d => {
        if (d.type === "coordinator") return "rgba(245,158,11,0.2)";
        if (d.type === "zwave-controller") return "rgba(167,139,250,0.2)";
        if (d.type === "router") return "rgba(52,211,153,0.15)";
        return "rgba(148,163,184,0.1)";
      })
      .attr("stroke", d => {
        if (d.type === "coordinator") return "#f59e0b";
        if (d.type === "zwave-controller") return "#a78bfa";
        if (d.type === "router") return "#34d399";
        return "#64748b";
      })
      .attr("stroke-width", d => (d.type === "coordinator" || d.type === "zwave-controller") ? 2.5 : 1.5)
      .attr("filter", d => (d.type === "coordinator" || d.type === "zwave-controller") ? "url(#glow)" : null);

    // Node icon text
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", d => {
        if (d.type === "coordinator" || d.type === "zwave-controller") return "13px";
        if (d.type === "router") return "10px";
        return "8px";
      })
      .text(d => {
        if (d.type === "coordinator") return "⬡";
        if (d.type === "zwave-controller") return "Z";
        if (d.type === "router") return "⇌";
        return "•";
      })
      .attr("fill", d => {
        if (d.type === "coordinator") return "#f59e0b";
        if (d.type === "zwave-controller") return "#a78bfa";
        if (d.type === "router") return "#34d399";
        return "#94a3b8";
      });

    // Node labels
    node.append("text")
      .attr("dy", d => {
        if (d.type === "coordinator" || d.type === "zwave-controller") return 26;
        if (d.type === "router") return 21;
        return 17;
      })
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-family", "Inter, sans-serif")
      .attr("fill", "#94a3b8")
      .text(d => d.label ? (d.label.length > 14 ? d.label.slice(0, 13) + "…" : d.label) : d.id);

    // Tick
    this.simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      linkLabel
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
  }

  resetZoom() {
    d3.select(this.svg).transition().duration(400)
      .call(this._zoom.transform, d3.zoomIdentity);
  }

  zoomIn() {
    d3.select(this.svg).transition().duration(250)
      .call(this._zoom.scaleBy, 1.4);
  }

  zoomOut() {
    d3.select(this.svg).transition().duration(250)
      .call(this._zoom.scaleBy, 0.7);
  }

  highlightNode(id) {
    if (!this._g) return;
    this._g.selectAll(".node circle")
      .attr("stroke-width", d => d.id === id ? 3.5 : (d.type === "coordinator" || d.type === "zwave-controller") ? 2.5 : 1.5)
      .attr("stroke-opacity", d => d.id === id ? 1 : 0.7);
    this._g.selectAll(".links line")
      .attr("stroke-opacity", d => (d.source.id === id || d.target.id === id) ? 1 : 0.15);
  }

  clearHighlight() {
    if (!this._g) return;
    this._g.selectAll(".node circle").attr("stroke-width", d => (d.type === "coordinator" || d.type === "zwave-controller") ? 2.5 : 1.5).attr("stroke-opacity", 1);
    this._g.selectAll(".links line").attr("stroke-opacity", 1);
  }
}

// ─── Log parser helpers ──────────────────────────────────────────────────────

function parseZ2MLog(raw) {
  // Format: "Zigbee2MQTT:info  2024-01-01 12:00:00: message"
  // or MQTT message: {"level":"info","message":"...","namespace":"z2m"}
  try {
    const obj = typeof raw === "object" ? raw : JSON.parse(raw);
    return { level: obj.level || "info", source: "Z2M", message: obj.message || "", time: new Date().toISOString() };
  } catch {
    const m = String(raw).match(/^(?:Zigbee2MQTT:)?(\w+)\s+([\d\- :]+):\s*(.+)$/);
    if (m) return { level: m[1].toLowerCase(), source: "Z2M", message: m[3].trim(), time: m[2].trim() };
    return { level: "info", source: "Z2M", message: String(raw), time: new Date().toISOString() };
  }
}

function parseLQI(val) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return null;
  return n;
}

function lqiClass(lqi) {
  if (lqi == null) return "";
  if (lqi > 180) return "lqi-good";
  if (lqi > 90)  return "lqi-warn";
  return "lqi-bad";
}

// ─── Web Component ───────────────────────────────────────────────────────────

class NetworkVisualizerPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = {};
    this._activeTab = "all";      // all | zigbee | zwave
    this._activeDetailTab = "info"; // info | log
    this._devices = [];           // all devices (zigbee + zwave)
    this._selectedDevice = null;
    this._logs = [];
    this._graphNodes = [];
    this._graphLinks = [];
    this._graph = null;
    this._unsubZ2M = null;
    this._filterText = "";
    this._hasZigbee = false;
    this._hasZwave = false;
    this._d3Loaded = false;
    this._resizeObserver = null;
    this._zwaveConnected = false;
    this._z2mConnected = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._loadD3().then(() => {
        this._render();
        this._subscribeZ2M();
        this._loadZwave();
        this._setupResize();
      });
    }
  }

  setConfig(config) {
    this._config = config || {};
  }

  async _loadD3() {
    if (this._d3Loaded || window.d3) { this._d3Loaded = true; return; }
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    this._d3Loaded = true;
  }

  // ─── HA WebSocket helpers ───────────────────────────────────────────────

  async _callWS(type, params = {}) {
    return new Promise((resolve, reject) => {
      this._hass.connection.sendMessagePromise({ type, ...params })
        .then(resolve).catch(reject);
    });
  }

  // ─── Zigbee2MQTT via MQTT sensor states ────────────────────────────────

  async _subscribeZ2M() {
    const baseTopic = (this._config.z2m_mqtt_topic || "zigbee2mqtt").replace(/\/$/, "");

    try {
      // Subscribe to zigbee2mqtt/bridge/log MQTT topic via HA event subscription
      // Z2M publishes events to HA event bus: mqtt_message_received
      this._unsubZ2M = await this._hass.connection.subscribeEvents(
        (event) => this._onMqttEvent(event, baseTopic),
        "state_changed"
      );

      // Request device list and network map via MQTT publish
      await this._publishMQTT(`${baseTopic}/bridge/request/devices`, "");
      await this._publishMQTT(`${baseTopic}/bridge/request/networkmap`, JSON.stringify({ type: "raw", routes: true }));

      // Load devices from HA entity registry (supplemental)
      await this._loadZ2MFromStates();
      this._z2mConnected = true;
    } catch (e) {
      console.warn("[NetworkVisualizer] Z2M subscribe error:", e);
      this._addLog({ level: "warning", source: "Panel", message: `Z2M kapcsolódás sikertelen: ${e.message || e}`, time: new Date().toISOString() });
      this._z2mConnected = false;
    }
    this._updateStatusDots();
  }

  async _publishMQTT(topic, payload) {
    try {
      await this._callWS("mqtt/publish", { topic, payload });
    } catch {}
  }

  _onMqttEvent(event, baseTopic) {
    // HA state_changed events for MQTT sensors — augment device data
    const { entity_id, new_state } = event.data || {};
    if (!new_state) return;

    // Z2M bridge devices response stored as sensor attribute
    const attrs = new_state.attributes || {};
    if (attrs.zigbee2mqtt_devices) {
      this._processZ2MDevices(attrs.zigbee2mqtt_devices);
    }
    if (attrs.zigbee2mqtt_networkmap) {
      this._processZ2MNetworkmap(attrs.zigbee2mqtt_networkmap);
    }
  }

  async _loadZ2MFromStates() {
    // Fetch all entities, find Zigbee2MQTT-sourced ones
    try {
      const states = await this._callWS("get_states");
      const z2mEntities = (states || []).filter(s =>
        s.attributes && (
          s.attributes.manufacturer != null ||
          (s.entity_id || "").includes("zigbee") ||
          (s.attributes.friendly_name && s.attributes.linkquality != null)
        ) && s.attributes.linkquality != null
      );

      // Deduplicate by ieee_address or friendly_name
      const seen = new Set();
      const devices = [];
      for (const s of z2mEntities) {
        const key = s.attributes.ieee_address || s.attributes.friendly_name || s.entity_id;
        if (seen.has(key)) continue;
        seen.add(key);
        devices.push({
          id: `z2m_${key}`,
          network: "zigbee",
          type: "end-device",
          label: s.attributes.friendly_name || s.entity_id,
          ieee: s.attributes.ieee_address || "",
          model: s.attributes.model || "",
          manufacturer: s.attributes.manufacturer || "",
          lqi: parseLQI(s.attributes.linkquality),
          last_seen: s.last_changed,
          entity_id: s.entity_id,
          state: s.state,
        });
        this._hasZigbee = true;
      }

      if (devices.length > 0) {
        this._processZ2MDevicesFromStates(devices);
      }

      // Separately try to fetch bridge devices via MQTT sensor
      const bridgeSensor = (states || []).find(s =>
        s.entity_id.includes("z2m") && s.entity_id.includes("bridge") ||
        s.attributes?.devices != null && s.attributes?.type === "zigbee"
      );
      if (bridgeSensor?.attributes?.devices) {
        this._processZ2MDevices(bridgeSensor.attributes.devices);
      }
    } catch (e) {
      console.warn("[NetworkVisualizer] loadZ2MFromStates error:", e);
    }
  }

  _processZ2MDevicesFromStates(newDevices) {
    for (const d of newDevices) {
      const idx = this._devices.findIndex(x => x.id === d.id);
      if (idx >= 0) {
        this._devices[idx] = { ...this._devices[idx], ...d };
      } else {
        this._devices.push(d);
      }
    }
    this._rebuildGraph();
    this._renderDeviceList();
    this._updateStats();
  }

  _processZ2MDevices(devicesArr) {
    if (!Array.isArray(devicesArr)) return;
    const mapped = devicesArr.map(d => ({
      id: `z2m_${d.ieee_address || d.friendly_name}`,
      network: "zigbee",
      type: d.type === "Coordinator" ? "coordinator" : d.type === "Router" ? "router" : "end-device",
      label: d.friendly_name || d.ieee_address,
      ieee: d.ieee_address || "",
      model: d.model_id || d.definition?.model || "",
      manufacturer: d.manufacturer || d.definition?.vendor || "",
      lqi: null,
      last_seen: d.last_seen,
      description: d.description || "",
      supported: d.supported,
    }));
    for (const d of mapped) {
      const idx = this._devices.findIndex(x => x.id === d.id);
      if (idx >= 0) this._devices[idx] = { ...d, lqi: this._devices[idx].lqi };
      else this._devices.push(d);
      this._hasZigbee = true;
    }
    this._rebuildGraph();
    this._renderDeviceList();
    this._updateStats();
    this._addLog({ level: "info", source: "Z2M", message: `${mapped.length} Zigbee eszköz betöltve`, time: new Date().toISOString() });
  }

  _processZ2MNetworkmap(data) {
    // raw format: { nodes: [{id,ieeeAddr,type,nwkAddr,lqiList:[{ieeeAddr,lqi}]}] }
    if (!data || !data.nodes) return;
    const lqiMap = {};
    for (const node of data.nodes) {
      const srcId = `z2m_${node.ieeeAddr || node.id}`;
      for (const lqiEntry of (node.lqiList || [])) {
        const tgtId = `z2m_${lqiEntry.ieeeAddr || lqiEntry.id}`;
        lqiMap[`${srcId}--${tgtId}`] = lqiEntry.lqi;
      }
    }
    // Update node lqi from first link
    for (const node of data.nodes) {
      const devId = `z2m_${node.ieeeAddr || node.id}`;
      const dev = this._devices.find(d => d.id === devId);
      if (dev && node.lqiList && node.lqiList[0]) {
        dev.lqi = node.lqiList[0].lqi;
      }
    }
    this._zigbeeLQIMap = lqiMap;
    this._rebuildGraph();
  }

  // ─── Z-Wave JS via HA WebSocket ─────────────────────────────────────────

  async _loadZwave() {
    try {
      // Get Z-Wave JS config entries
      const entries = await this._callWS("config_entries/get", { type_filter: "hub" });
      const zwaveEntry = (entries || []).find(e => e.domain === "zwave_js");
      if (!zwaveEntry) {
        this._addLog({ level: "info", source: "ZWave", message: "Z-Wave JS integráció nem található.", time: new Date().toISOString() });
        return;
      }
      this._zwaveEntryId = zwaveEntry.entry_id;

      // Get all nodes
      const result = await this._callWS("zwave_js/get_nodes", { entry_id: zwaveEntry.entry_id });
      if (result && result.nodes) {
        this._processZwaveNodes(result.nodes, zwaveEntry.entry_id);
        this._zwaveConnected = true;
      } else if (Array.isArray(result)) {
        this._processZwaveNodes(result, zwaveEntry.entry_id);
        this._zwaveConnected = true;
      }

      // Subscribe to Z-Wave events
      this._hass.connection.subscribeEvents(
        (event) => this._onZwaveEvent(event),
        "zwave_js_node_added"
      );
      this._hass.connection.subscribeEvents(
        (event) => this._onZwaveEvent(event),
        "zwave_js_node_removed"
      );
      this._hass.connection.subscribeEvents(
        (event) => this._onZwaveEvent(event),
        "zwave_js_value_updated"
      );

    } catch (e) {
      console.warn("[NetworkVisualizer] Z-Wave load error:", e);
      this._addLog({ level: "warning", source: "ZWave", message: `Z-Wave betöltési hiba: ${e.message || e}`, time: new Date().toISOString() });
      this._zwaveConnected = false;
    }
    this._updateStatusDots();
  }

  _processZwaveNodes(nodes, entryId) {
    for (const n of nodes) {
      const devId = `zwave_${entryId}_${n.node_id}`;
      const isController = n.is_controller_node || n.node_id === 1;
      const device = {
        id: devId,
        network: "zwave",
        type: isController ? "zwave-controller" : "zwave-node",
        label: n.name || n.label || `Node ${n.node_id}`,
        node_id: n.node_id,
        manufacturer: n.manufacturer_name || n.manufacturer || "",
        model: n.product_name || n.label || "",
        is_ready: n.ready,
        status: n.status,
        rssi: n.statistics?.lastRssi || null,
        lqi: null,
        last_seen: n.last_seen,
        zwave_version: n.zwave_plus_version,
        security: n.highest_security_class || "",
        entry_id: entryId,
      };
      const idx = this._devices.findIndex(x => x.id === devId);
      if (idx >= 0) this._devices[idx] = device;
      else this._devices.push(device);
      this._hasZwave = true;
    }

    // Build Z-Wave links (controller <-> each node)
    this._zwaveLinks = [];
    const controller = this._devices.find(d => d.network === "zwave" && d.type === "zwave-controller");
    const zwNodes = this._devices.filter(d => d.network === "zwave" && d.type === "zwave-node");
    if (controller) {
      for (const node of zwNodes) {
        this._zwaveLinks.push({ source: controller.id, target: node.id, network: "zwave", lqi: node.rssi });
      }
    }

    this._rebuildGraph();
    this._renderDeviceList();
    this._updateStats();
    this._addLog({ level: "info", source: "ZWave", message: `${nodes.length} Z-Wave csomópont betöltve`, time: new Date().toISOString() });
  }

  _onZwaveEvent(event) {
    const d = event.data || {};
    this._addLog({ level: "info", source: "ZWave", message: `${event.event_type}: node ${d.node_id || ""}`, time: new Date().toISOString() });
  }

  // ─── Graph builder ──────────────────────────────────────────────────────

  _rebuildGraph() {
    const visible = this._activeTab === "all" ? this._devices :
                    this._activeTab === "zigbee" ? this._devices.filter(d => d.network === "zigbee") :
                    this._devices.filter(d => d.network === "zwave");

    this._graphNodes = visible.map(d => ({ ...d, x: d.x, y: d.y }));

    const nodeIds = new Set(this._graphNodes.map(n => n.id));
    const links = [];

    // Zigbee links from networkmap
    if (this._zigbeeLQIMap) {
      for (const [key, lqi] of Object.entries(this._zigbeeLQIMap)) {
        const [src, tgt] = key.split("--");
        if (nodeIds.has(src) && nodeIds.has(tgt)) {
          links.push({ source: src, target: tgt, lqi, network: "zigbee" });
        }
      }
    } else {
      // Fallback: connect all routers/end-devices to coordinator
      const coord = this._graphNodes.find(n => n.type === "coordinator");
      if (coord) {
        for (const n of this._graphNodes) {
          if (n.id !== coord.id) {
            links.push({ source: coord.id, target: n.id, lqi: n.lqi, network: "zigbee" });
          }
        }
      }
    }

    // Z-Wave links
    for (const l of (this._zwaveLinks || [])) {
      if (nodeIds.has(l.source) && nodeIds.has(l.target)) {
        links.push(l);
      }
    }

    this._graphLinks = links;

    if (this._graph) {
      this._graph.update(this._graphNodes, this._graphLinks);
    }
  }

  // ─── Log management ─────────────────────────────────────────────────────

  _addLog(entry) {
    this._logs.unshift(entry);
    if (this._logs.length > 500) this._logs.pop();
    const logEl = this.shadowRoot.querySelector(".log-scroll");
    if (logEl) this._renderLogs(logEl);
  }

  _renderLogs(container) {
    const html = this._logs.slice(0, 200).map(l => {
      const time = typeof l.time === "string" ? l.time.slice(11, 19) : "";
      return `<div class="log-entry ${l.level}">` +
        `<span class="log-time">${time}</span>` +
        `<span class="log-source">[${l.source}]</span>` +
        `${this._escape(l.message)}` +
        `</div>`;
    }).join("");
    container.innerHTML = html;
  }

  _escape(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ─── Rendering ──────────────────────────────────────────────────────────

  _render() {
    const shadow = this.shadowRoot;

    const stylesheet = document.createElement("style");
    stylesheet.textContent = STYLES;
    shadow.appendChild(stylesheet);

    shadow.innerHTML += `
      <div class="panel">
        ${this._renderHeader()}
        ${this._renderStatsBar()}
        <div class="content">
          ${this._renderDeviceListHTML()}
          ${this._renderGraphArea()}
          ${this._renderDetailPanel()}
        </div>
      </div>
    `;

    // Re-query after innerHTML
    this._initGraph();
    this._renderDeviceList();
    this._updateStats();
    this._bindEvents();

    this._addLog({ level: "info", source: "Panel", message: "Network Visualizer v" + VERSION + " indítva", time: new Date().toISOString() });
  }

  _renderHeader() {
    return `
      <header class="header">
        <div class="header-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="Network Visualizer">
            <circle cx="14" cy="14" r="4" fill="#22d3ee"/>
            <circle cx="5" cy="8"  r="2.5" fill="#34d399"/>
            <circle cx="23" cy="8"  r="2.5" fill="#a78bfa"/>
            <circle cx="5" cy="20" r="2.5" fill="#34d399"/>
            <circle cx="23" cy="20" r="2.5" fill="#a78bfa"/>
            <line x1="14" y1="14" x2="5"  y2="8"  stroke="#34d399" stroke-width="1.2" opacity="0.7"/>
            <line x1="14" y1="14" x2="23" y2="8"  stroke="#a78bfa" stroke-width="1.2" opacity="0.7"/>
            <line x1="14" y1="14" x2="5"  y2="20" stroke="#34d399" stroke-width="1.2" opacity="0.7"/>
            <line x1="14" y1="14" x2="23" y2="20" stroke="#a78bfa" stroke-width="1.2" opacity="0.7"/>
          </svg>
        </div>
        <div>
          <div class="header-title">Network Visualizer</div>
          <div class="header-subtitle">Zigbee & Z-Wave topológia</div>
        </div>
        <div class="header-spacer"></div>
        <div class="header-actions">
          <div class="tab-bar">
            <button class="tab active" data-tab="all">Összes</button>
            <button class="tab zigbee" data-tab="zigbee">Zigbee</button>
            <button class="tab zwave" data-tab="zwave">Z-Wave</button>
          </div>
          <span class="status-dot loading" id="z2m-dot" title="Zigbee2MQTT"></span>
          <span class="status-dot loading" id="zwave-dot" title="Z-Wave JS"></span>
          <button class="btn primary" id="btn-refresh">⟳ Frissítés</button>
        </div>
      </header>
    `;
  }

  _renderStatsBar() {
    return `
      <div class="stats-bar" id="stats-bar">
        <div class="stat-cell"><div class="stat-value zigbee" id="stat-z2m">0</div><div class="stat-label">Zigbee</div></div>
        <div class="stat-cell"><div class="stat-value zwave"  id="stat-zwave">0</div><div class="stat-label">Z-Wave</div></div>
        <div class="stat-cell"><div class="stat-value router" id="stat-router">0</div><div class="stat-label">Router</div></div>
        <div class="stat-cell"><div class="stat-value coord" id="stat-coord">0</div><div class="stat-label">Koord.</div></div>
      </div>
    `;
  }

  _renderDeviceListHTML() {
    return `
      <aside class="device-list">
        <div class="device-list-header">
          <h3>Eszközök</h3>
          <span class="device-count" id="dev-count">0</span>
        </div>
        <input class="search-input" id="dev-search" type="search" placeholder="Keresés…" autocomplete="off"/>
        <div class="device-scroll" id="dev-list"></div>
      </aside>
    `;
  }

  _renderDeviceList() {
    const el = this.shadowRoot.querySelector("#dev-list");
    if (!el) return;
    const filter = this._filterText.toLowerCase();
    const visible = this._devices.filter(d => {
      if (this._activeTab === "zigbee" && d.network !== "zigbee") return false;
      if (this._activeTab === "zwave" && d.network !== "zwave") return false;
      if (filter && !(d.label || "").toLowerCase().includes(filter) &&
                    !(d.model || "").toLowerCase().includes(filter) &&
                    !(d.manufacturer || "").toLowerCase().includes(filter)) return false;
      return true;
    });

    const countEl = this.shadowRoot.querySelector("#dev-count");
    if (countEl) countEl.textContent = visible.length;

    el.innerHTML = visible.map(d => {
      const lqiBadge = d.lqi != null ? `<span class="lqi-badge ${lqiClass(d.lqi)}">${d.lqi}</span>` : "";
      const rssi = d.rssi != null ? `<span class="lqi-badge lqi-warn">${d.rssi}dBm</span>` : "";
      const badge = d.network === "zigbee" ? lqiBadge : rssi;
      const selected = this._selectedDevice?.id === d.id ? " selected" : "";
      const icon = this._typeIcon(d.type);
      const meta = d.model || d.manufacturer || d.ieee || `Node ${d.node_id || ""}`;
      return `<div class="device-item ${d.network}${selected}" data-id="${d.id}">
        <div class="device-icon ${d.type}">${icon}</div>
        <div class="device-info">
          <div class="device-name">${this._escape(d.label || d.id)}</div>
          <div class="device-meta">${this._escape(meta)}</div>
        </div>
        ${badge}
      </div>`;
    }).join("");

    // Click events
    el.querySelectorAll(".device-item").forEach(item => {
      item.addEventListener("click", () => {
        const id = item.dataset.id;
        this._selectDevice(id);
      });
    });
  }

  _typeIcon(type) {
    const icons = {
      coordinator: "⬡", router: "⇌", "end-device": "◦",
      "zwave-controller": "Z", "zwave-node": "⬡"
    };
    return icons[type] || "◦";
  }

  _renderGraphArea() {
    return `
      <main class="graph-area" id="graph-area">
        <svg class="graph-canvas" id="graph-svg"></svg>
        <div class="legend">
          <div class="legend-row"><div class="legend-dot" style="background:#f59e0b"></div><span>Koordinátor</span></div>
          <div class="legend-row"><div class="legend-dot" style="background:#34d399"></div><span>Router (Zigbee)</span></div>
          <div class="legend-row"><div class="legend-dot" style="background:#94a3b8"></div><span>End device</span></div>
          <div class="legend-row"><div class="legend-dot" style="background:#a78bfa"></div><span>Z-Wave csomópont</span></div>
          <div class="legend-row"><div class="legend-line" style="background:rgba(34,211,238,0.5)"></div><span>Zigbee link (LQI)</span></div>
          <div class="legend-row"><div class="legend-line" style="background:rgba(167,139,250,0.5)"></div><span>Z-Wave link</span></div>
        </div>
        <div class="graph-controls">
          <button class="graph-btn" id="btn-zoom-in" title="Közelítés">+</button>
          <button class="graph-btn" id="btn-zoom-out" title="Távolítás">−</button>
          <button class="graph-btn" id="btn-zoom-reset" title="Visszaállítás">⊡</button>
        </div>
        <div class="tooltip" id="tooltip"></div>
      </main>
    `;
  }

  _renderDetailPanel() {
    return `
      <aside class="detail-panel">
        <div class="detail-tabs">
          <button class="detail-tab active" data-dtab="info">Részletek</button>
          <button class="detail-tab" data-dtab="log">Log</button>
        </div>
        <div id="detail-info" class="detail-scroll">
          <div style="color:var(--text-muted);font-size:12px;padding:20px;text-align:center;">
            Kattints egy eszközre a részletek megtekintéséhez.
          </div>
        </div>
        <div id="detail-log" style="display:none;flex:1;flex-direction:column;overflow:hidden;">
          <div class="log-header">
            <h3>Eseménynapló</h3>
            <button class="btn" id="btn-clear-log">Törlés</button>
          </div>
          <div class="log-scroll" id="log-scroll"></div>
        </div>
      </aside>
    `;
  }

  _initGraph() {
    const svg = this.shadowRoot.querySelector("#graph-svg");
    const area = this.shadowRoot.querySelector("#graph-area");
    if (!svg || !area || !window.d3) return;
    const { width, height } = area.getBoundingClientRect();
    this._graph = new NetworkGraph(svg, (node) => this._selectDevice(node.id));
    this._graph.init(width || 600, height || 400);
    this._rebuildGraph();
  }

  _setupResize() {
    const area = this.shadowRoot.querySelector("#graph-area");
    if (!area) return;
    this._resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const svg = this.shadowRoot.querySelector("#graph-svg");
        if (svg && this._graph) {
          this._graph.init(width, height);
          this._rebuildGraph();
        }
      }
    });
    this._resizeObserver.observe(area);
  }

  _selectDevice(id) {
    this._selectedDevice = this._devices.find(d => d.id === id) || null;
    this._renderDeviceList();
    this._renderDetailInfo();
    if (this._graph) {
      if (this._selectedDevice) this._graph.highlightNode(id);
      else this._graph.clearHighlight();
    }
  }

  _renderDetailInfo() {
    const el = this.shadowRoot.querySelector("#detail-info");
    if (!el) return;
    const d = this._selectedDevice;
    if (!d) {
      el.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:20px;text-align:center;">Kattints egy eszközre a részletek megtekintéséhez.</div>`;
      return;
    }

    const lqiVal = d.lqi ?? d.rssi;
    const lqiMax = d.lqi != null ? 255 : 0;
    const lqiPct = lqiVal != null && lqiMax ? Math.round(lqiVal / lqiMax * 100) : 0;
    const lqiColor = d.lqi != null ? (d.lqi > 180 ? "#22c55e" : d.lqi > 90 ? "#f59e0b" : "#ef4444") : "#64748b";

    const networkBadge = d.network === "zigbee"
      ? `<span style="color:var(--accent-zigbee)">Zigbee</span>`
      : `<span style="color:var(--accent-zwave)">Z-Wave</span>`;

    const typeLabel = {
      coordinator: "Koordinátor", router: "Router", "end-device": "Végpont",
      "zwave-controller": "Kontroller", "zwave-node": "Csomópont"
    }[d.type] || d.type;

    let html = `
      <div class="detail-section">
        <h4>Azonosítás</h4>
        <div class="detail-kv"><span class="key">Hálózat</span><span class="val">${networkBadge}</span></div>
        <div class="detail-kv"><span class="key">Típus</span><span class="val">${typeLabel}</span></div>
        <div class="detail-kv"><span class="key">Név</span><span class="val">${this._escape(d.label || d.id)}</span></div>
        ${d.ieee ? `<div class="detail-kv"><span class="key">IEEE</span><span class="val" style="font-size:10px;font-family:monospace">${d.ieee}</span></div>` : ""}
        ${d.node_id != null ? `<div class="detail-kv"><span class="key">Node ID</span><span class="val">${d.node_id}</span></div>` : ""}
        ${d.manufacturer ? `<div class="detail-kv"><span class="key">Gyártó</span><span class="val">${this._escape(d.manufacturer)}</span></div>` : ""}
        ${d.model ? `<div class="detail-kv"><span class="key">Modell</span><span class="val">${this._escape(d.model)}</span></div>` : ""}
      </div>
    `;

    if (lqiVal != null) {
      html += `
        <div class="detail-section">
          <h4>${d.lqi != null ? "Jelerősség (LQI)" : "Jelerősség (RSSI)"}</h4>
          <div class="detail-kv">
            <span class="key">${d.lqi != null ? "LQI" : "RSSI"}</span>
            <span class="val" style="color:${lqiColor}">${lqiVal}${d.rssi != null && !d.lqi ? " dBm" : ""}</span>
          </div>
          ${lqiMax ? `<div class="lqi-bar-wrap"><div class="lqi-bar-bg"><div class="lqi-bar-fill" style="width:${lqiPct}%;background:${lqiColor}"></div></div></div>` : ""}
        </div>
      `;
    }

    if (d.last_seen) {
      const ls = new Date(d.last_seen);
      html += `
        <div class="detail-section">
          <h4>Aktivitás</h4>
          <div class="detail-kv"><span class="key">Utoljára látva</span><span class="val">${ls.toLocaleString("hu-HU")}</span></div>
          ${d.state != null ? `<div class="detail-kv"><span class="key">Állapot</span><span class="val">${d.state}</span></div>` : ""}
          ${d.is_ready != null ? `<div class="detail-kv"><span class="key">Kész</span><span class="val">${d.is_ready ? "✓" : "✗"}</span></div>` : ""}
          ${d.status != null ? `<div class="detail-kv"><span class="key">Státusz</span><span class="val">${d.status}</span></div>` : ""}
        </div>
      `;
    }

    if (d.security || d.zwave_version) {
      html += `
        <div class="detail-section">
          <h4>Biztonság</h4>
          ${d.security ? `<div class="detail-kv"><span class="key">Biztonsági osztály</span><span class="val">${d.security}</span></div>` : ""}
          ${d.zwave_version ? `<div class="detail-kv"><span class="key">Z-Wave Plus v.</span><span class="val">${d.zwave_version}</span></div>` : ""}
        </div>
      `;
    }

    if (d.entity_id) {
      html += `
        <div class="detail-section">
          <h4>HA entitás</h4>
          <div class="detail-kv"><span class="key">entity_id</span><span class="val" style="font-size:10px;font-family:monospace">${d.entity_id}</span></div>
        </div>
      `;
    }

    el.innerHTML = html;
  }

  _updateStats() {
    const z2m = this._devices.filter(d => d.network === "zigbee").length;
    const zwave = this._devices.filter(d => d.network === "zwave").length;
    const routers = this._devices.filter(d => d.type === "router").length;
    const coords = this._devices.filter(d => d.type === "coordinator" || d.type === "zwave-controller").length;
    const q = (id) => this.shadowRoot.querySelector(id);
    if (q("#stat-z2m")) q("#stat-z2m").textContent = z2m;
    if (q("#stat-zwave")) q("#stat-zwave").textContent = zwave;
    if (q("#stat-router")) q("#stat-router").textContent = routers;
    if (q("#stat-coord")) q("#stat-coord").textContent = coords;
  }

  _updateStatusDots() {
    const z2mDot = this.shadowRoot.querySelector("#z2m-dot");
    const zwaveDot = this.shadowRoot.querySelector("#zwave-dot");
    if (z2mDot) z2mDot.className = `status-dot ${this._z2mConnected ? "connected" : ""}`;
    if (zwaveDot) zwaveDot.className = `status-dot ${this._zwaveConnected ? "connected" : ""}`;
  }

  _bindEvents() {
    const sh = this.shadowRoot;

    // Tab switching
    sh.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        sh.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        this._activeTab = tab.dataset.tab;
        this._rebuildGraph();
        this._renderDeviceList();
      });
    });

    // Detail tabs
    sh.querySelectorAll(".detail-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        sh.querySelectorAll(".detail-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const dtab = tab.dataset.dtab;
        sh.querySelector("#detail-info").style.display = dtab === "info" ? "" : "none";
        sh.querySelector("#detail-log").style.display = dtab === "log" ? "flex" : "none";
        if (dtab === "log") {
          this._renderLogs(sh.querySelector("#log-scroll"));
        }
      });
    });

    // Refresh
    const btnRefresh = sh.querySelector("#btn-refresh");
    if (btnRefresh) {
      btnRefresh.addEventListener("click", async () => {
        btnRefresh.textContent = "⟳ …";
        this._devices = [];
        await this._subscribeZ2M();
        await this._loadZwave();
        btnRefresh.textContent = "⟳ Frissítés";
      });
    }

    // Search
    const search = sh.querySelector("#dev-search");
    if (search) {
      search.addEventListener("input", (e) => {
        this._filterText = e.target.value;
        this._renderDeviceList();
      });
    }

    // Graph controls
    sh.querySelector("#btn-zoom-in")?.addEventListener("click", () => this._graph?.zoomIn());
    sh.querySelector("#btn-zoom-out")?.addEventListener("click", () => this._graph?.zoomOut());
    sh.querySelector("#btn-zoom-reset")?.addEventListener("click", () => this._graph?.resetZoom());

    // Clear log
    sh.querySelector("#btn-clear-log")?.addEventListener("click", () => {
      this._logs = [];
      const logEl = sh.querySelector("#log-scroll");
      if (logEl) logEl.innerHTML = "";
    });

    // Click on empty graph area = clear selection
    sh.querySelector("#graph-svg")?.addEventListener("click", () => {
      this._selectedDevice = null;
      this._renderDeviceList();
      this._renderDetailInfo();
      this._graph?.clearHighlight();
    });
  }
}

customElements.define("network-visualizer", NetworkVisualizerPanel);
