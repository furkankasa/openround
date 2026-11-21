// Reproduces the "Manual Blast Design Example" report of NIOSH DRIFT 2.0 (tests/fixtures/drift_manual_example_report.txt).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const OR = require('../src/engine.js');
const DEFAULT_INPUT = require('../src/defaults.js');
const D = OR.design(structuredClone(DEFAULT_INPUT));
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (±${tol})`);

test('damage radius, Modified Ash energy (DRIFT: 0.3108 / 0.4403 / 0.6216 m)', () => {
  near(D.Rd.smooth, 0.3108, 5e-4, 'smooth'); near(D.Rd.buffer, 0.4403, 5e-4, 'buffer'); near(D.Rd.full, 0.6216, 5e-4, 'full');
});
test('maximum burdens (DRIFT: 0.9000 / 1.0947 / 1.2575 / 1.4060 m)', () => {
  near(D.B.smooth, 0.9, 5e-4, 'smooth'); near(D.B.buffer, 1.0947, 5e-4, 'buffer'); near(D.B.full, 1.2575, 5e-4, 'full'); near(D.B.lifter, 1.406, 5e-4, 'lifter');
});
test('cut chain Q1–Q4 maximum burden and hole distance', () => {
  const bmax = [0.2272, 0.2210, 0.4463, 0.6897], hd = [0.2365, 0.3949, 0.8255, 1.4743];
  D.cut.quads.forEach((q, i) => { near(q.Bmax, bmax[i], 5e-4, 'Bmax Q' + q.n); near(q.HD, hd[i], 5e-4, 'HD Q' + q.n); });
});
test('cut centre (DRIFT: -0.54, 1.67)', () => { near(D.cut.cx, -0.54, 0.01, 'x'); near(D.cut.cy, 1.67, 0.015, 'y'); });
test('hole counts per section (DRIFT: 59 holes, 236 m drilled)', () => {
  const g = k => D.holes.filter(h => (h.grp || h.type) === k).length;
  assert.deepEqual([g('back'), g('rib'), g('lifter') + g('corner'), g('stopeB'), g('stopeC')], [11, 8, 6, 6, 10]);
  assert.equal(D.Q.nHoles, 59); near(D.Q.drilled, 236, 1e-9, 'drilled');
});
test('timing intervals (DRIFT: 2,2,2,2,2,2,2,2,2,4,5,5,8,11,4,2)', () => {
  const by = {}; for (const h of D.holes) if (h.type !== 'empty') by[h.delay] = (by[h.delay] || 0) + 1;
  assert.deepEqual(Object.keys(by).sort((a, b) => a - b).map(k => by[k]), [2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 5, 5, 8, 11, 4, 2]);
});
test('correct face area and charge (DRIFT report overstates both)', () => {
  near(D.G.area, 28.088, 2e-3, 'area');          // DRIFT prints 44.175 m² (sector + segment counted twice)
  near(D.Q.kg, 240.50, 0.02, 'charge');          // DRIFT prints 304.19 kg (Stope C counted twice)
});
