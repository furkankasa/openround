# Validation against NIOSH DRIFT 2.0

Reference: the *Manual Blast Design Example* report printed by DRIFT 2.0 ([fixture](../tests/fixtures/drift_manual_example_report.txt)).
- Section: 6.0 × 5.0 m arched drift (4.0 m walls, 1.0 m arch).
- Drilling: Ø48 mm holes, 4.0 m long, two Ø104 mm empty holes.
- Explosive: string emulsion at 24, 34 and 48 mm.
- Rock and models: rock constant 0.40, Holmberg design, Modified Ash energy damage model.

`npm test` checks every row below.

| Quantity | OpenRound | DRIFT 2.0 | |
|---|---|---|---|
| Rd smoothwall / buffer / full | 0.3108 / 0.4403 / 0.6216 m | 0.3108 / 0.4403 / 0.6216 m | ✓ |
| Bmax smooth / buffer / full / lifter | 0.9000 / 1.0947 / 1.2575 / 1.4060 m | same | ✓ |
| Cut Bmax Q1–Q4 | 0.2272 / 0.2211 / 0.4463 / 0.6898 m | 0.2272 / 0.2210 / 0.4463 / 0.6897 m | ✓ |
| Cut hole distance Q1–Q4 | 0.2365 / 0.3950 / 0.8257 / 1.4745 m | 0.2365 / 0.3949 / 0.8255 / 1.4743 m | ✓ |
| Cut centre | −0.54, 1.68 m | −0.54, 1.67 m | ✓ |
| Back / ribs / lifters / Stope B / Stope C | 11 / 8 / 6 / 6 / 10 | 11 / 8 / 6 / 6 / 10 | ✓ |
| Holes, drilled length | 59, 236 m | 59, 236 m | ✓ |
| Holes per delay (16 intervals) | 2,2,2,2,2,2,2,2,2,4,5,5,8,11,4,2 | same | ✓ |
| Rib hole heights | 3.39, 2.67, 1.95, 1.23 m | 3.37, 2.64, 1.91, 1.18 m | ≈ 5 cm |
| Face area | **28.09 m²** | 44.18 m² | DRIFT error |
| Total charge | **240.50 kg** | 304.19 kg | DRIFT error |
| Powder factor | **2.09 kg/m³** | 1.69 kg/m³ | follows from the errors above |

## Errors found in DRIFT 2.0
1. **Face area.** A 6.0 m wide drift with 4.0 m walls and a 1.0 m circular arch (R = 5 m) has an area of 24.00 + 4.09 = 28.09 m². DRIFT reports 44.175 m², which equals 24 + 16.09 (circular sector) + 4.09 (circular segment): the arch is counted twice. The lookout area (50.56 m²) has the same error. Volume, tonnage and all factors per m³ and per tonne inherit it.
2. **Stope C charge.** The charge totals list 20 Stope C holes and 127.39 kg, but only 10 are drilled: the hole count is 59, the drilled length is 236 m, and the timing table has 16 stoping holes in total. The true total charge is 240.50 kg.
3. **Coupling-ratio table.** The Johnson and Sher columns are identical to the Holmberg–Persson sum column. The unit of angular deviation is printed as "mm" instead of m/m.

## Remaining differences
- Holmberg–Persson: DRIFT's radii are about 2.2 times smaller than the published integral formula gives, at every coupling ratio. The DRIFT variant is not documented, so OpenRound keeps the published formula.
- Q5 (not drilled): DRIFT reports Bmax 1.2466 m, OpenRound 0.945 m.
- Rib hole spacing: 0.719 m against 0.73 m.
