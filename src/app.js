(function () {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clone = o => JSON.parse(JSON.stringify(o));
const STORE = 'openround.v3';
let lang = 'en', inp = clone(DEFAULT_INPUT), D = null, locked = false, lockedHoles = null, lockedCut = null;
let sel = null, addMode = false, tab = 'summary', modelRole = 'smooth';
try { const s = JSON.parse(localStorage.getItem(STORE) || 'null'); if (s && s.inp) { inp = merge(clone(DEFAULT_INPUT), s.inp); lang = s.lang || 'en'; } } catch (e) {}
function merge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k]) merge(a[k], b[k]); else a[k] = b[k]; } return a; }
const T = (k, ...v) => { let s = (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k; v.forEach((x, i) => s = s.replace('{' + i + '}', x)); return s; };
const get = (o, p) => p.split('.').reduce((a, k) => a[k], o);
const set = (o, p, v) => { const ks = p.split('.'); const l = ks.pop(); ks.reduce((a, k) => a[k], o)[l] = v; };
const f = (x, d = 2) => (x === undefined || x === null || !isFinite(x)) ? '—' : Number(x).toLocaleString(lang === 'en' ? 'en-US' : lang, { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- explosive presets (typical values; verify with supplier) ---------- */
const PRESETS = [
  { name: 'ANFO – reference', type: 'bulk', SG: 0.82, RWS: 1.0, VOD: 3.65 },
  { name: 'ANFO – pneumatically loaded', type: 'bulk', SG: 0.95, RWS: 1.0, VOD: 3.9 },
  { name: 'Bulk emulsion – low density', type: 'bulk', SG: 0.97, RWS: 0.77, VOD: 3.2 },
  { name: 'Bulk emulsion – standard', type: 'bulk', SG: 1.2, RWS: 0.78, VOD: 5.5 },
  { name: 'Bulk emulsion – high density', type: 'bulk', SG: 1.26, RWS: 0.98, VOD: 6.0 },
  { name: 'String emulsion (SSE) – 50% load', type: 'string', SG: 1.0, RWS: 0.78, VOD: 5.0, De: 0.032 },
  { name: 'String emulsion (SSE) – 25% load', type: 'string', SG: 0.9, RWS: 0.78, VOD: 4.5, De: 0.024 },
  { name: 'Cartridge emulsion 25 mm', type: 'cartridge', SG: 1.15, RWS: 0.88, VOD: 4.7, De: 0.025, Le: 0.4 },
  { name: 'Cartridge emulsion 32 mm', type: 'cartridge', SG: 1.15, RWS: 0.88, VOD: 4.7, De: 0.032, Le: 0.4 },
  { name: 'Cartridge emulsion 38 mm', type: 'cartridge', SG: 1.15, RWS: 0.88, VOD: 4.7, De: 0.038, Le: 0.4 },
  { name: 'High-strength emulsion 25 mm', type: 'cartridge', SG: 1.37, RWS: 1.13, VOD: 6.1, De: 0.025, Le: 0.2 },
  { name: 'Emulsion pipe charge on cord 22 mm', type: 'cartridge', SG: 1.30, RWS: 1.09, VOD: 7.0, De: 0.022, Le: 0.6 },
  { name: 'NG dynamite pipe charge 22 mm', type: 'cartridge', SG: 1.4, RWS: 1.13, VOD: 2.6, De: 0.022, Le: 0.6 },
  { name: 'Detonating cord 40 g/m', type: 'cord', SG: 1.4, RWS: 2.2, VOD: 6.5, coreLoad: 40 },
  { name: 'Detonating cord 80 g/m', type: 'cord', SG: 1.4, RWS: 2.2, VOD: 6.5, coreLoad: 80 }
];

/* ---------- input schema ---------- */
const MM = { u: 'mm', s: 1000 }, M = { u: 'm', s: 1 };
const SECTIONS = [
  ['project', [['name', 'project.name', null, 'text'], ['comment', 'project.comment', null, 'text']]],
  ['geometry', 'GEOM'],
  ['drilling', [['Dh', 'drill.Dh', MM], ['emptyD', 'drill.emptyD', MM], ['nEmpty', 'drill.nEmpty', { u: '', s: 1 }, 'sel', [1, 2, 3, 4]],
    ['L', 'drill.L', M], ['lookout', 'drill.lookout', M], ['collarDev', 'drill.collarDev', M], ['angDev', 'drill.angDev', { u: 'm/m', s: 1 }], ['advance', 'drill.advance', { u: '%', s: 1 }]]],
  ['rockSec', [['SG', 'rock.SG', { u: '', s: 1 }], ['cb', 'rock.cb', { u: 'kg/m³', s: 1 }], ['UCS', 'rock.UCS', { u: 'MPa', s: 1 }], ['UTS', 'rock.UTS', { u: 'MPa', s: 1 }],
    ['E', 'rock.E', { u: 'MPa', s: 1 }], ['nu', 'rock.nu', { u: '', s: 1 }], ['c', 'rock.c', { u: 'MPa', s: 1 }], ['phi', 'rock.phi', { u: '°', s: 1 }], ['stress', 'rock.stress', { u: 'MPa', s: 1 }]]],
  ['modelSec', [['lkF', 'rock.lkF', { u: '', s: 1 }, 'num', null, 'lk'], ['lkKS', 'rock.lkKS', { u: '', s: 1 }, 'num', null, 'lk'],
    ['rockClass', 'rock.rockClass', null, 'sel', ['Ia', 'Ib', 'II', 'III'], 'etkin'], ['jointSpacing', 'rock.jointSpacing', M, 'num', null, 'etkin'], ['jointWidth', 'rock.jointWidth', { u: 'mm', s: 1 }, 'num', null, 'etkin'],
    ['etkinZone', 'rock.etkinZone', null, 'sel', ['deep', 'surface'], 'etkin'],
    ['K', 'rock.K', { u: 'm/s', s: 1 }, 'num', null, 'hp'], ['alpha', 'rock.alpha', { u: '', s: 1 }, 'num', null, 'hp'], ['beta', 'rock.beta', { u: '', s: 1 }, 'num', null, 'hp'],
    ['ppvCrit', 'rock.ppvCrit', { u: 'm/s', s: 1 }, 'num', null, 'hp'], ['dz', 'rock.dz', M, 'num', null, 'hpSum'],
    ['ba', 'rock.ba', { u: '1/m', s: 1 }, 'num', null, 'johnson'], ['johnsonExp', 'rock.johnsonExp', { u: '', s: 1 }, 'num', null, 'johnson']]],
  ['factors', [['ksLifter', 'ks.lifter', { u: '', s: 1 }], ['ksFull', 'ks.full', { u: '', s: 1 }], ['ksBuffer', 'ks.buffer', { u: '', s: 1 }], ['ksSmooth', 'ks.smooth', { u: '', s: 1 }],
    ['Ek', 'holmberg.Ek', { u: '×d', s: 1 }], ['EB', 'holmberg.EB', { u: '', s: 1 }], ['overlap', 'bufferRow.overlap', { u: '', s: 1 }]]],
  ['explosivesSec', 'EXPL'],
  ['cutSec', [['xAuto', 'cut.xAuto', null, 'chk'], ['cutX', 'cut.x', M], ['yAuto', 'cut.yAuto', null, 'chk'], ['cutY', 'cut.y', M], ['q1k', 'cut.q1k', { u: '×φ', s: 1 }], ['outerScale', 'cut.outerScale', { u: '×', s: 1 }]]],
  ['costSec', [['currency', 'cost.currency', null, 'text'], ['drillPerM', 'cost.drillPerM', { u: '/m', s: 1 }], ['detPerHole', 'cost.detPerHole', { u: '/hole', s: 1 }], ['fixedPerRound', 'cost.fixedPerRound', { u: '', s: 1 }]]]
];
const ROLES = ['full', 'buffer', 'smooth', 'lifter'];
const COL = { perim: 'var(--c-perim)', buffer: 'var(--c-buffer)', stope: 'var(--c-stope)', lifter: 'var(--c-lifter)', cut1: 'var(--c-cut)', cut2: 'var(--c-cut)', cut3: 'var(--c-cut)', cut4: 'var(--c-cut)', empty: 'var(--s-empty)' };
const CHG_COL = { smooth: 'var(--c-perim)', buffer: 'var(--c-buffer)', full: 'var(--c-stope)', lifter: 'var(--c-lifter)' };
const SEC_COL = { project: 'var(--ink)', geometry: 'var(--sheet)', drilling: 'var(--c-buffer)', cutSec: 'var(--c-cut)', rockSec: 'var(--ochre)', modelSec: 'var(--hem)', factors: 'var(--mal)', explosivesSec: 'linear-gradient(90deg,var(--c-perim) 25%,var(--c-buffer) 25% 50%,var(--c-stope) 50% 75%,var(--c-lifter) 75%)', costSec: 'var(--ochreT)' };
const ADV = new Set(['rockSec', 'modelSec', 'factors', 'costSec']); let advOpen = false;
let focusType = null;
const TYPES = ['perim', 'buffer', 'stope', 'lifter', 'cut1', 'cut2', 'cut3', 'cut4', 'empty'];
const TYPE_CHARGE = { perim: 'smooth', buffer: 'buffer', stope: 'full', lifter: 'lifter', cut1: 'smooth', cut2: 'buffer', cut3: 'full', cut4: 'full', empty: 'none' };

function field(key, path, unit, kind = 'num', opts, model, shapes) {
  const v = get(inp, path);
  const dm = (model ? ` data-model="${model}"` : '') + (shapes ? ` data-shape="${shapes}"` : '');
  if (kind === 'range') { const [mn, mx, st] = opts; return `<label class="row rng"${dm}><span>${T(key)}</span><input type="range" min="${mn}" max="${mx}" step="${st}" value="${v}" data-p="${path}" data-s="1" aria-label="${T(key)}"><input type="number" step="${st}" min="${mn}" max="${mx}" data-p="${path}" data-s="1" value="${+(+v).toFixed(3)}"><i>${unit.u}</i></label>`; }
  if (kind === 'chk') return `<label class="row chk"${dm}><input type="checkbox" data-p="${path}" ${v ? 'checked' : ''}><span>${T(key)}</span></label>`;
  if (kind === 'sel') return `<label class="row"${dm}><span>${T(key)}</span><select data-p="${path}" data-num="${typeof opts[0] === 'number'}">${opts.map(o => `<option value="${o}" ${o == v ? 'selected' : ''}>${typeof o === 'number' ? o : path === 'geom.shape' ? T('shp_' + o) : T(o)}</option>`).join('')}</select><i></i></label>`;
  if (kind === 'text') return `<label class="row"${dm}><span>${T(key)}</span><input type="text" data-p="${path}" value="${esc(v)}"><i></i></label>`;
  const dv = +(v * unit.s).toPrecision(6);
  return `<label class="row"${dm}><span>${T(key)}</span><input type="number" step="any" data-p="${path}" data-s="${unit.s}" value="${dv}"><i>${unit.u}</i></label>`;
}
function geomHTML() {
  const g = inp.geom, sh = g.shape || 'arched';
  const haMax = +(g.W / 2).toFixed(2), rMax = +Math.min(g.W / 2, g.H).toFixed(2);
  let h = field('shape', 'geom.shape', null, 'sel', ['arched', 'flat', 'rounded', 'horseshoe', 'custom'].map(x => x));
  h += field('W', 'geom.W', M, 'num', null, null, 'arched flat rounded horseshoe');
  h += field('Hw', 'geom.Hw', M, 'num', null, null, 'arched');
  h += field('ha', 'geom.ha', M, 'range', [0, haMax, 0.05], null, 'arched');
  h += field('Hgt', 'geom.H', M, 'num', null, null, 'flat rounded horseshoe');
  h += field('rC', 'geom.r', M, 'range', [0, rMax, 0.05], null, 'rounded');
  h += field('kW', 'geom.k', { u: '×', s: 1 }, 'range', [1.2, 3, 0.05], null, 'horseshoe');
  h += `<div class="imp"><button class="btn" id="impBtn">${T('importBtn')}</button><input type="file" id="impFile" accept=".dxf,.csv,.txt,.xyz" hidden>
    <div id="impPick"></div><p class="note">${sh === 'custom' && g.importName && D ? esc(T('impInfo', g.importName, f(D.G.W), f(D.G.H), f(D.G.area))) : T('impHint')}</p></div>`;
  return h;
}
function explHTML() {
  return ROLES.map(r => {
    const e = inp.explosives[r];
    const show = (k) => ({ De: e.type === 'cartridge' || e.type === 'string', Le: e.type === 'cartridge', coreLoad: e.type === 'cord', SG: e.type !== 'cord' }[k] ?? true);
    const p = 'explosives.' + r + '.';
    return `<div class="ex" style="border-left-color:${CHG_COL[r]}"><div class="exh">${T('role_' + r)}</div>
      <label class="row"><span>${T('preset')}</span><select data-preset="${r}"><option value="">${esc(e.name)}</option>${PRESETS.map((x, i) => `<option value="${i}">${esc(x.name)}</option>`).join('')}</select><i></i></label>
      ${field('type', p + 'type', null, 'sel', ['bulk', 'string', 'cartridge', 'cord'])}
      ${show('SG') ? field('SG', p + 'SG', { u: 'g/cm³', s: 1 }) : ''}${field('RWS', p + 'RWS', { u: '', s: 1 })}${field('VOD', p + 'VOD', { u: 'km/s', s: 1 })}
      ${show('De') ? field('De', p + 'De', MM) : ''}${show('Le') ? field('Le', p + 'Le', M) : ''}${show('coreLoad') ? field('coreLoad', p + 'coreLoad', { u: 'g/m', s: 1 }) : ''}
      ${inp.stemAuto ? '' : field('stem', 'stem.' + r, M)}${field('price', p + 'price', { u: inp.cost.currency + '/kg', s: 1 })}</div>`;
  }).join('');
}
const open = new Set(['geometry', 'drilling']);
function buildForm() {
  let h = `<div class="sec top"><label class="row"><span>${T('method')}</span><select data-p="method">${['bufferRow', 'chargeRegion', 'holmberg'].map(m => `<option value="${m}" ${inp.method === m ? 'selected' : ''}>${T(m)}</option>`).join('')}</select><i></i></label>
  <label class="row"><span>${T('damageModel')}</span><select data-p="damageModel">${OR.MODELS.map(m => `<option value="${m}" ${inp.damageModel === m ? 'selected' : ''}>${T(m)}</option>`).join('')}</select><i></i></label></div>`;
  let adv = '';
  for (const [key, fields] of SECTIONS) {
    const body = fields === 'GEOM' ? geomHTML() : fields === 'EXPL' ? field('stemAuto', 'stemAuto', null, 'chk') + explHTML() : fields.map(x => field(...x)).join('');
    const blk = `<details class="sec" data-sec="${key}" ${open.has(key) ? 'open' : ''}><summary><b class="sw" style="background:${SEC_COL[key] || '#ccc'}"></b>${T(key)}</summary>${body}</details>`;
    if (ADV.has(key)) adv += blk; else h += blk;
  }
  h += `<button class="advt" id="advt" aria-expanded="${advOpen}">${T('advanced')}<span>${ADV.size}</span></button><div class="adv" ${advOpen ? '' : 'hidden'}>${adv}</div>`;
  $('#form').innerHTML = h;
  modelVis();
  $('#advt').addEventListener('click', () => { advOpen = !advOpen; buildForm(); });
  $('#impBtn').addEventListener('click', () => $('#impFile').click());
  $('#impFile').addEventListener('change', onImportFile);
  $$('#form details').forEach(d => d.addEventListener('toggle', () => d.open ? open.add(d.dataset.sec) : open.delete(d.dataset.sec)));
}
function modelVis() {
  const m = inp.damageModel;
  $$('#form [data-model]').forEach(el => { const t = el.dataset.model; el.style.display = (t === m || (t === 'hp' && /^hp/.test(m))) ? '' : 'none'; });
  const shp = inp.geom.shape || 'arched';
  $$('#form [data-shape]').forEach(el => { el.style.display = el.dataset.shape.split(' ').includes(shp) ? '' : 'none'; });
  const cy = $('#form [data-p="cut.y"]'); if (cy) cy.disabled = inp.cut.yAuto;
  const cxx = $('#form [data-p="cut.x"]'); if (cxx) cxx.disabled = inp.cut.xAuto;
}
document.addEventListener('input', e => {
  const el = e.target; if (!el.closest('#form')) return;
  if (el.dataset.p) {
    let v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? parseFloat(el.value) / parseFloat(el.dataset.s) : el.value;
    if (el.tagName === 'SELECT' && el.dataset.num === 'true') v = +v;
    if (el.type === 'number' && !isFinite(v)) return;
    set(inp, el.dataset.p, v);
    $$(`#form [data-p="${el.dataset.p}"]`).forEach(o => { if (o !== el && o.type !== 'checkbox') o.value = o.type === 'range' ? v : +(+v).toFixed(3); });
    if (el.dataset.p === 'geom.shape') { if (v === 'custom' && !inp.geom.points) { inp.geom.shape = 'arched'; el.value = 'arched'; $('#impFile').click(); return; } rebuildSoon(0); }
    if (/^geom\.(W|H)$/.test(el.dataset.p)) { const ha = $('#form input[type=range][data-p="geom.ha"]'), r = $('#form input[type=range][data-p="geom.r"]'); if (ha) ha.max = (inp.geom.W / 2).toFixed(2); if (r) r.max = Math.min(inp.geom.W / 2, inp.geom.H).toFixed(2); }
    if (/\.type$|^cost\.currency|^stemAuto/.test(el.dataset.p) || el.dataset.p === 'damageModel') { if (el.dataset.p === 'damageModel') modelVis(); else rebuildSoon(); }
    if (/^cut\.[xy]Auto/.test(el.dataset.p)) modelVis();
    run();
  }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.preset !== undefined && el.value !== '') {
    const r = el.dataset.preset, p = PRESETS[+el.value];
    inp.explosives[r] = { ...inp.explosives[r], De: inp.explosives[r].De || 0.032, Le: inp.explosives[r].Le || 0.4, coreLoad: 40, ...p };
    buildForm(); run();
  }
});
let rbT; function rebuildSoon(ms = 400) { clearTimeout(rbT); rbT = setTimeout(() => { buildForm(); }, ms); }

/* ---------- import of a surveyed section (DXF / CSV) ---------- */
const vMin = a => a.reduce((x, y) => y < x ? y : x, Infinity), vMax = a => a.reduce((x, y) => y > x ? y : x, -Infinity);
function bulgeArc(a, b, bulge, out) {
  const th = 4 * Math.atan(bulge), dx = b[0] - a[0], dy = b[1] - a[1], c = Math.hypot(dx, dy); if (c < 1e-12 || Math.abs(th) < 1e-9) return;
  const dd = (c / 2) / Math.tan(th / 2), cx = (a[0] + b[0]) / 2 - dd * dy / c, cy = (a[1] + b[1]) / 2 + dd * dx / c;
  const R = Math.hypot(a[0] - cx, a[1] - cy), a0 = Math.atan2(a[1] - cy, a[0] - cx), n = Math.max(2, Math.ceil(Math.abs(th) / (Math.PI / 180)));
  for (let i = 1; i < n; i++) { const t = a0 + th * i / n; out.push([cx + R * Math.cos(t), cy + R * Math.sin(t)]); }
}
function parseDXF(text) {
  const L = text.split(/\r?\n/), pairs = [];
  for (let i = 0; i + 1 < L.length; i += 2) pairs.push([parseInt(L[i].trim(), 10), L[i + 1].trim()]);
  let i = 0; while (i < pairs.length && !(pairs[i][0] === 2 && pairs[i][1] === 'ENTITIES')) i++;
  const ents = []; let cur = null;
  for (; i < pairs.length; i++) { const [c, v] = pairs[i]; if (c === 0) { if (v === 'ENDSEC') break; cur = { type: v, g: [] }; ents.push(cur); } else if (cur) cur.g.push([c, v]); }
  const polys = [], segs = []; let pl = null;
  const num = v => parseFloat(v);
  for (const e of ents) {
    const g = e.g, layer = (g.find(q => q[0] === 8) || [0, '0'])[1];
    if (e.type === 'LWPOLYLINE') {
      const flags = +((g.find(q => q[0] === 70) || [0, 0])[1]), z = num((g.find(q => q[0] === 38) || [0, 0])[1]) || 0, pts = []; let last = null;
      for (const [c, v] of g) { if (c === 10) { last = [num(v), 0, z, 0]; pts.push(last); } else if (c === 20 && last) last[1] = num(v); else if (c === 42 && last) last[3] = num(v); }
      const out = []; for (let k = 0; k < pts.length; k++) { out.push([pts[k][0], pts[k][1], z]); const nx = pts[k + 1] || ((flags & 1) ? pts[0] : null); if (nx && pts[k][3]) { const tmp = []; bulgeArc(pts[k], nx, pts[k][3], tmp); tmp.forEach(q => out.push([q[0], q[1], z])); } }
      polys.push({ pts: out, closed: !!(flags & 1), layer, kind: 'LWPOLYLINE' });
    } else if (e.type === 'POLYLINE') { const flags = +((g.find(q => q[0] === 70) || [0, 0])[1]); pl = { pts: [], closed: !!(flags & 1), layer, kind: flags & 8 ? '3D POLYLINE' : 'POLYLINE', bul: [] }; polys.push(pl); }
    else if (e.type === 'VERTEX' && pl) { const x = num((g.find(q => q[0] === 10) || [0, 0])[1]), y = num((g.find(q => q[0] === 20) || [0, 0])[1]), z = num((g.find(q => q[0] === 30) || [0, 0])[1]) || 0, b = num((g.find(q => q[0] === 42) || [0, 0])[1]) || 0;
      const prev = pl.pts[pl.pts.length - 1]; if (prev && pl.lastB) { const tmp = []; bulgeArc(prev, [x, y], pl.lastB, tmp); tmp.forEach(q => pl.pts.push([q[0], q[1], z])); } pl.pts.push([x, y, z]); pl.lastB = b; }
    else if (e.type === 'SEQEND') pl = null;
    else if (e.type === 'LINE') { const v = c => num((g.find(q => q[0] === c) || [0, 0])[1]) || 0; segs.push({ pts: [[v(10), v(20), v(30)], [v(11), v(21), v(31)]], layer }); }
    else if (e.type === 'ARC') { const v = c => num((g.find(q => q[0] === c) || [0, 0])[1]) || 0; const cx = v(10), cy = v(20), z = v(30), r = v(40); let a0 = v(50) * Math.PI / 180, a1 = v(51) * Math.PI / 180; if (a1 < a0) a1 += 2 * Math.PI;
      const n = Math.max(2, Math.ceil((a1 - a0) / (Math.PI / 180))), pts = []; for (let k = 0; k <= n; k++) { const t = a0 + (a1 - a0) * k / n; pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t), z]); } segs.push({ pts, layer }); }
    else if (e.type === 'SPLINE') { const fit = [], ctl = []; let lf = null, lc = null;
      for (const [c, v] of g) { if (c === 11) { lf = [num(v), 0, 0]; fit.push(lf); } else if (c === 21 && lf) lf[1] = num(v); else if (c === 31 && lf) lf[2] = num(v); else if (c === 10) { lc = [num(v), 0, 0]; ctl.push(lc); } else if (c === 20 && lc) lc[1] = num(v); else if (c === 30 && lc) lc[2] = num(v); }
      const flags = +((g.find(q => q[0] === 70) || [0, 0])[1]); polys.push({ pts: fit.length > 2 ? fit : ctl, closed: !!(flags & 1), layer, kind: 'SPLINE' }); }
  }
  // join loose LINE / ARC pieces end to end
  const tol = 1e-3, used = new Array(segs.length).fill(false);
  for (let s0 = 0; s0 < segs.length; s0++) { if (used[s0]) continue; used[s0] = true; let chain = segs[s0].pts.slice(), grew = true;
    while (grew) { grew = false; for (let k = 0; k < segs.length; k++) { if (used[k]) continue; const p = segs[k].pts, a = chain[chain.length - 1], b = chain[0], d = (u, w) => Math.hypot(u[0] - w[0], u[1] - w[1], u[2] - w[2]);
      if (d(a, p[0]) < tol) { chain = chain.concat(p.slice(1)); } else if (d(a, p[p.length - 1]) < tol) { chain = chain.concat(p.slice(0, -1).reverse()); } else if (d(b, p[p.length - 1]) < tol) { chain = p.slice(0, -1).concat(chain); } else if (d(b, p[0]) < tol) { chain = p.slice(1).reverse().concat(chain); } else continue; used[k] = true; grew = true; } }
    polys.push({ pts: chain, closed: false, layer: segs[s0].layer, kind: 'LINE/ARC' }); }
  return polys.filter(p => p.pts.length > 2);
}
function parseXYZ(text) {
  const pts = [];
  for (const ln of text.split(/\r?\n/)) { const n = ln.trim().split(/[\s,;\t]+/).map(Number).filter(v => isFinite(v)); if (n.length >= 2 && !/[a-df-z]/i.test(ln.replace(/e[-+]?\d/gi, ''))) pts.push([n[0], n[1], n.length > 2 ? n[2] : 0]); }
  return pts.length > 2 ? [{ pts, closed: true, layer: '—', kind: 'XYZ' }] : [];
}
// 3D section → 2D (horizontal along the section, vertical = elevation); 2D drawings are used as they are
function to2D(pts) {
  const zs = pts.map(p => p[2]), zr = vMax(zs) - vMin(zs);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), ext = Math.max(vMax(xs) - vMin(xs), vMax(ys) - vMin(ys));
  if (zr < 1e-6 * Math.max(1, ext) || zr < 1e-4) return { p: pts.map(q => [q[0], q[1]]), proj: false };
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxx = 0, syy = 0, sxy = 0; for (const q of pts) { const dx = q[0] - mx, dy = q[1] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy), ux = Math.cos(ang), uy = Math.sin(ang);
  return { p: pts.map(q => [(q[0] - mx) * ux + (q[1] - my) * uy, q[2]]), proj: true };
}
function simplifyDP(p, eps) {
  if (p.length < 4) return p;
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1; const st = [[0, p.length - 1]];
  while (st.length) { const [a, b] = st.pop(); let dm = 0, im = -1; const [ax, ay] = p[a], [bx, by] = p[b], L = Math.hypot(bx - ax, by - ay) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((by - ay) * p[i][0] - (bx - ax) * p[i][1] + bx * ay - by * ax) / L; if (d > dm) { dm = d; im = i; } }
    if (dm > eps && im > 0) { keep[im] = 1; st.push([a, im], [im, b]); } }
  return p.filter((_, i) => keep[i]);
}
function normaliseProfile(p2) {
  let p = p2.slice(); const w0 = vMax(p.map(q => q[0])) - vMin(p.map(q => q[0])), h0 = vMax(p.map(q => q[1])) - vMin(p.map(q => q[1]));
  let mm = false; if (Math.max(w0, h0) > 60) { p = p.map(q => [q[0] / 1000, q[1] / 1000]); mm = true; }
  if (Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 1e-6) p.pop();
  { let k = 0, dk = 0; for (let i = 1; i < p.length; i++) { const d = Math.hypot(p[i][0] - p[0][0], p[i][1] - p[0][1]); if (d > dk) { dk = d; k = i; } }
    const A = simplifyDP(p.slice(0, k + 1), 0.01), Bc = simplifyDP([...p.slice(k), p[0]], 0.01); p = [...A.slice(0, -1), ...Bc.slice(0, -1)]; }
  const ymin = vMin(p.map(q => q[1])), band = p.filter(q => q[1] < ymin + 0.15), bx = band.length > 1 ? band : p;
  const xc = (vMin(bx.map(q => q[0])) + vMax(bx.map(q => q[0]))) / 2;
  return { pts: p.map(q => [+(q[0] - xc).toFixed(4), +(q[1] - ymin).toFixed(4)]), mm };
}
let impCands = [];
async function onImportFile(e) {
  const fl = e.target.files[0]; e.target.value = ''; if (!fl) return;
  const text = await fl.text();
  const raw = /\.dxf$/i.test(fl.name) || /\n\s*0\s*\n\s*SECTION/.test(text.slice(0, 2000)) ? parseDXF(text) : parseXYZ(text);
  impCands = raw.map(r => { const t = to2D(r.pts), a = Math.abs(OR.signedArea(t.p)); return { ...r, p2: t.p, proj: t.proj, area: a, name: fl.name.replace(/\.[^.]+$/, '') }; })
    .filter(c => c.area > 1e-6).sort((a, b) => b.area - a.area);
  if (!impCands.length) { $('#impPick').innerHTML = `<p class="note bad">${T('impNone')}</p>`; return; }
  if (impCands.length === 1) return useProfile(0);
  $('#impPick').innerHTML = `<label class="row"><span>${T('impPick')}</span><select id="impSel">${impCands.map((c, i) => { const s = vMax(c.p2.map(q => q[0])) - vMin(c.p2.map(q => q[0])) > 60 ? 1e-6 : 1;
    return `<option value="${i}">${esc(c.layer)} · ${c.kind} · ${f(c.area * s, 2)} m² · ${c.pts.length} pt</option>`; }).join('')}</select><i></i></label><button class="btn primary" id="impUse">${T('impUse')}</button>`;
  $('#impUse').addEventListener('click', () => useProfile(+$('#impSel').value));
}
function useProfile(i) {
  const c = impCands[i], n = normaliseProfile(c.p2);
  inp.geom.points = n.pts; inp.geom.shape = 'custom'; inp.geom.importName = c.name + (c.layer && c.layer !== '—' ? ' / ' + c.layer : '');
  locked = false; lockedHoles = null; $('#lock').checked = false; sel = null; V.fitted = false;
  run(); buildForm();
  note(T('impDone') + (n.mm ? ' ' + T('impUnits') : '') + (c.proj ? ' ' + T('impProj') : '') + (c.closed ? '' : ' ' + T('impOpen')));
}

