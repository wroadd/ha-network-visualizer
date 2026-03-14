/**
 * Zigbee & Z-Wave Network Visualizer Panel
 * Home Assistant Custom Panel — v3.0.0
 *
 * Four graph types: Force (MeshGraphViewer), Radial (Alarm.com), Organic (Homey), Grid (Routing Matrix)
 * Separate Zigbee / Z-Wave tabs
 */

/* ── D3.js Loader ─────────────────────────────────────── */
const _d3Ready = (function () {
  if (window.d3) return Promise.resolve(window.d3);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js';
    s.onload = () => resolve(window.d3);
    s.onerror = reject;
    document.head.appendChild(s);
  });
})();

/* ── CSS ──────────────────────────────────────────────── */
const NV_CSS = `
:host{display:block;height:100%;font-family:'Segoe UI',Roboto,sans-serif;--nv-primary:#4fc3f7;--nv-bg:#1a1a2e;--nv-surface:#16213e;--nv-text:#e0e0e0;--nv-text-dim:#888;--nv-accent:#00e676;--nv-border:#2a2a4a}
*{box-sizing:border-box;margin:0;padding:0}
.nv{display:flex;flex-direction:column;height:100%;background:var(--nv-bg);color:var(--nv-text)}
.nv-header{display:flex;align-items:center;gap:12px;padding:8px 16px;background:var(--nv-surface);border-bottom:1px solid var(--nv-border);flex-shrink:0;flex-wrap:wrap}
.nv-title{font-size:16px;font-weight:600;white-space:nowrap}
.nv-graph-types{display:flex;gap:4px;margin-left:auto}
.nv-graph-types button{background:transparent;color:var(--nv-text-dim);border:1px solid var(--nv-border);border-radius:6px;padding:4px 12px;font-size:12px;cursor:pointer;transition:.2s}
.nv-graph-types button.active{background:var(--nv-primary);color:#000;border-color:var(--nv-primary);font-weight:600}
.nv-graph-types button:hover:not(.active){background:rgba(79,195,247,.15)}
.nv-search{position:relative}
.nv-search input{background:var(--nv-bg);border:1px solid var(--nv-border);border-radius:6px;padding:4px 10px;color:var(--nv-text);font-size:13px;width:180px}
.nv-tabs{display:flex;border-bottom:2px solid var(--nv-border);flex-shrink:0;background:var(--nv-surface)}
.nv-tab{flex:1;text-align:center;padding:8px;font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:.2s;color:var(--nv-text-dim)}
.nv-tab.active{color:var(--nv-primary);border-bottom-color:var(--nv-primary)}
.nv-tab:hover:not(.active){color:var(--nv-text)}
.nv-body{flex:1;position:relative;overflow:hidden}
.nv-graph{width:100%;height:100%}
.nv-graph svg{width:100%;height:100%}
.nv-stats{display:flex;gap:16px;padding:6px 16px;font-size:12px;color:var(--nv-text-dim);background:var(--nv-surface);border-top:1px solid var(--nv-border);flex-shrink:0}
.nv-stats span{display:flex;align-items:center;gap:4px}
.nv-stats .dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.nv-zoom{position:absolute;bottom:12px;right:12px;display:flex;flex-direction:column;gap:4px;z-index:5}
.nv-zoom button{width:32px;height:32px;border-radius:6px;border:1px solid var(--nv-border);background:var(--nv-surface);color:var(--nv-text);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.nv-zoom button:hover{background:var(--nv-primary);color:#000}
.nv-tooltip{position:absolute;background:var(--nv-surface);border:1px solid var(--nv-border);border-radius:8px;padding:10px 14px;font-size:12px;pointer-events:none;z-index:10;max-width:260px;box-shadow:0 4px 12px rgba(0,0,0,.5);display:none}
.nv-tooltip.show{display:block}
.nv-tooltip h4{margin-bottom:4px;color:var(--nv-primary);font-size:13px}
.nv-tooltip .row{display:flex;justify-content:space-between;gap:12px;padding:2px 0;color:var(--nv-text-dim)}
.nv-tooltip .row span:last-child{color:var(--nv-text);font-weight:500}
.nv-legend{position:absolute;top:8px;right:12px;background:rgba(22,33,62,.9);border:1px solid var(--nv-border);border-radius:8px;padding:8px 12px;font-size:11px;z-index:5;display:flex;flex-direction:column;gap:4px}
.nv-legend-item{display:flex;align-items:center;gap:6px}
.nv-legend-dot{width:10px;height:10px;border-radius:50%}
.nv-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(26,26,46,.8);z-index:20;font-size:14px;color:var(--nv-primary)}
.nv-loading .spinner{width:32px;height:32px;border:3px solid var(--nv-border);border-top-color:var(--nv-primary);border-radius:50%;animation:spin 1s linear infinite;margin-right:12px}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.node-label{font-size:10px;fill:var(--nv-text);text-anchor:middle;pointer-events:none;user-select:none}
.link-label{font-size:9px;fill:var(--nv-text-dim);text-anchor:middle;pointer-events:none}
.hull{fill-opacity:.08;stroke-opacity:.3;stroke-width:1.5}
.nv-grid-wrap{width:100%;height:100%;overflow:auto;background:var(--nv-bg)}
.nv-matrix{border-collapse:collapse;font-size:11px;min-width:100%}
.nv-matrix th,.nv-matrix td{border:1px solid var(--nv-border);padding:4px 6px;text-align:center;white-space:nowrap}
.nv-matrix th{background:var(--nv-surface);color:var(--nv-text);position:sticky;top:0;z-index:2;font-weight:500}
.nv-matrix th.row-header{position:sticky;left:0;z-index:3;text-align:right;background:var(--nv-surface)}
.nv-matrix th.corner{position:sticky;top:0;left:0;z-index:4;background:var(--nv-surface)}
.nv-matrix td{cursor:default;min-width:36px;font-size:10px;font-weight:600;transition:transform .1s}
.nv-matrix td:hover{transform:scale(1.3);z-index:1;position:relative}
.nv-matrix td.self{background:#1a1a2e;color:#444}
.nv-matrix td.connected{color:#fff}
.nv-matrix td.no-link{background:rgba(255,255,255,.02);color:#333}
.nv-matrix .coord-row th.row-header{color:var(--nv-primary);font-weight:700}
`;

