/* OpenRound engine — drift round blast design & blast damage models.
   Methods follow the public-domain description in NIOSH Pub. 2019-129
   (Kuchta, Iverson, Hustrulid) and Persson, Holmberg & Lee (1994).
   Internal units: m, kg, MPa, km/s for VOD, MJ/kg for energy. */
(function (root) {
'use strict';
const ANFO = { SG: 0.82, AWS: 3.82, VOD: 3.65 };
const SG_REF = 2.65;
const PI = Math.PI;

/* ---------------- explosives ---------------- */
// type: bulk | string | cartridge | cord
function explosiveProps(ex, Dh) {
  let De, SG = ex.SG;
  if (ex.type === 'bulk') De = Dh;
  else if (ex.type === 'cord') { De = 0.95 * Math.sqrt(ex.coreLoad) / 1000; SG = 1.4; }
  else De = Math.min(ex.De, Dh);
  const RWS = ex.RWS;
  const RBS = RWS * SG / ANFO.SG;
  const q = PI / 4 * De * De * SG * 1000;               // kg/m
  const Pe = SG * 1000 * ex.VOD * ex.VOD / 8;            // MPa (rho kg/m3 * (km/s)^2 / 8)
  return { De, SG, RWS, RBS, q, Pe, VOD: ex.VOD, AWS: RWS * ANFO.AWS, ratio: De / Dh };
}

/* ---------------- burden equations ---------------- */
function burdenModAsh(p, rock) {            // Eq. 5 (with charge diameter)
  return 25 * p.De * Math.sqrt((SG_REF / rock.SG) * (p.SG * p.RWS / ANFO.SG));
}
function burdenLK(p, rock, f, KS) {          // Eq. 10
  return 0.9 * 25 * p.De * Math.sqrt(0.4 * PI * (SG_REF / rock.SG) * p.SG * p.RWS / (rock.cb * f * KS));
}

/* ---------------- Etkin tables (Table 5 / 6) ---------------- */
const ETKIN_T5 = { // [Ia, Ib, II, III] by joint category
  'I-A':[3,4,5,7],'I-B':[4,5,6,7],'I-C':[6,6,7,7],'I-D':[6,7,7,7],
  'II-A':[2,3,4,6],'II-B':[3,4,5,6],'II-C':[4,5,6,6],'II-D':[6,6,6,7],
  'III-A':[2,1,2,4],'III-B':[3,2,3,5],'III-C':[3,3,4,6],'III-D':[3,4,5,6],
  'IV-A':[1,1,2,4],'IV-B':[1,1,2,4],'IV-C':[1,2,3,5],'IV-D':[2,3,4,5],
  'V-A':[1,1,2,4],'V-B':[1,1,2,4],'V-C':[1,2,3,5],'V-D':[2,3,4,5]
};
// average ammonite powder factor (deep, near free surface). Class 5 deep average in the
// source table repeats class 4 (1.15) although its range is 0.4–0.8; the midpoint 0.6 is used.
const ETKIN_T6 = {1:[8,0.9],2:[4,0.5],3:[2.2,0.25],4:[1.15,0.12],5:[0.6,0.12],6:[0.3,0.03],7:[0.15,0.015]};
function etkinCategory(jointSpacing, jointWidthMm) {
  const s = jointSpacing < 0.1 ? 'I' : jointSpacing < 0.5 ? 'II' : jointSpacing < 1.0 ? 'III' : jointSpacing <= 1.5 ? 'IV' : 'V';
  const w = jointWidthMm < 0.5 ? 'A' : jointWidthMm < 1 ? 'B' : jointWidthMm <= 2 ? 'C' : 'D';
  return s + '-' + w;
}
function etkinPF(rock) {
  const cat = etkinCategory(rock.jointSpacing, rock.jointWidth);
  const col = { Ia: 0, Ib: 1, II: 2, III: 3 }[rock.rockClass] ?? 2;
  const cls = ETKIN_T5[cat][col];
  const pfAmm = ETKIN_T6[cls][rock.etkinZone === 'surface' ? 1 : 0];
  return { cat, cls, pfAmm, pfAnfo: pfAmm * 4.3 / ANFO.AWS };
}

/* ---------------- damage models ---------------- */
function bisect(fn, lo, hi, it = 200) {
  let flo = fn(lo), fhi = fn(hi);
  if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return NaN;
  for (let i = 0; i < it; i++) {
    const m = 0.5 * (lo + hi), fm = fn(m);
    if (fm * flo <= 0) { hi = m; fhi = fm; } else { lo = m; flo = fm; }
    if (hi - lo < 1e-7) break;
  }
  return 0.5 * (lo + hi);
}

// ppv model helpers; L = charge length (m)
function ppvSum(q, r, L, K, a, b, dz) {
  const n = Math.max(1, Math.round(L / 2 / dz)), d = (L / 2) / n;
  let s = 0;
  for (let i = 0; i < n; i++) { const z = (i + 0.5) * d; s += 1 / Math.pow(r * r + z * z, b / 2); }
  return 2 * K * Math.pow(q, a) * Math.pow(d, a) * s;
}
function ppvIntegral(q, r, L, K, a, b) {   // Holmberg–Persson (1978): K [q ∫ dz / R^(b/a)]^a
  const n = 400, d = (L / 2) / n; let s = 0;
  for (let i = 0; i < n; i++) { const z = (i + 0.5) * d; s += d / Math.pow(r * r + z * z, b / (2 * a)); }
  return K * Math.pow(q * 2 * s, a);
}
function sherRd(p, Dh, rock) {
  const phi = rock.phi * PI / 180, sn = Math.sin(phi);
  const al = 2 * sn / (1 - sn), Y = 2 * rock.c * Math.cos(phi) / (1 - sn);
  const al2 = rock.UCS / rock.UTS - 1, Y2 = rock.UCS, P = rock.stress;
  const qs = -(Y2 + 2 * P * (1 + al2)) / (2 + al2);
  const k = -(1 + rock.nu) * (qs + 2 * P * (1 - rock.nu)) / rock.E;   // ub = k*b
  const rh = Dh / 2, rc = p.De / 2, P0 = p.Pe, g1 = 3, g2 = 1.27, as = 1.89 * rc;
  const pa = a => a <= as ? P0 * Math.pow(a / rc, -2 * g1) : P0 * Math.pow(as / rc, -2 * g1) * Math.pow(a / as, -2 * g2);
  const aOf = bb => Math.sqrt(rh * rh + bb * bb * (2 * k - k * k));
  const ex = al / (1 + al);
  const g = bb => { const a = aOf(bb); return (Y / al - qs) * Math.pow(bb / a, ex) - Y / al - pa(a); };
  const lo = rh * 1.0001;
  if (g(lo) >= 0) return rh;                       // no crushing beyond hole wall
  return bisect(g, lo, rh * 2000);
}
function johnsonRd(p, Dh, rock) {
  const rh = Dh / 2, Pw = p.Pe * Math.pow(p.De / Dh, rock.johnsonExp);
  const f = R => Pw * Math.sqrt(rh / R) * Math.exp(-rock.ba * R) - rock.UCS;
  if (f(rh) <= 0) return rh;
  return bisect(f, rh, 50);
}

const MODELS = ['ashE', 'ashP', 'lk', 'etkin', 'hpSum', 'hpInt', 'johnson', 'sher'];
function damageRadius(model, p, Dh, rock, L) {
  switch (model) {
    case 'ashE': return 12.5 * p.De * Math.sqrt(p.RBS * SG_REF / rock.SG);
    case 'ashP': return 12.5 * p.De * Math.sqrt(p.RBS * (SG_REF / rock.SG) * (p.De / Dh));
    case 'lk': return 0.9 * 12.5 * p.De * Math.sqrt(0.4 * PI * p.SG * p.RWS / (rock.cb * rock.lkF * rock.lkKS));
    case 'etkin': return 12.5 * p.De * Math.sqrt(0.4 * PI * p.SG * p.RWS / etkinPF(rock).pfAnfo);
    case 'hpSum': { const fn = r => ppvSum(p.q, r, L, rock.K, rock.alpha, rock.beta, rock.dz) - rock.ppvCrit;
      return bisect(fn, Dh / 2, 30); }
    case 'hpInt': { const fn = r => ppvIntegral(p.q, r, L, rock.K, rock.alpha, rock.beta) - rock.ppvCrit;
      return bisect(fn, Dh / 2, 30); }
    case 'johnson': return johnsonRd(p, Dh, rock);
    case 'sher': return sherRd(p, Dh, rock);
  }
  return NaN;
}

/* ---------------- geometry: every section is a closed polygon (clockwise, y up) ----------------
   Offsets (lookout, buffer, full-charge region) use Clipper (Angus Johnson, Boost licence) with mitred corners,
   so straight walls and arches offset exactly as in DRIFT. */
const CL = typeof ClipperLib !== 'undefined' ? ClipperLib : (typeof require !== 'undefined' ? require('../lib/clipper.min.js') : null);
const signedArea = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const toCW = p => signedArea(p) > 0 ? p.slice().reverse() : p;
function arcPts(cx, cy, r, a0, a1, out, skipFirst) {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) * r / 0.01));
  for (let i = skipFirst ? 1 : 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
}
function dedupe(p) { const o = []; for (const q of p) { const l = o[o.length - 1]; if (!l || Math.hypot(q[0] - l[0], q[1] - l[1]) > 1e-7) o.push(q); }
  if (o.length > 2 && Math.hypot(o[0][0] - o[o.length - 1][0], o[0][1] - o[o.length - 1][1]) < 1e-7) o.pop(); return o; }
