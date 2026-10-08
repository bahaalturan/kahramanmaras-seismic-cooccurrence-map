import { LOCATIONS } from './locations.js';
import { t, lang, setLang, applyStatic } from './i18n.js';

// ---------------------------------------------------------------------------
// Sabitler
// ---------------------------------------------------------------------------
// Açıklamalar (info) dile göre i18n.js'den gelir
const METRICS = [
  { key: 'antSupport', label: 'Antecedent support' },
  { key: 'consSupport', label: 'Consequent support' },
  { key: 'support', label: 'Support', weight: true },
  { key: 'confidence', label: 'Confidence', weight: true, directed: true },
  { key: 'lift', label: 'Lift', weight: true },
  { key: 'leverage', label: 'Leverage', weight: true },
  { key: 'conviction', label: 'Conviction', weight: true, directed: true },
  { key: 'zhang', label: "Zhang's metric", weight: true },
];
const metricInfo = key => t('info')[key] ?? '';
const METRIC = Object.fromEntries(METRICS.map(m => [m.key, m]));
const LENGTHS = [1, 2, 3, 4];
const PLAY_MS = 1600;
const DEFAULT_TOP_N = 80; // tüm kurallar birlikte çok kalabalık; açılışta en güçlü 80 kural

// ---------------------------------------------------------------------------
// Veri
// ---------------------------------------------------------------------------
const [{ rules: RULES }, provinces] = await Promise.all([
  fetch('data/rules.json').then(r => r.json()),
  fetch('data/tr-provinces.geojson').then(r => r.json()),
]);
const YEARS = [...new Set(RULES.map(r => r.year))].sort();

// Metrik başına veri aralığı (∞ conviction hariç)
const RANGE = {};
for (const m of METRICS) {
  const vals = RULES.map(r => r[m.key]).filter(v => v !== null);
  RANGE[m.key] = { min: Math.min(...vals), max: Math.max(...vals) };
}
const CONV_CAP = RANGE.conviction.max; // ∞ conviction ağırlık hesabında bu değerle sınırlanır

// Tekil itemset desteği: yıl → il → o ilde deprem görülen günlerin oranı
const SINGLE_SUPPORT = {};
for (const r of RULES) {
  const s = (SINGLE_SUPPORT[r.year] ??= {});
  if (r.antLen === 1) s[r.antecedents[0]] = r.antSupport;
  if (r.consLen === 1) s[r.consequents[0]] = r.consSupport;
}