/* ---------- compute ---------- */
function run() {
  try {
    const d = OR.design(inp);
    if (locked && lockedHoles) {
      d.holes = lockedHoles.map(h => ({ ...h }));
      d.cut.cx = lockedCut.cx; d.cut.cy = lockedCut.cy;
      OR.finish(d);
      lockedHoles = d.holes;
    }
    const sig = h => [h.x.toFixed(3), h.y.toFixed(3), h.type, h.delay, (h.kg || 0).toFixed(2)].join('|');
    const prev = D && !drag ? new Map(D.holes.map(h => [h.id, sig(h)])) : null;
    d._changed = new Set();
    if (prev) { for (const h of d.holes) if (prev.get(h.id) !== sig(h)) d._changed.add(h.id); }
    D = d;
    $('#err').textContent = '';
  } catch (err) { $('#err').textContent = 'Error: ' + err.message; console.error(err); }
  try { localStorage.setItem(STORE, JSON.stringify({ inp, lang })); } catch (e) {}
  $('#projName').textContent = inp.project.name || '';
  draw(); results(); renderLegend();
  if (D && D._changed) setTimeout(() => { if (D) D._changed = new Set(); }, 1200);
}

/* ---------- drawing sheet (CAD-like) ---------- */
const V = { sc: 100, ox: 0, oy: 0, fitSc: 100, key: '' };
let mode = 'select', measures = [], rStart = null, cursorW = null, snapPt = null, pan = null, drag = null;
if (!inp.view.show) inp.view.show = {};
const SHOW_KEYS = ['grid', 'spacings', 'dims', 'damage', 'delays', 'ids', 'contours', 'collars', 'detail'];
if (!Object.keys(inp.view.show).length) { Object.assign(inp.view.show, { grid: true, spacings: false, dims: false, damage: false, delays: true, ids: false, contours: true, collars: true, detail: true }); inp.view.preset = 'design'; }
for (const k of SHOW_KEYS) if (inp.view.show[k] === undefined) inp.view.show[k] = k !== 'ids';
const show = () => inp.view.show;
const svgEl = () => $('#plot');
const posOf = h => { const fp = inp.view.plane; return [h.x - (1 - fp) * h.lx, h.y - (1 - fp) * h.ly]; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function layout() {
  const G = D.G, LD = inp.drill.lookout;
  const xL = G.xmin - LD, xR = G.xmax + LD, yB = G.ymin - LD, yT = G.ymax + LD;
  const k = Math.max(0.7, (yT - yB) / 5.2);
  const m = 0.95 * k, t = 0.085 * k;
  const rC = (D.cut.quads.length ? D.cut.quads[D.cut.quads.length - 1].HD / Math.SQRT2 : 0.3) + 0.12;
  const dw = show().detail ? Math.max(2.0 * k, 0.5 * (yT - yB)) : 0;
  const qd = D.cut.quads, rDet = (qd.length >= 2 ? qd[1].HD : qd[0].HD) / Math.SQRT2 + 0.12;
  const dx0 = xR + m + 0.35 * k, dx1 = dx0 + dw, dy1 = yT + 0.2 * k, dy0 = dy1 - dw;
  const x0 = xL - m - 0.3 * k, x1 = (show().detail ? dx1 : xR + m) + 0.3 * k;
  const titleH = 0.95 * k;
  const y0 = yB - m - titleH - 0.2 * k, y1 = yT + m + 0.3 * k;
  return { G, LD, xL, xR, yB, yT, k, m, t, rC, rDet, dw, dx0, dx1, dy0, dy1, x0, x1, y0, y1, titleH };
}
function fitView() {
  const r = svgEl().getBoundingClientRect(), L = layout();
  const st = $('#strip'), res = st && st.offsetParent ? st.offsetHeight + 24 : 0, hAv = r.height - res;
  const sc = Math.min(r.width / (L.x1 - L.x0), hAv / (L.y1 - L.y0)) * 0.97;
  V.sc = V.fitSc = sc; V.ox = r.width / 2 - (L.x0 + L.x1) / 2 * sc; V.oy = hAv / 2 + (L.y0 + L.y1) / 2 * sc;
}
function viewKey() { const g = inp.geom; return [g.W, g.Hw, g.ha, inp.drill.lookout, show().detail].join('|'); }
function toWorld(ev) { const r = svgEl().getBoundingClientRect(); return [(ev.clientX - r.left - V.ox) / V.sc, (V.oy - (ev.clientY - r.top)) / V.sc]; }

/* scene as an SVG string for a given view (used on screen and in the report) */
function sceneSVG(W, H, view, opt = {}) {
  const L = layout(), S = show(), sc = view.sc;
  const X = x => (view.ox + x * sc), Y = y => (view.oy - y * sc);
  const n2 = v => v.toFixed(1);
  const fs = mult => clamp(L.t * sc * mult, 7, 15).toFixed(1);
  const pl = (pts, cls) => `<polyline class="${cls}" points="${pts.map(p => n2(X(p[0])) + ',' + n2(Y(p[1]))).join(' ')}"/>`;
  const G = D.G;
  let s = '';
  // paper
  s += `<rect class="paper" x="${n2(X(L.x0))}" y="${n2(Y(L.y1))}" width="${n2((L.x1 - L.x0) * sc)}" height="${n2((L.y1 - L.y0) * sc)}"/>`;
  const fi = 0.08 * L.k;
  s += `<rect class="frame" x="${n2(X(L.x0 + fi))}" y="${n2(Y(L.y1 - fi))}" width="${n2((L.x1 - L.x0 - 2 * fi) * sc)}" height="${n2((L.y1 - L.y0 - 2 * fi) * sc)}"/>`;
  // grid
  const gx0 = L.xL - L.m * 0.7, gx1 = L.xR + L.m * 0.7, gy0 = L.yB - L.m * 0.7, gy1 = L.yT + L.m * 0.7;
  if (S.grid) {
    const step = [0.05, 0.1, 0.25, 0.5, 1].find(v => v * sc >= 7) || 1;
    let dmin = '', dmaj = '';
    for (let x = Math.ceil(gx0 / step) * step; x <= gx1 + 1e-9; x += step) { const maj = Math.abs(x - Math.round(x)) < 1e-6; const d = `M${n2(X(x))} ${n2(Y(gy0))}V${n2(Y(gy1))}`; maj ? dmaj += d : dmin += d; }
    for (let y = Math.ceil(gy0 / step) * step; y <= gy1 + 1e-9; y += step) { const maj = Math.abs(y - Math.round(y)) < 1e-6; const d = `M${n2(X(gx0))} ${n2(Y(y))}H${n2(X(gx1))}`; maj ? dmaj += d : dmin += d; }
    s += `<path class="gmin" d="${dmin}"/><path class="gmaj" d="${dmaj}"/>`;
    for (let x = Math.ceil(gx0); x <= gx1; x++) s += `<text class="gl" x="${n2(X(x))}" y="${n2(Y(gy0) + 11)}" text-anchor="middle">${x}</text>`;
    for (let y = Math.ceil(gy0); y <= gy1; y++) s += `<text class="gl" x="${n2(X(gx0) - 4)}" y="${n2(Y(y) + 3)}" text-anchor="end">${y}</text>`;
  }
  // contours
  s += pl(OR.contourPts(G, 0, 160), 'cdesign');
  s += pl(OR.contourPts(G, -L.LD, 160), 'clook');
  if (S.contours) { if (D.bufOff) s += pl(OR.contourPts(G, D.bufOff, 160), 'coff cbuf'); s += pl(OR.contourPts(G, D.fullOff, 160), 'coff cfull'); }
  const holes = D.holes, P = new Map(holes.map(h => [h.id, posOf(h)]));
  // damage
  if (S.damage) { let d = ''; for (const h of holes) if (h.rd > 0 && !/^cut/.test(h.type)) { const [x, y] = P.get(h.id); d += `<circle cx="${n2(X(x))}" cy="${n2(Y(y))}" r="${n2(h.rd * sc)}" style="stroke:${CHG_COL[h.charge]};fill:${CHG_COL[h.charge]}"/>`; } s += `<g class="dmg">${d}</g>`; }
  // spacings: each hole to its nearest and next-nearest neighbours (cut excluded – see Detail A)
  if (S.spacings) {
    const zoomed = sc >= V.fitSc * 2.2 && !opt.report;
    const pts = holes.filter(h => h.type !== 'empty' && (zoomed || !/^cut/.test(h.type)));
    const seen = new Set(); let lines = '', labs = '';
    for (const a of pts) {
      const pa = P.get(a.id);
      const nb = pts.filter(b => b !== a).map(b => [b, Math.hypot(P.get(b.id)[0] - pa[0], P.get(b.id)[1] - pa[1])]).sort((u, v) => u[1] - v[1]).slice(0, 2);
      nb.forEach(([b, d], i) => {
        if (i === 1 && d > nb[0][1] * 1.45) return;
        const key = Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id); if (seen.has(key)) return; seen.add(key);
        const pb = P.get(b.id); lines += `M${n2(X(pa[0]))} ${n2(Y(pa[1]))}L${n2(X(pb[0]))} ${n2(Y(pb[1]))}`;
        if (d * sc > 42) { let ang = Math.atan2(-(pb[1] - pa[1]), pb[0] - pa[0]) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
          const mx = X((pa[0] + pb[0]) / 2), my = Y((pa[1] + pb[1]) / 2);
          labs += `<text class="sp" x="${n2(mx)}" y="${n2(my - 2)}" transform="rotate(${ang.toFixed(1)} ${n2(mx)} ${n2(my)})" style="font-size:${fs(0.82)}px">${d.toFixed(2)}</text>`; }
      });
    }
    s += `<path class="spl" d="${lines}"/>${labs}`;
  }
  // dimensions
  if (S.dims) {
    const dimH = (xa, xb, y, txt, small) => { const ya = Y(y); let o = `<path class="dim" d="M${n2(X(xa))} ${n2(ya)}H${n2(X(xb))}M${n2(X(xa))} ${n2(ya - 4)}v8M${n2(X(xb))} ${n2(ya - 4)}v8"/>`;
      const w = (xb - xa) * sc, mx = X((xa + xb) / 2); o += w > 26 || !small ? `<text class="dt" x="${n2(mx)}" y="${n2(ya - 3)}" text-anchor="middle" style="font-size:${fs(small ? 0.8 : 1)}px">${txt}</text>` : `<text class="dt" x="${n2(mx + 3)}" y="${n2(ya - 5)}" transform="rotate(-90 ${n2(mx + 3)} ${n2(ya - 5)})" style="font-size:${fs(0.75)}px">${txt}</text>`; return o; };
    const dimV = (ya, yb, x, txt, small) => { const xa = X(x); let o = `<path class="dim" d="M${n2(xa)} ${n2(Y(ya))}V${n2(Y(yb))}M${n2(xa - 4)} ${n2(Y(ya))}h8M${n2(xa - 4)} ${n2(Y(yb))}h8"/>`;
      const hgt = (yb - ya) * sc, my = Y((ya + yb) / 2); o += hgt > 26 || !small ? `<text class="dt" x="${n2(xa - 3)}" y="${n2(my)}" text-anchor="middle" transform="rotate(-90 ${n2(xa - 3)} ${n2(my)})" style="font-size:${fs(small ? 0.8 : 1)}px">${txt}</text>` : `<text class="dt" x="${n2(xa + 5)}" y="${n2(my + 3)}" style="font-size:${fs(0.75)}px">${txt}</text>`; return o; };
    s += dimH(G.xmin, G.xmax, L.yB - 0.42 * L.k, 'W = ' + f(G.W) + ' m');
    s += dimV(G.ymin, G.ymax, L.xL - 0.42 * L.k, 'H = ' + f(G.H) + ' m');
    if (G.Hw && G.Hw < G.H - 0.02) s += dimV(G.ymin, G.Hw, L.xL - 0.22 * L.k, f(G.Hw), true);
    const pts = holes.filter(h => h.type !== 'empty' && !/^cut/.test(h.type)).map(h => P.get(h.id));
    const chain = (vals, lo, hi) => { const v = [...vals, lo, hi].sort((a, b) => a - b), out = []; for (const x of v) if (!out.length || x - out[out.length - 1] > 0.03) out.push(x); return out; };
    const xs = chain(pts.map(p => p[0]), G.xmin, G.xmax), yc = L.yT + 0.5 * L.k;
    for (let i = 1; i < xs.length; i++) s += dimH(xs[i - 1], xs[i], yc, f(xs[i] - xs[i - 1]), true);
    s += `<path class="ext" d="${xs.map(x => `M${n2(X(x))} ${n2(Y(L.yT + 0.08 * L.k))}V${n2(Y(yc) + 4)}`).join('')}"/>`;
    const ys = chain(pts.map(p => p[1]), G.ymin, G.ymax), xc = L.xR + 0.5 * L.k;
    for (let i = 1; i < ys.length; i++) s += dimV(ys[i - 1], ys[i], xc, f(ys[i] - ys[i - 1]), true);
    s += `<path class="ext" d="${ys.map(y => `M${n2(X(L.xR + 0.08 * L.k))} ${n2(Y(y))}H${n2(X(xc) + 4)}`).join('')}"/>`;
  }
  // collars & lookout traces
  if (S.collars) { let d = ''; for (const h of holes) if (h.lx || h.ly) d += `M${n2(X(h.x - h.lx))} ${n2(Y(h.y - h.ly))}L${n2(X(h.x))} ${n2(Y(h.y))}`; s += `<path class="lk" d="${d}"/>`; }
  // cut callout
  if (S.detail) s += `<circle class="callout" cx="${n2(X(D.cut.cx))}" cy="${n2(Y(D.cut.cy))}" r="${n2(L.rDet * sc)}"/><text class="callt" x="${n2(X(D.cut.cx + L.rDet * 0.75))}" y="${n2(Y(D.cut.cy + L.rDet * 0.75))}" style="font-size:${fs(1.3)}px">A</text>`;
  // holes
  const minR = 3.2, near = new Map();
  for (const h of holes) { const p = P.get(h.id); let dm = 1e9; for (const o of holes) if (o !== h) { const q = P.get(o.id); dm = Math.min(dm, Math.hypot(q[0] - p[0], q[1] - p[1])); } near.set(h.id, dm * sc); }
  let hs = '', tx = '';
  for (const h of holes) {
    const [x, y] = P.get(h.id), cx = X(x), cy = Y(y);
    const rt = (h.type === 'empty' ? inp.drill.emptyD : inp.drill.Dh) / 2 * sc, r = Math.max(rt, h.type === 'empty' ? 4 : minR);
    const grpT = /^cut/.test(h.type) ? 'cut' : h.type;
    const selc = (sel === h.id ? ' sel' : '') + (D._changed && D._changed.has(h.id) ? ' chg' : '') + (focusType && focusType !== grpT ? ' dimmed' : '');
    if (h.type === 'empty') hs += `<circle class="h empty${selc}" cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r)}"/><circle class="einner" cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r * 0.45)}"/>`;
    else hs += `<circle class="h${selc}" cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r)}" style="fill:${COL[h.type]}"/>`;
    hs += `<circle class="hit" data-id="${h.id}" cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(Math.max(r + 3, 7))}"/>`;
    const room = near.get(h.id) > 22;
    if (h.type !== 'empty' && room) {
      if (S.delays) tx += `<text class="dl${focusType && focusType !== grpT ? ' dimmed' : ''}" x="${n2(cx + r + 2)}" y="${n2(cy - r - 1)}" style="font-size:${fs(0.95)}px">${h.delay}</text>`;
      if (S.ids) tx += `<text class="hid" x="${n2(cx + r + 2)}" y="${n2(cy + r + 9)}" style="font-size:${fs(0.8)}px">#${h.id}</text>`;
    }
  }
  s += hs + tx;
  // detail A
  if (S.detail) s += detailSVG(L, view, fs);
  // legend
  const lx = S.detail ? X(L.dx0) : X(L.xL - L.m + 0.05 * L.k), ly = S.detail ? Y(L.dy0 - 0.2 * L.k) : Y(L.yT + L.m - 0.05 * L.k);
  s += `<g class="leg">` + ['perim', 'buffer', 'stope', 'lifter', 'cut1', 'empty'].map((t, i) => `<circle cx="${n2(lx + 6)}" cy="${n2(ly + 8 + i * 15)}" r="4.5" class="${t === 'empty' ? 'h empty' : 'h'}" style="${t === 'empty' ? '' : 'fill:' + COL[t]}"/><text x="${n2(lx + 15)}" y="${n2(ly + 12 + i * 15)}">${esc(T('t_' + t).replace(/ (Q|D|К)1$/, ''))}</text>`).join('') + `</g>`;
  s += titleBlock(L, view);
  if (!opt.noOverlay) s += `<g id="overlay">${overlaySVG(view)}</g>`;
  return s;
}