const SHAPES = ['arched', 'flat', 'rounded', 'horseshoe', 'custom'];
function shapePoly(g) {
  const shape = g.shape || 'arched', W = g.W, p = [];
  if (shape === 'custom' && g.points && g.points.length > 2) return { p: g.points.map(q => [q[0], q[1]]) };
  if (shape === 'flat') { const H = g.H; p.push([-W / 2, 0], [-W / 2, H], [W / 2, H], [W / 2, 0]); return { p, Hw: H }; }
  if (shape === 'rounded') {
    const H = g.H, r = Math.max(0, Math.min(g.r, W / 2, H));
    p.push([-W / 2, 0]);
    if (r > 1e-4) { arcPts(-W / 2 + r, H - r, r, PI, PI / 2, p); arcPts(W / 2 - r, H - r, r, PI / 2, 0, p); } else p.push([-W / 2, H], [W / 2, H]);
    p.push([W / 2, 0]); return { p, Hw: H - r, r };
  }
  if (shape === 'horseshoe') {
    const r = W / 2, H = Math.max(g.H, r + 0.05), yc = H - r, k = Math.max(g.k || 2, yc / r + 0.02), R = k * r, al = Math.asin(Math.min(1, yc / R));
    arcPts((k - 1) * r, yc, R, -PI + al, -PI, p);            // left wall, floor → springline
    arcPts(0, yc, r, PI, 0, p, true);                         // crown
    arcPts(-(k - 1) * r, yc, R, 0, -al, p, true);             // right wall, springline → floor
    return { p, Hw: yc };
  }
  // arched (default): vertical walls Hw and a circular arch of rise ha
  const Hw = g.Hw, ha = Math.min(g.ha, W / 2);
  p.push([-W / 2, 0], [-W / 2, Hw]);
  if (ha > 1e-6) { const R = (W * W / 4 + ha * ha) / (2 * ha), yc = Hw + ha - R, th = Math.asin(Math.min(1, (W / 2) / R)); arcPts(0, yc, R, PI / 2 + th, PI / 2 - th, p, true); p.pop(); }
  p.push([W / 2, Hw], [W / 2, 0]);
  return { p, Hw };
}
function driftGeom(g) {
  const sp = shapePoly(g), poly = toCW(dedupe(sp.p));
  let xmin = 1e9, xmax = -1e9, ymin = 1e9, ymax = -1e9;
  for (const [x, y] of poly) { xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
  let crown = poly[0]; for (const q of poly) if (q[1] > crown[1] + 1e-9 || (Math.abs(q[1] - crown[1]) < 1e-9 && Math.abs(q[0]) < Math.abs(crown[0]))) crown = q;
  // sharp vertices (corners, abutments) for snapping and labelling
  const corners = [];
  for (let i = 0; i < poly.length; i++) { const a = poly[(i - 1 + poly.length) % poly.length], b = poly[i], c = poly[(i + 1) % poly.length];
    const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]), t2 = Math.atan2(c[1] - b[1], c[0] - b[0]); let d = Math.abs(t2 - t1); if (d > PI) d = 2 * PI - d; if (d > 0.35) corners.push(b); }
  const shape = g.shape || 'arched';
  return { shape, poly, xmin, xmax, ymin, ymax, W: xmax - xmin, H: ymax - ymin, Hw: sp.Hw, crown, corners, area: Math.abs(signedArea(poly)),
    arch: shape === 'arched' && g.ha > 1e-6, _off: {} };
}
function offsetPoly(G, d) {
  const key = d.toFixed(6); if (G._off[key] !== undefined) return G._off[key];
  if (Math.abs(d) < 1e-9) return (G._off[key] = G.poly);
  const S = 1e5, co = new CL.ClipperOffset(10, 0.25);
  co.AddPath(G.poly.map(([x, y]) => ({ X: Math.round(x * S), Y: Math.round(y * S) })), CL.JoinType.jtMiter, CL.EndType.etClosedPolygon);
  const sol = new CL.Paths(); co.Execute(sol, -d * S);
  let best = null, ba = 0; for (const q of sol) { const ar = Math.abs(CL.Clipper.Area(q)); if (ar > ba) { ba = ar; best = q; } }
  return (G._off[key] = best && best.length > 2 ? toCW(best.map(q => [q.X / S, q.Y / S])) : null);
}
function polyBounds(p) { let ymin = 1e9, ymax = -1e9; for (const q of p) { ymin = Math.min(ymin, q[1]); ymax = Math.max(ymax, q[1]); } return { ymin, ymax }; }
function crossingsY(p, y) { const out = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length];
  if ((a[1] - y) * (b[1] - y) < 0 || (a[1] === y && b[1] !== y)) { const t = (y - a[1]) / (b[1] - a[1]); out.push({ i, x: a[0] + (b[0] - a[0]) * t }); } } return out; }
