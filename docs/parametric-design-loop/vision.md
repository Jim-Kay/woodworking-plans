# Vision

## Product Concept

Build a system that generates customizable, human-buildable plans for physical objects.

The user specifies dimensions, material preferences, available tools, skill level, target cost, and desired strength or aesthetic constraints. The system generates a validated design with:

- Completed renderings
- A generated 3D model in a well-known format such as OpenSCAD
- Exploded assembly diagrams
- Step-by-step construction instructions
- Cut lists
- Bill of materials
- Materials cost estimate
- Active and elapsed assembly time estimates
- Tool requirements
- Stability and structural validation notes

## Why Parametric Plans Matter

Many digital blueprints sold online are fixed-size. A customer can buy a plan for a 48-inch bench or a 72-inch shelf, but customization often requires manual redesign.

Parametric plans are more useful because the end user can ask for:

- A shelf that fits a specific wall opening
- A planter sized for a patio
- A bench that matches a table height
- A cart sized around existing storage bins
- A stronger version for heavier loads
- A cheaper version using locally available materials

The system should not merely scale geometry. It should adapt the design so the result remains buildable, stable, affordable, and easy to assemble.

## Core Loop

1. The local model proposes a design or design revision.
2. The simulator and validation engine test it.
3. The local model iterates many times cheaply.
4. Successful designs become reusable patterns.
5. Codex adds new capabilities when the local loop needs better mechanics, tools, validators, or outputs.

## Success Criteria

A generated plan is successful when:

- The design fits the requested dimensions and constraints.
- The structure is stable under expected gravity, load, wind, and vibration conditions.
- The material choices are available in standard purchasable forms.
- The assembly order is realistic for the intended builder.
- The instructions and diagrams are clear enough for a human to build from.
- The generated 3D model visually matches the design data and can be used for inspection.
- The cost and time estimates are honest ranges rather than false precision.
- The design can be regenerated at different dimensions without hand-editing the plan.

## Non-Goals For Early Versions

- Full engineering certification
- Building code compliance
- Complex joinery optimization
- Photorealistic rendering
- Live retailer price scraping
- Training a large model from scratch

The early system should be useful, transparent, and conservative.

## Product Paths

There are two viable product paths:

- Static plan packets: generated files that someone can download, print, and follow.
- Interactive portal: a web experience where users adjust parameters, inspect 3D models, view build stages, and export the final plan.

These paths should share the same canonical design data. A static plan and an interactive portal view should be two presentations of the same validated design, not two separate implementations.

The existing `D:\GH\woodworking-plans` project is a strong candidate foundation for the interactive portal path because it already includes plan selection, interactive dimensions, Three.js viewing, build-stage controls, cut lists, OpenSCAD export, printable output, and first-pass physics diagnostics.
