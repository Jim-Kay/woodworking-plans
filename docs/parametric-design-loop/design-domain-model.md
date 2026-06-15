# Design Domain Model

## Core Objects

### Design

A design is a complete parametric object definition.

Fields:

- `id`
- `name`
- `template`
- `parameters`
- `parts`
- `joints`
- `materials`
- `assembly_steps`
- `constraints`
- `validation_results`
- `metadata`

### Parameter

Parameters are user-facing inputs or derived values:

- Width
- Height
- Depth
- Material family
- Number of shelves
- Target load
- Builder skill
- Available tools
- Finish type

Parameters should include units and valid ranges.

### Part

Parts are physical components:

- Board
- Sheet panel
- Block
- Rail
- Leg
- Brace
- Fastener
- Adhesive
- Gusset
- Bracket

Example:

```json
{
  "id": "shelf_1",
  "type": "panel",
  "material": "plywood_3_4",
  "dimensions_in": [48, 18, 0.75],
  "position_in": [0, 0, 24],
  "orientation_deg": [0, 0, 0]
}
```

### Material

Materials need construction-relevant properties:

- Density
- Strength class
- Modulus or simplified stiffness rating
- Thickness
- Cost source
- Standard purchasable forms
- Cut constraints
- Finish compatibility

Early versions can use simplified properties and conservative rules.

### Joint

Joints connect parts:

- Contact-only
- Glue
- Screws
- Nails
- Bolts
- Dowels
- Pocket holes
- Dados/rabbets
- Mortise and tenon
- Brackets

Initial implementation should support:

- Contact
- Screws
- Glue
- Screw-plus-glue
- Simple brackets

### Assembly Step

An assembly step describes a human action:

- Cut part
- Mark location
- Drill pilot holes
- Apply glue
- Clamp
- Fasten
- Attach subassembly
- Sand
- Finish

Assembly steps should reference actual parts and tools.

## Units

Use explicit units in serialized data.

Early product-facing dimensions can use inches for US woodworking plans. Internal simulation may use SI units if the physics engine prefers it, but conversion should happen at clear boundaries.

## Constraints

Constraints should be attached to templates and generated designs:

- Overall dimension limits
- Maximum unsupported spans
- Minimum edge distances
- Material availability
- Load requirements
- Tool requirements
- Assembly accessibility
- Stability thresholds

Example:

```json
{
  "type": "max_unsupported_span",
  "material": "plywood_3_4",
  "load_lbf": 40,
  "limit_in": 32
}
```

## Template Definition

A template defines a family of buildable objects.

Example templates:

- `shelving_unit`
- `planter_box`
- `workbench`
- `storage_cart`
- `side_table`

Each template should provide:

- Parameter schema
- Part generation function
- Constraint set
- Assembly planner
- Validation scenarios
- Blueprint layout hints