function crossingsX(p, x) { const out = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length];
  if ((a[0] - x) * (b[0] - x) < 0 || (a[0] === x && b[0] !== x)) { const t = (x - a[0]) / (b[0] - a[0]); out.push(a[1] + (b[1] - a[1]) * t); } } return out; }
// closed polyline of the contour offset by d (d > 0 inward, d < 0 outward)
function contourPts(G, d, n, closed = true) { const p = offsetPoly(G, d); if (!p) return []; return closed ? [...p, p[0]] : p.slice(); }
// walls + back of the offset contour above height y0, from the left wall to the right wall (left normal points outward)
function upperChain(p, y0) {
  if (!p) return null;
  const b = polyBounds(p); if (y0 <= b.ymin) y0 = b.ymin + 1e-6; if (y0 >= b.ymax) return null;
  const xs = crossingsY(p, y0); if (xs.length < 2) return null;
  let Lc = xs[0], Rc = xs[0]; for (const c of xs) { if (c.x < Lc.x) Lc = c; if (c.x > Rc.x) Rc = c; }
  const out = [[Lc.x, y0]], n = p.length; let i = (Lc.i + 1) % n, guard = 0;
  while (i !== (Rc.i + 1) % n && guard++ < n + 2) { out.push(p[i]); i = (i + 1) % n; }
  out.push([Rc.x, y0]);
  return out;
}
function backPath(G, d, y0) { return upperChain(offsetPoly(G, d), y0) || []; }
function polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
function chainCum(pts) { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c; }
// point and outward (left) normal at arc length s; bias > 0 takes the segment after a vertex, < 0 the one before
function chainAt(pts, cum, s, bias = 1) {
  const L = cum[cum.length - 1]; s = Math.max(0, Math.min(L, s));
  let i;
  if (bias < 0) { i = 0; while (i < cum.length - 2 && cum[i + 1] < s - 1e-12) i++; }
  else { i = cum.length - 2; while (i > 0 && cum[i] > s + 1e-12) i--; }
  while (i < cum.length - 2 && cum[i + 1] - cum[i] < 1e-12) i++;
  const a = pts[i], b = pts[i + 1], sl = (cum[i + 1] - cum[i]) || 1, t = Math.max(0, Math.min(1, (s - cum[i]) / sl));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, -(b[1] - a[1]) / sl, (b[0] - a[0]) / sl];
}
function pointsAlong(pts, nSpaces) { const cum = chainCum(pts), L = cum[cum.length - 1], out = []; for (let k = 0; k <= nSpaces; k++) out.push(chainAt(pts, cum, L * k / nSpaces, k === nSpaces ? -1 : 1)); return out; }
// ribs = the near-vertical runs (within 30°) that start at the floor on either side; the rest of the chain is the back
function splitRibs(pts) {
  const cum = chainCum(pts), tan = Math.tan(30 * PI / 180), Lc = cum[cum.length - 1];
  // direction over a 0.3 m chord, so survey noise does not break a wall into pieces
  const nv = i => { const q = chainAt(pts, cum, Math.min(Lc, cum[i] + 0.3), -1), dx = q[0] - pts[i][0], dy = q[1] - pts[i][1]; return Math.hypot(dx, dy) < 1e-9 || Math.abs(dx) <= tan * Math.abs(dy); };
  const nvb = j => { const q = chainAt(pts, cum, Math.max(0, cum[j] - 0.3), 1), dx = pts[j][0] - q[0], dy = pts[j][1] - q[1]; return Math.hypot(dx, dy) < 1e-9 || Math.abs(dx) <= tan * Math.abs(dy); };
  let i = 0; while (i < pts.length - 1 && nv(i)) i++;
  let j = pts.length - 1; while (j > i && nvb(j)) j--;
  return { cum, sL: cum[i], sR: cum[j], L: cum[cum.length - 1] };
}
function insideDist(G, x, y) {
  const p = G.poly; let d = 1e9, inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[j], b = p[i];
    if ((b[1] > y) !== (a[1] > y) && x < (a[0] - b[0]) * (y - b[1]) / (a[1] - b[1]) + b[0]) inside = !inside;
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
    d = Math.min(d, Math.hypot(a[0] + t * dx - x, a[1] + t * dy - y)); }
  return inside ? d : -d;
}
// x-range of the region offset by d at height y (the region continues straight down to its floor)
function rowSpan(G, d, y) { const p = offsetPoly(G, d); if (!p) return null; const b = polyBounds(p); const yy = Math.max(y, b.ymin + 1e-6); if (yy >= b.ymax) return null;
  const xs = crossingsY(p, yy).map(c => c.x); if (xs.length < 2) return null; return [Math.min(...xs), Math.max(...xs)]; }