/* ── Constants ────────────────────────────────────────── */
const STOR = {
  POSITIONS: 'nv3_positions',
  SETTINGS: 'nv3_settings',
};

const NODE_COLORS = {
  coordinator: { fill: '#ff9800', stroke: '#e65100', icon: '⭐' },
  router: { fill: '#4fc3f7', stroke: '#0288d1', icon: '📡' },
  end_device: { fill: '#81c784', stroke: '#388e3c', icon: '📱' },
  controller: { fill: '#ff9800', stroke: '#e65100', icon: '🎮' },
  node: { fill: '#ce93d8', stroke: '#7b1fa2', icon: '🔌' },
};

const AREA_COLORS = ['#4fc3f7','#ff9800','#81c784','#ce93d8','#f48fb1','#fff176','#a5d6a7','#90caf9'];

function lqiColor(lqi) {
  if (lqi == null) return '#888';
  const t = Math.max(0, Math.min(1, lqi / 255));
  const r = Math.round(240 - t * 236);
  const g = Math.round(35 + t * 164);
  return `rgb(${r},${g},17)`;
}
function lqiWidth(lqi) { return lqi == null ? 1 : 1 + (lqi / 255) * 3; }
function loadStore(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } }
function saveStore(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

/* ── ForceGraphRenderer ───────────────────────────────── */
class ForceGraphRenderer {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = opts;
    this.svg = null; this.sim = null; this.g = null; this.zoom = null;
    this._nodes = []; this._links = [];
  }
  init(nodes, links) {
    this._nodes = nodes; this._links = links;
    const d3 = window.d3, W = this.container.clientWidth, H = this.container.clientHeight;
    this.container.innerHTML = '';
    this.svg = d3.select(this.container).append('svg').attr('width', W).attr('height', H);
    const defs = this.svg.append('defs');
    defs.append('marker').attr('id','nv-arrow').attr('viewBox','0 -3 6 6').attr('refX',18)
      .attr('refY',0).attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto')
      .append('path').attr('d','M0,-3L6,0L0,3').attr('fill','#666');
    this.g = this.svg.append('g');
    this.zoom = d3.zoom().scaleExtent([0.2, 5]).on('zoom', e => this.g.attr('transform', e.transform));
    this.svg.call(this.zoom);
    const positions = loadStore(STOR.POSITIONS);
    const areaMap = {}; let aIdx = 0;
    nodes.forEach(n => {
      if (n.area && !areaMap[n.area]) areaMap[n.area] = AREA_COLORS[aIdx++ % AREA_COLORS.length];
      const p = positions[n.id];
      if (p) { n.x = p.x; n.y = p.y; n.fx = p.x; n.fy = p.y; }
    });
    // Hulls
    const areaNames = Object.keys(areaMap);
    const hullG = this.g.append('g').attr('class','hulls');
    // Links
    const linkG = this.g.append('g');
    const linkSel = linkG.selectAll('line').data(links).join('line')
      .attr('stroke', d => lqiColor(d.lqi)).attr('stroke-width', d => lqiWidth(d.lqi))
      .attr('stroke-opacity', 0.7).attr('marker-end','url(#nv-arrow)');
    const linkLabelSel = linkG.selectAll('text').data(links.filter(d => d.lqi != null)).join('text')
      .attr('class','link-label').text(d => d.lqi);
    // Nodes
    const nodeG = this.g.append('g');
    const nodeSel = nodeG.selectAll('g').data(nodes).join('g').attr('cursor','grab');
    nodeSel.append('circle').attr('r', d => d.type === 'coordinator' || d.type === 'controller' ? 16 : 11)
      .attr('fill', d => (NODE_COLORS[d.type] || NODE_COLORS.node).fill)
      .attr('stroke', d => (NODE_COLORS[d.type] || NODE_COLORS.node).stroke).attr('stroke-width', 2);
    nodeSel.append('text').attr('class','node-label').attr('dy', d => (d.type === 'coordinator' || d.type === 'controller' ? 28 : 22))
      .text(d => d.name.length > 18 ? d.name.slice(0,16) + '…' : d.name);
    nodeSel.append('text').attr('text-anchor','middle').attr('dy',4).attr('font-size','12px')
      .attr('pointer-events','none').text(d => (NODE_COLORS[d.type] || NODE_COLORS.node).icon);
    // Drag
    const drag = d3.drag()
      .on('start', (e,d) => { if(!e.active) this.sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
      .on('drag', (e,d) => { d.fx=e.x; d.fy=e.y; })
      .on('end', (e,d) => {
        if(!e.active) this.sim.alphaTarget(0);
        const pos = loadStore(STOR.POSITIONS); pos[d.id] = { x: d.x, y: d.y }; saveStore(STOR.POSITIONS, pos);
      });
    nodeSel.call(drag);
    // Tooltip
    const onNode = this.opts.onNodeHover;
    if (onNode) {
      nodeSel.on('mouseenter', (e,d) => onNode(d, e)).on('mouseleave', () => onNode(null));
    }
    if (this.opts.onNodeClick) nodeSel.on('click', (e,d) => this.opts.onNodeClick(d));
    // Simulation
    this.sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(W/2, H/2))
      .force('collide', d3.forceCollide(30))
      .on('tick', () => {
        linkSel.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
        linkLabelSel.attr('x',d=>(d.source.x+d.target.x)/2).attr('y',d=>(d.source.y+d.target.y)/2);
        nodeSel.attr('transform', d=>`translate(${d.x},${d.y})`);
        // Hulls
        if (areaNames.length) {
          const hullData = areaNames.map(a => {
            const pts = nodes.filter(n => n.area === a).map(n => [n.x, n.y]);
            return pts.length >= 3 ? { area: a, hull: d3.polygonHull(pts), color: areaMap[a] } : null;
          }).filter(Boolean);
          const h = hullG.selectAll('path').data(hullData, d=>d.area);
          h.enter().append('path').attr('class','hull').merge(h)
            .attr('d', d => 'M' + d.hull.join('L') + 'Z')
            .attr('fill', d=>d.color).attr('stroke', d=>d.color);
          h.exit().remove();
        }
      });
    this._nodeSel = nodeSel; this._linkSel = linkSel;
  }
  highlightNode(nodeId) {
    const linked = new Set();
    this._links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === nodeId) linked.add(t);
      if (t === nodeId) linked.add(s);
    });
    linked.add(nodeId);
    this._nodeSel.style('opacity', d => linked.has(d.id) ? 1 : 0.15);
    this._linkSel.style('opacity', d => {
      const s = typeof d.source === 'object' ? d.source.id : d.source;
      const t = typeof d.target === 'object' ? d.target.id : d.target;
      return (s === nodeId || t === nodeId) ? 1 : 0.05;
    });
  }
  clearHighlight() { this._nodeSel?.style('opacity',1); this._linkSel?.style('opacity',0.7); }
  resetZoom() { this.svg?.transition().duration(400).call(this.zoom.transform, window.d3.zoomIdentity); }
  zoomIn() { this.svg?.transition().duration(300).call(this.zoom.scaleBy, 1.3); }
  zoomOut() { this.svg?.transition().duration(300).call(this.zoom.scaleBy, 0.7); }
  destroy() { this.sim?.stop(); this.container.innerHTML = ''; }
}

