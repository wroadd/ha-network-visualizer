/**
 * Zigbee & Z-Wave Network Visualizer Panel
 * Home Assistant Custom Panel — v2.0.0
 *
 * Features:
 *  1. D3.js local bundle (offline)
 *  2. Network health dashboard
 *  3. Real-time LQI/RSSI updates
 *  4. Room-based layout (area_registry)
 *  5. Full mobile responsiveness
 *  6. Graph position saving (localStorage)
 *  7. Device dropout indicators on graph
 *  8. Historical LQI/RSSI chart
 *  9. Lovelace card support
 * 10. Z-Wave routing map + route load visualization
 */

const VERSION = "2.0.0";
const POSITION_STORAGE_KEY = "network-visualizer-positions";
const HISTORY_STORAGE_KEY = "network-visualizer-history";
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
const MAX_HISTORY_POINTS = 100;

// ─── Styles ────────────────────────────────────────────────────────────────

const STYLES = `
  :host {
    display: block; width: 100%; height: 100%;
    font-family: var(--primary-font-family, 'Inter', sans-serif);
    color: var(--primary-text-color, #e1e1e1);
    background: var(--primary-background-color, #111827);
    --accent-zigbee: #22d3ee; --accent-zwave: #a78bfa;
    --accent-coord: #f59e0b; --accent-router: #34d399; --accent-end: #94a3b8;
    --accent-ok: #22c55e; --accent-warn: #f59e0b; --accent-error: #ef4444;
    --surface: #1e293b; --surface-2: #0f172a;
    --border: rgba(255,255,255,0.08); --text-muted: #64748b;
    --text-sm: 11px; --text-base: 13px; --radius: 10px;
    --transition: 0.2s cubic-bezier(0.4,0,0.2,1);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .panel {
    display: grid; grid-template-rows: 52px auto auto 1fr;
    height: 100dvh; overflow: hidden; background: var(--surface-2);
  }

  /* ── Header ── */
  .header {
    display: flex; align-items: center; gap: 12px;
    padding: 0 20px; background: var(--surface);
    border-bottom: 1px solid var(--border); z-index: 20;
  }
  .header-logo svg { flex-shrink: 0; }
  .header-title { font-size: 14px; font-weight: 600; letter-spacing: 0.02em; }
  .header-subtitle { font-size: var(--text-sm); color: var(--text-muted); margin-top: 1px; }
  .header-spacer { flex: 1; }
  .header-actions { display: flex; gap: 8px; align-items: center; }
  .hamburger { display: none; background: none; border: none; color: var(--primary-text-color,#e1e1e1); font-size: 22px; cursor: pointer; padding: 4px; }

  .btn {
    display: flex; align-items: center; gap: 5px; padding: 5px 10px;
    border-radius: 6px; font-size: var(--text-sm); font-weight: 500; cursor: pointer;
    border: 1px solid var(--border); background: transparent;
    color: var(--primary-text-color, #e1e1e1);
    transition: background var(--transition), border-color var(--transition);
  }
  .btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.18); }
  .btn.primary { background: rgba(34,211,238,0.12); border-color: var(--accent-zigbee); color: var(--accent-zigbee); }
  .btn.primary:hover { background: rgba(34,211,238,0.22); }
  .btn.small { padding: 3px 7px; font-size: 10px; }

  .tab-bar {
    display: flex; gap: 2px; background: var(--surface-2);
    border-radius: 7px; padding: 2px; border: 1px solid var(--border);
  }
  .tab {
    padding: 4px 12px; border-radius: 5px; font-size: var(--text-sm); font-weight: 500;
    cursor: pointer; transition: background var(--transition), color var(--transition);
    color: var(--text-muted); border: none; background: none;
  }
  .tab.active { background: var(--surface); color: var(--primary-text-color, #e1e1e1); }
  .tab.zigbee.active { color: var(--accent-zigbee); }
  .tab.zwave.active { color: var(--accent-zwave); }

  .status-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--accent-error); flex-shrink: 0;
  }
  .status-dot.connected { background: var(--accent-ok); }
  .status-dot.loading { background: var(--accent-warn); animation: pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes dropout-pulse { 0%,100%{stroke-opacity:1} 50%{stroke-opacity:0.3} }

  /* ── Health Dashboard ── */
  .health-bar {
    display: flex; gap: 1px; border-bottom: 1px solid var(--border);
    background: var(--border); flex-shrink: 0;
  }
  .health-cell {
    flex: 1; padding: 6px 8px; background: var(--surface); text-align: center;
  }
  .health-value { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1; }
  .health-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }

  /* ── Stats bar ── */
  .stats-bar {
    display: flex; gap: 1px; border-bottom: 1px solid var(--border);
    background: var(--border); flex-shrink: 0;
  }
  .stat-cell { flex: 1; padding: 8px 10px; background: var(--surface); text-align: center; }
  .stat-value { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1; }
  .stat-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 3px; }
  .stat-value.zigbee { color: var(--accent-zigbee); }
  .stat-value.zwave  { color: var(--accent-zwave); }
  .stat-value.router { color: var(--accent-router); }
  .stat-value.coord  { color: var(--accent-coord); }

  /* ── Main content ── */
  .content {
    display: grid; grid-template-columns: 260px 1fr 300px;
    overflow: hidden; height: 100%;
  }

  /* ── Left sidebar ── */
  .device-list {
    background: var(--surface); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; overflow: hidden;
  }
  .device-list-header {
    padding: 12px 14px 8px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .device-list-header h3 { font-size: var(--text-sm); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .device-count { font-size: var(--text-sm); color: var(--text-muted); background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 999px; }

  .search-input {
    margin: 8px 10px; padding: 6px 10px; background: var(--surface-2);
    border: 1px solid var(--border); border-radius: 6px; font-size: var(--text-sm);
    color: var(--primary-text-color, #e1e1e1); width: calc(100% - 20px); outline: none;
  }
  .search-input:focus { border-color: var(--accent-zigbee); }
  .device-scroll { overflow-y: auto; flex: 1; overscroll-behavior: contain; }

  .device-item {
    display: flex; align-items: center; gap: 9px; padding: 7px 12px;
    cursor: pointer; border-bottom: 1px solid var(--border);
    transition: background var(--transition); position: relative;
  }
  .device-item:hover { background: rgba(255,255,255,0.04); }
  .device-item.selected { background: rgba(34,211,238,0.07); }
  .device-item.zwave.selected { background: rgba(167,139,250,0.07); }
  .device-item.stale { opacity: 0.5; }
  .device-item .dropout-indicator {
    width: 6px; height: 6px; border-radius: 50%; background: var(--accent-error);
    position: absolute; top: 4px; right: 4px;
    animation: dropout-pulse 1.5s ease-in-out infinite;
  }

  .device-icon {
    width: 26px; height: 26px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; flex-shrink: 0;
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
    font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 4px;
    font-variant-numeric: tabular-nums; flex-shrink: 0;
  }
  .lqi-good { background: rgba(34,197,94,0.15); color: var(--accent-ok); }
  .lqi-warn { background: rgba(245,158,11,0.15); color: var(--accent-warn); }
  .lqi-bad  { background: rgba(239,68,68,0.15);  color: var(--accent-error); }

  /* ── Graph area ── */
  .graph-area { position: relative; overflow: hidden; background: var(--surface-2); }
  .graph-canvas { width: 100%; height: 100%; }

  .graph-controls {
    position: absolute; bottom: 16px; right: 16px;
    display: flex; flex-direction: column; gap: 4px;
  }
  .graph-btn {
    width: 32px; height: 32px; border-radius: 8px;
    border: 1px solid var(--border); background: var(--surface);
    color: var(--primary-text-color, #e1e1e1); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; transition: background var(--transition);
  }
  .graph-btn:hover { background: rgba(255,255,255,0.1); }

  .legend {
    position: absolute; top: 12px; left: 12px;
    background: rgba(15,23,42,0.85); border: 1px solid var(--border);
    border-radius: 8px; padding: 8px 10px; font-size: 10px; backdrop-filter: blur(8px);
  }
  .legend-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .legend-row:last-child { margin-bottom: 0; }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .legend-line { width: 16px; height: 2px; flex-shrink: 0; border-radius: 1px; }

  .tooltip {
    position: absolute; pointer-events: none; background: var(--surface);
    border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px;
    font-size: var(--text-sm); z-index: 100; min-width: 160px; max-width: 240px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5); opacity: 0; transition: opacity 0.15s;
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

  /* ── Right panel ── */
  .detail-panel {
    background: var(--surface); border-left: 1px solid var(--border);
    display: flex; flex-direction: column; overflow: hidden;
  }
  .detail-tabs { display: flex; border-bottom: 1px solid var(--border); }
  .detail-tab {
    flex: 1; padding: 10px 6px; font-size: var(--text-sm); font-weight: 500;
    text-align: center; cursor: pointer; color: var(--text-muted);
    border-bottom: 2px solid transparent;
    transition: color var(--transition), border-color var(--transition);
    background: none; border-top: none; border-left: none; border-right: none;
  }
  .detail-tab.active { color: var(--accent-zigbee); border-bottom-color: var(--accent-zigbee); }
  .detail-tab.zwave-tab.active { color: var(--accent-zwave); border-bottom-color: var(--accent-zwave); }
  .detail-scroll { overflow-y: auto; flex: 1; overscroll-behavior: contain; padding: 12px; }

  .detail-section { margin-bottom: 16px; }
  .detail-section h4 {
    font-size: 10px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.07em; color: var(--text-muted); margin-bottom: 8px;
  }
  .detail-kv { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 5px; font-size: var(--text-sm); }
  .detail-kv .key { color: var(--text-muted); }
  .detail-kv .val { font-weight: 500; font-variant-numeric: tabular-nums; text-align: right; word-break: break-all; }

  .lqi-bar-wrap { margin-top: 4px; }
  .lqi-bar-bg { height: 5px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
  .lqi-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }

  /* ── History chart ── */
  .history-chart { margin-top: 8px; }
  .history-chart svg { width: 100%; }

  /* ── Log viewer ── */
  .log-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .log-header h3 { font-size: var(--text-sm); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .log-scroll {
    flex: 1; overflow-y: auto; overscroll-behavior: contain;
    font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 10px; padding: 6px 0;
  }
  .log-entry {
    padding: 2px 12px; white-space: pre-wrap; word-break: break-all;
    line-height: 1.5; border-left: 2px solid transparent;
  }
  .log-entry:hover { background: rgba(255,255,255,0.03); }
  .log-entry.info { color: #94a3b8; }
  .log-entry.warning { color: var(--accent-warn); border-left-color: var(--accent-warn); }
  .log-entry.error { color: var(--accent-error); border-left-color: var(--accent-error); }
  .log-entry.debug { color: #475569; }
  .log-time { color: #334155; margin-right: 6px; }
  .log-source { color: #7c3aed; margin-right: 6px; }

  /* ── Area hulls ── */
  .area-hull { fill-opacity: 0.04; stroke-opacity: 0.3; stroke-width: 1.5; stroke-dasharray: 4 2; }
  .area-label { font-size: 10px; fill: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }

  /* ── Route load lines ── */
  .route-load-high { stroke: var(--accent-ok) !important; stroke-opacity: 0.8 !important; }
  .route-load-med  { stroke: var(--accent-warn) !important; stroke-opacity: 0.6 !important; }
  .route-load-low  { stroke: var(--accent-error) !important; stroke-opacity: 0.4 !important; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

  /* ── Mobile: overlay sidebar ── */
  .mobile-overlay {
    display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    z-index: 50;
  }
  .mobile-overlay.visible { display: block; }

  @media (max-width: 900px) {
    .content { grid-template-columns: 1fr; }
    .device-list {
      position: fixed; left: -280px; top: 0; bottom: 0; width: 280px;
      z-index: 60; transition: left 0.3s ease;
    }
    .device-list.open { left: 0; }
    .detail-panel {
      position: fixed; right: -320px; top: 0; bottom: 0; width: 320px;
      z-index: 60; transition: right 0.3s ease;
    }
    .detail-panel.open { right: 0; }
    .hamburger { display: flex; }
    .header-actions .tab-bar { display: none; }
  }
  @media (min-width: 901px) {
    .mobile-overlay { display: none !important; }
  }
`;