function topAt(G, d, x) { const p = offsetPoly(G, d); if (!p) return -1e9; const ys = crossingsX(p, x); return ys.length ? Math.max(...ys) : polyBounds(p).ymax; }

/* ---------------- cut (Holmberg chain as implemented in DRIFT 2.0) ----------------
   Q1: Bmax = k1·φ (k1 = 1.5 × inner scaling; DRIFT example ⇒ 1.545), φ = de·√n
   Qi: W = HD(i-1) − √2·F,  Bmax = 0.088·√(W·q·s/(d·c)),  B = Bmax − F,  HD(i) = √2·(B + HD(i-1)/2)
   F = total hole deviation, c = rock constant (uncorrected), s = RWS, q = charge of that quadrangle */
const CUT_CHARGE = { 1: 'smooth', 2: 'buffer', 3: 'full', 4: 'full', 5: 'full' };
function holmbergCut(inp, P, rock, dev) {
  const de = inp.drill.emptyD, ne = inp.drill.nEmpty, d = inp.drill.Dh, c = rock.cb;
  const phi = de * Math.sqrt(ne);
  const Hmax = 0.15 + 34.1 * phi - 39.4 * phi * phi;
  const quads = [];
  const B1max = inp.cut.q1k * phi;
  let B = B1max - dev, HD = Math.SQRT2 * B;
  quads.push({ n: 1, Bmax: B1max, B, HD, W: HD, charge: CUT_CHARGE[1] });
  for (let i = 2; i <= 5; i++) {
    const p = P[CUT_CHARGE[i]];
    const Weff = HD - Math.SQRT2 * dev;
    const Bmax = 0.088 * Math.sqrt(Math.max(0, Weff) * p.q * p.RWS / (d * c)) * (i === 4 ? inp.cut.outerScale : 1);
    B = Bmax - dev; if (B <= 0) break;
    HD = Math.SQRT2 * (B + HD / 2);
    quads.push({ n: i, Bmax, B, HD, W: HD, charge: CUT_CHARGE[i] });
  }
  const q5 = quads.length > 4 ? quads.pop() : null;          // Q5 is reported but not drilled (stoping takes over)
  return { phi, Hmax, quads, q5, W: quads[quads.length - 1].HD };
}

