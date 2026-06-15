# 3D Model Export

## Purpose

The system should produce a 3D model artifact for every generated design.

This artifact serves two audiences:

- Builders who want to inspect the object before building.
- The system itself, which can use rendered models for visual verification and regression checks.

## Recommended Early Format: OpenSCAD

OpenSCAD is a good first export target because it is:

- Text-based
- Parametric
- Diffable
- Widely used by maker communities
- Easy to generate programmatically
- Suitable for visual inspection
- Convertible to mesh formats such as STL

OpenSCAD should not replace the canonical design JSON. It should be generated from it.

## Export Principles

- The design JSON remains the source of truth.
- The OpenSCAD file is an artifact, not an independent model.
- Every physical part should map to a visible model primitive.
- Part IDs should appear in comments or labels.
- Units should be explicit.
- Optional exploded-view transforms should be deterministic.

## Model Modes

### Assembled Mode

Shows the object in build position.

Uses:

- Visual inspection
- Rendered thumbnails
- Stability sanity checks
- Plan overview images

### Exploded Mode

Separates parts or subassemblies.

Uses:

- Assembly diagrams
- Part identification
- Debugging missing or overlapping components

### Step Mode

Highlights parts involved in a specific assembly step.

Uses:

- Per-step diagrams
- Instruction verification

## Minimal OpenSCAD Structure

```scad
// Generated from design_id: shelf_001
// Units: inches

module board(id, size, pos, rot=[0,0,0]) {
  // id is preserved in comments for traceability.
  translate(pos)
    rotate(rot)
      cube(size, center=false);
}

// part_id: left_front_leg
board("left_front_leg", [1.5, 1.5, 72], [0, 0, 0]);

// part_id: shelf_1
board("shelf_1", [48, 18, 0.75], [0, 0, 12]);
```

## Validation Checks

Automated checks should confirm:

- The exporter generated a file.
- The file contains every expected part ID.
- Dimensions in the file match design JSON values.
- OpenSCAD can parse the file when installed.
- A rendered preview is nonblank when rendering is available.

## Later Formats

After OpenSCAD support is stable, add:

- STL for mesh export
- GLTF for web previews
- STEP for CAD interchange
- DXF/SVG for cut layouts

## Relationship To Diagrams

The 3D model should become an input to diagram generation:

- Finished render
- Exploded view
- Step highlights
- Part callouts
- Thumbnail images

This helps keep diagrams consistent with the design JSON, cut list, and assembly steps.

