# Methods

All quantities are in SI units: m, kg, MPa, and km/s for VOD. Explosive strength is relative to ANFO (SG 0.82, AWS 3.82 MJ/kg).

## Geometry
Every section is a closed polygon. Offsets (lookout contour, buffer row, full-charge region) are computed with Clipper using mitred corners, so straight walls and circular arches offset exactly.
- **Ribs** are the near-vertical runs of the contour (within 30° of vertical over a 0.3 m chord) that start at the floor. The rest of the contour is the **back**.
- **Lookout** is the perimeter hole toe offset at the back of the round. Perimeter, rib and lifter holes are drilled to the nominal length.
- **Imported profiles**:
  - Simplified to 10 mm (Douglas–Peucker).
  - Floor moved to 0 and floor centre to x = 0. Coordinates above 60 units are read as millimetres.
  - 3D sections are projected onto their vertical plane (principal horizontal direction, elevation).

## Burdens and spacings (Holmberg)
- Langefors–Kihlström: `B = 0.9 · 25 · De · √[0.4π · (2.65/SGr) · SGe · RWS / (c̄ · f · S/B)]` with `c̄ = c + 0.05`.
  - Lifters: f = 1.45, S/B = 1.
  - Stoping: f = 1.45, S/B = 1.25.
  - Buffer: f = 1.20, S/B = 1.
- Contour: `E = 15 · d`, `B = E / 0.8`.
- Practical burden: `B − F`, where `F = collaring error + angular deviation × hole length`.

## Cut (DRIFT implementation of the Holmberg cut)
- `φ = de · √n` (equivalent empty-hole diameter), drillable depth `H = 0.15 + 34.1φ − 39.4φ²`.
- Q1: `Bmax = 1.545 · φ` (DRIFT calibration of 1.5φ).
- Qi: `W = HD(i−1) − √2·F`, `Bmax = 0.088 · √(W · q · s / (d · c))` with the uncorrected rock constant c and s = RWS. Then `B = Bmax − F` and `HD(i) = √2 · (B + HD(i−1)/2)`.
- Charges: Q1 uses the smoothwall charge, Q2 the buffer charge, Q3 and Q4 the full charge.

## Stoping layout
- **Stope B:** equal horizontal burdens between the cut and the ribs of the full-charge region. The integer number of columns sets the horizontal position of the cut. Rows sit at the bottom and top edges of the cut.
- **Stope C:** columns along the back of the full-charge region, spaced at `S/B · B − F`. Rows are interpolated between the top of Stope B and the back.
- **Timing:** opposite cut holes in pairs, then Stope B (wider side first), Stope C rows, ribs, back, lifters and corner lifters.

## Damage models (practical damage radius Rd)
- Modified Ash, energy: `Rd = 12.5 · De · √(RBS · 2.65/SGr)`. Pressure variant: × De/Dh under the root.
- Langefors–Kihlström: `Rd = 0.9 · 12.5 · De · √(0.4π · SGe · RWS / (c̄ · f · S/B))`.
- Etkin: c is replaced by the powder factor from the cracking-resistance tables. Ammonite values are converted to ANFO energy with 4.3/3.82. The class 5 "deep" average in the source table repeats class 4, so the range midpoint 0.6 kg/m³ is used.
- Holmberg–Persson PPV:
  - integral `K [q ∫dz / R^(β/α)]^α`
  - sum `2Kq^α Δz^α Σ R^−β`, whose result depends on Δz.
- Johnson: `σc = Pw √(rh/Rd) e^(−b·Rd)`, `Pw = Pe (De/Dh)^n`, `Pe = ρ VOD²/8`.
- Sher: quasi-static crushed zone with Jones–Miller gas expansion.

## Quantities
- Volume = mean of design and lookout areas × advance.
- Powder, drilling and energy factors per m³ and per tonne.
- Cost = drilling + explosives + initiation + fixed cost per round.

## Perimeter check
At the chosen section plane (collar → toe), the design contour is sampled at 300 points. For each point the tool records whether a damage circle covers it, and how deep the damage reaches beyond it along the outward normal (taken over a ±0.15 m chord).

## References
- NIOSH [2019]. A blast design technique to reduce risk of injury from ground falls (DRIFT). Kuchta M, Iverson S, Hustrulid W. DHHS (NIOSH) Pub. No. 2019-129. doi:10.26616/NIOSHPUB2019129
- Persson P-A, Holmberg R, Lee J [1994]. Rock blasting and explosives engineering. CRC Press.
- Iverson SR, Hustrulid WA, Johnson JC [2013]. A new perimeter control blast design concept for underground metal/nonmetal drifting applications. NIOSH RI 9691.
- Holmberg R, Persson P-A [1978]. The Swedish approach to contour blasting. ISEE.
- Etkin MB et al. [2001]. Protecting external rock bodies from blasting damage. Hydrotechnical Construction 35(9).
- Sher EN, Aleksandrova NI [2007]. Effect of borehole charge structure on the parameters of a failure zone in rocks under blasting. J Mining Science 43(4).
- Johnson JC [2010]. The Hustrulid bar — a dynamic strength test and its application to the cautious blasting of rock. PhD thesis, University of Utah.