/* ---------------- main design ---------------- */
function design(inp) {
  const G = driftGeom(inp.geom), dr = inp.drill, rock = inp.rock, Dh = dr.Dh;
  const L = dr.L, LD = dr.lookout, dev = dr.collarDev + dr.angDev * L;
  const ex = inp.explosives, P = {};
  for (const k of ['full', 'buffer', 'smooth', 'lifter']) P[k] = explosiveProps(ex[k], Dh);
  const stem = k => inp.stemAuto ? 10 * Dh : inp.stem[k];
  const chargeL = k => Math.max(0.1, L - stem(k));
  const rockLK = { ...rock, cb: rock.cb + 0.05 };            // Holmberg corrected rock constant c̄ = c + 0.05
  const Rd = {}; for (const k in P) Rd[k] = damageRadius(inp.damageModel, P[k], Dh, rockLK, chargeL(k));
  const warn = [], holes = [];
  let id = 0;
  const add = (x, y, type, charge, lx = 0, ly = 0, extra = {}) => holes.push({ id: ++id, x, y, type, charge, lx, ly, ...extra });
  const method = inp.method, KS = inp.ks;

  // maximum burdens (Langefors–Kihlström with c̄; Charge Region: Modified Ash)
  const B = {}, S = {};
  if (method === 'chargeRegion') {
    for (const k of ['smooth', 'buffer', 'full', 'lifter']) B[k] = burdenModAsh(P[k], rock);
  } else {
    B.lifter = burdenLK(P.lifter, rockLK, 1.45, 1.0);
    B.full = burdenLK(P.full, rockLK, 1.45, KS.full);
    B.buffer = burdenLK(P.buffer, rockLK, 1.20, 1.0);
    B.smooth = inp.holmberg.Ek * Dh / inp.holmberg.EB;       // contour: E = Ek·d, E/B
  }
  const prac = b => Math.max(0.05, b - dev);
  const Sp = method === 'chargeRegion' ? KS.smooth * prac(B.smooth) : inp.holmberg.Ek * Dh;   // perimeter spacing (practical)
  S.smooth = Sp; S.lifter = KS.lifter * prac(B.lifter); S.full = KS.full * B.full - dev; S.buffer = KS.buffer * prac(B.buffer);

  // region offsets (from design contour, positive inward)
  let bufOff = null, fullOff;
  if (method === 'holmberg') fullOff = prac(B.smooth) - LD;
  else if (method === 'bufferRow') { bufOff = Rd.buffer; fullOff = bufOff + prac(B.buffer); }
  else { bufOff = prac(B.smooth) - LD; fullOff = bufOff + prac(B.buffer); }

  /* lifters on the lookout floor */
  const lookP = offsetPoly(G, -LD), lb = polyBounds(lookP), yFloor = lb.ymin;
  const Bl = prac(B.lifter), band = G.shape === 'custom' ? Math.min(0.15, 0.3 * Bl) : 1e-6;   // surveyed floors are uneven
  const fsp = rowSpan(G, -LD, yFloor + band);
  const nl = Math.max(1, Math.ceil((fsp[1] - fsp[0]) / S.lifter - 1e-9));
  for (let i = 0; i <= nl; i++) add(fsp[0] + (fsp[1] - fsp[0]) * i / nl, yFloor, 'lifter', 'lifter', i === 0 ? -LD : i === nl ? LD : 0, -LD, { grp: i === 0 || i === nl ? 'corner' : 'lifter' });

  /* perimeter on the lookout contour: ribs (from the abutment down, DRIFT rule) and back (abutment to abutment) */
  const pc = upperChain(lookP, yFloor + band), rs = splitRibs(pc), cum = rs.cum;
  const nb0 = Math.max(1, Math.ceil((rs.sR - rs.sL) / Sp - 1e-9));
  for (let i = 0; i <= nb0; i++) {
    const sPos = rs.sL + (rs.sR - rs.sL) * i / nb0, [x, y, nx, ny] = chainAt(pc, cum, sPos, i === nb0 ? -1 : 1);
    if (y < yFloor + 0.3 * Sp && (i === 0 || i === nb0)) continue;           // no rib: back ends sit on the corner lifters
    add(x, y, 'perim', 'smooth', nx * LD, ny * LD, { grp: 'back' });
  }
  let nr = 0, sr = 0;
  for (const [Lr, from, dir] of [[rs.sL, rs.sL, -1], [rs.L - rs.sR, rs.sR, 1]]) {
    if (Lr < 1e-6) continue;
    const n = Math.max(1, Math.ceil(Lr / Sp - 1e-9)), st = Lr / n; nr = n; sr = st;
    for (let k = 1; k < n - 1; k++) { const [x, y, nx, ny] = chainAt(pc, cum, from + dir * k * st, dir); add(x, y, 'perim', 'smooth', nx * LD, ny * LD, { grp: 'rib' }); }
  }

  /* buffer row (Buffer Row / Charge Region) along back and ribs */
  if (bufOff !== null && bufOff > 0.02) {
    const yb = yFloor + Bl;
    const bp = backPath(G, bufOff, yb);
    const bs = method === 'bufferRow' ? inp.bufferRow.overlap * 2 * Rd.buffer : S.buffer;
    const nb = Math.max(2, Math.ceil(polyLen(bp) / bs));
    for (const [x, y] of pointsAlong(bp, nb)) add(x, y, 'buffer', 'buffer', 0, 0, { grp: 'buffer' });
  }

  /* cut + stoping inside the full-charge region */
  const cut = holmbergCut(inp, P, rock, dev);
  const Bs = prac(B.full);
  const fullP = offsetPoly(G, fullOff);
  if (!fullP) throw new Error('drift too small for the perimeter burden');
  const yTopF = topAt(G, fullOff, G.crown[0]);
  const spanAt = y => rowSpan(G, fullOff, y) || [0, 0];
  let side = cut.W, sp0 = spanAt(yFloor + Bs + side / 2);
  while (cut.quads.length > 2 && side > (sp0[1] - sp0[0]) - 0.5 * Bs) { cut.quads.pop(); side = cut.quads[cut.quads.length - 1].HD; sp0 = spanAt(yFloor + Bs + side / 2); }
  cut.W = side;
  // Stope B: equal horizontal burdens between the cut and the ribs of the full region
  const free = Math.max(0, (sp0[1] - sp0[0]) - side);
  const nB = free > 0.3 * Bs ? Math.ceil(free / Bs - 1e-9) : 0;
  const Badj = nB ? free / nB : Bs;
  let nL = Math.floor(nB / 2), nR = nB - nL;
  let cx;
  if (inp.cut.xAuto) cx = sp0[0] + nL * Badj + side / 2;
  else { cx = inp.cut.x; nL = Math.max(0, Math.round((cx - side / 2 - sp0[0]) / Bs)); nR = Math.max(0, Math.round((sp0[1] - cx - side / 2) / Bs)); }
  const cy = inp.cut.yAuto ? yFloor + Badj + dev + side / 2 : inp.cut.y;
  if (L > cut.Hmax + 1e-6) warn.push({ k: 'warnPull', v: [cut.Hmax.toFixed(2), L.toFixed(2)] });
  for (let i = 0; i < dr.nEmpty; i++) {
    if (dr.nEmpty === 1) { add(cx, cy, 'empty', 'none'); break; }
    const a = PI / 2 + 2 * PI * i / dr.nEmpty, r = dr.emptyD * (dr.nEmpty === 2 ? 0.55 : 0.7);
    add(cx + r * Math.cos(a), cy + r * Math.sin(a), 'empty', 'none');
  }
  let t = 0;                                                 // DRIFT timing: opposite pairs per interval
  for (const Q of cut.quads) {
    const rad = Q.HD / Math.SQRT2, rot = (Q.n % 2 ? 0 : 45) * PI / 180;
    const pos = [0, 2, 1, 3].map(k => [cx + rad * Math.cos(rot + k * PI / 2), cy + rad * Math.sin(rot + k * PI / 2)]);
    add(pos[0][0], pos[0][1], 'cut' + Q.n, Q.charge, 0, 0, { delay: ++t });
    add(pos[1][0], pos[1][1], 'cut' + Q.n, Q.charge, 0, 0, { delay: t });
    add(pos[2][0], pos[2][1], 'cut' + Q.n, Q.charge, 0, 0, { delay: ++t });
    add(pos[3][0], pos[3][1], 'cut' + Q.n, Q.charge, 0, 0, { delay: t });
  }
  const yB0 = cy - side / 2, yB1 = cy + side / 2;
  const rowsB = [yB0, yB1];
  for (let y = yB0 - Bs; y > yFloor + 0.75 * Bl; y -= Bs) rowsB.unshift(y);
  let BadjL = Bs, BadjR = Bs;
  for (let j = 1; j <= Math.max(nL, nR); j++) {
    for (const y of rowsB) {
      const sp = spanAt(y), wl = cx - side / 2 - sp[0], wr = sp[1] - cx - side / 2;
      const bl = nL ? wl / nL : Bs, br = nR ? wr / nR : Bs; if (y === yB0) { BadjL = bl; BadjR = br; }
      const first = nR >= nL ? 1 : -1;   // the wider side fires first (DRIFT)
      if (j <= nL && wl > 0.3 * Bs) add(cx - side / 2 - j * bl, y, 'stope', 'full', 0, 0, { grp: 'stopeB', delay: t + j + (first === 1 ? 1 : 0) });
      if (j <= nR && wr > 0.3 * Bs) add(cx + side / 2 + j * br, y, 'stope', 'full', 0, 0, { grp: 'stopeB', delay: t + j + (first === -1 ? 1 : 0) });
    }
  }
  t += Math.max(nL, nR) + (nL && nR && nL !== nR ? 0 : (nL && nR ? 1 : 0));
  // Stope C: rows interpolated between the top of Stope B and the back of the full-charge region
  const nC = yTopF - yB1 > 0.3 * Bs ? Math.ceil((yTopF - yB1) / Bs - 1e-9) : 0;
  if (nC) {
    const fc = upperChain(fullP, polyBounds(fullP).ymin + 1e-6), fr = splitRibs(fc);
    const n = Math.max(1, Math.ceil((fr.sR - fr.sL) / S.full - 1e-9)), cols = [];
    for (let i = 0; i <= n; i++) cols.push(chainAt(fc, fr.cum, fr.sL + (fr.sR - fr.sL) * i / n, i === n ? -1 : 1));
    for (let k = 1; k <= nC; k++) for (const [x, ya] of cols) {
      const y = yB1 + (ya - yB1) * k / nC;
      if (y <= yB1 + 0.3 * Bs) continue;
      if (holes.some(h => h.type !== 'empty' && Math.hypot(h.x - x, h.y - y) < 0.35 * Bs)) continue;
      add(x, y, 'stope', 'full', 0, 0, { grp: 'stopeC', delay: t + k });
    }
    t += nC;
  }
  // timing of the contour: ribs, back, lifters, corner lifters (DRIFT order)
  if (bufOff !== null) { t++; for (const h of holes) if (h.type === 'buffer') h.delay = t; }
  t++; for (const h of holes) if (h.grp === 'rib') h.delay = t;
  t++; for (const h of holes) if (h.grp === 'back') h.delay = t;
  t++; for (const h of holes) if (h.grp === 'lifter') h.delay = t;
  t++; for (const h of holes) if (h.grp === 'corner') h.delay = t;
  for (const h of holes) if (h.type === 'empty') h.delay = 0;

  const meta = { Bs, Badj, BadjL, BadjR, nB, nL, nR, nC, Sp, nr, sr, side, yFloor };
  return finish({ inp, G, P, Rd, B, S, holes, cut: { ...cut, cx, cy }, perimB: prac(B.smooth), bufOff, fullOff, dev, warn, meta, stemOf: stem, nDelays: t });
}

