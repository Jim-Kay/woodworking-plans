# Roadmap

## Phase 0: Foundations

Goals:

- Define design JSON schema.
- Define material catalog schema.
- Define validator result schema.
- Build a simple command-line runner.
- Generate one static shelving design from parameters.

Deliverables:

- `design.json`
- `materials.json`
- `validate` command
- `estimate-cost` command
- `estimate-time` command

## Phase 1: First Parametric Template

Recommended target: adjustable shelving unit.

Features:

- User dimensions: width, height, depth, shelf count
- Material profiles: budget, standard, heavy-duty
- Part generator
- Cut list generator
- Basic construction rule checks
- Cost and time estimates
- Markdown plan output

Exit criteria:

- Generate valid shelf plans for several dimensions.
- Reject or warn on excessive shelf spans.
- Produce a complete bill of materials.
- Produce beginner-friendly assembly steps.

## Phase 2: Visualization

Features:

- 3D preview
- OpenSCAD model export
- Finished render
- Exploded view
- Step diagrams
- Cut layout diagrams

Exit criteria:

- The system emits a `.scad` model from canonical design data.
- The `.scad` model renders successfully in automated checks.
- Every assembly step has a diagram.
- All parts are labeled consistently.
- HTML plan output is readable and printable.

## Phase 3: Simulation

Features:

- Gravity stability
- Load scenarios
- Lateral force scenarios
- Vibration perturbation
- Failure mode reporting

Exit criteria:

- Designs receive structural and stability scores.
- Failed designs produce actionable repair suggestions.
- Batch trials can compare parameter variants.

## Phase 4: Local Model Operator

Features:

- Local LLM inference setup
- Structured tool interface
- Experiment loop
- Candidate design generation
- Feedback-based repair attempts
- Experiment store

Exit criteria:

- Local model can improve designs over repeated trials.
- Failures are logged and summarized.
- Successful candidates are saved to the pattern library.

## Phase 5: Codex Escalation Loop

Features:

- Capability request schema
- Automatic issue/task generation
- Codex-readable experiment summaries
- Regression test scenarios for new primitives

Exit criteria:

- Local model can identify missing tools.
- Codex can add a capability and rerun the failing experiments.
- Newly added capabilities become reusable.

## Phase 6: Plan Productization

Features:

- PDF export
- OpenSCAD and mesh artifacts in final plan bundle
- Marketplace-style ZIP packages
- Interactive portal publishing
- Shareable parametric plan URLs
- Build-stage and exploded-view web interactions
- Project thumbnails
- Design variants
- User-editable price catalogs
- Versioned template releases

Exit criteria:

- Generated plans are clear enough for external users.
- Outputs include dimensions, diagrams, costs, time, and tools.
- Parametric variants regenerate consistently.
- Static exports and portal views agree because they are generated from the same canonical design.

## Early Technical Choices

Recommended defaults:

- TypeScript or Python for the initial design kernel.
- JSON Schema for data contracts.
- A mature physics engine when simulation begins.
- Local editable price catalogs before live pricing.
- CPU-first validation, CUDA where inference or batch simulation benefits.

## Risks

- LLM produces plausible but unsafe plans.
- Physics simulation is too approximate.
- Assembly instructions ignore human constraints.
- Cost estimates appear falsely precise.
- Parametric scaling creates invalid designs.
- Diagrams are insufficiently clear.

Mitigations:

- Conservative validators.
- Explicit warning language.
- Clear confidence levels.
- Schema-first design.
- Repeatable benchmark scenarios.
- Human review before publishing plan products.