function detailSVG(L, view, fs) {
  const sc = view.sc, X = x => view.ox + x * sc, Y = y => view.oy - y * sc, n2 = v => v.toFixed(1);
  const bx = (L.dx0 + L.dx1) / 2, hdr = 0.22 * L.k, ftr = 0.62 * L.k, by = (L.dy0 + ftr + L.dy1 - hdr) / 2;
  const f2 = (L.dw * 0.74) / (2 * L.rDet);
  const cx = D.cut.cx, cy = D.cut.cy, M = (x, y) => [bx + (x - cx) * f2, by + (y - cy) * f2];
  let s = `<rect class="dbox" x="${n2(X(L.dx0))}" y="${n2(Y(L.dy1))}" width="${n2(L.dw * sc)}" height="${n2(L.dw * sc)}"/>`;
  s += `<text class="dhead" x="${n2(X(L.dx0 + 0.08 * L.k))}" y="${n2(Y(L.dy1 - 0.15 * L.k))}" style="font-size:${fs(1.05)}px">${esc(T('detailTitle'))} · ×${f2.toFixed(1)}</text>`;
  const id = 'clipA' + Math.random().toString(36).slice(2, 7);
  s += `<clipPath id="${id}"><rect x="${n2(X(L.dx0))}" y="${n2(Y(L.dy1 - hdr))}" width="${n2(L.dw * sc)}" height="${n2((L.dw - hdr - ftr) * sc)}"/></clipPath><g clip-path="url(#${id})">`;
  // 0.1 m grid in cut coordinates
  let g = ''; const st = 0.1, ext = L.rC * 1.6;
  for (let u = -Math.ceil(ext / st) * st; u <= ext; u += st) { const [ax, ay] = M(cx + u, cy - ext), [bx2, by2] = M(cx + u, cy + ext); g += `M${n2(X(ax))} ${n2(Y(ay))}L${n2(X(bx2))} ${n2(Y(by2))}`; const [cx1, cy1] = M(cx - ext, cy + u), [cx2, cy2] = M(cx + ext, cy + u); g += `M${n2(X(cx1))} ${n2(Y(cy1))}L${n2(X(cx2))} ${n2(Y(cy2))}`; }
  s += `<path class="gmin" d="${g}"/>`;
  // quadrangle outlines + labels
  for (const q of D.cut.quads) {
    const r = q.HD / Math.SQRT2, rot = (q.n % 2 ? 0 : 45) * Math.PI / 180;
    const pts = [0, 1, 2, 3, 0].map(k => M(cx + r * Math.cos(rot + k * Math.PI / 2), cy + r * Math.sin(rot + k * Math.PI / 2)));
    s += `<polyline class="qline" points="${pts.map(p => n2(X(p[0])) + ',' + n2(Y(p[1]))).join(' ')}"/>`;
    void 0;
  }
  // centre cross
  const [ccx, ccy] = M(cx, cy);
  s += `<path class="ctr" d="M${n2(X(ccx) - 8)} ${n2(Y(ccy))}h16M${n2(X(ccx))} ${n2(Y(ccy) - 8)}v16"/>`;
  for (const h of D.holes) {
    if (!(/^cut/.test(h.type) || h.type === 'empty')) continue;
    const [x, y] = M(h.x, h.y), rt = (h.type === 'empty' ? inp.drill.emptyD : inp.drill.Dh) / 2 * f2 * sc, r = Math.max(rt, 3);
    s += h.type === 'empty' ? `<circle class="h empty" cx="${n2(X(x))}" cy="${n2(Y(y))}" r="${n2(r)}"/>` : `<circle class="h${sel === h.id ? ' sel' : ''}" cx="${n2(X(x))}" cy="${n2(Y(y))}" r="${n2(r)}" style="fill:${COL[h.type]}"/>`;
    s += `<circle class="hit" data-id="${h.id}" data-detail="1" cx="${n2(X(x))}" cy="${n2(Y(y))}" r="${n2(r + 4)}"/>`;
    if (h.type !== 'empty') s += `<text class="dl" x="${n2(X(x) + r + 2)}" y="${n2(Y(y) - r - 1)}" style="font-size:${fs(0.85)}px">${show().ids ? '#' + h.id + ' · ' : ''}${h.delay}</text>`;
  }
  s += '</g>';
  s += `<path class="tb" d="M${n2(X(L.dx0))} ${n2(Y(L.dy0 + ftr))}H${n2(X(L.dx1))}"/>`;
  const qd = D.cut.quads, colW = (L.dw - 0.12 * L.k) / (qd.length + 1), rowH = ftr / 4.4, fz = fs(0.72);
  const cellT = (i, r, txt, cls = 'dsub') => `<text class="${cls}" x="${n2(X(L.dx0 + 0.08 * L.k + i * colW))}" y="${n2(Y(L.dy0 + ftr - (r + 1) * rowH))}" style="font-size:${fz}px">${txt}</text>`;
  s += cellT(0, 0, '') + qd.map((q, i) => cellT(i + 1, 0, 'Q' + q.n, 'qt')).join('');
  s += cellT(0, 1, 'B m') + qd.map((q, i) => cellT(i + 1, 1, q.B.toFixed(3))).join('');
  s += cellT(0, 2, 'HD m') + qd.map((q, i) => cellT(i + 1, 2, q.HD.toFixed(3))).join('');
  s += `<text class="dsub" x="${n2(X(L.dx0 + 0.08 * L.k))}" y="${n2(Y(L.dy0 + ftr - 4 * rowH))}" style="font-size:${fz}px">φ ${f(D.cut.phi, 3)} m · ${T('cutCentre')} ${f(cx)}, ${f(cy)} m</text>`;
  return s;
}

