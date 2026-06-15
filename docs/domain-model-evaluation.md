# Domain Model Evaluation

## Summary

The current project has a useful working domain model for hand-authored parametric plans, but it should be adjusted before it becomes the long-term model for generated designs.

The existing shape is good for rendering and export:

- `result.parts` drives cut lists and purchase estimates.
- `result.assembly.parts` drives the Three.js viewer, OpenSCAD export, and physics diagnostics.
- `result.assembly.connections` expresses contacts and fastener relationships.
- `PLAN_CATALOG` carries plan metadata, defaults, and build steps.
- Build steps can include stages, generated images, animations, and placeholder text.

The main limitation is that plan definitions and calculators are still specialized per family. A generated design loop needs a canonical design package that can be produced outside the browser app and adapted into the current viewer/export model.

## Existing Model Strengths

### Assembly Parts

The current assembly part shape is close to what the long-term system needs:

```js
{
  id,
  role,
  material,
  size: { x, y, z },
  position: { x, y, z },
  rotation: { x, y, z },
  meta
}
```

This is sufficient for:

- 3D viewer geometry
- OpenSCAD export
- overlap checks
- build-stage visibility
- hover metadata
- part traceability

### Connections

The current connection model supports contact and fastened relationships. This is important because long-term validation needs to know which parts merely touch and which parts are actually joined.

### Build Steps

The current build-step model already understands that instructions are not just text. It supports staged visual states, generated stills, animations, and calculated placeholders.

That is directly aligned with interactive parametric plans.

## Current Gaps

### 1. No Canonical Design Package

The app currently calculates plan results directly from UI state. Generated designs need a stable package format:

```text
scenario -> canonical design -> validation -> estimates -> exports
```

### 2. Mixed Product Concepts

The current `result` object mixes:

- calculation output
- cut list
- assembly model
- warnings
- plan-specific fields
- UI-facing convenience values

That is fine for hand-authored plans, but generated designs should separate canonical data from view adapters.

### 3. Specialized Calculators

`frameMath.js` and `shelfMath.js` contain project-family-specific logic. This is practical, but a generator needs a way to introduce new project families without hand-wiring every UI field and calculator branch.

### 4. Materials Are Not First-Class Enough

The current model has material labels and board-foot estimates, but the long-term system needs:

- purchasable stock definitions
- material properties
- cost catalog references
- finish compatibility
- waste assumptions
- tool requirements

### 5. Validation Is Useful But Not Yet General

Existing validation catches overlaps, screw placement, missing contact, weak bite, and some plan-specific constraints. The long-term system needs a validator registry that can run schema, geometry, construction, cost, model-export, and assembly-order checks across generated designs.

## Recommendation

Keep the existing app model as the portal adapter target, but introduce a canonical generated-design model alongside it.

Do not rewrite the viewer first.

Instead:

1. Define canonical design JSON.
2. Write an adapter from canonical design to current `result`/`assembly` shape.
3. Let generated plans use the existing viewer, OpenSCAD, print, and cut-list surfaces.
4. Gradually move hand-authored plans toward the same canonical package format.

## Proposed Canonical Shape

```json
{
  "schema_version": "0.1",
  "design_id": "simple_bird_feeder_001",
  "template_id": "tray_bird_feeder",
  "units": "in",
  "parameters": {},
  "materials": [],
  "parts": [],
  "joints": [],
  "assembly_steps": [],
  "validation": {},
  "estimates": {},
  "exports": {}
}
```

## Adapter Contract

The adapter should produce the current browser-facing result shape:

```js
{
  type,
  ok,
  warnings,
  parts,
  assembly,
  buildSteps,
  estimates
}
```

This keeps the current UI useful while making room for a generator written in JavaScript, Python, C#, or another service platform.

