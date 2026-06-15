# Simulation And Validation

## Purpose

The simulator and validators prevent plausible-sounding but bad designs from becoming plans.

They should answer:

- Does it stand up?
- Does it tip, slide, sag, rack, or vibrate excessively?
- Are parts sized reasonably?
- Are joints sufficient?
- Can a person build it?
- Does it use available materials?

## Validation Layers

### 1. Schema Validation

Checks that the design is well-formed:

- Required fields exist.
- Units are explicit.
- Part references are valid.
- Joints reference existing parts.
- Assembly steps reference existing tools and parts.

### 2. Geometry Validation

Checks spatial feasibility:

- No impossible overlaps.
- Intended contacts exist.
- Parts sit on supports.
- Fasteners land inside material.
- Assembly access is plausible.

### 3. Construction Rules

Checks craft constraints:

- Screws are not too close to edges.
- Shelf spans are not too long.
- Boards are available in required dimensions.
- Cuts fit on standard stock.
- Glue area is sufficient.
- Required clamps/tools are available.

### 4. Physics Simulation

Checks simplified physical behavior:

- Gravity stability
- Load deflection
- Sliding and tipping
- Side loads
- Vibration perturbations
- Joint stress approximation

### 5. Assembly Validation

Checks whether steps are practical:

- Subassemblies are stable while being assembled.
- Fastener locations are accessible.
- Glue-up steps include clamps or temporary supports.
- Heavy or awkward steps may require a second person.

### 6. 3D Model Validation

Checks whether generated model artifacts match the design data:

- Every physical part appears in the model.
- Model dimensions match canonical part dimensions.
- Part labels or metadata can be traced back to design IDs.
- Rendered snapshots are nonblank and framed.
- Obvious overlaps or missing supports are visible before plan export.

## Scoring

Use multiple scores rather than one opaque score:

```json
{
  "overall": 84,
  "stability": 91,
  "strength": 78,
  "material_efficiency": 73,
  "assembly_ease": 86,
  "cost": 80,
  "diagram_clarity": 88
}
```

## Failure Modes

Failure modes should be explicit:

- `tips_forward`
- `tips_sideways`
- `slides_under_load`
- `excessive_shelf_deflection`
- `joint_overstress`
- `unsupported_span`
- `invalid_fastener_location`
- `stock_size_unavailable`
- `assembly_access_blocked`
- `requires_unavailable_tool`
- `requires_two_person_lift`
- `model_export_failed`
- `model_design_mismatch`

## CUDA Acceleration Opportunities

Start with CPU simulation unless the first implementation already has a GPU-capable engine available.

Add CUDA when useful for:

- Parallel trials with different dimensions
- Monte Carlo perturbations
- Stress scenario sweeps
- Learned scoring models
- Local LLM inference
- Future custom physics kernels

## Recommended First Simulation Scenarios

For a shelving unit:

- Empty standing stability
- Loaded shelves at rated weight
- Heavier load on top shelf
- Lateral side load
- Front pull force
- Minor random vibration
- Uneven floor shim test

## Conservative Defaults

The system should prefer conservative warnings over optimistic claims.

Example:

```text
This design is likely stable for light storage, but the shelf span exceeds the conservative limit for 3/4 inch plywood under 40 lb. Add a center support or reduce width.
```
