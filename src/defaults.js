/* Default project = the "Manual Blast Design Example" of NIOSH DRIFT 2.0 (Holmberg, Modified Ash energy),
   so that every number can be checked against the DRIFT report. */
const DEFAULT_INPUT = {
  project: { name: 'Manual Blast Design Example', comment: '6.0 × 5.0 m arched drift, string emulsion' },
  method: 'holmberg', damageModel: 'ashE',
  geom: { shape: 'arched', W: 6.0, Hw: 4.0, ha: 1.0, H: 5.0, r: 1.0, k: 2.0, points: null, importName: '' },
  drill: { Dh: 0.048, emptyD: 0.104, nEmpty: 2, L: 4.0, lookout: 0.21, collarDev: 0.02, angDev: 0.01, advance: 95 },
  rock: { SG: 2.65, cb: 0.40, lkF: 1.0, lkKS: 1.0, UCS: 220, UTS: 18, c: 30, phi: 42, E: 60000, nu: 0.25, stress: 0,
          K: 0.7, alpha: 0.7, beta: 1.4, dz: 0.1, ppvCrit: 1.0, ba: 1.2, johnsonExp: 1.5,
          rockClass: 'II', jointSpacing: 0.75, jointWidth: 1.5, etkinZone: 'deep' },
  explosives: {
    smooth: { name: 'Emulsion A – string 24 mm', type: 'string', SG: 1.0, RWS: 0.88, VOD: 5.3, De: 0.024, Le: 0.4, coreLoad: 40, price: 2.5 },
    buffer: { name: 'Emulsion A – string 34 mm', type: 'string', SG: 1.0, RWS: 0.88, VOD: 5.3, De: 0.034, Le: 0.4, coreLoad: 40, price: 2.5 },
    full:   { name: 'Emulsion A – string 48 mm', type: 'string', SG: 1.0, RWS: 0.88, VOD: 5.3, De: 0.048, Le: 0.4, coreLoad: 40, price: 2.5 },
    lifter: { name: 'Emulsion A – string 48 mm', type: 'string', SG: 1.0, RWS: 0.88, VOD: 5.3, De: 0.048, Le: 0.4, coreLoad: 40, price: 2.5 }
  },
  stemAuto: true,
  stem: { full: 0.48, buffer: 0.48, smooth: 0.48, lifter: 0.48 },
  ks: { lifter: 1.0, full: 1.25, buffer: 1.0, smooth: 1.5 },
  holmberg: { Ek: 15, EB: 0.8 },
  bufferRow: { overlap: 0.75 },
  cut: { xAuto: true, x: 0, yAuto: true, y: 1.6, q1k: 1.545, outerScale: 1.0 },
  cost: { currency: 'USD', drillPerM: 1.5, detPerHole: 4.0, fixedPerRound: 0 },
  view: { plane: 1, showDamage: true, showDelays: true, showIds: false, showContours: true, showCollars: true }
};
if (typeof module !== 'undefined') module.exports = DEFAULT_INPUT;