/* timing, quantities, perimeter analysis — reused after manual edits */
function finish(D) {
  const { inp, G, P, holes } = D;
  const L = inp.drill.L, Dh = inp.drill.Dh;
  const cx = D.cut.cx, cy = D.cut.cy;
  // Rd per hole
  for (const h of holes) h.rd = h.charge === 'none' ? 0 : D.Rd[h.charge];
  // timing: keep the design delays; holes added by hand get a band by distance from the cut
  const Bs = Math.max(0.1, D.B.full - D.dev), cutR = D.cut.W / Math.SQRT2;
  for (const h of holes) if (h.delay === undefined || h.delay === null) {
    if (h.type === 'empty') { h.delay = 0; continue; }
    const base = { perim: D.nDelays - 2, buffer: D.nDelays - 4, lifter: D.nDelays - 1 }[h.type];
    h.delay = base !== undefined ? base : (D.cut.quads.length * 2) + 1 + Math.floor(Math.max(0, Math.hypot(h.x - cx, h.y - cy) - cutR) / Bs);
  }
  D.nDelays = Math.max(...holes.map(h => h.delay));

  // quantities
  const ex = inp.explosives, stemOf = D.stemOf || (k => inp.stem[k]);
  let kg = 0, MJ = 0, drilled = 0, nCharged = 0, cost = 0;
  const byType = {};
  for (const h of holes) {
    const hl = L;   // DRIFT convention: every hole is drilled to the nominal length
    h.len = hl; drilled += hl;
    const bt = byType[h.type] || (byType[h.type] = { n: 0, kg: 0, m: 0 });
    bt.n++; bt.m += hl;
    if (h.charge === 'none') { h.kg = 0; continue; }
    const cl = Math.max(0, hl - stemOf(h.charge));
    const p = P[h.charge];
    h.chargeLen = cl; h.kg = p.q * cl; h.ncart = ex[h.charge].type === 'cartridge' ? Math.ceil(cl / ex[h.charge].Le) : 0;
    kg += h.kg; MJ += h.kg * p.AWS; nCharged++; bt.kg += h.kg;
    cost += h.kg * (ex[h.charge].price || 0);
  }
  const advance = L * inp.drill.advance / 100;
  const lookArea = OR_lookArea(G, inp.drill.lookout);
  const areaMean = (G.area + lookArea) / 2;
  const vol = areaMean * advance, tonnes = vol * inp.rock.SG;
  const c = inp.cost;
  const costDrill = drilled * c.drillPerM, costDet = nCharged * c.detPerHole, costExp = cost;
  const costRound = costDrill + costDet + costExp + c.fixedPerRound;
  const Q = { kg, MJ, drilled, nHoles: holes.length, nCharged, advance, vol, tonnes, area: G.area, lookArea, areaMean,
    PF: kg / vol, PFt: kg / tonnes, EF: MJ / vol, DF: drilled / vol, holesPerM2: holes.length / G.area, byType,
    costDrill, costDet, costExp, costRound, costPerM: costRound / advance, costPerM3: costRound / vol, costPerT: costRound / tonnes };
  D.Q = Q;
  D.perimeter = perimeterCheck(D);
  return D;
}