// ─── D3 force graph renderer ────────────────────────────────────────────────

class NetworkGraph {
  constructor(svg, opts) {
    this.svg = svg;
    this.onNodeClick = opts.onNodeClick || (() => {});
    this.onPositionChange = opts.onPositionChange || (() => {});
    this.simulation = null;
    this.nodes = [];
    this.links = [];
    this._zoom = null;
    this._g = null;
    this._areaHulls = null;
    this._areas = {};
  }

  init(width, height) {
    const svg = d3.select(this.svg);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const defs = svg.append("defs");

    // Glow filter
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Dropout glow (red)
    const dropFilter = defs.append("filter").attr("id", "dropout-glow");
    dropFilter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    const dm = dropFilter.append("feMerge");
    dm.append("feMergeNode").attr("in", "blur");
    dm.append("feMergeNode").attr("in", "SourceGraphic");

    // Arrows
    defs.append("marker").attr("id", "arrow-z2m").attr("viewBox", "0 -4 8 8")
      .attr("refX", 18).attr("refY", 0).attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
      .append("path").attr("d", "M0,-4L8,0L0,4").attr("fill", "rgba(34,211,238,0.6)");
    defs.append("marker").attr("id", "arrow-zwave").attr("viewBox", "0 -4 8 8")
      .attr("refX", 18).attr("refY", 0).attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
      .append("path").attr("d", "M0,-4L8,0L0,4").attr("fill", "rgba(167,139,250,0.6)");

    this._zoom = d3.zoom().scaleExtent([0.1, 4])
      .on("zoom", (event) => { this._g.attr("transform", event.transform); });
    svg.call(this._zoom);
    // Touch: prevent default for smoother mobile zoom
    svg.on("touchstart.zoom", null);

    this._g = svg.append("g");
    this.width = width;
    this.height = height;
  }

  setAreas(areas) { this._areas = areas || {}; }