function titleBlock(L, view) {
  const sc = view.sc, X = x => view.ox + x * sc, Y = y => view.oy - y * sc, n2 = v => v.toFixed(1);
  const x0 = L.x0 + 0.08 * L.k, x1 = L.x1 - 0.08 * L.k, y0 = L.y0 + 0.08 * L.k, y1 = y0 + L.titleH, ym = (y0 + y1) / 2;
  const Q = D.Q, G = D.G, lab = clamp(L.t * sc * 0.7, 6, 11), val = clamp(L.t * sc * 1.05, 7.5, 15);
  const cell = (xa, xb, ya, yb, k, v) => `<rect class="tb" x="${n2(X(xa))}" y="${n2(Y(yb))}" width="${n2((xb - xa) * sc)}" height="${n2((yb - ya) * sc)}"/><text class="tbl" x="${n2(X(xa) + 5)}" y="${n2(Y(yb) + lab + 3)}" style="font-size:${lab.toFixed(1)}px">${esc(k)}</text><text class="tbv" x="${n2(X(xa) + 5)}" y="${n2(Y(ya) - 5)}" style="font-size:${val.toFixed(1)}px">${esc(v)}</text>`;
  const w = x1 - x0, c = [0, 0.16, 0.42, 0.62, 0.82, 1].map(a => x0 + a * w), d = [0, 0.16, 0.3, 0.44, 0.58, 0.72, 0.86, 1].map(a => x0 + a * w);
  let s = `<rect class="tb" x="${n2(X(x0))}" y="${n2(Y(y1))}" width="${n2(w * sc)}" height="${n2((y1 - y0) * sc)}"/>`;
  s += `<rect class="tbbrand" x="${n2(X(c[0]))}" y="${n2(Y(y1))}" width="${n2((c[1] - c[0]) * sc)}" height="${n2((y1 - ym) * sc)}"/><text class="brandt" x="${n2(X(c[0]) + 6)}" y="${n2(Y((ym + y1) / 2) + val * 0.35)}" style="font-size:${(val * 1.05).toFixed(1)}px">Open<tspan>Round</tspan></text>`;
  s += cell(c[1], c[2], ym, y1, T('project'), inp.project.name);
  s += cell(c[2], c[3], ym, y1, T('method'), T(inp.method).replace(/ \(.*\)/, ''));
  s += cell(c[3], c[4], ym, y1, T('damageModel'), T(inp.damageModel));
  s += cell(c[4], c[5], ym, y1, T('date'), new Date().toISOString().slice(0, 10));
  const row2 = [[T('geometry'), `${T('shp_' + (G.shape || 'arched'))} ${f(G.W)} × ${f(G.H)} m`], ['Ø / L', `${f(inp.drill.Dh * 1000, 0)} mm / ${f(inp.drill.L)} m`], [T('t_empty'), `${inp.drill.nEmpty} × ${f(inp.drill.emptyD * 1000, 0)} mm`],
    [T('nHoles'), `${Q.nHoles} (${Q.nCharged})`], [T('kg'), `${f(Q.kg, 1)} kg`], [T('PF'), `${f(Q.PF)} kg/m³`], [T('delays'), String(D.nDelays)]];
  row2.forEach(([k, v], i) => s += cell(d[i], d[i + 1], y0, ym, k, v));
  return s;
}