/* ── RadialTreeRenderer ───────────────────────────────── */
class RadialTreeRenderer {
  constructor(container, opts = {}) {
    this.container = container; this.opts = opts;
    this.svg = null; this.g = null; this.zoom = null;
    this._nodes = []; this._links = [];
  }
  init(nodes, links) {
    this._nodes = nodes; this._links = links;
    const d3 = window.d3, W = this.container.clientWidth, H = this.container.clientHeight;
    this.container.innerHTML = '';
    this.svg = d3.select(this.container).append('svg').attr('width',W).attr('height',H);
    this.g = this.svg.append('g').attr('transform',`translate(${W/2},${H/2})`);
    this.zoom = d3.zoom().scaleExtent([0.2,5]).on('zoom', e => this.g.attr('transform',`translate(${W/2+e.transform.x},${H/2+e.transform.y}) scale(${e.transform.k})`));
    this.svg.call(this.zoom);
    // Build tree via BFS
    const root = nodes.find(n => n.type === 'coordinator' || n.type === 'controller') || nodes[0];
    if (!root) return;
    const adj = {}; nodes.forEach(n => adj[n.id] = []);
    links.forEach(l => { adj[l.source]?.push(l.target); adj[l.target]?.push(l.source); });
    const treeData = { id: root.id, data: root, children: [] };
    const visited = new Set([root.id]); const queue = [treeData];
    while (queue.length) {
      const cur = queue.shift();
      (adj[cur.id] || []).forEach(nid => {
        if (!visited.has(nid)) {
          visited.add(nid);
          const child = { id: nid, data: nodes.find(n => n.id === nid), children: [] };
          cur.children.push(child);
          queue.push(child);
        }
      });
    }
    // Add orphan nodes
    nodes.forEach(n => { if (!visited.has(n.id)) { visited.add(n.id); treeData.children.push({ id: n.id, data: n, children: [] }); } });
    const maxR = Math.min(W, H) / 2 - 60;
    const hier = d3.hierarchy(treeData);
    const treeLayout = d3.tree().size([2 * Math.PI, maxR]).separation((a,b) => (a.parent === b.parent ? 1 : 2) / a.depth || 1);
    treeLayout(hier);
    // Guide circles
    const maxDepth = hier.height || 1;
    const guideG = this.g.append('g');
    for (let i = 1; i <= maxDepth; i++) {
      const r = (maxR / maxDepth) * i;
      guideG.append('circle').attr('r', r).attr('fill','none').attr('stroke','#2a2a4a').attr('stroke-dasharray','4,4').attr('opacity',0.5);
      guideG.append('text').attr('x',4).attr('y',-r-2).attr('font-size','9px').attr('fill','#666').text(`Hop ${i}`);
    }
    // Build link map for LQI
    const lqiMap = {};
    links.forEach(l => { lqiMap[l.source + '-' + l.target] = l.lqi; lqiMap[l.target + '-' + l.source] = l.lqi; });
    // Links
    const linkG = this.g.append('g');
    hier.links().forEach(l => {
      const lqi = lqiMap[l.source.data.id + '-' + l.target.data.id] ?? null;
      linkG.append('path')
        .attr('d', d3.linkRadial().angle(d => d.x).radius(d => d.y)({source: l.source, target: l.target}))
        .attr('fill','none').attr('stroke', lqiColor(lqi)).attr('stroke-width', lqiWidth(lqi)).attr('stroke-opacity',0.6);
    });
    // Nodes
    const nodeG = this.g.append('g');
    const nodeSel = nodeG.selectAll('g').data(hier.descendants()).join('g')
      .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);
    nodeSel.append('circle')
      .attr('r', d => d.depth === 0 ? 18 : 10)
      .attr('fill', d => (NODE_COLORS[d.data.data?.type] || NODE_COLORS.node).fill)
      .attr('stroke', d => (NODE_COLORS[d.data.data?.type] || NODE_COLORS.node).stroke)
      .attr('stroke-width', 2);
    nodeSel.append('text')
      .attr('dy','0.35em').attr('font-size','10px').attr('fill','#e0e0e0')
      .attr('text-anchor', d => d.x < Math.PI ? 'start' : 'end')
      .attr('transform', d => {
        const ang = d.x * 180 / Math.PI;
        return d.depth === 0 ? '' : `rotate(${ang < 180 ? -ang + 90 : -ang + 270}) translate(${d.depth === 0 ? 0 : 16},0)`;
      })
      .text(d => { const nm = d.data.data?.name || d.data.id; return nm.length > 16 ? nm.slice(0,14)+'…' : nm; });
    // LQI badges
    nodeSel.filter(d => {
      const n = d.data.data;
      return n && n.lqi != null;
    }).append('text')
      .attr('dy',-14).attr('text-anchor','middle').attr('font-size','8px')
      .attr('fill', d => lqiColor(d.data.data.lqi)).text(d => d.data.data.lqi);
    // Tooltip
    if (this.opts.onNodeHover) {
      nodeSel.on('mouseenter', (e,d) => this.opts.onNodeHover(d.data.data, e))
        .on('mouseleave', () => this.opts.onNodeHover(null));
    }
    this._nodeSel = nodeSel;
  }
  highlightNode(nodeId) {
    this._nodeSel?.style('opacity', d => d.data.id === nodeId ? 1 : 0.2);
  }
  clearHighlight() { this._nodeSel?.style('opacity',1); }
  resetZoom() { this.svg?.transition().duration(400).call(this.zoom.transform, window.d3.zoomIdentity); }
  zoomIn() { this.svg?.transition().duration(300).call(this.zoom.scaleBy, 1.3); }
  zoomOut() { this.svg?.transition().duration(300).call(this.zoom.scaleBy, 0.7); }
  destroy() { this.container.innerHTML = ''; }
}

