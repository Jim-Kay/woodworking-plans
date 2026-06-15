# First Generated Project Research

## Research Snapshot

Recent beginner/kids woodworking project lists repeatedly suggest:

- birdhouses
- pencil or marker holders
- toolboxes or caddies
- picture frames
- step stools
- treasure boxes
- planter boxes
- bird feeders
- simple shelves
- book holders

Kreg's kids-project list includes birdhouses, toolboxes, step stools, planter boxes, bird feeders, shelves, and book holders. It specifically frames step stools as useful for learning stability and weight-bearing structures, and bird feeders as good assembly/design practice.

Ana White has a one-picket cedar bird feeder positioned as a low-cost beginner/kid-friendly plan. 100 Things 2 Do describes a very simple bird feeder made from a fence board and screws. The Spruce's step-stool roundup reinforces that step stools are common beginner projects, but they carry more safety implications because someone stands on them.

## Candidate Comparison

### Tray Bird Feeder

Pros:

- Very simple geometry.
- Low safety risk compared with load-bearing furniture.
- Good for parametric width, depth, side height, roof/no-roof, perch, and hanging options.
- Clear cut list.
- Easy OpenSCAD model.
- Easy assembly sequence.
- Good first generator target.

Cons:

- Less structural depth than a shelf or stool.
- Outdoor material/finish choices need basic guidance.

### Step Stool

Pros:

- Small and familiar.
- Good test of stability and weight-bearing validation.
- Strong marketplace relevance.

Cons:

- Higher safety stakes.
- Needs conservative load, anti-tip, joinery, and material checks.
- Better as a second or third generated project.

### Simple Shelf

Pros:

- Directly comparable to the existing storage shelf code.
- Good test of spans, supports, and wall mounting.
- Good bridge to the longer-term shelving target.

Cons:

- Slightly more complex than needed for the first canonical generator.
- Wall mounting introduces assumptions.

### Tool Caddy

Pros:

- Beginner-friendly.
- Useful, small, and parametric.
- Good handle and side-panel geometry.

Cons:

- More irregular geometry than a tray feeder.
- Handle cutouts complicate early OpenSCAD and cut diagrams.

## Recommendation

Use a tray-style bird feeder as the first generated project.

It is simple enough to prove the canonical design package, adapter, OpenSCAD export, and portal integration without immediately taking on load-bearing safety. It is also well represented in beginner/kids woodworking examples, which makes it easy to compare generated output against familiar plan expectations.

After that, use a simple storage shelf as the second generated project so results can be compared directly against the existing `basement-shelves` plan.

## Suggested First Parameters

```json
{
  "template_id": "tray_bird_feeder",
  "parameters": {
    "width_in": 12,
    "depth_in": 8,
    "side_height_in": 1.5,
    "bottom_thickness_in": 0.75,
    "side_thickness_in": 0.75,
    "material": "cedar_fence_picket",
    "hanging": true,
    "drainage_holes": true
  }
}
```

## First Validation Rules

- Width and depth must be positive and within reasonable beginner-project limits.
- Side height must be high enough to retain seed but not so high that small birds cannot access it.
- Bottom must be supported by side rails.
- Hanging holes must not be too close to board ends.
- Drainage holes should be present for outdoor use.
- Cut parts must fit within selected stock.

## Sources Consulted

- Kreg, "Top 15 Woodworking Projects for Kids": https://learn.kregtool.com/learn/woodworking-projects-for-kids/
- Anika's DIY Life, "15 Best Woodworking Project Ideas For Kids": https://www.anikasdiylife.com/woodworking-project-ideas-for-kids/
- 100 Things 2 Do, "DIY Bird Feeder - $4 and 20 minutes to make": https://100things2do.ca/diy-bird-feeder/
- Ana White, "Easy $5 Cedar Bird Feeder": https://www.ana-white.com/woodworking-projects/easy-5-cedar-bird-feeder-free-plans-great-beginner-woodworking-project
- The Spruce, "11 Free Plans For a DIY Step Stool": https://www.thespruce.com/free-step-stool-plans-1357140

