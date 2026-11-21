import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const OR = require('../src/engine.js');
const DEF = require('../src/defaults.js');
const cases = [
  ['flat', { W: 5, H: 4.5 }, 22.5], ['rounded', { W: 6, H: 5, r: 1.2 }, 30 - 2 * 1.44 * (1 - Math.PI / 4)],
  ['horseshoe', { W: 6, H: 5.5, k: 2 }, null], ['arched', { W: 8, Hw: 5, ha: 2 }, null]
];
for (const [shape, g, area] of cases) for (const method of ['holmberg', 'bufferRow', 'chargeRegion']) {
  test(`${shape} ${JSON.stringify(g)} — ${method}`, () => {
    const inp = structuredClone(DEF); inp.method = method; Object.assign(inp.geom, { shape, ...g });
    const D = OR.design(inp);
    if (area) assert.ok(Math.abs(D.G.area - area) < 0.01, `area ${D.G.area} vs ${area}`);
    assert.ok(D.Q.nHoles > 20 && D.Q.nHoles < 200, 'hole count ' + D.Q.nHoles);
    for (const h of D.holes) if (h.type !== 'lifter' && h.type !== 'perim') assert.ok(OR.insideDist(D.G, h.x, h.y) > 0, `hole #${h.id} (${h.type}) lies outside the section`);
    assert.ok(D.Q.PF > 0.8 && D.Q.PF < 5, 'powder factor ' + D.Q.PF);
  });
}