/* ── OrganicGraphRenderer ─────────────────────────────── */
class OrganicGraphRenderer {
  constructor(container, opts = {}) {
    this.container = container; this.opts = opts;
    this.svg = null; this.sim = null; this.g = null; this.zoom = null;
    this._nodes = []; this._links = [];
  }
  init(nodes, links) {
    this._nodes = nodes; this._links = links;
    const d3 = window.d3, W = this.container.clientWidth, H = this.container.clientHeight;
    const NEON = ['#ff3366','#ffaa00','#b388ff','#00e676','#40c4ff','#ff6e40','#eeff41'];
    this.container.innerHTML = '';
    this.svg = d3.select(this.container).append('svg').attr('width',W).attr('height',H)
      .style('background','#080c14');
    // Glow filter
    const defs = this.svg.append('defs');
    const filt = defs.append('filter').attr('id','nv-glow').attr('x','-50%').attr('y','-50%').attr('width','200%').attr('height','200%');
    filt.append('feGaussianBlur').attr('stdDeviation','4').attr('result','blur');
    const merge = filt.append('feMerge');
    merge.append('feMergeNode').attr('in','blur');
    merge.append('feMergeNode').attr('in','SourceGraphic');
    this.g = this.svg.append('g');
    this.zoom = d3.zoom().scaleExtent([0.2,5]).on('zoom', e => this.g.attr('transform', e.transform));
    this.svg.call(this.zoom);
    // Assign neon colors by area or index
    const areaIdx = {}; let ai = 0;
    nodes.forEach((n, i) => {
      if (n.area && areaIdx[n.area] === undefined) areaIdx[n.area] = ai++;
      n._neon = NEON[(n.area ? areaIdx[n.area] : i) % NEON.length];
    });
    // Links — curved arcs
    const linkG = this.g.append('g');
    const linkSel = linkG.selectAll('path').data(links).join('path')
      .attr('fill','none').attr('stroke','#ffffff').attr('stroke-opacity',0.15).attr('stroke-width',1.5);
    // Nodes
    const nodeG = this.g.append('g');
    const nodeSel = nodeG.selectAll('g').data(nodes).join('g').attr('cursor','pointer');
    // Outer glow circle
    nodeSel.append('circle')
      .attr('r', d => (d.type === 'coordinator' || d.type === 'controller') ? 28 : 18)
      .attr('fill', d => d._neon).attr('opacity', 0.15).attr('filter','url(#nv-glow)');
    // Main circle
    nodeSel.append('circle')
      .attr('r', d => (d.type === 'coordinator' || d.type === 'controller') ? 16 : 10)
      .attr('fill', d => d._neon).attr('stroke','#fff').attr('stroke-width',1).attr('stroke-opacity',0.3);
    // Pulse on coordinators
    nodeSel.filter(d => d.type === 'coordinator' || d.type === 'controller')
      .append('circle').attr('r',20).attr('fill','none').attr('stroke', d => d._neon)
      .attr('stroke-width',1).attr('opacity',0.6).style('animation','pulse 2s infinite');
    // Labels
    nodeSel.append('text').attr('dy', d => (d.type === 'coordinator' || d.type === 'controller') ? 30 : 22)
      .attr('text-anchor','middle').attr('font-size','10px').attr('fill','#ccc').attr('font-weight','300')
      .text(d => d.name.length > 16 ? d.name.slice(0,14)+'…' : d.name);
    // Drag
    const drag = d3.drag()
      .on('start', (e,d) => { if(!e.active) this.sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
      .on('drag', (e,d) => { d.fx=e.x; d.fy=e.y; })
      .on('end', (e,d) => {
        if(!e.active) this.sim.alphaTarget(0);
        const pos = loadStore(STOR.POSITIONS); pos[d.id] = { x: d.x, y: d.y }; saveStore(STOR.POSITIONS, pos);
      });
    nodeSel.call(drag);
    if (this.opts.onNodeHover) {
      nodeSel.on('mouseenter', (e,d) => this.opts.onNodeHover(d, e)).on('mouseleave', () => this.opts.onNodeHover(null));
    }
    if (this.opts.onNodeClick) nodeSel.on('click', (e,d) => this.opts.onNodeClick(d));
    // Simulation — softer forces
    const positions = loadStore(STOR.POSITIONS);
    nodes.forEach(n => { const p = positions[n.id]; if(p){ n.x=p.x; n.y=p.y; n.fx=p.x; n.fy=p.y; } });
    this.sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(140).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W/2, H/2))
      .force('collide', d3.forceCollide(25))
      .velocityDecay(0.4)
      .on('tick', () => {
        linkSel.attr('d', d => {
          const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
          const dr = Math.sqrt(dx*dx + dy*dy) * 1.2;
          return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
        });
        nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
      });
    this._nodeSel = nodeSel; this._linkSel = linkSel;
  }
  highlightNode(nodeId) {
    const linked = new Set([nodeId]);
    this._links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === nodeId) linked.add(t);
      if (t === nodeId) linked.add(s);
    });
    this._nodeSel.style('opacity', d => linked.has(d.id) ? 1 : 0.1);
    this._linkSel.style('stroke-opacity', d => {
      const s = typeof d.source === 'object' ? d.source.id : d.source;
      const t = typeof d.target === 'object' ? d.target.id : d.target;
      return (s === nodeId || t === nodeId) ? 0.5 : 0.03;
    });
  }
  clearHighlight() { this._nodeSel?.style('opacity',1); this._linkSel?.style('stroke-opacity',0.15); }
  resetZoom() { this.svg?.transition().duration(400).call(this.zoom.transform, window.d3.zoomIdentity); }
  zoomIn() { this.svg?.transition().duration(300).call(this.zoom.scaleBy, 1.3); }
  zoomOut() { this.svg?.transition().duration(300).call(this.zoom.scaleBy, 0.7); }
  destroy() { this.sim?.stop(); this.container.innerHTML = ''; }
}

