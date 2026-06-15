# Parametric Build Lab Planning Docs

This folder defines a complete loop for a local, CUDA-assisted design system:

1. Codex builds and evolves the software environment.
2. A locally hosted model proposes designs and construction strategies.
3. A deterministic simulator and rules engine evaluate those designs.
4. Successful patterns are saved as reusable parametric templates.
5. The system generates human-buildable plans with 3D models, diagrams, materials, cost, and time estimates.

The intended product is not a one-off physics toy. It is a path toward a library of parametric, verified, buildable plans similar in usefulness to high-quality blueprint products, but customizable by end-user dimensions and constraints.

## Documents

- [Vision](./vision.md): product goal, users, and success criteria.
- [Product Paths](./product-paths.md): static plan packets vs an interactive parametric portal.
- [System Architecture](./system-architecture.md): major components and responsibilities.
- [Agent Loop](./agent-loop.md): how Codex, the local model, and simulator cooperate.
- [Design Domain Model](./design-domain-model.md): objects, materials, joins, constraints, and plan primitives.
- [Simulation And Validation](./simulation-and-validation.md): physics, structural checks, scoring, and failure modes.
- [Blueprint Output](./blueprint-output.md): diagrams, instructions, cut lists, exports, and builder-facing artifacts.
- [3D Model Export](./3d-model-export.md): OpenSCAD-centered model generation for verification and plan artifacts.
- [Cost And Time Estimation](./cost-and-time-estimation.md): bill of materials, price catalogs, labor estimates, and uncertainty ranges.
- [Roadmap](./roadmap.md): prototype phases and milestones.
- [MVP Backlog](./mvp-backlog.md): concrete first implementation tasks and acceptance criteria.
- [Existing Portal Integration](./existing-portal-integration.md): how `D:\GH\woodworking-plans` can serve as the interactive portal foundation.

## First Prototype Target

Start with a constrained but useful object class:

- Adjustable shelving unit
- Rectangular planter box
- Workbench
- Storage cart

The recommended first target is an adjustable shelving unit because it has meaningful structural constraints, clear parametric dimensions, simple geometry, understandable assembly steps, and obvious material/cost estimation.

## Guiding Principle

The local model explores inside the current universe. Codex changes the universe by adding better tools, APIs, validators, rendering, estimators, 3D export paths, and verification checks.