  update(nodes, links) {
    if (!this._g) return;
    this.nodes = nodes;
    this.links = links;

    const g = this._g;
    g.selectAll("*").remove();
    if (nodes.length === 0) return;
    if (this.simulation) this.simulation.stop();

    // Area hulls layer (behind everything)
    this._renderAreaHulls(g, nodes);

    this.simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id)
        .distance(d => d.lqi ? Math.max(60, 200 - d.lqi * 0.6) : 100).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2))
      .force("collision", d3.forceCollide(24))
      .alphaDecay(0.025);

    // Area grouping force
    if (Object.keys(this._areas).length > 0) {
      const areaPositions = {};
      const areaNames = [...new Set(nodes.map(n => n.area).filter(Boolean))];
      const step = Math.min(this.width, this.height) * 0.25;
      areaNames.forEach((a, i) => {
        const angle = (2 * Math.PI * i) / areaNames.length;
        areaPositions[a] = {
          x: this.width / 2 + Math.cos(angle) * step,
          y: this.height / 2 + Math.sin(angle) * step,
        };
      });
      this.simulation.force("area", (alpha) => {
        for (const n of nodes) {
          if (n.area && areaPositions[n.area]) {
            const target = areaPositions[n.area];
            n.vx += (target.x - n.x) * alpha * 0.08;
            n.vy += (target.y - n.y) * alpha * 0.08;
          }
        }
      });
    }

    // Links
    const link = g.append("g").attr("class", "links").selectAll("line")
      .data(links).join("line")
      .attr("stroke", d => d.network === "zigbee" ? "rgba(34,211,238,0.35)" : "rgba(167,139,250,0.35)")
      .attr("stroke-width", d => {
        if (d.routeLoad != null) return Math.max(1, Math.min(6, d.routeLoad / 20));
        return d.lqi ? Math.max(1, Math.min(4, d.lqi / 60)) : 1.5;
      })
      .attr("marker-end", d => d.network === "zigbee" ? "url(#arrow-z2m)" : "url(#arrow-zwave)")
      .classed("route-load-high", d => d.routeLoad != null && d.routeLoad > 70)
      .classed("route-load-med", d => d.routeLoad != null && d.routeLoad > 30 && d.routeLoad <= 70)
      .classed("route-load-low", d => d.routeLoad != null && d.routeLoad <= 30);

    // Link labels
    const linkLabel = g.append("g").attr("class", "link-labels").selectAll("text")
      .data(links.filter(d => d.lqi != null)).join("text")
      .attr("text-anchor", "middle").attr("font-size", "9px").attr("font-family", "monospace")
      .attr("fill", d => d.lqi > 180 ? "rgba(34,197,94,0.8)" : d.lqi > 90 ? "rgba(245,158,11,0.8)" : "rgba(239,68,68,0.8)")
      .text(d => d.lqi);

    // Node groups
    const self = this;
    const node = g.append("g").attr("class", "nodes").selectAll("g")
      .data(nodes).join("g")
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
          // Feature 6: Save position
          d.fx = event.x; d.fy = event.y;
          self.onPositionChange(d.id, event.x, event.y);
        }))
      .on("click", (event, d) => { event.stopPropagation(); this.onNodeClick(d); });

    // Feature 7: Dropout ring (behind node circle)
    node.filter(d => d._isStale)
      .append("circle")
      .attr("r", d => {
        if (d.type === "coordinator" || d.type === "zwave-controller") return 24;
        if (d.type === "router") return 19;
        return 15;
      })
      .attr("fill", "none")
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 2.5)
      .attr("filter", "url(#dropout-glow)")
      .style("animation", "dropout-pulse 1.5s ease-in-out infinite");

    // Node circles
    node.append("circle")
      .attr("r", d => {
        if (d.type === "coordinator" || d.type === "zwave-controller") return 18;
        if (d.type === "router") return 13;
        return 9;
      })
      .attr("fill", d => {
        if (d._isStale) return "rgba(239,68,68,0.15)";
        if (d.type === "coordinator") return "rgba(245,158,11,0.2)";
        if (d.type === "zwave-controller") return "rgba(167,139,250,0.2)";
        if (d.type === "router") return "rgba(52,211,153,0.15)";
        return "rgba(148,163,184,0.1)";
      })
      .attr("stroke", d => {
        if (d._isStale) return "#ef4444";
        if (d.type === "coordinator") return "#f59e0b";
        if (d.type === "zwave-controller") return "#a78bfa";
        if (d.type === "router") return "#34d399";
        return "#64748b";
      })
      .attr("stroke-width", d => (d.type === "coordinator" || d.type === "zwave-controller") ? 2.5 : 1.5)
      .attr("filter", d => (d.type === "coordinator" || d.type === "zwave-controller") ? "url(#glow)" : null);

    // Node icon
    node.append("text").attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-size", d => {
        if (d.type === "coordinator" || d.type === "zwave-controller") return "13px";
        if (d.type === "router") return "10px";
        return "8px";
      })
      .text(d => {
        if (d._isStale) return "✗";
        if (d.type === "coordinator") return "⬡";
        if (d.type === "zwave-controller") return "Z";
        if (d.type === "router") return "⇌";
        return "•";
      })
      .attr("fill", d => {
        if (d._isStale) return "#ef4444";
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
      .attr("text-anchor", "middle").attr("font-size", "9px")
      .attr("font-family", "Inter, sans-serif").attr("fill", "#94a3b8")
      .text(d => d.label ? (d.label.length > 14 ? d.label.slice(0, 13) + "…" : d.label) : d.id);

    // Tick
    const hullG = g.select(".area-hulls");
    this.simulation.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      linkLabel.attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
      // Update area hulls
      this._updateAreaHulls(hullG, nodes);
    });
  }

  _renderAreaHulls(g, nodes) {
    const hullG = g.append("g").attr("class", "area-hulls");
    // Will be updated on tick
  }

  _updateAreaHulls(hullG, nodes) {
    if (!hullG || !hullG.node()) return;
    const areaGroups = {};
    for (const n of nodes) {
      if (n.area) {
        if (!areaGroups[n.area]) areaGroups[n.area] = [];
        areaGroups[n.area].push([n.x, n.y]);
      }
    }
    const colors = ["#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#ec4899", "#6366f1", "#14b8a6"];
    const data = Object.entries(areaGroups).filter(([, pts]) => pts.length >= 3);

    hullG.selectAll("path").data(data, d => d[0]).join(
      enter => enter.append("path").attr("class", "area-hull"),
      update => update,
      exit => exit.remove()
    ).attr("d", ([, pts]) => {
      const hull = d3.polygonHull(pts);
      if (!hull) return "";
      return "M" + hull.map(p => p.join(",")).join("L") + "Z";
    }).attr("fill", (d, i) => colors[i % colors.length])
      .attr("stroke", (d, i) => colors[i % colors.length]);

    hullG.selectAll("text.area-label").data(data, d => d[0]).join(
      enter => enter.append("text").attr("class", "area-label"),
      update => update,
      exit => exit.remove()
    ).attr("x", ([, pts]) => pts.reduce((s, p) => s + p[0], 0) / pts.length)
      .attr("y", ([, pts]) => Math.min(...pts.map(p => p[1])) - 10)
      .attr("text-anchor", "middle")
      .text(([name]) => name);
  }

  resetZoom() { d3.select(this.svg).transition().duration(400).call(this._zoom.transform, d3.zoomIdentity); }
  zoomIn() { d3.select(this.svg).transition().duration(250).call(this._zoom.scaleBy, 1.4); }
  zoomOut() { d3.select(this.svg).transition().duration(250).call(this._zoom.scaleBy, 0.7); }

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
    this._g.selectAll(".node circle")
      .attr("stroke-width", d => (d.type === "coordinator" || d.type === "zwave-controller") ? 2.5 : 1.5)
      .attr("stroke-opacity", 1);
    this._g.selectAll(".links line").attr("stroke-opacity", 1);
  }

  destroy() {
    if (this.simulation) { this.simulation.stop(); this.simulation = null; }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseLQI(val) { const n = parseInt(val, 10); return isNaN(n) ? null : n; }
function lqiClass(lqi) {
  if (lqi == null) return "";
  if (lqi > 180) return "lqi-good";
  if (lqi > 90) return "lqi-warn";
  return "lqi-bad";
}
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function isStale(dev) {
  if (!dev.last_seen) return false;
  const t = new Date(dev.last_seen).getTime();
  return (Date.now() - t) > STALE_THRESHOLD_MS;
}

// ─── Web Component ───────────────────────────────────────────────────────────

class NetworkVisualizerPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = {};
    this._activeTab = "all";
    this._activeDetailTab = "info";
    this._devices = [];
    this._selectedDevice = null;
    this._logs = [];
    this._graphNodes = [];
    this._graphLinks = [];
    this._graph = null;
    this._unsubZ2M = null;
    this._unsubZwaveAdded = null;
    this._unsubZwaveRemoved = null;
    this._unsubZwaveUpdated = null;
    this._unsubStateChanged = null;
    this._filterText = "";
    this._hasZigbee = false;
    this._hasZwave = false;
    this._d3Loaded = false;
    this._resizeObserver = null;
    this._zwaveConnected = false;
    this._z2mConnected = false;
    this._areas = {};           // areaId -> {name, ...}
    this._deviceAreas = {};     // deviceId -> areaName
    this._savedPositions = {};  // Feature 6
    this._lqiHistory = {};      // Feature 8: deviceId -> [{time, value}]
    this._zwaveNeighbors = {};  // Feature 10: nodeId -> [neighborIds]
    this._zwaveRouteStats = {}; // Feature 10: nodeId -> stats
    this._mobileLeftOpen = false;
    this._mobileRightOpen = false;
    this._initialized = false;
  }

  set panel(panel) {
    const customConfig = panel?.config?._panel_custom?.config || {};
    this._config = customConfig;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._loadSavedPositions();
      this._loadLqiHistory();
      this._loadD3().then(() => {
        this._render();
        this._loadAreas();
        this._subscribeZ2M();
        this._loadZwave();
        this._subscribeRealtime();
        this._setupResize();
      }).catch((err) => {
        console.error("[NetworkVisualizer] D3.js load error:", err);
        this.shadowRoot.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-family:sans-serif;flex-direction:column;gap:12px;">
            <p style="font-size:16px;font-weight:600;">D3.js load error</p>
            <p style="font-size:12px;color:#94a3b8;">Could not load D3.js library.</p>
          </div>`;
      });
    }
  }

  disconnectedCallback() {
    [this._unsubZ2M, this._unsubZwaveAdded, this._unsubZwaveRemoved,
     this._unsubZwaveUpdated, this._unsubStateChanged].forEach(u => {
      if (u && typeof u === "function") u();
    });
    this._unsubZ2M = null;
    this._unsubZwaveAdded = null;
    this._unsubZwaveRemoved = null;
    this._unsubZwaveUpdated = null;
    this._unsubStateChanged = null;
    if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
    if (this._graph) { this._graph.destroy(); this._graph = null; }
    this._initialized = false;
  }

  // ─── D3 local load ─────────────────────────────────────────────────────
  async _loadD3() {
    if (this._d3Loaded || window.d3) { this._d3Loaded = true; return; }
    // Feature 1: Load local D3 first, fallback to CDN
    const tryLoad = (src) => new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
    try {
      await tryLoad("/local/network-visualizer/d3.min.js");
    } catch {
      await tryLoad("https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js");
    }
    this._d3Loaded = true;
  }

  // ─── Feature 6: Position save/restore ──────────────────────────────────
  _loadSavedPositions() {
    try { this._savedPositions = JSON.parse(localStorage.getItem(POSITION_STORAGE_KEY) || "{}"); }
    catch { this._savedPositions = {}; }
  }
  _savePosition(id, x, y) {
    this._savedPositions[id] = { x, y };
    try { localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(this._savedPositions)); }
    catch {}
  }

  // ─── Feature 8: LQI History ────────────────────────────────────────────
  _loadLqiHistory() {
    try { this._lqiHistory = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "{}"); }
    catch { this._lqiHistory = {}; }
  }
  _recordLqi(deviceId, value) {
    if (value == null) return;
    if (!this._lqiHistory[deviceId]) this._lqiHistory[deviceId] = [];
    const arr = this._lqiHistory[deviceId];
    arr.push({ time: Date.now(), value });
    if (arr.length > MAX_HISTORY_POINTS) arr.shift();
    try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this._lqiHistory)); }
    catch {}
  }

  // ─── HA WebSocket ──────────────────────────────────────────────────────
  _callWS(type, params = {}) {
    return this._hass.connection.sendMessagePromise({ type, ...params });
  }

  // ─── Feature 4: Area registry ──────────────────────────────────────────
  async _loadAreas() {
    try {
      const areas = await this._callWS("config/area_registry/list");
      if (Array.isArray(areas)) {
        this._areas = {};
        for (const a of areas) this._areas[a.area_id] = a.name || a.area_id;
      }
      // Get device registry for area mapping
      const devices = await this._callWS("config/device_registry/list");
      if (Array.isArray(devices)) {
        this._deviceAreas = {};
        for (const d of devices) {
          if (d.area_id && this._areas[d.area_id]) {
            // Map HA device identifiers to area names
            const areaName = this._areas[d.area_id];
            if (d.identifiers) {
              for (const [domain, id] of d.identifiers) {
                if (domain === "ieee") this._deviceAreas[`z2m_${id}`] = areaName;
                if (domain === "zwave_js") this._deviceAreas[`zwave_${id}`] = areaName;
              }
            }
            if (d.name_by_user || d.name) {
              this._deviceAreas[`name_${(d.name_by_user || d.name).toLowerCase()}`] = areaName;
            }
          }
        }
      }
    } catch (e) {
      console.warn("[NetworkVisualizer] Area registry error:", e);
    }
  }

  _getDeviceArea(dev) {
    if (this._deviceAreas[dev.id]) return this._deviceAreas[dev.id];
    if (dev.ieee && this._deviceAreas[`z2m_${dev.ieee}`]) return this._deviceAreas[`z2m_${dev.ieee}`];
    const nameKey = `name_${(dev.label || "").toLowerCase()}`;
    if (this._deviceAreas[nameKey]) return this._deviceAreas[nameKey];
    return null;
  }

  // ─── Feature 3: Real-time LQI/RSSI updates ────────────────────────────
  async _subscribeRealtime() {
    try {
      this._unsubStateChanged = await this._hass.connection.subscribeEvents(
        (event) => this._onRealtimeStateChange(event),
        "state_changed"
      );
    } catch (e) {
      console.warn("[NetworkVisualizer] Realtime subscribe error:", e);
    }
  }

  _onRealtimeStateChange(event) {
    const { entity_id, new_state } = event.data || {};
    if (!new_state || !new_state.attributes) return;
    const attrs = new_state.attributes;

    // Update LQI for Zigbee devices
    if (attrs.linkquality != null) {
      const lqi = parseLQI(attrs.linkquality);
      const dev = this._devices.find(d =>
        d.entity_id === entity_id || (d.label && attrs.friendly_name === d.label)
      );
      if (dev && lqi != null) {
        const oldLqi = dev.lqi;
        dev.lqi = lqi;
        dev.last_seen = new_state.last_changed;
        this._recordLqi(dev.id, lqi);
        if (oldLqi !== lqi) {
          this._renderDeviceList();
          this._updateStats();
          this._updateHealthDashboard();
          if (this._selectedDevice?.id === dev.id) this._renderDetailInfo();
        }
      }
    }

    // Handle Z2M bridge data
    if (attrs.zigbee2mqtt_devices) this._processZ2MDevices(attrs.zigbee2mqtt_devices);
    if (attrs.zigbee2mqtt_networkmap) this._processZ2MNetworkmap(attrs.zigbee2mqtt_networkmap);
  }

  // ─── Zigbee2MQTT ───────────────────────────────────────────────────────
  async _subscribeZ2M() {
    const baseTopic = (this._config.z2m_mqtt_topic || "zigbee2mqtt").replace(/\/$/, "");
    this._addLog({ level: "debug", source: "Z2M", message: `Loading Z2M data (topic: ${baseTopic})...`, time: new Date().toISOString() });
    try {
      const mqttOk1 = await this._publishMQTT(`${baseTopic}/bridge/request/devices`, "");
      const mqttOk2 = await this._publishMQTT(`${baseTopic}/bridge/request/networkmap`, JSON.stringify({ type: "raw", routes: true }));
      if (!mqttOk1 && !mqttOk2) {
        this._addLog({ level: "warning", source: "Z2M", message: "MQTT not available — loading from HA states only", time: new Date().toISOString() });
      }
      await this._loadZ2MFromStates();
      const z2mCount = this._devices.filter(d => d.network === "zigbee").length;
      this._addLog({ level: "info", source: "Z2M", message: `Z2M loading done. ${z2mCount} Zigbee devices found.`, time: new Date().toISOString() });
      this._z2mConnected = z2mCount > 0 || mqttOk1;
    } catch (e) {
      console.warn("[NetworkVisualizer] Z2M error:", e);
      this._addLog({ level: "warning", source: "Z2M", message: `Z2M connection failed: ${e.message || e}`, time: new Date().toISOString() });
      this._z2mConnected = false;
    }
    this._updateStatusDots();
  }

  async _publishMQTT(topic, payload) {
    try {
      await this._callWS("mqtt/publish", { topic, payload });
      return true;
    } catch (e) {
      this._addLog({ level: "warning", source: "MQTT", message: `MQTT publish failed (${topic}): ${e.message || e}`, time: new Date().toISOString() });
      return false;
    }
  }

  async _loadZ2MFromStates() {
    try {
      const states = await this._callWS("get_states");
      this._addLog({ level: "debug", source: "Z2M", message: `get_states returned ${(states || []).length} entities`, time: new Date().toISOString() });

      // Strategy 1: Find Z2M devices from device registry (most reliable)
      let registryDevices = [];
      try {
        const allDevices = await this._callWS("config/device_registry/list");
        registryDevices = (allDevices || []).filter(d =>
          d.identifiers && d.identifiers.some(([domain, id]) =>
            (domain === "mqtt" && typeof id === "string" && id.includes("zigbee2mqtt")) ||
            domain === "zigbee2mqtt"
          )
        );
        this._addLog({ level: "debug", source: "Z2M", message: `Device registry: ${registryDevices.length} Z2M devices found`, time: new Date().toISOString() });
      } catch (e) {
        this._addLog({ level: "warning", source: "Z2M", message: `Device registry failed: ${e.message || e}`, time: new Date().toISOString() });
      }

      // Strategy 2: Find linkquality sensor entities (sensor.xxx_linkquality)
      const lqiSensors = (states || []).filter(s =>
        (s.entity_id || "").includes("linkquality") && s.state != null && s.state !== "unavailable"
      );
      this._addLog({ level: "debug", source: "Z2M", message: `Found ${lqiSensors.length} linkquality sensor entities`, time: new Date().toISOString() });

      // Build LQI map from linkquality sensors: device_id -> lqi value
      const lqiByDeviceName = {};
      for (const s of lqiSensors) {
        // Extract device name from entity_id like "sensor.device_name_linkquality"
        const match = s.entity_id.match(/^sensor\.(.+)_linkquality$/);
        if (match) {
          lqiByDeviceName[match[1].toLowerCase()] = parseLQI(s.state);
        }
      }

      // Strategy 3: Also check entities with linkquality attribute (old Z2M style)
      const z2mAttrEntities = (states || []).filter(s =>
        s.attributes && s.attributes.linkquality != null
      );
      this._addLog({ level: "debug", source: "Z2M", message: `Found ${z2mAttrEntities.length} entities with linkquality attribute`, time: new Date().toISOString() });

      const seen = new Set();
      const devices = [];

      // Process registry devices first (most reliable)
      if (registryDevices.length > 0) {
        // Get entity registry for device->entity mapping
        let entityRegistry = [];
        try {
          entityRegistry = await this._callWS("config/entity_registry/list");
        } catch { /* older HA versions may not have this */ }

        for (const d of registryDevices) {
          const mqttIdent = d.identifiers.find(([domain, id]) =>
            (domain === "mqtt" && typeof id === "string" && id.includes("zigbee2mqtt")) ||
            domain === "zigbee2mqtt"
          );
          const ieee = mqttIdent ? String(mqttIdent[1]).replace("zigbee2mqtt_", "") : "";
          const devName = (d.name_by_user || d.name || "").toLowerCase().replace(/[^a-z0-9]/g, "_");
          const isCoord = (d.model || "").toLowerCase().includes("coordinator") ||
                          (d.name || "").toLowerCase().includes("coordinator");
          const isRouter = (d.model || "").toLowerCase().includes("router");

          // Find LQI from linkquality sensors
          let lqi = lqiByDeviceName[devName] || null;
          // Also try matching with normalized name variations
          if (lqi == null) {
            for (const [key, val] of Object.entries(lqiByDeviceName)) {
              if (key.includes(devName) || devName.includes(key)) { lqi = val; break; }
            }
          }

          const devId = `z2m_${ieee || d.id}`;
          if (seen.has(devId)) continue;
          seen.add(devId);

          const device = {
            id: devId, network: "zigbee",
            type: isCoord ? "coordinator" : isRouter ? "router" : "end-device",
            label: d.name_by_user || d.name || ieee,
            ieee, model: d.model || "", manufacturer: d.manufacturer || "",
            lqi, last_seen: null, ha_device_id: d.id,
          };
          devices.push(device);
          if (lqi != null) this._recordLqi(devId, lqi);
          this._hasZigbee = true;
        }
      }

      // Also process entities with linkquality attribute (old style)
      for (const s of z2mAttrEntities) {
        const key = s.attributes.ieee_address || s.attributes.friendly_name || s.entity_id;
        const devId = `z2m_${key}`;
        if (seen.has(devId)) continue;
        seen.add(devId);
        const lqi = parseLQI(s.attributes.linkquality);
        const dev = {
          id: devId, network: "zigbee", type: "end-device",
          label: s.attributes.friendly_name || s.entity_id,
          ieee: s.attributes.ieee_address || "",
          model: s.attributes.model || "", manufacturer: s.attributes.manufacturer || "",
          lqi, last_seen: s.last_changed, entity_id: s.entity_id, state: s.state,
        };
        devices.push(dev);
        this._recordLqi(devId, lqi);
        this._hasZigbee = true;
      }

      if (devices.length > 0) this._mergeDevices(devices);

      // Check for bridge sensor with full device list
      const bridgeSensor = (states || []).find(s =>
        (s.entity_id.includes("z2m") && s.entity_id.includes("bridge")) ||
        (s.entity_id.includes("zigbee2mqtt") && s.entity_id.includes("bridge")) ||
        (s.attributes?.devices != null && s.attributes?.type === "zigbee")
      );
      if (bridgeSensor?.attributes?.devices) this._processZ2MDevices(bridgeSensor.attributes.devices);
    } catch (e) {
      console.warn("[NetworkVisualizer] loadZ2MFromStates error:", e);
      this._addLog({ level: "error", source: "Z2M", message: `loadZ2MFromStates error: ${e.message || e}`, time: new Date().toISOString() });
    }
  }

  _mergeDevices(newDevices) {
    for (const d of newDevices) {
      const idx = this._devices.findIndex(x => x.id === d.id);
      if (idx >= 0) this._devices[idx] = { ...this._devices[idx], ...d };
      else this._devices.push(d);
    }
    this._rebuildGraph();
    this._renderDeviceList();
    this._updateStats();
    this._updateHealthDashboard();
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
      lqi: null, last_seen: d.last_seen,
      description: d.description || "", supported: d.supported,
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
    this._updateHealthDashboard();
    this._addLog({ level: "info", source: "Z2M", message: `${mapped.length} Zigbee devices loaded`, time: new Date().toISOString() });
  }

  _processZ2MNetworkmap(data) {
    if (!data || !data.nodes) return;
    const lqiMap = {};
    for (const node of data.nodes) {
      const srcId = `z2m_${node.ieeeAddr || node.id}`;
      for (const lqiEntry of (node.lqiList || [])) {
        const tgtId = `z2m_${lqiEntry.ieeeAddr || lqiEntry.id}`;
        lqiMap[`${srcId}--${tgtId}`] = lqiEntry.lqi;
      }
    }
    for (const node of data.nodes) {
      const devId = `z2m_${node.ieeeAddr || node.id}`;
      const dev = this._devices.find(d => d.id === devId);
      if (dev && node.lqiList && node.lqiList[0]) {
        dev.lqi = node.lqiList[0].lqi;
        this._recordLqi(dev.id, dev.lqi);
      }
    }
    this._zigbeeLQIMap = lqiMap;
    this._rebuildGraph();
  }

  // ─── Z-Wave JS ─────────────────────────────────────────────────────────
  async _loadZwave() {
    try {
      // Load Z-Wave devices from the HA device registry
      this._addLog({ level: "debug", source: "ZWave", message: "Loading device registry...", time: new Date().toISOString() });
      let devices;
      try {
        devices = await this._callWS("config/device_registry/list");
      } catch (regErr) {
        this._addLog({ level: "error", source: "ZWave", message: `Device registry failed: ${regErr.message || regErr}`, time: new Date().toISOString() });
        throw regErr;
      }
      this._addLog({ level: "debug", source: "ZWave", message: `Device registry returned ${(devices || []).length} devices`, time: new Date().toISOString() });

      const zwaveDevices = (devices || []).filter(d =>
        d.identifiers && d.identifiers.some(([domain]) => domain === "zwave_js")
      );

      if (zwaveDevices.length === 0) {
        this._addLog({ level: "info", source: "ZWave", message: "No Z-Wave JS devices found in device registry.", time: new Date().toISOString() });
        return;
      }

      this._addLog({ level: "info", source: "ZWave", message: `Found ${zwaveDevices.length} Z-Wave devices in registry`, time: new Date().toISOString() });

      // Extract entry_id from the first device's config entries
      const entryId = zwaveDevices[0]?.config_entries?.[0] || "zwave_js";
      this._zwaveEntryId = entryId;

      // Get all states to find Z-Wave entity attributes
      const states = await this._callWS("get_states");
      const zwaveStates = {};
      for (const s of (states || [])) {
        if (s.attributes?.node_id != null) {
          zwaveStates[s.attributes.node_id] = s;
        }
      }

      // Build node list from device registry
      const nodes = [];
      for (const d of zwaveDevices) {
        const zwIdent = d.identifiers.find(([domain]) => domain === "zwave_js");
        const nodeIdMatch = zwIdent ? String(zwIdent[1]).match(/(\d+)/) : null;
        const nodeId = nodeIdMatch ? parseInt(nodeIdMatch[1]) : null;
        const isController = (d.model || "").toLowerCase().includes("controller") ||
                             (d.manufacturer || "").toLowerCase().includes("controller") ||
                             nodeId === 1;
        const stateEntity = nodeId != null ? zwaveStates[nodeId] : null;

        const devId = `zwave_${entryId}_${nodeId || d.id}`;
        const device = {
          id: devId, network: "zwave",
          type: isController ? "zwave-controller" : "zwave-node",
          label: d.name_by_user || d.name || `Node ${nodeId || "?"}`,
          node_id: nodeId, manufacturer: d.manufacturer || "",
          model: d.model || "",
          is_ready: true, status: stateEntity?.state || "unknown",
          rssi: stateEntity?.attributes?.rssi || null, lqi: null,
          last_seen: stateEntity?.last_changed, ha_device_id: d.id,
          entry_id: entryId,
        };
        nodes.push(device);
        const idx = this._devices.findIndex(x => x.id === devId);
        if (idx >= 0) this._devices[idx] = device;
        else this._devices.push(device);
        this._hasZwave = true;
        if (device.rssi != null) this._recordLqi(devId, Math.abs(device.rssi));
      }

      this._zwaveConnected = true;
      this._rebuildGraph();
      this._renderDeviceList();
      this._updateStats();
      this._updateHealthDashboard();
      this._addLog({ level: "info", source: "ZWave", message: `${nodes.length} Z-Wave devices loaded from registry`, time: new Date().toISOString() });

      // Feature 10: Try loading routing info (optional, may not be available)
      await this._loadZwaveRouting(nodes, entryId);

      // Subscribe to Z-Wave events
      try {
        this._unsubZwaveAdded = await this._hass.connection.subscribeEvents(
          (event) => this._onZwaveEvent(event), "zwave_js_node_added");
      } catch {}
      try {
        this._unsubZwaveRemoved = await this._hass.connection.subscribeEvents(
          (event) => this._onZwaveEvent(event), "zwave_js_node_removed");
      } catch {}
      try {
        this._unsubZwaveUpdated = await this._hass.connection.subscribeEvents(
          (event) => this._onZwaveEvent(event), "zwave_js_value_updated");
      } catch {}

    } catch (e) {
      console.warn("[NetworkVisualizer] Z-Wave error:", e);
      this._addLog({ level: "warning", source: "ZWave", message: `Z-Wave load error: ${e.message || e}`, time: new Date().toISOString() });
      this._zwaveConnected = false;
    }
    this._updateStatusDots();
  }

  _processZwaveNodes(nodes, entryId) {
    for (const n of nodes) {
      const devId = `zwave_${entryId}_${n.node_id}`;
      const isController = n.is_controller_node || n.node_id === 1;
      const device = {
        id: devId, network: "zwave",
        type: isController ? "zwave-controller" : "zwave-node",
        label: n.name || n.label || `Node ${n.node_id}`,
        node_id: n.node_id, manufacturer: n.manufacturer_name || n.manufacturer || "",
        model: n.product_name || n.label || "",
        is_ready: n.ready, status: n.status,
        rssi: n.statistics?.lastRssi || null, lqi: null,
        last_seen: n.last_seen, zwave_version: n.zwave_plus_version,
        security: n.highest_security_class || "", entry_id: entryId,
      };
      const idx = this._devices.findIndex(x => x.id === devId);
      if (idx >= 0) this._devices[idx] = device;
      else this._devices.push(device);
      this._hasZwave = true;
      if (device.rssi != null) this._recordLqi(devId, Math.abs(device.rssi));
    }
    this._rebuildGraph();
    this._renderDeviceList();
    this._updateStats();
    this._updateHealthDashboard();
    this._addLog({ level: "info", source: "ZWave", message: `${nodes.length} Z-Wave nodes loaded`, time: new Date().toISOString() });
  }

  // Feature 10: Z-Wave routing map
  async _loadZwaveRouting(nodes, entryId) {
    this._zwaveNeighbors = {};
    this._zwaveRouteStats = {};
    for (const n of nodes) {
      if (n.type === "zwave-controller" || !n.node_id) continue;
      // Try device_id based neighbor lookup
      if (n.ha_device_id) {
        try {
          const result = await this._callWS("zwave_js/get_node_neighbors", {
            device_id: n.ha_device_id
          });
          if (result && result.neighbors) {
            this._zwaveNeighbors[n.node_id] = result.neighbors;
          } else if (Array.isArray(result)) {
            this._zwaveNeighbors[n.node_id] = result;
          }
        } catch {
          // Not all versions support get_node_neighbors
        }
        try {
          const stats = await this._callWS("zwave_js/get_node_statistics", {
            device_id: n.ha_device_id
          });
          if (stats) this._zwaveRouteStats[n.node_id] = stats;
        } catch {}
      }
    }
    if (Object.keys(this._zwaveNeighbors).length > 0 || Object.keys(this._zwaveRouteStats).length > 0) {
      this._rebuildGraph();
      this._addLog({ level: "info", source: "ZWave", message: `Routing data loaded for ${Object.keys(this._zwaveNeighbors).length} nodes`, time: new Date().toISOString() });
    }
  }

  _onZwaveEvent(event) {
    const d = event.data || {};
    this._addLog({ level: "info", source: "ZWave", message: `${event.event_type}: node ${d.node_id || ""}`, time: new Date().toISOString() });
  }

  // ─── Graph builder ─────────────────────────────────────────────────────
  _rebuildGraph() {
    const visible = this._activeTab === "all" ? this._devices :
      this._activeTab === "zigbee" ? this._devices.filter(d => d.network === "zigbee") :
      this._devices.filter(d => d.network === "zwave");

    this._graphNodes = visible.map(d => {
      const saved = this._savedPositions[d.id];
      const area = this._getDeviceArea(d);
      return {
        ...d,
        x: saved?.x ?? d.x, y: saved?.y ?? d.y,
        fx: saved?.x ?? null, fy: saved?.y ?? null,
        area,
        _isStale: isStale(d),
      };
    });

    const nodeIds = new Set(this._graphNodes.map(n => n.id));
    const links = [];

    // Zigbee links
    if (this._zigbeeLQIMap) {
      for (const [key, lqi] of Object.entries(this._zigbeeLQIMap)) {
        const [src, tgt] = key.split("--");
        if (nodeIds.has(src) && nodeIds.has(tgt)) {
          links.push({ source: src, target: tgt, lqi, network: "zigbee" });
        }
      }
    } else {
      const coord = this._graphNodes.find(n => n.type === "coordinator");
      if (coord) {
        for (const n of this._graphNodes) {
          if (n.id !== coord.id && n.network === "zigbee") {
            links.push({ source: coord.id, target: n.id, lqi: n.lqi, network: "zigbee" });
          }
        }
      }
    }

    // Feature 10: Z-Wave links from actual neighbor data
    const hasNeighborData = Object.keys(this._zwaveNeighbors).length > 0;
    if (hasNeighborData) {
      const entryId = this._zwaveEntryId;
      const addedLinks = new Set();
      for (const [nodeIdStr, neighbors] of Object.entries(this._zwaveNeighbors)) {
        const nodeId = parseInt(nodeIdStr);
        const srcId = `zwave_${entryId}_${nodeId}`;
        if (!nodeIds.has(srcId)) continue;
        for (const neighborId of neighbors) {
          const tgtId = `zwave_${entryId}_${neighborId}`;
          if (!nodeIds.has(tgtId)) continue;
          const linkKey = [Math.min(nodeId, neighborId), Math.max(nodeId, neighborId)].join("-");
          if (addedLinks.has(linkKey)) continue;
          addedLinks.add(linkKey);
          // Route load from statistics
          const stats = this._zwaveRouteStats[nodeId];
          const routeLoad = stats ? (stats.commandsTX || 0) + (stats.commandsRX || 0) : null;
          const rssi = stats?.lastRssi || null;
          links.push({
            source: srcId, target: tgtId, network: "zwave",
            lqi: rssi ? Math.abs(rssi) : null,
            routeLoad: routeLoad ? Math.min(100, routeLoad / 10) : null,
          });
        }
      }
    } else {
      // Fallback: star topology from controller
      const controller = this._graphNodes.find(d => d.type === "zwave-controller");
      const zwNodes = this._graphNodes.filter(d => d.network === "zwave" && d.type === "zwave-node");
      if (controller) {
        for (const node of zwNodes) {
          links.push({ source: controller.id, target: node.id, network: "zwave", lqi: node.rssi ? Math.abs(node.rssi) : null });
        }
      }
    }

    this._graphLinks = links;
    if (this._graph) {
      this._graph.setAreas(this._areas);
      this._graph.update(this._graphNodes, this._graphLinks);
    }
  }

  // ─── Logs ──────────────────────────────────────────────────────────────
  _addLog(entry) {
    this._logs.unshift(entry);
    if (this._logs.length > 500) this._logs.pop();
    const logEl = this.shadowRoot.querySelector(".log-scroll");
    if (logEl) this._renderLogs(logEl);
  }

  _renderLogs(container) {
    container.innerHTML = this._logs.slice(0, 200).map(l => {
      const time = typeof l.time === "string" ? l.time.slice(11, 19) : "";
      return `<div class="log-entry ${l.level}"><span class="log-time">${time}</span><span class="log-source">[${l.source}]</span>${esc(l.message)}</div>`;
    }).join("");
  }

  // ─── Rendering ─────────────────────────────────────────────────────────
  _render() {
    const shadow = this.shadowRoot;
    shadow.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = STYLES;
    shadow.appendChild(style);

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="panel">
        ${this._renderHeader()}
        ${this._renderStatsBar()}
        ${this._renderHealthBar()}
        <div class="content">
          ${this._renderDeviceListHTML()}
          ${this._renderGraphArea()}
          ${this._renderDetailPanel()}
        </div>
        <div class="mobile-overlay" id="mobile-overlay"></div>
      </div>`;
    shadow.appendChild(wrapper.firstElementChild);

    this._initGraph();
    this._renderDeviceList();
    this._updateStats();
    this._updateHealthDashboard();
    this._bindEvents();
    this._addLog({ level: "info", source: "Panel", message: "Network Visualizer v" + VERSION + " started", time: new Date().toISOString() });
  }

  _renderHeader() {
    return `
      <header class="header">
        <button class="hamburger" id="btn-hamburger" title="Menu">☰</button>
        <div class="header-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="4" fill="#22d3ee"/>
            <circle cx="5" cy="8" r="2.5" fill="#34d399"/><circle cx="23" cy="8" r="2.5" fill="#a78bfa"/>
            <circle cx="5" cy="20" r="2.5" fill="#34d399"/><circle cx="23" cy="20" r="2.5" fill="#a78bfa"/>
            <line x1="14" y1="14" x2="5" y2="8" stroke="#34d399" stroke-width="1.2" opacity="0.7"/>
            <line x1="14" y1="14" x2="23" y2="8" stroke="#a78bfa" stroke-width="1.2" opacity="0.7"/>
            <line x1="14" y1="14" x2="5" y2="20" stroke="#34d399" stroke-width="1.2" opacity="0.7"/>
            <line x1="14" y1="14" x2="23" y2="20" stroke="#a78bfa" stroke-width="1.2" opacity="0.7"/>
          </svg>
        </div>
        <div>
          <div class="header-title">Network Visualizer <span style="font-size:10px;color:var(--text-muted);font-weight:400;">v${VERSION}</span></div>
          <div class="header-subtitle">Zigbee & Z-Wave topology</div>
        </div>
        <div class="header-spacer"></div>
        <div class="header-actions">
          <div class="tab-bar">
            <button class="tab active" data-tab="all">All</button>
            <button class="tab zigbee" data-tab="zigbee">Zigbee</button>
            <button class="tab zwave" data-tab="zwave">Z-Wave</button>
          </div>
          <span class="status-dot loading" id="z2m-dot" title="Zigbee2MQTT"></span>
          <span class="status-dot loading" id="zwave-dot" title="Z-Wave JS"></span>
          <button class="btn primary" id="btn-refresh">⟳ Refresh</button>
          <button class="btn small" id="btn-clear-positions" title="Clear saved positions">⊡</button>
        </div>
      </header>`;
  }

  _renderStatsBar() {
    return `
      <div class="stats-bar" id="stats-bar">
        <div class="stat-cell"><div class="stat-value zigbee" id="stat-z2m">0</div><div class="stat-label">Zigbee</div></div>
        <div class="stat-cell"><div class="stat-value zwave" id="stat-zwave">0</div><div class="stat-label">Z-Wave</div></div>
        <div class="stat-cell"><div class="stat-value router" id="stat-router">0</div><div class="stat-label">Router</div></div>
        <div class="stat-cell"><div class="stat-value coord" id="stat-coord">0</div><div class="stat-label">Coord.</div></div>
      </div>`;
  }

  // Feature 2: Network health dashboard
  _renderHealthBar() {
    return `
      <div class="health-bar" id="health-bar">
        <div class="health-cell"><div class="health-value" id="health-avg-lqi" style="color:var(--accent-ok)">–</div><div class="health-label">Avg LQI</div></div>
        <div class="health-cell"><div class="health-value" id="health-weak" style="color:var(--accent-warn)">0</div><div class="health-label">Weak links</div></div>
        <div class="health-cell"><div class="health-value" id="health-offline" style="color:var(--accent-error)">0</div><div class="health-label">Offline</div></div>
        <div class="health-cell"><div class="health-value" id="health-score" style="color:var(--accent-zigbee)">–</div><div class="health-label">Health %</div></div>
      </div>`;
  }

  _updateHealthDashboard() {
    const q = (id) => this.shadowRoot.querySelector(id);
    const zigbeeDevs = this._devices.filter(d => d.network === "zigbee" && d.lqi != null);
    const avgLqi = zigbeeDevs.length > 0 ? Math.round(zigbeeDevs.reduce((s, d) => s + d.lqi, 0) / zigbeeDevs.length) : null;
    const weakLinks = this._devices.filter(d => d.lqi != null && d.lqi < 90).length;
    const offline = this._devices.filter(d => isStale(d)).length;
    const totalWithLqi = zigbeeDevs.length;
    const goodDevs = zigbeeDevs.filter(d => d.lqi > 90).length;
    const healthPct = totalWithLqi > 0 ? Math.round((goodDevs / totalWithLqi) * 100) : null;

    if (q("#health-avg-lqi")) q("#health-avg-lqi").textContent = avgLqi != null ? avgLqi : "–";
    if (q("#health-weak")) q("#health-weak").textContent = weakLinks;
    if (q("#health-offline")) q("#health-offline").textContent = offline;
    if (q("#health-score")) q("#health-score").textContent = healthPct != null ? healthPct + "%" : "–";

    // Color coding
    if (q("#health-avg-lqi")) {
      q("#health-avg-lqi").style.color = avgLqi == null ? "var(--text-muted)" :
        avgLqi > 180 ? "var(--accent-ok)" : avgLqi > 90 ? "var(--accent-warn)" : "var(--accent-error)";
    }
    if (q("#health-score")) {
      q("#health-score").style.color = healthPct == null ? "var(--text-muted)" :
        healthPct > 80 ? "var(--accent-ok)" : healthPct > 50 ? "var(--accent-warn)" : "var(--accent-error)";
    }
  }

  _renderDeviceListHTML() {
    return `
      <aside class="device-list" id="device-list-panel">
        <div class="device-list-header">
          <h3>Devices</h3>
          <span class="device-count" id="dev-count">0</span>
        </div>
        <input class="search-input" id="dev-search" type="search" placeholder="Search…" autocomplete="off"/>
        <div class="device-scroll" id="dev-list"></div>
      </aside>`;
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
      const stale = isStale(d);
      const lqiBadge = d.lqi != null ? `<span class="lqi-badge ${lqiClass(d.lqi)}">${d.lqi}</span>` : "";
      const rssi = d.rssi != null ? `<span class="lqi-badge lqi-warn">${d.rssi}dBm</span>` : "";
      const badge = d.network === "zigbee" ? lqiBadge : rssi;
      const selected = this._selectedDevice?.id === d.id ? " selected" : "";
      const staleClass = stale ? " stale" : "";
      const icon = this._typeIcon(d.type);
      const meta = d.model || d.manufacturer || d.ieee || `Node ${d.node_id || ""}`;
      const area = this._getDeviceArea(d);
      const areaBadge = area ? ` <span style="font-size:9px;color:var(--text-muted)">[${esc(area)}]</span>` : "";
      const dropoutDot = stale ? '<div class="dropout-indicator"></div>' : "";
      return `<div class="device-item ${d.network}${selected}${staleClass}" data-id="${d.id}">
        ${dropoutDot}
        <div class="device-icon ${d.type}">${icon}</div>
        <div class="device-info">
          <div class="device-name">${esc(d.label || d.id)}${areaBadge}</div>
          <div class="device-meta">${esc(meta)}</div>
        </div>
        ${badge}
      </div>`;
    }).join("");

    el.querySelectorAll(".device-item").forEach(item => {
      item.addEventListener("click", () => this._selectDevice(item.dataset.id));
    });
  }

  _typeIcon(type) {
    return { coordinator: "⬡", router: "⇌", "end-device": "◦", "zwave-controller": "Z", "zwave-node": "⬡" }[type] || "◦";
  }

  _renderGraphArea() {
    return `
      <main class="graph-area" id="graph-area">
        <svg class="graph-canvas" id="graph-svg"></svg>
        <div class="legend">
          <div class="legend-row"><div class="legend-dot" style="background:#f59e0b"></div><span>Coordinator</span></div>
          <div class="legend-row"><div class="legend-dot" style="background:#34d399"></div><span>Router (Zigbee)</span></div>
          <div class="legend-row"><div class="legend-dot" style="background:#94a3b8"></div><span>End device</span></div>
          <div class="legend-row"><div class="legend-dot" style="background:#a78bfa"></div><span>Z-Wave node</span></div>
          <div class="legend-row"><div class="legend-dot" style="background:#ef4444"></div><span>Offline / Stale</span></div>
          <div class="legend-row"><div class="legend-line" style="background:rgba(34,211,238,0.5)"></div><span>Zigbee link</span></div>
          <div class="legend-row"><div class="legend-line" style="background:rgba(167,139,250,0.5)"></div><span>Z-Wave link</span></div>
        </div>
        <div class="graph-controls">
          <button class="graph-btn" id="btn-zoom-in" title="Zoom in">+</button>
          <button class="graph-btn" id="btn-zoom-out" title="Zoom out">−</button>
          <button class="graph-btn" id="btn-zoom-reset" title="Reset">⊡</button>
          <button class="graph-btn" id="btn-detail-toggle" title="Details">ℹ</button>
        </div>
        <div class="tooltip" id="tooltip"></div>
      </main>`;
  }

  _renderDetailPanel() {
    return `
      <aside class="detail-panel" id="detail-panel">
        <div class="detail-tabs">
          <button class="detail-tab active" data-dtab="info">Details</button>
          <button class="detail-tab" data-dtab="history">History</button>
          <button class="detail-tab" data-dtab="log">Log</button>
        </div>
        <div id="detail-info" class="detail-scroll">
          <div style="color:var(--text-muted);font-size:12px;padding:20px;text-align:center;">
            Click a device to view details.
          </div>
        </div>
        <div id="detail-history" class="detail-scroll" style="display:none;">
          <div style="color:var(--text-muted);font-size:12px;padding:20px;text-align:center;">
            Select a device to view LQI/RSSI history.
          </div>
        </div>
        <div id="detail-log" style="display:none;flex:1;flex-direction:column;overflow:hidden;">
          <div class="log-header">
            <h3>Event log</h3>
            <button class="btn" id="btn-clear-log">Clear</button>
          </div>
          <div class="log-scroll" id="log-scroll"></div>
        </div>
      </aside>`;
  }

  _initGraph() {
    const svg = this.shadowRoot.querySelector("#graph-svg");
    const area = this.shadowRoot.querySelector("#graph-area");
    if (!svg || !area || !window.d3) return;
    const { width, height } = area.getBoundingClientRect();
    this._graph = new NetworkGraph(svg, {
      onNodeClick: (node) => this._selectDevice(node.id),
      onPositionChange: (id, x, y) => this._savePosition(id, x, y),
    });
    this._graph.init(width || 600, height || 400);
    this._rebuildGraph();
  }

  _setupResize() {
    const area = this.shadowRoot.querySelector("#graph-area");
    if (!area) return;
    this._resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (this._graph && width > 0 && height > 0) {
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
    this._renderHistoryChart();
    if (this._graph) {
      if (this._selectedDevice) this._graph.highlightNode(id);
      else this._graph.clearHighlight();
    }
    // Mobile: open detail panel
    if (window.innerWidth <= 900 && this._selectedDevice) {
      this._toggleMobileRight(true);
    }
  }

  _renderDetailInfo() {
    const el = this.shadowRoot.querySelector("#detail-info");
    if (!el) return;
    const d = this._selectedDevice;
    if (!d) {
      el.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:20px;text-align:center;">Click a device to view details.</div>`;
      return;
    }

    const lqiVal = d.lqi ?? d.rssi;
    const lqiMax = d.lqi != null ? 255 : 0;
    const lqiPct = lqiVal != null && lqiMax ? Math.round(lqiVal / lqiMax * 100) : 0;
    const lqiColor = d.lqi != null ? (d.lqi > 180 ? "#22c55e" : d.lqi > 90 ? "#f59e0b" : "#ef4444") : "#64748b";
    const stale = isStale(d);
    const area = this._getDeviceArea(d);

    const networkBadge = d.network === "zigbee"
      ? `<span style="color:var(--accent-zigbee)">Zigbee</span>`
      : `<span style="color:var(--accent-zwave)">Z-Wave</span>`;

    const typeLabel = {
      coordinator: "Coordinator", router: "Router", "end-device": "End device",
      "zwave-controller": "Controller", "zwave-node": "Node"
    }[d.type] || d.type;

    let html = `<div class="detail-section"><h4>Identity</h4>
      <div class="detail-kv"><span class="key">Network</span><span class="val">${networkBadge}</span></div>
      <div class="detail-kv"><span class="key">Type</span><span class="val">${typeLabel}</span></div>
      <div class="detail-kv"><span class="key">Name</span><span class="val">${esc(d.label || d.id)}</span></div>
      ${area ? `<div class="detail-kv"><span class="key">Area</span><span class="val">${esc(area)}</span></div>` : ""}
      ${d.ieee ? `<div class="detail-kv"><span class="key">IEEE</span><span class="val" style="font-size:10px;font-family:monospace">${d.ieee}</span></div>` : ""}
      ${d.node_id != null ? `<div class="detail-kv"><span class="key">Node ID</span><span class="val">${d.node_id}</span></div>` : ""}
      ${d.manufacturer ? `<div class="detail-kv"><span class="key">Manufacturer</span><span class="val">${esc(d.manufacturer)}</span></div>` : ""}
      ${d.model ? `<div class="detail-kv"><span class="key">Model</span><span class="val">${esc(d.model)}</span></div>` : ""}
      ${stale ? `<div class="detail-kv"><span class="key">Status</span><span class="val" style="color:var(--accent-error)">⚠ Offline / Stale</span></div>` : ""}
    </div>`;

    if (lqiVal != null) {
      html += `<div class="detail-section"><h4>${d.lqi != null ? "Signal (LQI)" : "Signal (RSSI)"}</h4>
        <div class="detail-kv"><span class="key">${d.lqi != null ? "LQI" : "RSSI"}</span>
          <span class="val" style="color:${lqiColor}">${lqiVal}${d.rssi != null && !d.lqi ? " dBm" : ""}</span></div>
        ${lqiMax ? `<div class="lqi-bar-wrap"><div class="lqi-bar-bg"><div class="lqi-bar-fill" style="width:${lqiPct}%;background:${lqiColor}"></div></div></div>` : ""}
      </div>`;
    }

    if (d.last_seen) {
      const ls = new Date(d.last_seen);
      html += `<div class="detail-section"><h4>Activity</h4>
        <div class="detail-kv"><span class="key">Last seen</span><span class="val">${ls.toLocaleString()}</span></div>
        ${d.state != null ? `<div class="detail-kv"><span class="key">State</span><span class="val">${d.state}</span></div>` : ""}
        ${d.is_ready != null ? `<div class="detail-kv"><span class="key">Ready</span><span class="val">${d.is_ready ? "✓" : "✗"}</span></div>` : ""}
        ${d.status != null ? `<div class="detail-kv"><span class="key">Status</span><span class="val">${d.status}</span></div>` : ""}
      </div>`;
    }

    if (d.security || d.zwave_version) {
      html += `<div class="detail-section"><h4>Security</h4>
        ${d.security ? `<div class="detail-kv"><span class="key">Security class</span><span class="val">${d.security}</span></div>` : ""}
        ${d.zwave_version ? `<div class="detail-kv"><span class="key">Z-Wave Plus v.</span><span class="val">${d.zwave_version}</span></div>` : ""}
      </div>`;
    }

    // Z-Wave neighbors
    if (d.network === "zwave" && d.node_id && this._zwaveNeighbors[d.node_id]) {
      const neighbors = this._zwaveNeighbors[d.node_id];
      html += `<div class="detail-section"><h4>Neighbors (${neighbors.length})</h4>
        <div style="font-size:var(--text-sm);color:var(--text-muted)">${neighbors.join(", ")}</div>
      </div>`;
    }

    // Route stats
    if (d.network === "zwave" && d.node_id && this._zwaveRouteStats[d.node_id]) {
      const s = this._zwaveRouteStats[d.node_id];
      html += `<div class="detail-section"><h4>Route Statistics</h4>
        ${s.commandsTX != null ? `<div class="detail-kv"><span class="key">TX commands</span><span class="val">${s.commandsTX}</span></div>` : ""}
        ${s.commandsRX != null ? `<div class="detail-kv"><span class="key">RX commands</span><span class="val">${s.commandsRX}</span></div>` : ""}
        ${s.commandsDroppedTX != null ? `<div class="detail-kv"><span class="key">TX dropped</span><span class="val" style="color:var(--accent-error)">${s.commandsDroppedTX}</span></div>` : ""}
        ${s.commandsDroppedRX != null ? `<div class="detail-kv"><span class="key">RX dropped</span><span class="val" style="color:var(--accent-error)">${s.commandsDroppedRX}</span></div>` : ""}
        ${s.lastRssi != null ? `<div class="detail-kv"><span class="key">Last RSSI</span><span class="val">${s.lastRssi} dBm</span></div>` : ""}
      </div>`;
    }

    if (d.entity_id) {
      html += `<div class="detail-section"><h4>HA Entity</h4>
        <div class="detail-kv"><span class="key">entity_id</span><span class="val" style="font-size:10px;font-family:monospace">${d.entity_id}</span></div>
      </div>`;
    }

    el.innerHTML = html;
  }

  // Feature 8: Historical LQI/RSSI chart
  _renderHistoryChart() {
    const el = this.shadowRoot.querySelector("#detail-history");
    if (!el) return;
    const d = this._selectedDevice;
    if (!d) {
      el.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:20px;text-align:center;">Select a device to view LQI/RSSI history.</div>`;
      return;
    }

    const history = this._lqiHistory[d.id];
    if (!history || history.length < 2) {
      el.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:20px;text-align:center;">
        Not enough history data yet for ${esc(d.label || d.id)}.<br>
        <span style="font-size:10px;">Data accumulates over time as the device reports.</span>
      </div>`;
      return;
    }

    // Render SVG chart using D3
    const W = 260, H = 120, M = { top: 10, right: 10, bottom: 20, left: 35 };
    const w = W - M.left - M.right, h = H - M.top - M.bottom;

    const xMin = d3.min(history, p => p.time);
    const xMax = d3.max(history, p => p.time);
    const yMin = d3.min(history, p => p.value) * 0.9;
    const yMax = d3.max(history, p => p.value) * 1.1;

    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, w]);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([h, 0]);

    const line = d3.line()
      .x(p => M.left + xScale(p.time))
      .y(p => M.top + yScale(p.value))
      .curve(d3.curveMonotoneX);

    const areaPath = d3.area()
      .x(p => M.left + xScale(p.time))
      .y0(M.top + h)
      .y1(p => M.top + yScale(p.value))
      .curve(d3.curveMonotoneX);

    const color = d.network === "zigbee" ? "#22d3ee" : "#a78bfa";
    const label = d.lqi != null ? "LQI" : "RSSI";

    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;">`;
    // Area fill
    svg += `<path d="${areaPath(history)}" fill="${color}" fill-opacity="0.1" />`;
    // Line
    svg += `<path d="${line(history)}" fill="none" stroke="${color}" stroke-width="1.5" />`;
    // Dots
    for (const p of history.slice(-20)) {
      svg += `<circle cx="${M.left + xScale(p.time)}" cy="${M.top + yScale(p.value)}" r="2" fill="${color}" />`;
    }
    // Y axis labels
    svg += `<text x="${M.left - 4}" y="${M.top + 4}" text-anchor="end" font-size="8" fill="#64748b">${Math.round(yMax)}</text>`;
    svg += `<text x="${M.left - 4}" y="${M.top + h}" text-anchor="end" font-size="8" fill="#64748b">${Math.round(yMin)}</text>`;
    // X axis
    svg += `<line x1="${M.left}" y1="${M.top + h}" x2="${M.left + w}" y2="${M.top + h}" stroke="rgba(255,255,255,0.1)" />`;
    svg += `</svg>`;

    const latest = history[history.length - 1]?.value;
    const oldest = history[0]?.value;
    const trend = latest > oldest ? "↑" : latest < oldest ? "↓" : "→";
    const trendColor = latest > oldest ? "var(--accent-ok)" : latest < oldest ? "var(--accent-error)" : "var(--text-muted)";

    el.innerHTML = `
      <div class="detail-section">
        <h4>${label} History — ${esc(d.label || d.id)}</h4>
        <div class="detail-kv"><span class="key">Current</span><span class="val">${latest}</span></div>
        <div class="detail-kv"><span class="key">Trend</span><span class="val" style="color:${trendColor}">${trend} (${oldest} → ${latest})</span></div>
        <div class="detail-kv"><span class="key">Data points</span><span class="val">${history.length}</span></div>
        <div class="history-chart">${svg}</div>
      </div>`;
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

  // ─── Feature 5: Mobile support ─────────────────────────────────────────
  _toggleMobileLeft(open) {
    this._mobileLeftOpen = open != null ? open : !this._mobileLeftOpen;
    const panel = this.shadowRoot.querySelector("#device-list-panel");
    const overlay = this.shadowRoot.querySelector("#mobile-overlay");
    if (panel) panel.classList.toggle("open", this._mobileLeftOpen);
    if (overlay) overlay.classList.toggle("visible", this._mobileLeftOpen || this._mobileRightOpen);
  }

  _toggleMobileRight(open) {
    this._mobileRightOpen = open != null ? open : !this._mobileRightOpen;
    const panel = this.shadowRoot.querySelector("#detail-panel");
    const overlay = this.shadowRoot.querySelector("#mobile-overlay");
    if (panel) panel.classList.toggle("open", this._mobileRightOpen);
    if (overlay) overlay.classList.toggle("visible", this._mobileLeftOpen || this._mobileRightOpen);
  }

  // ─── Event binding ─────────────────────────────────────────────────────
  _bindEvents() {
    const sh = this.shadowRoot;

    // Hamburger
    sh.querySelector("#btn-hamburger")?.addEventListener("click", () => this._toggleMobileLeft());

    // Mobile overlay close
    sh.querySelector("#mobile-overlay")?.addEventListener("click", () => {
      this._toggleMobileLeft(false);
      this._toggleMobileRight(false);
    });

    // Detail toggle (mobile)
    sh.querySelector("#btn-detail-toggle")?.addEventListener("click", () => this._toggleMobileRight());

    // Tabs
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
        sh.querySelector("#detail-history").style.display = dtab === "history" ? "" : "none";
        sh.querySelector("#detail-log").style.display = dtab === "log" ? "flex" : "none";
        if (dtab === "log") this._renderLogs(sh.querySelector("#log-scroll"));
        if (dtab === "history") this._renderHistoryChart();
      });
    });

    // Refresh
    const btnRefresh = sh.querySelector("#btn-refresh");
    if (btnRefresh) {
      btnRefresh.addEventListener("click", async () => {
        btnRefresh.textContent = "⟳ …";
        this._devices = [];
        await this._loadAreas();
        await this._subscribeZ2M();
        await this._loadZwave();
        btnRefresh.textContent = "⟳ Refresh";
      });
    }

    // Clear positions
    sh.querySelector("#btn-clear-positions")?.addEventListener("click", () => {
      this._savedPositions = {};
      try { localStorage.removeItem(POSITION_STORAGE_KEY); } catch {}
      this._rebuildGraph();
      this._addLog({ level: "info", source: "Panel", message: "Saved positions cleared", time: new Date().toISOString() });
    });

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

    // Click empty graph = clear selection
    sh.querySelector("#graph-svg")?.addEventListener("click", () => {
      this._selectedDevice = null;
      this._renderDeviceList();
      this._renderDetailInfo();
      this._renderHistoryChart();
      this._graph?.clearHighlight();
    });

    // Touch: swipe to open left panel
    let touchStartX = 0;
    sh.querySelector("#graph-area")?.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    sh.querySelector("#graph-area")?.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (dx > 80 && window.innerWidth <= 900) this._toggleMobileLeft(true);
      if (dx < -80 && window.innerWidth <= 900) this._toggleMobileRight(true);
    }, { passive: true });
  }
}

