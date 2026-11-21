# Changelog

## 1.1.0 — 2026-11-21
- Section shapes: arched, flat back, rounded rectangle, horseshoe, with sliders for arch rise, corner radius and wall radius.
- Import of surveyed profiles from DXF (2D and 3D polylines, lines, arcs, splines) and CSV/TXT. Millimetre coordinates are detected, 3D sections are projected to their vertical plane, and noisy scans are handled.
- New geometry engine on polygon offsets (Clipper); the DRIFT validation is unchanged.

## 1.0.0 — 2026-11-21
- Holmberg, Buffer Row and Charge Region designs and eight damage models, validated against NIOSH DRIFT 2.0.
- CAD-like drawing sheet: dimensions, spacings, Detail A of the cut, title block, ruler with snapping, hover information.
- Perimeter coverage and over-break check, model comparison, costs.
- CSV, DXF, JSON and PDF/HTML exports. English, Turkish and Russian interface. Light and dark themes. Windows desktop app.
