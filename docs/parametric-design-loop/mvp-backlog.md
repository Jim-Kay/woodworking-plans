# MVP Backlog

## MVP Objective

Generate a parametric shelving-unit plan from user dimensions, validate it against conservative construction rules, estimate materials cost and build time, and emit a readable Markdown plan.

The MVP does not need full physics simulation, local LLM operation, PDF export, or photorealistic diagrams. It should establish the data contracts and workflow that those later capabilities will build on. It should include a basic OpenSCAD export because that gives early visual verification and a durable parametric artifact.

## Work Package 1: Project Skeleton

Tasks:

- Choose implementation language.
- Add command-line entry point.
- Add test runner.
- Add JSON schema validation.
- Add sample input scenario.

Acceptance criteria:

- A command can load a scenario file.
- Invalid JSON fails with useful errors.
- Tests can run locally.

## Work Package 2: Data Contracts

Tasks:

- Define `scenario.schema.json`.
- Define `design.schema.json`.
- Define `material-catalog.schema.json`.
- Define `validation-result.schema.json`.
- Define `plan-output.schema.json`.
- Define `model-export.schema.json`.

Acceptance criteria:

- Example files validate against schemas.
- Every dimensional field includes units.
- Every part, material, and joint has a stable ID.

## Work Package 3: Material Catalog

Tasks:

- Create a starter US woodworking material catalog.
- Include common dimensional lumber.
- Include common plywood sheet goods.
- Include screws, glue, brackets, sandpaper, and finish.
- Include conservative material properties.

Acceptance criteria:

- Generated designs can resolve every material to a catalog item.
- Catalog supports user-editable prices.
- Cost estimates include purchase rounding.

## Work Package 4: Shelving Template

Tasks:

- Implement parametric shelving-unit generator.
- Support width, height, depth, shelf count, material profile, and target load.
- Generate legs, shelves, rails, back bracing or panel option, and fasteners.
- Generate an assembly sequence.

Acceptance criteria:

- Produces complete design JSON for at least three dimension sets.
- Every generated part appears in the cut list.
- Every assembly step references valid parts.

## Work Package 5: Construction Validators

Tasks:

- Validate maximum shelf span.
- Validate shelf support.
- Validate screw edge distance.
- Validate material availability.
- Validate overall proportions for tipping risk.
- Validate tool requirements.

Acceptance criteria:

- Invalid designs produce specific failure modes.
- Validator suggests at least one repair for common failures.
- Warnings are conservative and human-readable.

## Work Package 6: Cost Estimator

Tasks:

- Convert parts to purchasable stock.
- Estimate sheet and board usage.
- Count fasteners and package quantities.
- Add waste allowance.
- Emit cost range and confidence level.

Acceptance criteria:

- Cost output separates lumber, sheet goods, hardware, finish, and consumables.
- Cost estimates update when dimensions change.
- Output avoids false precision by using ranges.

## Work Package 7: Time Estimator

Tasks:

- Map assembly operations to estimated minutes.
- Add skill multipliers.
- Add tool multipliers.
- Separate active time from elapsed time.
- Include glue or finish wait time where applicable.

Acceptance criteria:

- Time estimates update when parts and steps change.
- Output includes active time range and elapsed time range.
- Estimate explains major drivers.

## Work Package 8: Markdown Plan Generator

Tasks:

- Emit project summary.
- Emit dimensions and assumptions.
- Emit materials list.
- Emit cut list.
- Emit tools list.
- Emit step-by-step assembly instructions.
- Emit validation warnings.
- Emit cost and time estimates.

Acceptance criteria:

- Plan is readable without inspecting JSON.
- All part IDs have human-friendly labels.
- Warnings and assumptions are visible near the top.

## Work Package 9: OpenSCAD Model Export

Tasks:

- Generate `model.scad` from canonical design JSON.
- Represent boards, panels, braces, and major fasteners with simple solids.
- Preserve part IDs as comments or labels.
- Add optional exploded-view mode.
- Add a command to render or syntax-check the model when OpenSCAD is available.

Acceptance criteria:

- Every physical part in the design appears in the `.scad` output.
- Model dimensions match the design JSON.
- The generated file can be opened in OpenSCAD for visual inspection.
- The plan output links to the generated model.

## Work Package 10: Experiment Records

Tasks:

- Save each generation run.
- Include input scenario, design JSON, validation result, cost/time estimate, and generated plan path.
- Add stable run IDs.

Acceptance criteria:

- Runs are reproducible from saved inputs.
- Failed designs are saved with failure reasons.
- Successful designs can be compared.

## Work Package 11: Local Model Harness

Tasks:

- Define tool-call format for local model operation.
- Add a dry-run local model adapter that replays scripted proposals.
- Add escalation request format for Codex.

Acceptance criteria:

- The system can accept a candidate design revision through a structured action.
- The local loop can run without paid model calls.
- A failed loop can emit a Codex-readable capability request.

## MVP Demo Scenario

Input:

```json
{
  "object": "shelving_unit",
  "parameters": {
    "width_in": 48,
    "height_in": 72,
    "depth_in": 18,
    "shelf_count": 5,
    "target_shelf_load_lbf": 40,
    "material_profile": "budget",
    "builder_skill": "beginner",
    "available_tools": ["circular_saw", "drill", "clamps", "tape_measure", "square"],
    "finish": "paint"
  }
}
```

Expected output:

- Validated design JSON
- Validation report with warnings if applicable
- Cost estimate
- Time estimate
- Markdown build plan
- OpenSCAD model
- Saved experiment record