customElements.define("network-visualizer", NetworkVisualizerPanel);

// ─── Feature 9: Lovelace Card version ────────────────────────────────────

class NetworkVisualizerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._panel = null;
  }

  setConfig(config) {
    this._config = config;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._panel) {
      this._panel = document.createElement("network-visualizer");
      this._panel.style.height = (this._config.height || 400) + "px";
      this._panel.style.borderRadius = "12px";
      this._panel.style.overflow = "hidden";
      this.shadowRoot.innerHTML = "";
      this.shadowRoot.appendChild(this._panel);
      // Pass panel config
      this._panel.panel = {
        config: {
          _panel_custom: {
            config: {
              z2m_mqtt_topic: this._config.z2m_mqtt_topic || "zigbee2mqtt",
              zwavejs_ws_url: this._config.zwavejs_ws_url || "",
            }
          }
        }
      };
    }
    this._panel.hass = hass;
  }

  getCardSize() {
    return Math.ceil((this._config.height || 400) / 50);
  }

  static getStubConfig() {
    return { height: 400 };
  }
}

customElements.define("network-visualizer-card", NetworkVisualizerCard);

// Register with Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "network-visualizer-card",
  name: "Network Visualizer",
  description: "Zigbee & Z-Wave network topology visualization card",
  preview: true,
  documentationURL: "https://github.com/wroadd/ha-network-visualizer",
});