/* overlay: measurements, ruler preview, snap marker */
function overlaySVG(view) {
  const sc = view.sc, X = x => view.ox + x * sc, Y = y => view.oy - y * sc, n2 = v => v.toFixed(1);
  let s = '';
  const one = (a, b, live) => {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), mx = X((a[0] + b[0]) / 2), my = Y((a[1] + b[1]) / 2);
    const t1 = `${d.toFixed(3)} m`, t2 = `Δx ${(b[0] - a[0]).toFixed(3)} · Δy ${(b[1] - a[1]).toFixed(3)}`;
    const wbox = Math.max(t1.length * 7.6, t2.length * 5.6) + 12;
    return `<g class="meas${live ? ' live' : ''}"><line x1="${n2(X(a[0]))}" y1="${n2(Y(a[1]))}" x2="${n2(X(b[0]))}" y2="${n2(Y(b[1]))}"/><circle cx="${n2(X(a[0]))}" cy="${n2(Y(a[1]))}" r="3.5"/><circle cx="${n2(X(b[0]))}" cy="${n2(Y(b[1]))}" r="3.5"/>
      <rect x="${n2(mx - wbox / 2)}" y="${n2(my - 30)}" width="${n2(wbox)}" height="30" rx="4"/><text class="m1" x="${n2(mx)}" y="${n2(my - 16)}" text-anchor="middle">${t1}</text><text class="m2" x="${n2(mx)}" y="${n2(my - 5)}" text-anchor="middle">${t2}</text></g>`;
  };
  for (const m of measures) s += one(m.a, m.b);
  if (mode === 'ruler' && rStart && cursorW) s += one(rStart, snapPt ? snapPt.p : cursorW, true);
  if (mode === 'ruler' && snapPt) {
    const x = X(snapPt.p[0]), y = Y(snapPt.p[1]);
    s += snapPt.kind === 'edge' ? `<path class="snap" d="M${n2(x - 6)} ${n2(y - 6)}l12 12M${n2(x + 6)} ${n2(y - 6)}l-12 12"/>` : snapPt.kind === 'hole' ? `<circle class="snap" cx="${n2(x)}" cy="${n2(y)}" r="8"/>` : `<rect class="snap" x="${n2(x - 6)}" y="${n2(y - 6)}" width="12" height="12"/>`;
    s += `<text class="snapt" x="${n2(x + 10)}" y="${n2(y + 16)}">${esc(snapPt.label)}</text>`;
  }
  return s;
}
function drawOverlay() { const g = $('#overlay'); if (g) g.innerHTML = overlaySVG(V); }

function draw() {
  if (!D) return;
  const svg = svgEl(), r = svg.getBoundingClientRect();
  if (V.key !== viewKey() || !V.fitted) { V.key = viewKey(); fitView(); V.fitted = true; }
  svg.innerHTML = sceneSVG(r.width, r.height, V);
  $('#zoomPct').textContent = Math.round(V.sc / V.fitSc * 100) + '%';
}

/* snapping */
function snapCandidates() {
  const G = D.G, LD = inp.drill.lookout, c = [];
  for (const h of D.holes) { c.push({ p: posOf(h), kind: 'hole', label: '#' + h.id + ' ' + T('t_' + h.type) }); if (h.lx || h.ly) c.push({ p: [h.x - h.lx, h.y - h.ly], kind: 'pt', label: '#' + h.id + ' ' + T('collar').replace(/ x,y/, '') }); }
  const add = (x, y, l) => c.push({ p: [x, y], kind: 'pt', label: l });
  for (const q of G.corners) add(q[0], q[1], q[1] < G.ymin + 0.02 ? T('snapCorner') : T('snapAbut'));
  add(G.crown[0], G.crown[1], T('snapCrown')); add((G.xmin + G.xmax) / 2, G.ymin, T('snapFloor'));
  const lsp = OR.contourPts(G, -LD).filter(q => q[1] < G.ymin - LD + 0.02); if (lsp.length) { const xs = lsp.map(q => q[0]); add(Math.min(...xs), G.ymin - LD, T('snapLook')); add(Math.max(...xs), G.ymin - LD, T('snapLook')); }
  add(D.cut.cx, D.cut.cy, T('cutCentre'));
  return c;
}
function nearestOnPoly(pts, x, y) {
  let best = null;
  for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1), px = ax + t * dx, py = ay + t * dy, d = Math.hypot(px - x, py - y);
    if (!best || d < best.d) best = { d, p: [px, py] }; }
  return best;
}
function findSnap(w) {
  const tol = 12 / V.sc; let best = null;
  for (const c of snapCandidates()) { const d = Math.hypot(c.p[0] - w[0], c.p[1] - w[1]); if (d < tol && (!best || d < best.d)) best = { ...c, d }; }
  if (best) return best;
  const e = nearestOnPoly(OR.contourPts(D.G, 0, 240), w[0], w[1]);
  if (e && e.d < 8 / V.sc) return { p: e.p, kind: 'edge', label: T('snapEdge') };
  const e2 = nearestOnPoly(OR.contourPts(D.G, -inp.drill.lookout, 240), w[0], w[1]);
  if (e2 && e2.d < 8 / V.sc) return { p: e2.p, kind: 'edge', label: T('snapLook') };
  return null;
}

/* hover tooltip */
function tipHTML(h) {
  const p = posOf(h), dist = OR.insideDist(D.G, p[0], p[1]);
  let nn = 1e9; for (const o of D.holes) if (o !== h && o.type !== 'empty') { const q = posOf(o); nn = Math.min(nn, Math.hypot(q[0] - p[0], q[1] - p[1])); }
  const ex = h.charge !== 'none' ? inp.explosives[h.charge] : null;
  const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
  return `<div class="tth"><b style="background:${COL[h.type]}"></b>#${h.id} · ${esc(T('t_' + h.type))}</div><table>
    ${ex ? row(T('charge'), esc(T('role_' + h.charge)) + '<br><small>' + esc(ex.name) + '</small>') : ''}
    ${row(T('toe'), `${f(h.x, 3)}, ${f(h.y, 3)}`)}${(h.lx || h.ly) ? row(T('collar'), `${f(h.x - h.lx, 3)}, ${f(h.y - h.ly, 3)}`) : ''}
    ${row(T('len'), f(h.len) + ' m')}${ex ? row(T('chargeLen'), f(h.chargeLen) + ' m') + row(T('chargeKg'), f(h.kg, 2) + ' kg' + (h.ncart ? ` · ${h.ncart} ${T('cart')}` : '')) : ''}
    ${h.type !== 'empty' ? row(T('delay'), h.delay) : ''}${h.rd ? row(T('Rd'), f(h.rd, 3) + ' m') : ''}
    ${row(T('nearest'), f(nn, 3) + ' m')}${row(T('toContour'), f(dist, 3) + ' m')}</table>`;
}
function showTip(ev, h) { const t = $('#tip'); t.innerHTML = tipHTML(h); t.style.display = 'block'; const r = $('#centre').getBoundingClientRect(); let x = ev.clientX - r.left + 16, y = ev.clientY - r.top + 14; const tw = t.offsetWidth, th = t.offsetHeight; if (x + tw > r.width - 6) x = ev.clientX - r.left - tw - 14; if (y + th > r.height - 6) y = r.height - th - 6; t.style.left = x + 'px'; t.style.top = y + 'px'; }
function hideTip() { $('#tip').style.display = 'none'; }