// area enclosed by the lookout contour (walls, floor and arch all offset by the lookout)
function OR_lookArea(G, LD) { const p = offsetPoly(G, -LD); return p ? Math.abs(signedArea(p)) : G.area; }
/* Damage penetration beyond the design perimeter and coverage of the design perimeter */
function perimeterCheck(D) {
  const { G, holes } = D;
  const path = backPath(G, 0, G.ymin);
  const pcum = chainCum(path), PL = pcum[pcum.length - 1];
  const samples = []; for (let k = 0; k <= 300; k++) { const sp = PL * k / 300, p = chainAt(path, pcum, sp), a = chainAt(path, pcum, Math.max(0, sp - 0.15)), b = chainAt(path, pcum, Math.min(PL, sp + 0.15)), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; samples.push([p[0], p[1], -dy / l, dx / l]); }
  let covered = 0, maxOver = 0, sumOver = 0, nOver = 0;
  const prof = [];
  const f = D.inp.view ? D.inp.view.plane : 1;   // 0 = collar, 1 = toe (back of round)
  const charged = holes.filter(h => h.rd > 0).map(h => ({ x: h.x - (1 - f) * h.lx, y: h.y - (1 - f) * h.ly, rd: h.rd }));
  for (const [x, y, nx, ny] of samples) {
    let cov = false, over = 0;
    for (const h of charged) {
      const dx = x - h.x, dy = y - h.y, dist = Math.hypot(dx, dy);
      if (dist <= h.rd) cov = true;
      // depth of this hole's damage circle along outward normal at the sample point
      const along = dx * nx + dy * ny; // projection of sample-hole on normal (sign: outward if nx points out)
      const perp2 = dist * dist - along * along;
      if (perp2 < h.rd * h.rd) { const reach = -along + Math.sqrt(h.rd * h.rd - perp2); over = Math.max(over, reach); }
    }
    if (cov) covered++;
    prof.push(Math.max(0, over));
    if (over > 0) { maxOver = Math.max(maxOver, over); sumOver += over; nOver++; }
  }
  return { coverage: covered / samples.length, maxOver, meanOver: nOver ? sumOver / samples.length : 0, prof, samples };
}