/* ── GridMatrixRenderer ───────────────────────────────── */
class GridMatrixRenderer {
  constructor(container, opts = {}) {
    this.container = container; this.opts = opts;
    this._nodes = []; this._links = []; this._highlighted = null;
  }
  init(nodes, links) {
    this._nodes = nodes; this._links = links;
    this.container.innerHTML = '';
    // Build adjacency map
    const adj = {};
    links.forEach(l => {
      const key = l.source + '|' + l.target;
      const keyR = l.target + '|' + l.source;
      adj[key] = l.lqi; adj[keyR] = l.lqi;
    });
    // Sort: coordinator/controller first, then by name
    const sorted = [...nodes].sort((a, b) => {
      const aCoord = (a.type === 'coordinator' || a.type === 'controller') ? 0 : 1;
      const bCoord = (b.type === 'coordinator' || b.type === 'controller') ? 0 : 1;
      if (aCoord !== bCoord) return aCoord - bCoord;
      return a.name.localeCompare(b.name);
    });
    const wrap = document.createElement('div');
    wrap.className = 'nv-grid-wrap';
    const table = document.createElement('table');
    table.className = 'nv-matrix';
    // Header row
    const thead = document.createElement('thead');
    const hRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.className = 'corner';
    corner.textContent = '↘';
    hRow.appendChild(corner);
    sorted.forEach(n => {
      const th = document.createElement('th');
      const short = n.name.length > 12 ? n.name.slice(0, 10) + '…' : n.name;
      th.textContent = short;
      th.title = n.name + (n.type ? ' (' + n.type + ')' : '');
      th.style.color = (NODE_COLORS[n.type] || NODE_COLORS.node).fill;
      th.style.fontSize = '9px';
      th.style.writingMode = 'vertical-lr';
      th.style.textOrientation = 'mixed';
      th.style.maxHeight = '120px';
      hRow.appendChild(th);
    });
    thead.appendChild(hRow);
    table.appendChild(thead);
    // Body rows
    const tbody = document.createElement('tbody');
    sorted.forEach(row => {
      const tr = document.createElement('tr');
      if (row.type === 'coordinator' || row.type === 'controller') tr.className = 'coord-row';
      const rowH = document.createElement('th');
      rowH.className = 'row-header';
      const icon = (NODE_COLORS[row.type] || NODE_COLORS.node).icon;
      rowH.innerHTML = icon + ' ' + (row.name.length > 18 ? row.name.slice(0, 16) + '…' : row.name);
      rowH.title = row.name + ' (' + row.type + ')' + (row.area ? ' — ' + row.area : '');
      tr.appendChild(rowH);
      sorted.forEach(col => {
        const td = document.createElement('td');
        if (row.id === col.id) {
          td.className = 'self';
          td.textContent = '●';
        } else {
          const key = row.id + '|' + col.id;
          const lqi = adj[key];
          if (lqi !== undefined) {
            td.className = 'connected';
            td.textContent = lqi != null ? lqi : '✓';
            td.style.background = lqi != null ? lqiColor(lqi) + '44' : 'rgba(79,195,247,0.2)';
            td.title = row.name + ' ↔ ' + col.name + (lqi != null ? ' (LQI: ' + lqi + ')' : '');
          } else {
            td.className = 'no-link';
            td.textContent = '·';
          }
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    this.container.appendChild(wrap);
    this._wrap = wrap;
    this._rows = tbody.querySelectorAll('tr');
  }
  highlightNode(nodeId) {
    this._highlighted = nodeId;
    const idx = this._nodes.findIndex(n => n.id === nodeId);
    this._rows?.forEach(tr => { tr.style.opacity = '0.3'; });
    if (idx >= 0 && this._rows?.[idx]) this._rows[idx].style.opacity = '1';
  }
  clearHighlight() {
    this._highlighted = null;
    this._rows?.forEach(tr => { tr.style.opacity = '1'; });
  }
  resetZoom() {}
  zoomIn() {}
  zoomOut() {}
  destroy() { this.container.innerHTML = ''; }
}

/* ── Main Component ───────────────────────────────────── */
class NetworkVisualizerPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._activeTab = 'zigbee';
    this._activeGraphType = 'force';
    this._renderer = null;
    this._allNodes = [];
    this._allLinks = [];
    this._highlighted = null;
    this._settings = loadStore(STOR.SETTINGS);
    if (this._settings.activeTab) this._activeTab = this._settings.activeTab;
    if (this._settings.graphType) this._activeGraphType = this._settings.graphType;
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) { this._render(); this._loadData(); }
  }

  connectedCallback() { if (this._hass) { this._render(); this._loadData(); } }
  disconnectedCallback() { this._renderer?.destroy(); }

  _render() {
    const s = this.shadowRoot;
    s.innerHTML = `<style>${NV_CSS}</style>
    <div class="nv">
      <div class="nv-header">
        <span class="nv-title">🔗 Network Visualizer</span>
        <div class="nv-graph-types">
          <button data-type="force" class="${this._activeGraphType==='force'?'active':''}">Force</button>
          <button data-type="radial" class="${this._activeGraphType==='radial'?'active':''}">Radial</button>
          <button data-type="organic" class="${this._activeGraphType==='organic'?'active':''}">Organic</button>
          <button data-type="grid" class="${this._activeGraphType==='grid'?'active':''}">Grid</button>
        </div>
        <div class="nv-search"><input type="text" placeholder="🔍 Search..." /></div>
      </div>
      <div class="nv-tabs">
        <div class="nv-tab${this._activeTab==='zigbee'?' active':''}" data-tab="zigbee">📡 Zigbee</div>
        <div class="nv-tab${this._activeTab==='zwave'?' active':''}" data-tab="zwave">🔌 Z-Wave</div>
      </div>
      <div class="nv-body">
        <div class="nv-graph"></div>
        <div class="nv-legend"></div>
        <div class="nv-tooltip"></div>
        <div class="nv-zoom">
          <button data-z="in" title="Zoom in">+</button>
          <button data-z="out" title="Zoom out">−</button>
          <button data-z="reset" title="Reset">⟲</button>
        </div>
        <div class="nv-loading"><div class="spinner"></div>Loading…</div>
      </div>
      <div class="nv-stats"></div>
    </div>`;
    // Events — tabs
    s.querySelectorAll('.nv-tab').forEach(t => t.addEventListener('click', () => this._switchTab(t.dataset.tab)));
    // Events — graph type
    s.querySelectorAll('.nv-graph-types button').forEach(b => b.addEventListener('click', () => this._switchGraphType(b.dataset.type)));
    // Events — search
    s.querySelector('.nv-search input').addEventListener('input', e => this._handleSearch(e.target.value));
    // Events — zoom
    s.querySelectorAll('.nv-zoom button').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.z === 'in') this._renderer?.zoomIn();
      else if (b.dataset.z === 'out') this._renderer?.zoomOut();
      else this._renderer?.resetZoom();
    }));
  }

  _switchTab(tab) {
    if (tab === this._activeTab) return;
    this._activeTab = tab;
    this._settings.activeTab = tab;
    saveStore(STOR.SETTINGS, this._settings);
    this.shadowRoot.querySelectorAll('.nv-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    this._buildGraph();
  }

  _switchGraphType(type) {
    if (type === this._activeGraphType) return;
    this._activeGraphType = type;
    this._settings.graphType = type;
    saveStore(STOR.SETTINGS, this._settings);
    this.shadowRoot.querySelectorAll('.nv-graph-types button').forEach(b => b.classList.toggle('active', b.dataset.type === type));
    this._buildGraph();
  }

  async _loadData() {
    try {
      const [devices, entities, states] = await Promise.all([
        this._hass.callWS({ type: 'config/device_registry/list' }),
        this._hass.callWS({ type: 'config/entity_registry/list' }),
        this._hass.callWS({ type: 'get_states' }),
      ]);
      const areas = await this._hass.callWS({ type: 'config/area_registry/list' }).catch(() => []);
      const areaMap = {}; (areas || []).forEach(a => areaMap[a.area_id] = a.name);
      const stateMap = {}; (states || []).forEach(s => stateMap[s.entity_id] = s);

      const nodes = [], links = [];

      // ── Zigbee (Zigbee2MQTT) ──
      const z2mDevices = devices.filter(d => d.identifiers?.some(id => Array.isArray(id) && id[0] === 'mqtt' && (id[1]||'').startsWith('zigbee2mqtt_')));
      let coordId = null;
      z2mDevices.forEach(d => {
        const ident = d.identifiers.find(id => id[0] === 'mqtt');
        const ieee = ident ? ident[1].replace('zigbee2mqtt_', '') : d.id;
        let nodeType = 'end_device';
        if ((d.model || '').toLowerCase().includes('coordinator') || (d.name || '').toLowerCase().includes('coordinator')) {
          nodeType = 'coordinator'; coordId = d.id;
        } else {
          const pwrEntity = entities.find(e => e.device_id === d.id && /power_source/i.test(e.entity_id));
          const pwrState = pwrEntity ? stateMap[pwrEntity.entity_id] : null;
          if (pwrState && /mains|dc/i.test(pwrState.state)) nodeType = 'router';
          if (!pwrEntity) {
            const mdl = (d.model || '').toLowerCase();
            if (/plug|switch|outlet|relay|bulb|light|dimmer|socket/i.test(mdl)) nodeType = 'router';
          }
        }
        const lqiEnt = entities.find(e => e.device_id === d.id && /linkquality/i.test(e.entity_id));
        const lqiState = lqiEnt ? stateMap[lqiEnt.entity_id] : null;
        const lqi = lqiState ? parseInt(lqiState.state) : null;
        nodes.push({
          id: d.id, name: d.name_by_user || d.name || ieee, type: nodeType,
          protocol: 'zigbee', model: d.model || '', manufacturer: d.manufacturer || '',
          lqi: isNaN(lqi) ? null : lqi, area: areaMap[d.area_id] || null, ieee,
        });
      });
      // Build Zigbee links
      if (coordId) {
        const routers = nodes.filter(n => n.protocol === 'zigbee' && n.type === 'router');
        const endDevs = nodes.filter(n => n.protocol === 'zigbee' && n.type === 'end_device');
        routers.forEach(r => links.push({ source: coordId, target: r.id, lqi: r.lqi, protocol: 'zigbee' }));
        endDevs.forEach(e => {
          const sameAreaRouter = routers.find(r => r.area && r.area === e.area);
          const parent = sameAreaRouter || routers[0] || coordId;
          links.push({ source: typeof parent === 'string' ? parent : parent.id, target: e.id, lqi: e.lqi, protocol: 'zigbee' });
        });
      }

      // ── Z-Wave (Z-Wave JS) ──
      let zwCtrlId = null;
      const zwDevices = devices.filter(d => d.identifiers?.some(id => Array.isArray(id) && id[0] === 'zwave_js'));
      zwDevices.forEach(d => {
        const ident = d.identifiers.find(id => id[0] === 'zwave_js');
        const nodeIdMatch = ident ? (ident[1] || '').match(/^(\d+)/) : null;
        const zwNodeId = nodeIdMatch ? parseInt(nodeIdMatch[1]) : null;
        let nodeType = 'node';
        if (zwNodeId === 1 || (d.model || '').toLowerCase().includes('controller') || (d.manufacturer || '').toLowerCase().includes('z-wave')) {
          nodeType = 'controller'; zwCtrlId = d.id;
        }
        nodes.push({
          id: d.id, name: d.name_by_user || d.name || `Node ${zwNodeId}`, type: nodeType,
          protocol: 'zwave', model: d.model || '', manufacturer: d.manufacturer || '',
          lqi: null, area: areaMap[d.area_id] || null, nodeId: zwNodeId,
        });
      });
      if (zwCtrlId) {
        nodes.filter(n => n.protocol === 'zwave' && n.type !== 'controller').forEach(n => {
          links.push({ source: zwCtrlId, target: n.id, lqi: null, protocol: 'zwave' });
        });
      }

      this._allNodes = nodes;
      this._allLinks = links;
      this._hideLoading();
      this._buildGraph();
    } catch (err) {
      console.error('[NetworkVisualizer] Load error:', err);
      this._hideLoading();
      const graph = this.shadowRoot.querySelector('.nv-graph');
      if (graph) graph.innerHTML = `<div style="padding:40px;text-align:center;color:#f44336">Error loading data: ${err.message}</div>`;
    }
  }

  _hideLoading() {
    const el = this.shadowRoot.querySelector('.nv-loading');
    if (el) el.style.display = 'none';
  }

  _buildGraph() {
    this._renderer?.destroy();
    const nodes = this._allNodes.filter(n => n.protocol === this._activeTab.replace('zwave','zwave'));
    const nodeIds = new Set(nodes.map(n => n.id));
    const links = this._allLinks.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target) && (l.protocol === (this._activeTab === 'zwave' ? 'zwave' : 'zigbee')));
    const container = this.shadowRoot.querySelector('.nv-graph');
    if (!container || !nodes.length) {
      if (container) container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--nv-text-dim)">No ${this._activeTab === 'zwave' ? 'Z-Wave' : 'Zigbee'} devices found.</div>`;
      this._updateStats(nodes);
      this._updateLegend(nodes);
      return;
    }
    const nodesCopy = nodes.map(n => ({ ...n }));
    const linksCopy = links.map(l => ({ ...l }));
    const opts = {
      onNodeHover: (node, event) => this._showTooltip(node, event),
      onNodeClick: (node) => {
        if (this._highlighted === node.id) { this._highlighted = null; this._renderer.clearHighlight(); }
        else { this._highlighted = node.id; this._renderer.highlightNode(node.id); }
      },
    };
    const Cls = this._activeGraphType === 'radial' ? RadialTreeRenderer
              : this._activeGraphType === 'organic' ? OrganicGraphRenderer
              : this._activeGraphType === 'grid' ? GridMatrixRenderer
              : ForceGraphRenderer;
    this._renderer = new Cls(container, opts);
    this._renderer.init(nodesCopy, linksCopy);
    this._updateStats(nodes);
    this._updateLegend(nodes);
  }

  _updateStats(nodes) {
    const bar = this.shadowRoot.querySelector('.nv-stats');
    if (!bar) return;
    const proto = this._activeTab === 'zwave' ? 'Z-Wave' : 'Zigbee';
    const total = nodes.length;
    const types = {};
    nodes.forEach(n => { types[n.type] = (types[n.type] || 0) + 1; });
    let html = `<span><b>${proto}</b> — ${total} devices</span>`;
    Object.entries(types).forEach(([t, c]) => {
      const col = (NODE_COLORS[t] || NODE_COLORS.node).fill;
      html += `<span><span class="dot" style="background:${col}"></span>${t}: ${c}</span>`;
    });
    const avgLqi = nodes.filter(n => n.lqi != null);
    if (avgLqi.length) {
      const avg = Math.round(avgLqi.reduce((s, n) => s + n.lqi, 0) / avgLqi.length);
      html += `<span>Avg LQI: <b>${avg}</b></span>`;
    }
    bar.innerHTML = html;
  }

  _updateLegend(nodes) {
    const leg = this.shadowRoot.querySelector('.nv-legend');
    if (!leg) return;
    const types = [...new Set(nodes.map(n => n.type))];
    let html = types.map(t => {
      const c = (NODE_COLORS[t] || NODE_COLORS.node);
      return `<div class="nv-legend-item"><span class="nv-legend-dot" style="background:${c.fill}"></span>${c.icon} ${t}</div>`;
    }).join('');
    if (this._activeTab === 'zigbee') {
      html += `<div class="nv-legend-item" style="margin-top:4px;border-top:1px solid var(--nv-border);padding-top:4px">
        <span class="nv-legend-dot" style="background:#04C714"></span>Good LQI
      </div><div class="nv-legend-item">
        <span class="nv-legend-dot" style="background:#F02311"></span>Poor LQI
      </div>`;
    }
    leg.innerHTML = html;
  }

  _showTooltip(node, event) {
    const tip = this.shadowRoot.querySelector('.nv-tooltip');
    if (!tip) return;
    if (!node) { tip.classList.remove('show'); return; }
    let html = `<h4>${node.name}</h4>`;
    html += `<div class="row"><span>Type</span><span>${node.type}</span></div>`;
    if (node.manufacturer) html += `<div class="row"><span>Manufacturer</span><span>${node.manufacturer}</span></div>`;
    if (node.model) html += `<div class="row"><span>Model</span><span>${node.model}</span></div>`;
    if (node.area) html += `<div class="row"><span>Area</span><span>${node.area}</span></div>`;
    if (node.lqi != null) html += `<div class="row"><span>LQI</span><span style="color:${lqiColor(node.lqi)}">${node.lqi}</span></div>`;
    if (node.ieee) html += `<div class="row"><span>IEEE</span><span style="font-size:10px">${node.ieee}</span></div>`;
    if (node.nodeId != null) html += `<div class="row"><span>Node ID</span><span>${node.nodeId}</span></div>`;
    tip.innerHTML = html;
    const body = this.shadowRoot.querySelector('.nv-body');
    const rect = body.getBoundingClientRect();
    tip.style.left = Math.min(event.clientX - rect.left + 12, rect.width - 270) + 'px';
    tip.style.top = Math.min(event.clientY - rect.top + 12, rect.height - 150) + 'px';
    tip.classList.add('show');
  }

  _handleSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) { this._renderer?.clearHighlight(); this._highlighted = null; return; }
    const match = this._allNodes.find(n => n.protocol === (this._activeTab === 'zwave' ? 'zwave' : 'zigbee') && n.name.toLowerCase().includes(q));
    if (match) { this._highlighted = match.id; this._renderer?.highlightNode(match.id); }
  }
}

/* ── Registration ─────────────────────────────────────── */
customElements.define('network-visualizer', NetworkVisualizerPanel);