const toRad = d => d * Math.PI / 180;
function distanceKm(a, b) {
  const A = LOCATIONS[a], B = LOCATIONS[b];
  const dLat = toRad(B.lat - A.lat), dLon = toRad(B.lon - A.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(A.lat)) * Math.cos(toRad(B.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
const pairsOf = r => r.antecedents.flatMap(a => r.consequents.map(c => [a, c]));
const MAX_DIST = Math.ceil(Math.max(...RULES.flatMap(r => pairsOf(r).map(([a, b]) => distanceKm(a, b)))) / 50) * 50;
const USED_LOCS = [...new Set(RULES.flatMap(r => [...r.antecedents, ...r.consequents]))]
  .sort((a, b) => LOCATIONS[a].name.localeCompare(LOCATIONS[b].name, 'tr'));

// ---------------------------------------------------------------------------
// Durum
// ---------------------------------------------------------------------------
const defaults = () => ({
  years: new Set(YEARS),
  compare: false,
  weight: 'lift',
  aggregate: 'max',
  scale: 'linear',
  scaleRange: 'visible',
  directed: true,
  topN: DEFAULT_TOP_N,
  ranges: Object.fromEntries(METRICS.map(m => [m.key, [RANGE[m.key].min, RANGE[m.key].max]])),
  antLen: new Set(LENGTHS),
  consLen: new Set(LENGTHS),
  oneToOne: false,  locs: new Set(),
  locRole: 'any',
  dist: [0, MAX_DIST],
  nodeSize: 'support',
  basemap: 'auto',
  labels: true,
  arrows: true,
  borders: true,
  hideIsolated: true,
  focus: null,
  selectedRule: null,
  sort: { key: 'lift', dir: -1 },
});
let state = defaults();

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------
const $ = id => document.getElementById(id);
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const fmt = v => v === null ? '∞' : Math.abs(v) >= 10 ? v.toFixed(2) : v.toFixed(3);
const weightOf = (r, key = state.weight) => r[key] ?? CONV_CAP;
// Görünen ad; LOCATIONS[l].name il sınırı GeoJSON'u ile eşleşme için Türkçe kalır
const locName = l => (lang === 'en' && LOCATIONS[l].en) || LOCATIONS[l].name;
const ruleText = r => `${r.antecedents.map(locName).join(', ')} → ${r.consequents.map(locName).join(', ')}`;
const isDark = () => document.documentElement.dataset.theme === 'dark' ||
  (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);

function lerpColor(stops, t) {
  t = Math.min(1, Math.max(0, t));
  const i = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
  const f = t * (stops.length - 1) - i;
  const a = stops[i].match(/\w\w/g).map(h => parseInt(h, 16));
  const b = stops[i + 1].match(/\w\w/g).map(h => parseInt(h, 16));
  return '#' + a.map((v, k) => Math.round(v + (b[k] - v) * f).toString(16).padStart(2, '0')).join('');
}
// Tek tonlu mavi sıralı rampa; zayıf uç haritada kaybolmasın diye 250’den başlar.
const RAMP_LIGHT = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281', '#0d366b'];
const RAMP_DARK = ['#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4', '#cde2fb'];
const ramp = () => isDark() ? RAMP_DARK : RAMP_LIGHT;

// ---------------------------------------------------------------------------
// Filtreleme ve graf kurulumu
// ---------------------------------------------------------------------------
function inRange(key, v) {
  const [lo, hi] = state.ranges[key];
  const { min, max } = RANGE[key];
  const eps = (max - min) * 1e-6;
  if (v === null) return hi >= max - eps; // ∞ yalnızca üst sınır açıkken geçer
  return (lo <= min + eps || v >= lo - eps) && (hi >= max - eps || v <= hi + eps);
}

function computeGraph() {
  const [dLo, dHi] = state.dist;
  let rules = [];
  for (const r of RULES) {
    if (!state.years.has(r.year)) continue;
    if (!state.antLen.has(Math.min(r.antLen, 4)) || !state.consLen.has(Math.min(r.consLen, 4))) continue;
    if (state.oneToOne && (r.antLen > 1 || r.consLen > 1)) continue;
    if (!METRICS.every(m => inRange(m.key, r[m.key]))) continue;
    if (state.locs.size) {
      const side = state.locRole === 'ant' ? r.antecedents : state.locRole === 'cons' ? r.consequents : [...r.antecedents, ...r.consequents];
      if (!side.some(l => state.locs.has(l))) continue;
    }
    const pairs = pairsOf(r).filter(([a, b]) => { const d = distanceKm(a, b); return d >= dLo && d <= dHi; });
    if (!pairs.length) continue;
    rules.push({ rule: r, pairs });
  }
  rules.sort((x, y) => weightOf(y.rule) - weightOf(x.rule));
  rules = rules.slice(0, state.topN);

  const edges = new Map();
  for (const { rule, pairs } of rules) {
    for (const [a, b] of pairs) {
      const [s, t] = state.directed || a < b ? [a, b] : [b, a];
      const key = `${state.compare ? rule.year : 'all'}|${s}|${t}`;
      let e = edges.get(key);
      if (!e) edges.set(key, e = { key, source: s, target: t, year: state.compare ? rule.year : null, rules: [] });
      e.rules.push(rule);
    }
  }
  for (const e of edges.values()) {
    const vals = e.rules.map(r => weightOf(r));
    e.value = state.aggregate === 'max' ? Math.max(...vals)
      : state.aggregate === 'mean' ? vals.reduce((s, v) => s + v, 0) / vals.length
      : state.aggregate === 'sum' ? vals.reduce((s, v) => s + v, 0)
      : vals.length;
    e.distance = distanceKm(e.source, e.target);
    e.rules.sort((x, y) => weightOf(y) - weightOf(x));
  }
  return { rules: rules.map(x => x.rule), edges: [...edges.values()].sort((a, b) => a.value - b.value) };
}

// ---------------------------------------------------------------------------
// Harita
// ---------------------------------------------------------------------------
const map = L.map('map', { zoomSnap: 0.25, minZoom: 5, maxZoom: 10, preferCanvas: false })
  .fitBounds([[35.8, 25.7], [42.2, 44.8]]);
map.attributionControl.setPrefix(false);
const esri = name => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${name}/MapServer/tile/{z}/{y}/{x}`;
const tiles = {
  light: L.tileLayer(esri('World_Light_Gray_Base'), { attribution: t('tileAttr'), maxNativeZoom: 16 }),
  dark: L.tileLayer(esri('World_Dark_Gray_Base'), { attribution: t('tileAttr'), maxNativeZoom: 16 }),
};
function updateAttribution() {
  for (const layer of Object.values(tiles)) {
    const old = layer.options.attribution;
    layer.options.attribution = t('tileAttr');
    if (map.hasLayer(layer)) map.attributionControl.removeAttribution(old).addAttribution(t('tileAttr'));
  }
}
// Düğümler her zaman kenarların üstünde kalsın diye ayrı pane'ler
map.createPane('edges').style.zIndex = 410;
map.createPane('nodes').style.zIndex = 450;
const provinceLayer = L.geoJSON(provinces, { interactive: false }).addTo(map);
const edgeLayer = L.layerGroup().addTo(map);
const nodeLayer = L.layerGroup().addTo(map);
map.on('click', () => { if (state.focus || state.selectedRule) { state.focus = null; state.selectedRule = null; render(); } });
map.on('zoomend', () => drawEdges());

let graph = { rules: [], edges: [] };
let nodeRadius = {};

function applyBasemap() {
  const root = document.documentElement;
  if (state.basemap === 'light' || state.basemap === 'dark') root.dataset.theme = state.basemap;
  else delete root.dataset.theme;
  const want = state.basemap === 'none' ? null : isDark() ? 'dark' : 'light';
  for (const [k, layer] of Object.entries(tiles)) {
    if (k === want) layer.addTo(map); else layer.remove();
  }
}

function styleProvinces(active) {
  const noTiles = state.basemap === 'none';
  provinceLayer.setStyle(f => {
    const on = active.has(f.properties.name);
    return {
      color: css('--province-line'),
      weight: state.borders ? 0.6 : 0,
      fillColor: on ? css('--province-active') : css('--province-fill'),
      fillOpacity: on ? 0.55 : noTiles ? 1 : 0.15,
    };
  });
}

// İlgili il/kural vurgusu: odak il veya tablodan seçili kural
function highlightSet() {
  if (state.selectedRule) {
    const r = RULES.find(x => x.id === state.selectedRule);
    return r ? { nodes: new Set([...r.antecedents, ...r.consequents]), ruleId: r.id } : null;
  }
  if (state.focus) return { focus: state.focus };
  return null;
}
function edgeHighlighted(e, hl) {
  if (!hl) return true;
  if (hl.focus) return e.source === hl.focus || e.target === hl.focus;
  return e.rules.some(r => r.id === hl.ruleId);
}

// Kalınlık aralığı: görünen kenarlar ya da (max/ortalama için) tüm kurallar — ikincisi yıllar arası karşılaştırılabilir
function scaleDomain(edges) {
  if (state.scaleRange === 'global' && (state.aggregate === 'max' || state.aggregate === 'mean')) {
    const { min, max } = RANGE[state.weight];
    return [min, state.weight === 'conviction' ? CONV_CAP : max];
  }
  const vals = edges.map(e => e.value);
  return vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 0];
}

function widthScale(edges) {
  const [lo, hi] = scaleDomain(edges);
  return v => {
    let t = hi > lo ? Math.min(1, Math.max(0, (v - lo) / (hi - lo))) : 1;
    if (state.scale === 'log') t = Math.log1p(9 * t) / Math.log(10);
    return t;
  };
}

function curvePoints(p0, p2, bend) {
  const mx = (p0.x + p2.x) / 2, my = (p0.y + p2.y) / 2;
  const dx = p2.x - p0.x, dy = p2.y - p0.y;
  const c = L.point(mx - dy * bend, my + dx * bend); // yönün soluna doğru bük
  const pts = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32, u = 1 - t;
    pts.push(L.point(u * u * p0.x + 2 * u * t * c.x + t * t * p2.x, u * u * p0.y + 2 * u * t * c.y + t * t * p2.y));
  }
  return pts;
}

function drawEdges() {
  edgeLayer.clearLayers();
  const { edges } = graph;
  if (!edges.length) return;
  const scale = widthScale(edges);
  const hl = highlightSet();
  const yearIdx = Object.fromEntries([...state.years].sort().map((y, i) => [y, i]));

  for (const e of edges) {
    const t = scale(e.value);
    const w = 1.25 + t * 10.75;
    const color = state.compare ? css(`--y${e.year}`) : lerpColor(ramp(), t);
    const on = edgeHighlighted(e, hl);
    const opacity = on ? 0.35 + 0.55 * t : 0.06;

    const p0 = map.latLngToLayerPoint([LOCATIONS[e.source].lat, LOCATIONS[e.source].lon]);
    const p2 = map.latLngToLayerPoint([LOCATIONS[e.target].lat, LOCATIONS[e.target].lon]);
    let bend = state.directed ? 0.14 : 0.06;
    if (state.compare) bend += 0.07 * (yearIdx[e.year] ?? 0);
    let pts = curvePoints(p0, p2, bend);

    // Oku hedef düğümün kenarında bitir
    const rT = (nodeRadius[e.target] ?? 5) + 2;
    let end = pts.length - 1;
    while (end > 1 && pts[end].distanceTo(p2) < rT) end--;
    pts = pts.slice(0, end + 1);
    const tip = pts[pts.length - 1];

    let arrow = null;
    if (state.directed && state.arrows) {
      const prev = pts[Math.max(0, pts.length - 3)];
      const ang = Math.atan2(tip.y - prev.y, tip.x - prev.x);
      const len = 7 + w * 0.9, half = 3.5 + w * 0.55;
      const base = L.point(tip.x - Math.cos(ang) * len, tip.y - Math.sin(ang) * len);
      const nx = -Math.sin(ang) * half, ny = Math.cos(ang) * half;
      arrow = [tip, L.point(base.x + nx, base.y + ny), L.point(base.x - nx, base.y - ny)];
      // gövdeyi ok tabanında kes
      while (pts.length > 2 && pts[pts.length - 1].distanceTo(tip) < len * 0.8) pts.pop();
    }
    const ll = pts.map(p => map.layerPointToLatLng(p));
    const line = L.polyline(ll, { pane: 'edges', color, weight: w, opacity, lineCap: 'round', interactive: false });
    const hit = L.polyline(ll, { pane: 'edges', color: '#000', weight: Math.max(12, w + 8), opacity: 0, interactive: on });
    edgeLayer.addLayer(line);
    if (arrow) edgeLayer.addLayer(L.polygon(arrow.map(p => map.layerPointToLatLng(p)), { pane: 'edges', color, fillColor: color, fillOpacity: opacity, opacity: 0, weight: 0, interactive: false }));
    if (on) {
      hit.bindTooltip(() => edgeTooltip(e), { sticky: true, className: 'tip', direction: 'top', offset: [0, -8] });
      hit.on('mouseover', () => line.setStyle({ opacity: 1, weight: w + 2 }));
      hit.on('mouseout', () => line.setStyle({ opacity, weight: w }));
      edgeLayer.addLayer(hit);
    }
  }
}

function edgeTooltip(e) {
  const m = METRIC[state.weight];
  const arrow = state.directed ? '→' : '↔';
  const aggLabel = t('agg')[state.aggregate];
  const rows = e.rules.slice(0, 6).map(r => `<tr><td>${r.year}</td><td style="text-align:left">${ruleText(r)}</td><td>${fmt(r.lift)}</td><td>${fmt(r.confidence)}</td><td>${fmt(r.conviction)}</td></tr>`).join('');
  return `<div class="t">${locName(e.source)} ${arrow} ${locName(e.target)}${e.year ? ` · ${e.year}` : ''}</div>
    <div>${m.label} (${aggLabel}): <b>${state.aggregate === 'count' ? e.value : fmt(e.value)}</b></div>
    <div class="muted">${Math.round(e.distance)} km · ${t('nRules')(e.rules.length)}</div>
    <table><tr class="muted"><td>${t('year')}</td><td style="text-align:left">${t('rule')}</td><td>Lift</td><td>Conf.</td><td>Conv.</td></tr>${rows}</table>
    ${e.rules.length > 6 ? `<div class="muted">${t('moreRules')(e.rules.length - 6)}</div>` : ''}`;
}

function nodeTooltip(loc, stats) {
  const sup = YEARS.map(y => SINGLE_SUPPORT[y]?.[loc] !== undefined ? `<tr><td>${y}</td><td>${fmt(SINGLE_SUPPORT[y][loc])}</td></tr>` : '').join('');
  const top = graph.edges.filter(e => e.source === loc || e.target === loc).sort((a, b) => b.value - a.value).slice(0, 5)
    .map(e => `<tr><td style="text-align:left">${e.source === loc ? '→ ' + locName(e.target) : '← ' + locName(e.source)}${e.year ? ` (${e.year})` : ''}</td><td>${fmt(e.value)}</td></tr>`).join('');
  return `<div class="t">${locName(loc)}</div>
    <div class="muted">${t('nodeInfo')(stats.degree)}</div>
    ${sup ? `<div style="margin-top:4px">${t('singleSupport')}</div><table>${sup}</table>` : ''}
    ${top ? `<div style="margin-top:4px">${t('strongest')(METRIC[state.weight].label)}</div><table>${top}</table>` : ''}`;
}

function drawNodes() {
  nodeLayer.clearLayers();
  const stats = {};
  for (const l of USED_LOCS) stats[l] = { degree: 0, strength: 0 };
  const scale = graph.edges.length ? widthScale(graph.edges) : () => 0;
  for (const e of graph.edges) {
    for (const l of [e.source, e.target]) { stats[l].degree++; stats[l].strength += 0.2 + scale(e.value); }
  }
  const sizeVal = l => {
    if (state.nodeSize === 'degree') return stats[l].degree;
    if (state.nodeSize === 'strength') return stats[l].strength;
    const v = [...state.years].map(y => SINGLE_SUPPORT[y]?.[l]).filter(v => v !== undefined);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
  };
  const visible = USED_LOCS.filter(l => !state.hideIsolated || stats[l].degree > 0 || state.locs.has(l));
  const maxV = Math.max(1e-9, ...visible.map(sizeVal));
  const hl = highlightSet();
  const neighbors = new Set();
  if (hl?.focus) {
    neighbors.add(hl.focus);
    graph.edges.forEach(e => { if (e.source === hl.focus) neighbors.add(e.target); if (e.target === hl.focus) neighbors.add(e.source); });
  }
  nodeRadius = {};
  for (const l of visible) {
    const r = 4 + 12 * Math.sqrt(sizeVal(l) / maxV);
    nodeRadius[l] = r;
    const dim = hl && !(hl.focus ? neighbors.has(l) : hl.nodes.has(l));
    const marker = L.circleMarker([LOCATIONS[l].lat, LOCATIONS[l].lon], {
      pane: 'nodes', radius: r, color: css('--node-ring'), weight: 2, fillColor: state.locs.has(l) || state.focus === l ? css('--accent') : css('--node'),
      fillOpacity: dim ? 0.2 : 0.95, opacity: dim ? 0.3 : 1,
    });
    marker.bindTooltip(() => nodeTooltip(l, stats[l]), { className: 'tip', direction: 'top', offset: [0, -r] });
    marker.on('click', ev => { L.DomEvent.stopPropagation(ev); state.selectedRule = null; state.focus = state.focus === l ? null : l; render(); });
    nodeLayer.addLayer(marker);
    if (state.labels && !dim) {
      L.tooltip({ permanent: true, direction: 'right', className: 'node-label', offset: [r + 1, 0], interactive: false })
        .setLatLng([LOCATIONS[l].lat, LOCATIONS[l].lon]).setContent(locName(l)).addTo(nodeLayer);
    }
  }
  styleProvinces(new Set(visible.map(l => LOCATIONS[l].name)));
  return visible.length;
}

// ---------------------------------------------------------------------------
// Lejant, özet, tablo
// ---------------------------------------------------------------------------
function drawLegend() {
  const m = METRIC[state.weight];
  const aggLabel = t('legendAgg')[state.aggregate];
  const vals = graph.edges.map(e => e.value);
  const [lo, hi] = scaleDomain(graph.edges);
  const f = v => state.aggregate === 'count' ? String(v) : fmt(v);
  const widths = `<div class="widths">${[1.25, 4, 7.5, 12].map(w => `<i style="height:${w}px"></i>`).join('')}<span>${t('thinStrong')}</span></div>`;
  let body;
  if (state.compare) {
    body = `<div class="yearkey">${[...state.years].sort().map(y => `<span><i style="background:var(--y${y})"></i>${y}</span>`).join('')}</div>
      <div style="margin-top:4px">${t('widthRange')}: ${f(lo)} – ${f(hi)}</div>${widths}`;
  } else {
    body = `<div class="ramp" style="background:linear-gradient(90deg, ${ramp().join(',')})"></div>
      <div class="ends"><span>${f(lo)}</span><span>${f(hi)}</span></div>${widths}`;
  }
  $('legend').innerHTML = `<div class="title">${t('edge')}: ${m.label} (${aggLabel})</div>${vals.length ? body : `<span>${t('noRules')}</span>`}
    ${state.weight === 'conviction' ? `<div class="muted">${t('convNote')}</div>` : ''}`;
}

function drawSummary(nodeCount) {
  const yrs = [...state.years].sort();
  const yearText = yrs.length === YEARS.length ? t('allYears') : yrs.length ? yrs.join(', ') : '—';
  $('summary').innerHTML = [
    [graph.rules.length, t('sumRules')], [graph.edges.length, t('sumEdges')], [nodeCount, t('sumNodes')], [yearText, t('sumPeriod')],
  ].map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
}

const tableCols = () => [
  { key: 'year', label: t('year') },
  { key: 'rule', label: t('ruleCol') },
  ...METRICS.map(m => ({ key: m.key, label: m.label.replace('Antecedent support', 'Ant. sup.').replace('Consequent support', 'Cons. sup.') })),
];
function drawTable() {
  const { key, dir } = state.sort;
  const rows = [...graph.rules].sort((a, b) => {
    const va = key === 'rule' ? ruleText(a) : key === 'conviction' ? weightOf(a, key) : a[key];
    const vb = key === 'rule' ? ruleText(b) : key === 'conviction' ? weightOf(b, key) : b[key];
    return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
  });
  $('ruleTable').tHead.innerHTML = `<tr>${tableCols().map(c => `<th data-key="${c.key}" class="${c.key === key ? 'sorted' + (dir > 0 ? ' asc' : '') : ''}" title="${metricInfo(c.key)}">${c.label}</th>`).join('')}</tr>`;
  $('ruleTable').tBodies[0].innerHTML = rows.map(r => `<tr data-id="${r.id}" class="${r.id === state.selectedRule ? 'sel' : ''}">
    <td>${r.year}</td>
    <td class="rule">${r.antecedents.map(locName).join(', ')}<span class="arrow">→</span>${r.consequents.map(locName).join(', ')}</td>
    ${METRICS.map(m => `<td>${fmt(r[m.key])}</td>`).join('')}</tr>`).join('');
  $('tableInfo').textContent = t('tableInfo')(rows.length);
}

// ---------------------------------------------------------------------------
// Ana çizim
// ---------------------------------------------------------------------------
function render() {
  graph = computeGraph();
  const nodeCount = drawNodes();
  drawEdges();
  drawLegend();
  drawSummary(nodeCount);
  drawTable();
  $('topNVal').textContent = state.topN >= RULES.length ? t('all') : state.topN;
}

// ---------------------------------------------------------------------------
// Kontroller
// ---------------------------------------------------------------------------
function dualRange(container, { label, info, min, max, value, format, onChange }) {
  const wrap = document.createElement('div');
  wrap.className = 'range';
  wrap.innerHTML = `<div class="range-head"><span ${info ? `class="info" title="${info}"` : ''}>${label}</span><span class="range-vals"></span></div>
    <div class="dual"><div class="track"></div><div class="fill"></div><input type="range"><input type="range"></div>`;
  container.appendChild(wrap);
  const [a, b] = wrap.querySelectorAll('input');
  const step = (max - min) / 400;
  for (const inp of [a, b]) Object.assign(inp, { min, max, step });
  const fill = wrap.querySelector('.fill'), vals = wrap.querySelector('.range-vals');
  const pct = v => (v - min) / (max - min) * 100;
  const sync = () => {
    const lo = +a.value, hi = +b.value;
    fill.style.left = pct(lo) + '%';
    fill.style.width = (pct(hi) - pct(lo)) + '%';
    vals.textContent = `${format(lo)} – ${format(hi)}`;
    a.style.zIndex = lo > min + (max - min) * 0.5 ? 3 : 2;
  };
  const set = ([lo, hi]) => { a.value = lo; b.value = hi; sync(); };
  const onInput = which => () => {
    if (+a.value > +b.value) { if (which === a) a.value = b.value; else b.value = a.value; }
    sync();
    onChange([+a.value, +b.value]);
  };
  a.addEventListener('input', onInput(a));
  b.addEventListener('input', onInput(b));
  set(value);
  return { set };
}

function chip(text, on, onClick, swatch) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'chip' + (on ? ' on' : '');
  el.innerHTML = (swatch ? `<i class="sw" style="background:${swatch}"></i>` : '') + text;
  el.addEventListener('click', onClick);
  return el;
}

let rangeCtrls = {};
let distCtrl;
function buildControls() {
  // Yıllar
  const years = $('years');
  years.innerHTML = '';
  for (const y of YEARS) {
    const n = RULES.filter(r => r.year === y).length;
    years.appendChild(chip(`${y} <span class="muted">(${n})</span>`, state.years.has(y), () => {
      stopPlay();
      state.years.has(y) ? state.years.delete(y) : state.years.add(y);
      buildControls(); render();
    }, state.compare ? `var(--y${y})` : null));
  }
  $('compareYears').checked = state.compare;

  // Ağırlık
  $('weightMetric').innerHTML = METRICS.filter(m => m.weight)
    .map(m => `<option value="${m.key}" ${m.key === state.weight ? 'selected' : ''}>${m.label}${m.directed ? t('directedTag') : ''}</option>`).join('');
  $('aggregate').value = state.aggregate;
  $('scaleType').value = state.scale;
  $('scaleRange').value = state.scaleRange;
  $('directed').checked = state.directed;
  Object.assign($('topN'), { max: RULES.length, value: state.topN });

  // Metrik aralıkları
  if (!Object.keys(rangeCtrls).length) {
    for (const m of METRICS) {
      rangeCtrls[m.key] = dualRange($('metricRanges'), {
        label: m.label, info: metricInfo(m.key), min: RANGE[m.key].min, max: RANGE[m.key].max, value: state.ranges[m.key],
        format: v => (m.key === 'conviction' && v >= RANGE[m.key].max) ? '∞' : fmt(v),
        onChange: v => { state.ranges[m.key] = v; render(); },
      });
    }
    distCtrl = dualRange($('distanceRange'), {
      label: t('distanceLabel'), min: 0, max: MAX_DIST, value: state.dist, format: v => `${Math.round(v)} km`,
      onChange: v => { state.dist = v; render(); },
    });
  } else {
    for (const m of METRICS) rangeCtrls[m.key].set(state.ranges[m.key]);
    distCtrl.set(state.dist);
  }

  // Kural yapısı
  for (const [id, set] of [['antLen', state.antLen], ['consLen', state.consLen]]) {
    const el = $(id);
    el.innerHTML = '';
    for (const n of LENGTHS) {
      el.appendChild(chip(n === 4 ? '4+' : String(n), set.has(n), () => {
        set.has(n) ? set.delete(n) : set.add(n);
        buildControls(); render();
      }));
    }
  }
  $('oneToOne').checked = state.oneToOne;
  // Konumlar
  $('locRole').value = state.locRole;
  buildLocationChips();

  // Görünüm
  $('nodeSize').value = state.nodeSize;
  $('basemap').value = state.basemap;
  $('showLabels').checked = state.labels;
  $('showArrows').checked = state.arrows;
  $('showBorders').checked = state.borders;
  $('hideIsolated').checked = state.hideIsolated;
}

function buildLocationChips() {
  const q = $('locSearch').value.trim().toLocaleLowerCase('tr');
  const el = $('locations');
  el.innerHTML = '';
  for (const l of USED_LOCS) {
    if (q && !locName(l).toLocaleLowerCase('tr').includes(q)) continue;
    el.appendChild(chip(locName(l), state.locs.has(l), () => {
      state.locs.has(l) ? state.locs.delete(l) : state.locs.add(l);
      buildLocationChips(); render();
    }));
  }
}

const bind = (id, ev, fn) => $(id).addEventListener(ev, e => { fn(e.target); render(); });
bind('compareYears', 'change', t => { state.compare = t.checked; buildControls(); });
bind('weightMetric', 'change', t => { state.weight = t.value; state.sort = { key: t.value, dir: -1 }; });
bind('aggregate', 'change', t => { state.aggregate = t.value; });
bind('scaleType', 'change', t => { state.scale = t.value; });
bind('scaleRange', 'change', t => { state.scaleRange = t.value; });
bind('directed', 'change', t => { state.directed = t.checked; });
bind('topN', 'input', t => { state.topN = +t.value; });
bind('oneToOne', 'change', t => { state.oneToOne = t.checked; });bind('locRole', 'change', t => { state.locRole = t.value; });
bind('nodeSize', 'change', t => { state.nodeSize = t.value; });
bind('basemap', 'change', t => { state.basemap = t.value; applyBasemap(); });
bind('showLabels', 'change', t => { state.labels = t.checked; });
bind('showArrows', 'change', t => { state.arrows = t.checked; });
bind('showBorders', 'change', t => { state.borders = t.checked; });
bind('hideIsolated', 'change', t => { state.hideIsolated = t.checked; });
$('locSearch').addEventListener('input', buildLocationChips);
$('locClear').addEventListener('click', () => { state.locs.clear(); $('locSearch').value = ''; buildLocationChips(); render(); });
$('resetBtn').addEventListener('click', () => { stopPlay(); state = defaults(); applyBasemap(); buildControls(); render(); });

$('ruleTable').tHead.addEventListener('click', e => {
  const key = e.target.closest('th')?.dataset.key;
  if (!key) return;
  state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : (key === 'rule' || key === 'year' ? 1 : -1) };
  drawTable();
});
$('ruleTable').tBodies[0].addEventListener('click', e => {
  const id = e.target.closest('tr')?.dataset.id;
  if (!id) return;
  state.focus = null;
  state.selectedRule = state.selectedRule === id ? null : id;
  render();
});

// Yıl oynatıcı
let playTimer = null;
function stopPlay() {
  clearInterval(playTimer); playTimer = null;
  $('playBtn').textContent = t('play');
  $('playBtn').classList.remove('active');
}
$('playBtn').addEventListener('click', () => {
  if (playTimer) return stopPlay();
  let i = 0;
  const step = () => { state.years = new Set([YEARS[i++ % YEARS.length]]); buildControls(); render(); };
  step();
  playTimer = setInterval(step, PLAY_MS);
  $('playBtn').textContent = t('stop');
  $('playBtn').classList.add('active');
});

// Dil seçimi (TR / EN)
for (const b of document.querySelectorAll('[data-lang]')) {
  b.addEventListener('click', () => {
    if (b.dataset.lang === lang) return;
    setLang(b.dataset.lang);
    $('playBtn').textContent = t(playTimer ? 'stop' : 'play');
    updateAttribution();
    // Aralık kaydırıcıları etiketleriyle birlikte bir kez kuruluyor; yeni dille baştan kur
    $('metricRanges').innerHTML = ''; $('distanceRange').innerHTML = ''; rangeCtrls = {};
    buildControls(); render();
  });
}

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { applyBasemap(); render(); });

applyStatic();
$('playBtn').textContent = t('play');
applyBasemap();
buildControls();
render();