/* Rd vs decoupling ratio for all models (comparison chart) */
function modelCurves(inp, exKey) {
  const Dh = inp.drill.Dh, L = Math.max(0.1, inp.drill.L - (inp.stemAuto ? 10 * Dh : inp.stem[exKey]));
  const rock = { ...inp.rock, cb: inp.rock.cb + 0.05 };
  const base = { ...inp.explosives[exKey], type: 'cartridge' };
  const out = {};
  for (const m of MODELS) {
    const pts = [];
    for (let r = 0.2; r <= 1.0001; r += 0.02) {
      const p = explosiveProps({ ...base, De: r * Dh }, Dh);
      pts.push([r, damageRadius(m, p, Dh, rock, L)]);
    }
    out[m] = pts;
  }
  return out;
}

function rdTable(inp, P) { const Dh = inp.drill.Dh, rock = { ...inp.rock, cb: inp.rock.cb + 0.05 }; const out = {};
  for (const m of MODELS) { out[m] = {}; for (const r in P) out[m][r] = damageRadius(m, P[r], Dh, rock, Math.max(0.1, inp.drill.L - (inp.stemAuto ? 10 * Dh : inp.stem[r]))); } return out; }
const api = { rdTable, ANFO, explosiveProps, burdenModAsh, burdenLK, damageRadius, MODELS, etkinPF, etkinCategory, driftGeom,
  contourPts, backPath, design, lookArea: OR_lookArea, CUT_CHARGE, offsetPoly, upperChain, splitRibs, SHAPES, signedArea, finish, perimeterCheck, modelCurves, holmbergCut, ppvSum, ppvIntegral, sherRd, johnsonRd, insideDist };
if (typeof module !== 'undefined') module.exports = api; else root.OR = api;
})(this);
