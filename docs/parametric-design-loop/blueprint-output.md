# Blueprint Output

## Goal

Convert validated parametric designs into plans a real person can build.

A plan should be clear enough to sell or share as a high-quality digital blueprint.

## Required Outputs

### 1. Finished Design Render

Shows the completed object from one or more useful angles.

### 2. 3D Model Artifact

Includes an inspectable generated model, preferably OpenSCAD for early versions because it is text-based, parametric, diffable, and widely understood by maker communities.

The model should be generated from canonical design data rather than hand-authored separately.

### 3. Dimensioned Views

Include front, side, top, and key detail views with measurements.

### 4. Exploded View

Shows how major parts and subassemblies relate.

### 5. Cut List

Lists every part to cut:

- Part ID
- Quantity
- Material
- Final dimensions
- Source stock
- Notes

### 6. Cut Layout

Shows how parts fit on boards or sheet goods.

### 7. Bill Of Materials

Lists purchasable materials and hardware:

- Lumber
- Sheet goods
- Screws
- Glue
- Brackets
- Finish
- Consumables

### 8. Tools Required

Separate required from helpful:

- Required: saw, drill, tape measure
- Helpful: clamps, square, countersink bit, sander

### 9. Step-By-Step Assembly Instructions

Each step should include:

- Action
- Parts involved
- Tools involved
- Fasteners or adhesive involved
- Diagram reference
- Safety or alignment notes

### 10. Validation Summary

Include practical validation notes:

- Rated load assumptions
- Stability warning
- Material substitutions
- Build difficulty
- Estimated cost
- Estimated time

## Diagram Requirements

Diagrams should prioritize clarity over beauty:

- Consistent part labels
- Clear callouts
- Stable camera angles
- Exploded spacing
- Highlight current step parts
- Avoid visual clutter
- Use repeated view conventions

## Export Formats

Early exports:

- Markdown
- HTML
- JSON design package
- OpenSCAD `.scad` model
- PNG diagrams

Later exports:

- PDF plan packet
- DXF/SVG cut diagrams
- STL, STEP, or GLTF model
- ZIP bundle for marketplace delivery

## Plan Packet Structure

```text
project-name/
  design.json
  model.scad
  plan.md
  plan.html
  diagrams/
    finished-view.png
    exploded-view.png
    step-001.png
    step-002.png
    cut-layout-sheet-1.png
  exports/
    plan.pdf
```

## Quality Checklist

Before releasing a generated plan:

- All parts in instructions appear in the cut list.
- All cut list parts appear in diagrams.
- All fasteners in instructions appear in the bill of materials.
- Dimensions are consistent across views.
- The 3D model can be rendered and visually matches the part list.
- Assembly steps are possible in order.
- The builder can identify every part by label.
- Cost and time estimates are shown as ranges.
