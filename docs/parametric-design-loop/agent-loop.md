# Agent Loop

## Roles

### Local Model

The local model is the high-volume experimenter. It should:

- Propose design candidates.
- Read structured validation feedback.
- Try repairs and variants.
- Search promising neighborhoods.
- Summarize failure patterns.
- Request new tools only when blocked.

### Simulator And Validators

The simulator and validators are the source of truth. They should:

- Reject impossible geometry.
- Identify likely structural failures.
- Provide precise feedback.
- Produce scores and metrics.
- Avoid vague judgments.

### Codex

Codex is the environment builder. It should:

- Add missing capabilities.
- Improve data contracts.
- Fix broken tools.
- Add new object classes.
- Improve visualization and exports.
- Convert repeated local-model requests into durable system features.

## Basic Iteration

1. User supplies a product goal.
2. System creates a scenario with required dimensions, materials, loads, tools, and output format.
3. Local model generates a candidate design.
4. Validator checks schema, geometry, construction rules, and material feasibility.
5. Simulator tests stability and force resistance.
6. Scorer assigns metrics and failure modes.
7. Local model proposes a repair or new candidate.
8. High-scoring designs are saved.
9. Blueprint generator emits builder-facing plans.

## Escalation To Codex

The local model should ask Codex for help when:

- A needed primitive does not exist.
- A repeated failure cannot be represented in the current rules.
- The simulator lacks an important force or constraint.
- The blueprint output cannot explain a valid design.
- The local model discovers a useful pattern that should become a reusable template.
- The API is too awkward or ambiguous.

Escalation should be structured:

```json
{
  "type": "capability_request",
  "requested_change": "Add diagonal brace primitive with screw-fastened endpoints.",
  "reason": "Tall shelf designs repeatedly fail lateral vibration tests.",
  "examples": ["experiment_2026_00142", "experiment_2026_00157"],
  "expected_tool_contract": {
    "action": "add_brace",
    "from_part": "left_leg",
    "to_part": "top_rail",
    "material": "1x2 pine",
    "fastener": "wood_screws"
  }
}
```

## Local Model Tool API

The local model should interact through structured calls:

```json
{
  "action": "create_design",
  "template": "shelving_unit",
  "parameters": {
    "width_in": 48,
    "height_in": 72,
    "depth_in": 18,
    "shelf_count": 5,
    "material_profile": "budget_pine_and_plywood"
  }
}
```

```json
{
  "action": "validate_design",
  "design_id": "candidate_018"
}
```

```json
{
  "action": "simulate",
  "design_id": "candidate_018",
  "scenario": "loaded_shelf_lateral_vibration"
}
```

## Feedback Contract

Feedback should be compact, specific, and machine-readable:

```json
{
  "score": 72.4,
  "valid": false,
  "failure_modes": [
    {
      "type": "excessive_shelf_span",
      "part": "shelf_3",
      "observed": 48,
      "limit": 32,
      "suggestion": "Add center support or increase shelf thickness."
    },
    {
      "type": "lateral_instability",
      "scenario": "side_load_10_lbf",
      "max_displacement_in": 1.2,
      "suggestion": "Add back panel or diagonal bracing."
    }
  ]
}
```

## Search Strategy

Do not rely on pure brute force or pure language reasoning.

Recommended approach:

- Local model proposes a promising design family.
- Deterministic parameter sweeps explore nearby values.
- Validators prune impossible candidates.
- Simulations rank survivors.
- Local model interprets failure reports and proposes the next neighborhood.