/* interaction */
function lockNow() { if (!locked) { locked = true; lockedHoles = D.holes.map(h => ({ ...h })); lockedCut = { cx: D.cut.cx, cy: D.cut.cy }; $('#lock').checked = true; } }
function setMode(m) { mode = m; rStart = null; snapPt = null; $$('#tools [data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === m)); svgEl().dataset.mode = m; drawOverlay(); }
const plot = () => svgEl();
document.addEventListener('DOMContentLoaded', () => {});
function bindSheet() {
  const svg = plot();
  svg.addEventListener('wheel', ev => { ev.preventDefault(); const r = svg.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top; const [wx, wy] = toWorld(ev);
    const k = ev.deltaY < 0 ? 1.15 : 1 / 1.15; V.sc = clamp(V.sc * k, V.fitSc * 0.3, V.fitSc * 40); V.ox = mx - wx * V.sc; V.oy = my + wy * V.sc; draw(); }, { passive: false });
  svg.addEventListener('pointerdown', ev => {
    const hit = ev.target.closest && ev.target.closest('.hit'); const w = toWorld(ev);
    if (ev.button === 1 || (ev.button === 0 && mode === 'select' && !hit)) { pan = { x: ev.clientX, y: ev.clientY, ox: V.ox, oy: V.oy, moved: false }; svg.setPointerCapture(ev.pointerId); return; }
    if (ev.button !== 0) return;
    if (mode === 'ruler') { const p = snapPt ? snapPt.p : w; if (!rStart) { if (!(ev.ctrlKey || ev.metaKey)) measures = []; rStart = p; } else { measures.push({ a: rStart, b: ev.shiftKey ? ortho(rStart, p) : p }); rStart = null; } drawOverlay(); return; }
    if (mode === 'add') { lockNow(); const type = $('#addType').value, id = Math.max(0, ...lockedHoles.map(h => h.id)) + 1;
      lockedHoles.push({ id, x: +w[0].toFixed(3), y: +w[1].toFixed(3), type, charge: TYPE_CHARGE[type], lx: 0, ly: 0 }); sel = id; run(); syncSel(); return; }
    if (hit) { sel = +hit.dataset.id; if (!hit.dataset.detail) { const h = D.holes.find(q => q.id === sel); drag = { id: sel, dx: h.x - w[0], dy: h.y - w[1], moved: false }; svg.setPointerCapture(ev.pointerId); } draw(); syncSel(); results(); }
  });
  svg.addEventListener('pointermove', ev => {
    const w = toWorld(ev); cursorW = w;
    if (isFinite(w[0]) && isFinite(w[1])) $('#coord').textContent = `X ${w[0].toFixed(3)}   Y ${w[1].toFixed(3)} m`;
    if (pan) { V.ox = pan.ox + ev.clientX - pan.x; V.oy = pan.oy + ev.clientY - pan.y; pan.moved = true; draw(); return; }
    if (drag) { if (!drag.moved) { lockNow(); drag.moved = true; } const h = lockedHoles.find(q => q.id === drag.id); if (h) { h.x = +(w[0] + drag.dx).toFixed(3); h.y = +(w[1] + drag.dy).toFixed(3); run(); } hideTip(); return; }
    if (mode === 'ruler') { snapPt = findSnap(w); if (ev.shiftKey && rStart && !snapPt) cursorW = ortho(rStart, w); drawOverlay(); }
    const hit = ev.target.closest && ev.target.closest('.hit');
    if (hit && mode !== 'ruler') { const h = D.holes.find(q => q.id === +hit.dataset.id); if (h) showTip(ev, h); } else hideTip();
  });
  const end = ev => { if (pan && !pan.moved && mode === 'select') { sel = null; measures = []; draw(); syncSel(); results(); } pan = null; if (drag) { drag = null; results(); } };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  svg.addEventListener('pointerleave', hideTip);
  svg.addEventListener('dblclick', ev => { if (mode !== 'ruler' && !(ev.target.closest && ev.target.closest('.hit'))) { fitView(); draw(); } });
  svg.addEventListener('contextmenu', ev => { if (mode === 'ruler') { ev.preventDefault(); rStart = null; drawOverlay(); } });
  document.addEventListener('keydown', ev => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const k = ev.key;
    if (k === 'Escape') { if (rStart) { rStart = null; drawOverlay(); } else if (mode !== 'select') setMode('select'); else { sel = null; draw(); syncSel(); } }
    else if ((k === 'Delete' || k === 'Backspace') && sel) { ev.preventDefault(); delSel(); }
    else if (k.startsWith('Arrow') && sel) { ev.preventDefault(); lockNow(); const h = lockedHoles.find(q => q.id === sel); if (!h) return; const st = ev.shiftKey ? 0.1 : 0.01;
      if (k === 'ArrowLeft') h.x -= st; if (k === 'ArrowRight') h.x += st; if (k === 'ArrowUp') h.y += st; if (k === 'ArrowDown') h.y -= st; h.x = +h.x.toFixed(3); h.y = +h.y.toFixed(3); run(); syncSel(); }
    else if (k === 'm' || k === 'M') setMode('ruler'); else if (k === 'v' || k === 'V') setMode('select'); else if (k === 'a' || k === 'A') setMode('add');
    else if (k === 'f' || k === 'F') { fitView(); draw(); }
  });
  $$('#tools [data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#zin').addEventListener('click', () => zoomBy(1.25)); $('#zout').addEventListener('click', () => zoomBy(0.8));
  $('#zfit').addEventListener('click', () => { fitView(); draw(); });
  $('#mclear').addEventListener('click', () => { measures = []; rStart = null; drawOverlay(); });
  $('#lock').addEventListener('change', e => { if (e.target.checked) lockNow(); else { locked = false; lockedHoles = null; run(); } });
  $('#regen').addEventListener('click', () => { locked = false; lockedHoles = null; $('#lock').checked = false; sel = null; run(); syncSel(); });
  new ResizeObserver(() => { const k = V.sc / V.fitSc; fitView(); if (Math.abs(k - 1) > 1e-6) { V.sc = V.fitSc; } draw(); }).observe(svg);
}
function ortho(a, p) { return Math.abs(p[0] - a[0]) > Math.abs(p[1] - a[1]) ? [p[0], a[1]] : [a[0], p[1]]; }
function zoomBy(k) { const r = svgEl().getBoundingClientRect(), mx = r.width / 2, my = r.height / 2, wx = (mx - V.ox) / V.sc, wy = (V.oy - my) / V.sc; V.sc = clamp(V.sc * k, V.fitSc * 0.3, V.fitSc * 40); V.ox = mx - wx * V.sc; V.oy = my + wy * V.sc; draw(); }
function delSel() { if (!sel) return; lockNow(); lockedHoles = lockedHoles.filter(h => h.id !== sel); sel = null; run(); syncSel(); }

/* selected hole card */
function syncSel() {
  const box = $('#selCard'); if (!box) return;
  const h = sel && D ? D.holes.find(q => q.id === sel) : null;
  if (!h) { box.innerHTML = `<div class="ph">${T('selHint')}</div>`; return; }
  box.innerHTML = `<div class="selh"><b style="background:${COL[h.type]}"></b>#${h.id}</div>
    <label class="row"><span>${T('type')}</span><select id="sType">${TYPES.map(t => `<option value="${t}" ${t === h.type ? 'selected' : ''}>${T('t_' + t)}</option>`).join('')}</select><i></i></label>
    <label class="row"><span>X (${T('toe').replace(/ x,y/, '')})</span><input id="sX" type="number" step="0.01" value="${h.x.toFixed(3)}"><i>m</i></label>
    <label class="row"><span>Y (${T('toe').replace(/ x,y/, '')})</span><input id="sY" type="number" step="0.01" value="${h.y.toFixed(3)}"><i>m</i></label>
    <label class="row"><span>${T('delay')}</span><input id="sD" type="number" step="1" min="0" value="${h.delay}"><i></i></label>
    <button id="sDel" class="btn danger">${T('del')}</button>`;
  const upd = fn => { lockNow(); const q = lockedHoles.find(o => o.id === sel); if (q) { fn(q); run(); } };
  $('#sType').addEventListener('change', e => upd(q => { q.type = e.target.value; q.charge = TYPE_CHARGE[q.type]; }));
  $('#sX').addEventListener('change', e => upd(q => q.x = +e.target.value));
  $('#sY').addEventListener('change', e => upd(q => q.y = +e.target.value));
  $('#sD').addEventListener('change', e => upd(q => q.delay = Math.max(0, Math.round(+e.target.value))));
  $('#sDel').addEventListener('click', delSel);
}

/* ---------- legend (map legend that doubles as a filter) ---------- */
function renderLegend() {
  const el = $('#legend'); if (!el || !D) return;
  const groups = [['perim', 'perim'], ['buffer', 'buffer'], ['stope', 'stope'], ['lifter', 'lifter'], ['cut', 'cut1'], ['empty', 'empty']];
  const rows = groups.map(([g, t]) => { const hs = D.holes.filter(h => (/^cut/.test(h.type) ? 'cut' : h.type) === g); if (!hs.length) return '';
    const kg = hs.reduce((a, h) => a + (h.kg || 0), 0);
    return `<button class="lg${focusType === g ? ' on' : ''}" data-g="${g}" aria-pressed="${focusType === g}"><span class="sw" style="background:${COL[t]}"></span><span>${T('t_' + t).replace(/ (Q|D|К)1$/, '')}</span><span class="n">${hs.length}</span><span class="k">${kg ? f(kg, 1) + ' kg' : '—'}</span></button>`; }).join('');
  el.innerHTML = `<h2>${T('legendTitle')}</h2>${rows}<p class="lgnote">${T(focusType ? 'legendClear' : 'legendHint')}</p>`;
  $$('#legend .lg').forEach(b => b.addEventListener('click', () => { focusType = focusType === b.dataset.g ? null : b.dataset.g; draw(); renderLegend(); }));
}
function warnings() {
  const w = [...D.warn];
  if (D.perimeter.coverage < 0.7) w.push({ k: 'warnCov', v: [f(D.perimeter.coverage * 100, 0)] });
  if (D.perimeter.maxOver > 0.5) w.push({ k: 'warnOver', v: [f(D.perimeter.maxOver)] });
  return w;
}
function renderStrip() {
  const el = $('#strip'); if (!el || !D) return;
  const Q = D.Q, cov = D.perimeter.coverage * 100, w = warnings();
  el.innerHTML = (w.length ? `<button class="flag" id="flag" title="${esc(w.map(x => T(x.k, ...x.v)).join('\n'))}"><b>!</b><span>${w.length} ${T('checks')}</span></button>` : '') + `<div><b>${f(Q.PF)}<small>kg/m³</small></b><span>${T('PF')}</span></div><div><b>${f(Q.kg, 0)}<small>kg</small></b><span>${T('kg')}</span></div>
    <div><b>${Q.nHoles}</b><span>${T('nHoles')}</span></div><div class="${cov < 70 ? 'bad' : ''}"><b>${f(cov, 0)}<small>%</small></b><span>${T('coverageShort')}</span></div>
    <div><b>${f(Q.costPerM, 0)}<small>${esc(inp.cost.currency)}/m</small></b><span>${T('costPerMShort')}</span></div>`;
  const fl = $('#flag'); if (fl) fl.addEventListener('click', () => { setRight(true); tab = 'summary'; syncTabs(); results(); });
}
/* ---------- results ---------- */
function kpi(label, val, unit) { return `<div class="kpi"><div class="kl">${label}</div><div class="kv">${val}<small> ${unit}</small></div></div>`; }
function results() {
  if (!D) return;
  renderStrip();
  const Q = D.Q, cur = esc(inp.cost.currency);
  const w = warnings();
  let h = '';
  if (tab === 'summary') {
    if (w.length) h += `<ul class="checks">${w.map(x => `<li>${esc(T(x.k, ...x.v))}</li>`).join('')}</ul>`;
    h += `<div class="kpis">${kpi(T('nHoles'), Q.nHoles + ' / ' + Q.nCharged, '')}${kpi(T('drilled'), f(Q.drilled, 1), 'm')}${kpi(T('kg'), f(Q.kg, 1), 'kg')}${kpi(T('PF'), f(Q.PF), 'kg/m³')}
      ${kpi(T('adv'), f(Q.advance), 'm')}${kpi(T('vol'), f(Q.vol, 1), 'm³')}${kpi(T('coverage'), f(D.perimeter.coverage * 100, 0), '%')}${kpi(T('maxOver'), f(D.perimeter.maxOver), 'm')}</div>`;
    h += `<table><thead><tr><th>${T('holeType')}</th><th>${T('count')}</th><th>${T('metres')}</th><th>${T('chargeKg')}</th></tr></thead><tbody>${TYPES.filter(t => Q.byType[t]).map(t => `<tr><td><b class="dot" style="background:${COL[t]}"></b>${T('t_' + t)}</td><td>${Q.byType[t].n}</td><td>${f(Q.byType[t].m, 1)}</td><td>${f(Q.byType[t].kg, 1)}</td></tr>`).join('')}</tbody></table>`;
    const tot = Q.costRound || 1, parts = [['costDrill', Q.costDrill], ['costExp', Q.costExp], ['costDet', Q.costDet], ['costFixed', inp.cost.fixedPerRound]];
    h += `<h3>${T('tCost')}</h3><div class="kpis">${kpi(T('costRound'), f(Q.costRound, 0), cur)}${kpi(T('costPerM'), f(Q.costPerM, 0), cur + '/m')}${kpi(T('costPerM3'), f(Q.costPerM3, 1), cur + '/m³')}${kpi(T('costPerT'), f(Q.costPerT, 2), cur + '/t')}</div>
      <table class="costt"><tbody>${parts.map(([k, v]) => `<tr><td>${T(k)}</td><td>${f(v, 0)} ${cur}</td><td class="barc"><div class="bar" style="width:${(v / tot * 100).toFixed(1)}%"></div></td><td>${f(v / tot * 100, 0)}%</td></tr>`).join('')}</tbody></table>`;
    h += `<details class="more"><summary>${T('calcDetails')}</summary>
      <div class="kpis">${kpi(T('PFt'), f(Q.PFt), 'kg/t')}${kpi(T('EF'), f(Q.EF, 1), 'MJ/m³')}${kpi(T('DF'), f(Q.DF), 'm/m³')}${kpi(T('tonnes'), f(Q.tonnes, 0), 't')}${kpi(T('area'), f(Q.area), 'm²')}${kpi(T('delays'), D.nDelays, '')}</div>
      <table><thead><tr><th>${T('charge')}</th><th>De mm</th><th>q kg/m</th><th>${T('Bmax')} m</th><th>${T('Rd')} m</th></tr></thead><tbody>${ROLES.map(r => { const p = D.P[r]; return `<tr><td><b class="dot" style="background:${CHG_COL[r]}"></b>${T('role_' + r)}</td><td>${f(p.De * 1000, 1)}</td><td>${f(p.q, 3)}</td><td>${f(D.B[r], 3)}</td><td>${f(D.Rd[r], 3)}</td></tr>`; }).join('')}</tbody></table>
      <table><thead><tr><th>${T('cutTable')}</th><th>${T('charge')}</th><th>Bmax m</th><th>B m</th><th>HD m</th></tr></thead><tbody>${D.cut.quads.map(q => `<tr><td>Q${q.n}</td><td><b class="dot" style="background:${CHG_COL[q.charge]}"></b>${T('role_' + q.charge)}</td><td>${f(q.Bmax, 4)}</td><td>${f(q.B, 4)}</td><td>${f(q.HD, 4)}</td></tr>`).join('')}</tbody></table>
      <table><tbody><tr><td>${T('areaLook')}</td><td>${f(Q.lookArea, 3)} m²</td></tr><tr><td>${T('areaMean')}</td><td>${f(Q.areaMean, 3)} m²</td></tr><tr><td>${T('cutCentre')}</td><td>${f(D.cut.cx)}, ${f(D.cut.cy)} m</td></tr><tr><td>Stope B</td><td>${D.meta.nL} + ${D.meta.nR} × ${f(D.meta.Badj)} m</td></tr><tr><td>Stope C</td><td>${D.meta.nC} ${T('rows')}</td></tr></tbody></table>
      <p class="note">${T('Bprac')}: ${T('Bmax')} − (${f(inp.drill.collarDev)} + ${f(inp.drill.angDev, 3)}×${f(inp.drill.L)}) = −${f(D.dev, 3)} m · φ = ${f(D.cut.phi, 3)} m · Hmax = ${f(D.cut.Hmax)} m</p></details>`;
  } else if (tab === 'holes') {
    h += `<div class="scroll"><table class="holes"><thead><tr><th>${T('id')}</th><th>${T('holeType')}</th><th>${T('collar')}</th><th>${T('toe')}</th><th>${T('len')} m</th><th>${T('chargeLen')} m</th><th>kg</th><th>${T('cart')}</th><th>${T('Rd')} m</th><th>${T('delay')}</th></tr></thead><tbody>${[...D.holes].sort((a, b) => a.delay - b.delay || a.id - b.id).map(o => `<tr class="${sel === o.id ? 'sel' : ''}" data-id="${o.id}"><td>${o.id}</td><td><b class="dot" style="background:${COL[o.type]}"></b>${T('t_' + o.type)}</td><td>${f(o.x - o.lx)}, ${f(o.y - o.ly)}</td><td>${f(o.x)}, ${f(o.y)}</td><td>${f(o.len)}</td><td>${f(o.chargeLen)}</td><td>${f(o.kg)}</td><td>${o.ncart || ''}</td><td>${f(o.rd, 3)}</td><td>${o.delay}</td></tr>`).join('')}</tbody></table></div>`;
  } else if (tab === 'analysis') {
    h += `<h3 class="first">${T('tPerim')}</h3><p class="note">${T('perimInfo')}</p><div class="kpis">${kpi(T('coverage'), f(D.perimeter.coverage * 100, 0), '%')}${kpi(T('maxOver'), f(D.perimeter.maxOver), 'm')}${kpi(T('meanOver'), f(D.perimeter.meanOver), 'm')}</div>${perimChart()}`;
    const RT = OR.rdTable(inp, D.P);
    h += `<h3>${T('tModels')}</h3><p class="note">${T('modelsInfo')}</p><div class="scroll"><table><thead><tr><th></th>${ROLES.map(r => `<th style="color:${CHG_COL[r]}">${T('role_' + r)}</th>`).join('')}</tr></thead><tbody>${OR.MODELS.map(m => `<tr class="${m === inp.damageModel ? 'cur' : ''}"><td>${T(m)}</td>${ROLES.map(r => `<td>${f(RT[m][r], 3)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <label class="row inl"><span>${T('chargeFor')}</span><select id="modelRole">${ROLES.map(r => `<option value="${r}" ${r === modelRole ? 'selected' : ''}>${T('role_' + r)}</option>`).join('')}</select></label>${modelChart()}`;
  } else if (tab === 'valid') {
    h += validation();
  } else if (tab === 'about') {
    h += $('#aboutTpl').innerHTML.replace('{{disc}}', esc(T('disclaimer')));
  }
  $('#res').innerHTML = h;
  const mr = $('#modelRole'); if (mr) mr.addEventListener('change', e => { modelRole = e.target.value; results(); });
  $$('#res tr[data-id]').forEach(tr => tr.addEventListener('click', () => { sel = +tr.dataset.id; const h = D.holes.find(q => q.id === sel); if (h) { const r = svgEl().getBoundingClientRect(), p = posOf(h), px = V.ox + p[0] * V.sc, py = V.oy - p[1] * V.sc; if (px < 40 || py < 40 || px > r.width - 40 || py > r.height - 40) { V.ox = r.width / 2 - p[0] * V.sc; V.oy = r.height / 2 + p[1] * V.sc; } } draw(); results(); syncSel(); }));
}
function validation() {
  const V = OR.design(JSON.parse(JSON.stringify(DEFAULT_INPUT)));
  const g = k => V.holes.filter(h => (h.grp || h.type) === k).length;
  const cut = n => V.cut.quads[n - 1];
  const byD = {}; for (const h of V.holes) if (h.type !== 'empty') byD[h.delay] = (byD[h.delay] || 0) + 1;
  const dr = [2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 5, 5, 8, 11, 4, 2];
  const timingOK = dr.every((c, i) => byD[i + 1] === c) && Object.keys(byD).length === 16;
  const rows = [
    ['Rd smoothwall / buffer / full (m)', [V.Rd.smooth, V.Rd.buffer, V.Rd.full].map(x => f(x, 4)).join(' / '), '0.3108 / 0.4403 / 0.6216', 1],
    ['Bmax smooth / buffer / full / lifter (m)', [V.B.smooth, V.B.buffer, V.B.full, V.B.lifter].map(x => f(x, 4)).join(' / '), '0.9000 / 1.0947 / 1.2575 / 1.4060', 1],
    ['Cut Bmax Q1–Q4 (m)', [1, 2, 3, 4].map(n => f(cut(n).Bmax, 4)).join(' / '), '0.2272 / 0.2210 / 0.4463 / 0.6897', 1],
    ['Cut hole distance Q1–Q4 (m)', [1, 2, 3, 4].map(n => f(cut(n).HD, 4)).join(' / '), '0.2365 / 0.3949 / 0.8255 / 1.4743', 1],
    [T('cutCentre') + ' (m)', f(V.cut.cx) + ', ' + f(V.cut.cy), '-0.54, 1.67', 1],
    ['Back / ribs / lifters / Stope B / Stope C', [g('back'), g('rib'), g('lifter') + g('corner'), g('stopeB'), g('stopeC')].join(' / '), '11 / 8 / 6 / 6 / 10', 1],
    [T('nHoles') + ' · ' + T('drilled'), V.Q.nHoles + ' · ' + f(V.Q.drilled, 0) + ' m', '59 · 236 m', 1],
    ['Timing intervals (holes per delay)', timingOK ? '16 = DRIFT' : 'differs', '2,2,2,2,2,2,2,2,2,4,5,5,8,11,4,2', timingOK ? 1 : 0],
    ['Rib hole heights (m)', V.holes.filter(h => h.grp === 'rib' && h.x < 0).map(h => f(h.y)).join(', '), '3.37, 2.64, 1.91, 1.18', 2],
    [T('kg') + ' (kg)', f(V.Q.kg, 2), '304.19', 3],
    [T('area') + ' (m²)', f(V.Q.area, 3) + ' / ' + f(V.Q.lookArea, 3), '44.175 / 50.558', 3],
    [T('PF') + ' (kg/m³)', f(V.Q.PF, 2), '1.69', 3],
    ['Holmberg–Persson Rd, full charge (m)', f(OR.damageRadius('hpInt', V.P.full, 0.048, { ...V.inp.rock, cb: 0.45 }, 3.52), 2), '0.80', 2]
  ];
  const st = { 1: ['✓', '#2e9b57'], 2: ['≈', '#b7791f'], 3: ['DRIFT ✗', '#d1453b'], 0: ['✗', '#d1453b'] };
  return `<p class="note">${T('validInfo')}</p><div class="scroll"><table><thead><tr><th></th><th>OpenRound</th><th>DRIFT 2.0</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td><td>${r[1]}</td><td>${r[2]}</td><td style="color:${st[r[3]][1]};font-weight:600">${st[r[3]][0]}</td></tr>`).join('')}</tbody></table></div>
  <h3>${T('bugsTitle')}</h3><ul class="note"><li>${T('bug1')}</li><li>${T('bug2')}</li><li>${T('bug3')}</li></ul>
  <h3>${T('diffTitle')}</h3><ul class="note"><li>${T('diff1')}</li><li>${T('diff2')}</li><li>${T('diff3')}</li></ul>`;
}
function lineChart(series, xl, yl, opt = {}) {
  const W = 720, H = 260, m = { l: 52, r: 14, t: 12, b: 40 };
  let xs = [], ys = [];
  series.forEach(s => s.pts.forEach(p => { if (isFinite(p[1])) { xs.push(p[0]); ys.push(p[1]); } }));
  const xmin = opt.xmin ?? Math.min(...xs), xmax = opt.xmax ?? Math.max(...xs), ymin = 0, ymax = (opt.ymax ?? Math.max(...ys, 0.1)) * 1.08;
  const X = x => m.l + (x - xmin) / (xmax - xmin || 1) * (W - m.l - m.r), Y = y => H - m.b - (y - ymin) / (ymax - ymin || 1) * (H - m.t - m.b);
  const nice = (a, b, n) => { const st = Math.pow(10, Math.floor(Math.log10((b - a) / n))); const k = [1, 2, 5, 10].find(k => (b - a) / (k * st) <= n) * st; const out = []; for (let v = Math.ceil(a / k) * k; v <= b + 1e-9; v += k) out.push(+v.toPrecision(6)); return out; };
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}">`;
  for (const v of nice(ymin, ymax, 5)) s += `<line class="gl" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="tk" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
  for (const v of nice(xmin, xmax, 8)) s += `<text class="tk" x="${X(v)}" y="${H - m.b + 16}" text-anchor="middle">${v}</text>`;
  s += `<line class="axl" x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}"/>`;
  s += `<text class="tk" x="${(W + m.l) / 2}" y="${H - 6}" text-anchor="middle">${xl}</text><text class="tk" transform="translate(13 ${(H - m.b) / 2}) rotate(-90)" text-anchor="middle">${yl}</text>`;
  for (const se of series) {
    const d = se.pts.filter(p => isFinite(p[1])).map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(Math.min(p[1], ymax)).toFixed(1)).join('');
    s += `<path d="${d}" fill="${se.fill ? se.color : 'none'}" fill-opacity="${se.fill ? 0.18 : 0}" stroke="${se.color}" stroke-width="${se.w || 1.6}" ${se.dash ? 'stroke-dasharray="4 3"' : ''}/>`;
  }
  if (opt.vline !== undefined) s += `<line x1="${X(opt.vline)}" x2="${X(opt.vline)}" y1="${m.t}" y2="${H - m.b}" stroke="#888" stroke-dasharray="3 3"/>`;
  if (opt.legend) s += opt.legend.map((l, i) => `<g transform="translate(${m.l + 10 + (i % 3) * 210} ${m.t + 6 + Math.floor(i / 3) * 15})"><line x2="16" y1="0" y2="0" stroke="${l[1]}" stroke-width="2.5" ${l[2] ? 'stroke-dasharray="4 3"' : ''}/><text class="tk" x="20" y="4">${esc(l[0])}</text></g>`).join('');
  return s + '</svg>';
}
function perimChart() {
  const P = D.perimeter, n = P.prof.length, Lp = OR.backPath ? polyLen(OR.backPath(D.G, 0, 0)) : n;
  const pts = P.prof.map((v, i) => [i / (n - 1) * Lp, v]);
  return lineChart([{ pts, color: '#d1453b', fill: true }], T('along'), T('depth'), { xmin: 0, xmax: Lp });
}
function polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
const MCOL = { ashE: '#1b6ac9', ashP: '#6aa7f0', lk: '#2e9b57', etkin: '#9bcf5a', hpSum: '#d1453b', hpInt: '#f08a65', johnson: '#7b4fc9', sher: '#333333' };
function modelChart() {
  const cur = OR.modelCurves(inp, modelRole);
  const series = OR.MODELS.map(m => ({ pts: cur[m], color: MCOL[m], w: m === inp.damageModel ? 3 : 1.6, dash: /hp/.test(m) }));
  const finite = OR.MODELS.flatMap(m => cur[m].map(p => p[1])).filter(isFinite).sort((a, b) => a - b);
  const ymax = finite[Math.floor(finite.length * 0.9)] || 1;
  return lineChart(series, T('ratio'), T('Rd') + ' (m)', { xmin: 0.2, xmax: 1, ymax, vline: D.P[modelRole].ratio, legend: OR.MODELS.map(m => [T(m), MCOL[m], /hp/.test(m)]) });
}
function syncTabs() { $$('.tabs button').forEach(x => x.classList.toggle('on', x.dataset.t === tab)); }
$$('.tabs button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.t; syncTabs(); results(); }));
function setRight(on) { inp.view.right = on; $('main').classList.toggle('noright', !on); $('#panelBtn').classList.toggle('on', on); $('#panelBtn').setAttribute('aria-pressed', on); saveState(); }
$('#panelBtn').addEventListener('click', () => setRight(!inp.view.right));
$('#helpBtn').addEventListener('click', () => { setRight(true); tab = 'about'; syncTabs(); results(); });
/* theme */
const THEME_KEY = 'openround.theme';
function curTheme() { const a = document.documentElement.dataset.theme; if (a === 'dark' || a === 'light') return a; return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem(THEME_KEY, t); } catch (e) {} $('#themeBtn').textContent = T(t === 'dark' ? 'themeLight' : 'themeDark'); draw(); }
try { const t = localStorage.getItem(THEME_KEY); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
$('#themeBtn').addEventListener('click', () => setTheme(curTheme() === 'dark' ? 'light' : 'dark'));

/* ---------- export / save ---------- */
let DL = null;
(async () => { try { if (window.claude && typeof window.claude.use === 'function') DL = await window.claude.use('downloads'); } catch (e) { DL = null; } })();
function note(msg) { $('#err').textContent = msg; setTimeout(() => { if ($('#err').textContent === msg) $('#err').textContent = ''; }, 6000); }
function download(name, data, type) {
  if (window.desktop) { window.desktop.saveFile(name, data instanceof Blob ? null : data).then(r => { if (r && r.saved) note(T('savedTo') + ' ' + r.path); }).catch(e => note('Save: ' + e.message)); return; }
  if (DL) { DL.save({ filename: name, data }).catch(e => { if (e && e.code !== 'declined') note('Download: ' + (e.code || e.message)); }); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
// minimal ZIP (stored) so the DXF can travel where .dxf downloads are not allowed
function crc32(u8) { let c, crc = 0xFFFFFFFF; for (let n = 0; n < u8.length; n++) { c = (crc ^ u8[n]) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xFFFFFFFF) >>> 0; }
function zipFiles(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  for (const [name, text] of files) {
    const nm = enc.encode(name), data = enc.encode(text), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(8, 0, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true);
    parts.push(new Uint8Array(h.buffer), nm, data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + data.length;
  }
  const csize = central.reduce((a, b) => a + b.length, 0);
  const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
const fname = ext => (inp.project.name || 'design').replace(/[^\w\-]+/g, '_').slice(0, 60) + ext;
$('#save').addEventListener('click', () => download(fname('.openround.json'), JSON.stringify({ app: 'OpenRound', v: 1, inp, locked, holes: locked ? lockedHoles : null, cut: locked ? lockedCut : null }, null, 1), 'application/json'));
$('#load').addEventListener('click', () => $('#file').click());
$('#file').addEventListener('change', async e => {
  const fl = e.target.files[0]; if (!fl) return;
  try { const o = JSON.parse(await fl.text()); inp = merge(clone(DEFAULT_INPUT), o.inp); locked = !!o.locked; lockedHoles = o.holes; lockedCut = o.cut; $('#lock').checked = locked; buildForm(); run(); }
  catch (err) { $('#err').textContent = 'Could not open file: ' + err.message; }
  e.target.value = '';
});
$('#csv').addEventListener('click', () => {
  const rows = [['id', 'type', 'charge', 'explosive', 'collar_x', 'collar_y', 'toe_x', 'toe_y', 'length_m', 'lookout_dx', 'lookout_dy', 'charge_length_m', 'charge_kg', 'cartridges', 'damage_radius_m', 'delay']];
  for (const h of [...D.holes].sort((a, b) => a.delay - b.delay || a.id - b.id)) rows.push([h.id, h.type, h.charge, h.charge === 'none' ? '' : inp.explosives[h.charge].name, (h.x - h.lx).toFixed(3), (h.y - h.ly).toFixed(3), h.x.toFixed(3), h.y.toFixed(3), h.len.toFixed(3), h.lx.toFixed(3), h.ly.toFixed(3), (h.chargeLen || 0).toFixed(3), (h.kg || 0).toFixed(3), h.ncart || 0, (h.rd || 0).toFixed(3), h.delay]);
  download(fname('_holes.csv'), rows.map(r => r.map(c => /[",;]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(',')).join('\r\n'), 'text/csv');
});
$('#dxf').addEventListener('click', () => {
  const out = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '6', '0', 'ENDSEC', '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '10'];
  const layers = { DESIGN: 8, LOOKOUT: 1, PERIM: 1, BUFFER: 5, STOPE: 3, LIFTER: 30, CUT: 6, EMPTY: 7, DAMAGE: 9, DELAY: 7, HOLES_3D: 2 };
  for (const [n, c] of Object.entries(layers)) out.push('0', 'LAYER', '2', n, '70', '0', '62', String(c), '6', 'CONTINUOUS');
  out.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');
  const n = v => v.toFixed(4);
  const line = (ly, a, b) => out.push('0', 'LINE', '8', ly, '10', n(a[0]), '20', n(a[1]), '30', n(a[2] || 0), '11', n(b[0]), '21', n(b[1]), '31', n(b[2] || 0));
  const circ = (ly, x, y, r) => out.push('0', 'CIRCLE', '8', ly, '10', n(x), '20', n(y), '30', '0', '40', n(r));
  const text = (ly, x, y, hgt, s) => out.push('0', 'TEXT', '8', ly, '10', n(x), '20', n(y), '30', '0', '40', n(hgt), '1', String(s));
  const pl = (ly, pts) => { for (let i = 1; i < pts.length; i++) line(ly, pts[i - 1], pts[i]); };
  pl('DESIGN', OR.contourPts(D.G, 0)); pl('LOOKOUT', OR.contourPts(D.G, -inp.drill.lookout));
  const LY = { perim: 'PERIM', buffer: 'BUFFER', stope: 'STOPE', lifter: 'LIFTER', empty: 'EMPTY' };
  for (const h of D.holes) {
    const ly = LY[h.type] || 'CUT', r = (h.type === 'empty' ? inp.drill.emptyD : inp.drill.Dh) / 2;
    const cx = h.x - h.lx, cy = h.y - h.ly;
    circ(ly, cx, cy, r);
    if (h.rd > 0) circ('DAMAGE', h.x, h.y, h.rd);
    if (h.type !== 'empty') text('DELAY', cx + 0.05, cy + 0.05, 0.08, h.delay);
    line('HOLES_3D', [cx, cy, 0], [h.x, h.y, -h.len]);
  }
  out.push('0', 'ENDSEC', '0', 'EOF');
  if (window.desktop) download(fname('.dxf'), out.join('\r\n'), 'application/dxf');
  else download(fname('_dxf.zip'), zipFiles([[fname('.dxf'), out.join('\r\n')]]), 'application/zip');
});
$('#print').addEventListener('click', () => {
  const keep = tab; const parts = [];
  for (const t of ['summary', 'analysis', 'holes']) { tab = t; results(); parts.push(`<h2>${T({ summary: 'tSummary', analysis: 'tAnalysis', holes: 'tHoles' }[t])}</h2>` + $('#res').innerHTML.replace(/<details class="more">/g, '<details class="more" open>')); }
  tab = keep; results();
  const inputs = $$('#form label.row').filter(l => l.offsetParent !== null || true).map(l => { const i = l.querySelector('input,select'); if (!i || l.style.display === 'none') return ''; const v = i.type === 'checkbox' ? (i.checked ? '✓' : '–') : i.tagName === 'SELECT' ? i.options[i.selectedIndex].text : i.value; return `<tr><td>${esc(l.querySelector('span').textContent)}</td><td>${esc(v)} ${esc((l.querySelector('i') || {}).textContent || '')}</td></tr>`; }).join('');
  const rep = `<h1>${T('report')}: ${esc(inp.project.name)}</h1><p>${esc(inp.project.comment)} · ${T('date')}: ${new Date().toISOString().slice(0, 10)} · ${T(inp.method)} · ${T(inp.damageModel)}</p>
    <div class="pplot">${reportSheet()}</div><div id="pwarn">${$('#warn').innerHTML}</div>${parts.join('')}<h2>Input</h2><table class="inputs">${inputs}</table><p class="note">${esc(T('disclaimer'))}</p>`;
  const css = document.querySelector('style').textContent;
  const html = `<!DOCTYPE html><html lang="${lang}" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(T('report'))} – ${esc(inp.project.name)}</title><style>${css}
body{display:block;background:#fff;color:#111;overflow:auto;padding:18px;max-width:1200px;margin:auto}.kpis{grid-template-columns:repeat(4,1fr)}.kpi{background:#f5f5f3;border-color:#ddd}.kl,th,.note{color:#555}td,th{border-color:#ddd}h1,h2{font-family:var(--mono)}h3{color:#c2410c}.chart .tk{fill:#555}.chart .gl{stroke:#e5e5e5}tr.sel td,tr.cur td{background:#fff3e8}#printArea{display:block!important}.pbtn{position:fixed;right:16px;top:12px;padding:8px 14px;border-radius:6px;border:1px solid #ccc;background:#1d232b;color:#fff;cursor:pointer}
#printArea .pplot svg{width:100%;height:auto}@media print{.pbtn{display:none}body{padding:0}}</style></head>
<body><button class="pbtn" onclick="print()">Print / PDF</button><div id="printArea">${rep}</div></body></html>`;
  if (window.desktop) { window.desktop.saveReportPDF(fname('_report.pdf'), html).then(r => { if (r && r.saved) note(T('savedTo') + ' ' + r.path); }).catch(e => note('PDF: ' + e.message)); return; }
  download(fname('_report.html'), html, 'text/html');
});

function reportSheet() {
  const W = 1200, H = 860, L = layout(), sc = Math.min(W / (L.x1 - L.x0), H / (L.y1 - L.y0));
  const view = { sc, ox: W / 2 - (L.x0 + L.x1) / 2 * sc, oy: H / 2 + (L.y0 + L.y1) / 2 * sc };
  const keep = sel; sel = null; const out = `<svg class="sheet" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${sceneSVG(W, H, view, { report: true })}</svg>`; sel = keep; return out;
}
/* ---------- view presets ---------- */
const PRESETS_V = {
  design: { grid: true, spacings: false, dims: false, damage: false, delays: true, ids: false, contours: true, collars: true, detail: true },
  check: { grid: false, spacings: false, dims: false, damage: true, delays: false, ids: false, contours: true, collars: true, detail: false },
  dims: { grid: true, spacings: true, dims: true, damage: false, delays: false, ids: true, contours: false, collars: false, detail: true }
};
function renderViewMenu() {
  const cur = inp.view.preset || 'custom';
  $('#presets').innerHTML = ['design', 'check', 'dims'].map(p => `<button class="${cur === p ? 'on' : ''}" data-p="${p}" aria-pressed="${cur === p}">${T('pv_' + p)}</button>`).join('');
  $$('#presets button').forEach(b => b.addEventListener('click', () => { inp.view.preset = b.dataset.p; Object.assign(show(), PRESETS_V[b.dataset.p]); renderViewMenu(); draw(); saveState(); }));
  $('#viewMenu').innerHTML = `<summary>${T('display')}</summary><div class="vm">${SHOW_KEYS.map(k => `<label><input type="checkbox" data-v="${k}" ${show()[k] ? 'checked' : ''}> ${T('sh_' + k)}</label>`).join('')}
    <label class="pl">${T('plane')}<input type="range" min="0" max="1" step="0.05" value="${inp.view.plane}" id="plane"></label></div>`;
  $$('#viewMenu [data-v]').forEach(c => c.addEventListener('change', () => { show()[c.dataset.v] = c.checked; inp.view.preset = 'custom'; renderViewMenuKeepOpen(); draw(); saveState(); }));
  $('#plane').addEventListener('input', e => { inp.view.plane = +e.target.value; if (D) D.perimeter = OR.perimeterCheck(D); draw(); results(); });
}
function renderViewMenuKeepOpen() { $$('#presets button').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', false); }); }
document.addEventListener('click', e => { const m = $('#viewMenu'); if (m && m.open && !m.contains(e.target)) m.open = false; });
/* ---------- language ---------- */
function applyLang() {
  document.documentElement.lang = lang;
  $$('[data-i]').forEach(el => el.textContent = T(el.dataset.i));
  $('#addType').innerHTML = TYPES.map(t => `<option value="${t}">${T('t_' + t)}</option>`).join('');
  $$('#lang button').forEach(b => b.classList.toggle('on', b.dataset.l === lang));
  renderViewMenu();
  $('#themeBtn').textContent = T(curTheme() === 'dark' ? 'themeLight' : 'themeDark');
  setRight(inp.view.right !== false);
  buildForm(); run(); syncSel();
}
function saveState() { try { localStorage.setItem(STORE, JSON.stringify({ inp, lang })); } catch (e) {} }
$$('#lang button').forEach(b => b.addEventListener('click', () => { lang = b.dataset.l; applyLang(); }));
window.OpenRound = { view: V, design: () => D, measures: () => measures };
bindSheet();
applyLang();
})();
