# Existing Portal Integration

## Project

Existing project:

```text
D:\GH\woodworking-plans
```

This project already implements much of the interactive portal path.

Observed capabilities:

- No-build browser app
- Plan catalog
- Interactive dimension controls
- Three.js 3D builder
- Build-stage slider
- Visibility toggles
- Camera presets
- Cut lists
- CSV export
- Clipboard copy
- Printable plan output
- Share links encoded in the URL
- OpenSCAD export
- Rapier-based physics diagnostic loaded from CDN

Relevant files:

- `src/plans.js`: hand-authored plan catalog and defaults
- `src/shelfMath.js`: shelf calculators and warnings
- `src/frameMath.js`: frame calculators and warnings
- `src/assembly.js`: assembly helpers and overlap validation
- `src/viewer3d.js`: Three.js viewer
- `src/openScad.js`: OpenSCAD generation
- `src/physicsSim.js`: physics diagnostic
- `src/app.js`: UI wiring, exports, state, and tabs

## Current Strength

The portal already has the right presentation ingredients:

- Users can interact with parameterized plans.
- Assemblies can feed visualization.
- OpenSCAD can be generated from assembly-backed plans.
- Some physics and overlap checks already exist.
- Build stages are part of the user experience.

## Current Gap

The project lacks a generalized way to generate new design families.

Today, plans appear to be hand-authored through plan definitions and specialized calculators. That is useful for curated plans, but it limits the local-model loop because the model needs a structured way to propose or modify designs without requiring a human to write a new calculator each time.

## Integration Goal

Use `woodworking-plans` as the interactive portal front end, but add a generated-design backend or library layer.

The portal should eventually consume canonical design packages:

```text
scenario.json
design.json
validation.json
cost-time.json
model.scad
plan.md
```

## Proposed Adapter Layer

Add an adapter that converts canonical design JSON into the portal's existing assembly shape.

Responsibilities:

- Convert canonical parts to viewer parts.
- Convert canonical joints/connections to assembly connections.
- Convert assembly steps to build-stage data.
- Convert validation warnings to portal warning panels.
- Feed OpenSCAD export from canonical data.
- Preserve part IDs across viewer, cut list, instructions, and exports.

## Migration Strategy

1. Keep existing hand-authored plans working.
2. Add support for loading a generated design package.
3. Implement canonical-to-assembly adapter.
4. Render generated designs in the existing Three.js viewer.
5. Generate OpenSCAD from canonical design data.
6. Add portal parameter controls generated from the template schema.
7. Let the portal export static plan packets from the current state.

## Why This Matters

The existing portal is the right place for the interactive user experience. The new planning system should not replace it prematurely.

Instead, the new generator should make the portal more powerful by letting it display and manipulate designs that were created by the Codex/local-model/simulator loop.

