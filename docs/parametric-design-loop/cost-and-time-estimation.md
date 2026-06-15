# Cost And Time Estimation

## Materials Cost

Cost should be estimated from the generated design, not from the template name alone.

Inputs:

- Generated parts
- Source stock sizes
- Hardware counts
- Finish choices
- Waste allowance
- Regional price catalog
- User overrides

## Price Catalog

Start with a local editable catalog:

```json
{
  "region": "US",
  "currency": "USD",
  "items": [
    {
      "sku": "pine_2x4x8",
      "name": "2x4x8 construction lumber",
      "unit": "piece",
      "unit_cost": 4.98
    },
    {
      "sku": "plywood_3_4_4x8",
      "name": "3/4 inch plywood 4x8 sheet",
      "unit": "sheet",
      "unit_cost": 54.00
    }
  ]
}
```

Live pricing can come later. A local catalog is simpler, transparent, and more reproducible.

## Cost Output

Use honest ranges:

```json
{
  "materials_subtotal": 96.40,
  "waste_allowance_percent": 12,
  "estimated_total_low": 105,
  "estimated_total_high": 135,
  "currency": "USD",
  "confidence": "medium"
}
```

## Cost Factors

Include:

- Stock purchase rounding
- Sheet layout waste
- Extra hardware because screws are sold by box
- Mistake allowance for beginner builders
- Optional finishing supplies
- Tool purchases excluded by default

## Assembly Time

Estimate time from operations:

- Measure and mark
- Cut
- Sand
- Drill pilot holes
- Countersink
- Apply glue
- Clamp
- Fasten
- Assemble subassemblies
- Attach final parts
- Finish

## Skill Multipliers

Use multipliers for builder experience:

- Beginner: slower, higher mistake allowance
- Intermediate: baseline
- Advanced: faster, fewer repeated setup costs

Example:

```json
{
  "beginner": 1.45,
  "intermediate": 1.0,
  "advanced": 0.75
}
```

## Tool Multipliers

Tool availability changes time:

- Table saw speeds sheet ripping.
- Miter saw speeds repeated crosscuts.
- Drill press improves repeated hole accuracy.
- Clamps reduce assembly difficulty.
- Circular saw plus straightedge is slower but accessible.

## Time Output

Separate active time from elapsed time:

```json
{
  "active_minutes_low": 150,
  "active_minutes_high": 240,
  "elapsed_minutes_low": 240,
  "elapsed_minutes_high": 1440,
  "drivers": [
    "Paint or finish drying time dominates elapsed time.",
    "Beginner skill profile increases measuring and assembly time."
  ]
}
```

## Confidence Levels

Use confidence labels:

- High: common construction pattern and simple materials
- Medium: known materials but nonstandard dimensions
- Low: unusual joinery, large spans, or uncertain prices

## Future Enhancements

- Retailer price import
- Region-specific material catalogs
- Automatic cut nesting optimization
- Tool-specific time calibration
- User feedback loop from actual builds
- Historical estimate correction

