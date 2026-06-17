# Build Step Authoring Guide

This guide is for future code assistants adding or improving step-by-step build instructions. The tote rack plan is the current reference implementation because it combines text instructions, calculated dimensions, multiple illustrated views, live 3D mini-animations, fasteners, and validation-sensitive assembly sequencing.

## Goals

Build steps should help a real person build the object safely and accurately from the generated plan. Treat them as assembly instructions, not just a slideshow of the final model.

Good build steps:

- Follow the order a builder should actually use.
- Show the measurements that control fit, alignment, and safety.
- Show only the parts relevant to the current operation.
- Include fasteners when they determine assembly order or collision risk.
- Highlight the parts added or worked on in the current step.
- Use callouts, close-ups, or inset views for screw paths, caster plates, diagonal fasteners, or hidden joints.
- Use the same generated geometry as the 3D builder whenever possible.
- Match the generated cut list and customizable inputs.
- Avoid decorative views that look good but do not answer a construction question.

The attached 27-gallon tote-rack PDF is the current quality target: dimensions are drawn directly on the step diagram, the current parts are color-highlighted, screw locations get detail views, and complex steps use an inset when one camera angle is not enough. Generated plans do not need to copy that layout, but they should answer the same builder questions before a plan is considered ready.

## Where Build Steps Live

Plan-facing step definitions live in `src/plans.js` under each catalog item:

```js
buildSteps: [
  {
    title: 'Assemble the front and back frames',
    stage: 1,
    dimensionContext: 'post',
    images: [{ type: 'front-frame', phase: 1 }],
    animation: { type: 'front-frame' },
    instructions: [
      'Use {frameRailLength} rails, with {postClearWidth} clear between posts.'
    ]
  }
]
```

Rendering and media selection are handled in `src/app.js`:

- `renderBuildSteps()` builds the section.
- `buildStepHtml()` renders text, illustrated views, and mini-video tabs.
- `buildStepImages()` and `buildStepImage()` choose generated still images.
- `buildStepAnimation()` maps supported animation types.
- `startBuildStepAnimation()` runs live Three.js animations in canvases and full-screen dialogs.

The underlying 3D scene is rendered by `src/viewer3d.js`. Prefer adding stage-aware or animation-aware model behavior there instead of inventing a parallel drawing system.

The local sandbox also exposes `review_build_steps` from `src/generated/buildStepQuality.js`. A local model should run this after `validate_design` and before `check_publishability`. If the review recommends annotations, the model should call `annotate_design` and review again. If the review reports missing diagram, callout, or stage-specific rendering capabilities, the model should emit a structured `request_capability` for Codex instead of pretending the plan is finished.

Generated plans can use the generic mini-video path by providing stable `assembly_steps[].part_ids` in the real operation order. The portal adapter turns drill, mark, and assembly steps into `generated-step-N` mini-videos and adds an overall generated build sequence above the numbered steps. This makes the assembly order visible enough for a person or local vision reviewer to notice when parts appear too early, float without host context, or move through an impossible sequence.

## Step Content

Each step should describe one build operation or one decision gate. Split a step when the builder must change orientation, clamp a subassembly, add hidden fasteners, or verify a fit before continuing.

Use concise instruction bullets. A useful pattern is:

- What to assemble.
- What dimension or alignment controls the placement.
- Where and how to fasten it.
- What to verify before moving on.

Use placeholders when text should follow calculated values. Current tote rack examples include `{postCountPerFrame}`, `{frameRailLength}`, and `{postClearWidth}`. Add new placeholders in `formatBuildInstruction()` when a step needs a calculated value that should update with user inputs.

## Dimensions

Dimensions in build-step images should be purposeful. Show dimensions when they tell the builder where parts go or how to verify the assembly.

Good uses:

- Clear distance between posts.
- Runner clear width.
- Runner vertical pitch.
- Overall rack width, height, or depth when laying out a large frame.
- Offset or inset values that affect tote fit, caster mounting, or fastener placement.

Avoid turning every image into a fully dimensioned engineering drawing. Too many labels make the important measurements harder to find.

For configurable plans, dimension labels must come from calculated geometry, not hardcoded assumptions. If a label says `21 in`, it should update when tote width, columns, lumber size, or clearance changes.

## Illustrated Views

Illustrated views are static images generated at render time. Use them for measurements, fit checks, and clear snapshots of each assembly state.

Best practices:

- Use the model stage that matches the step.
- Hide unrelated groups when they distract from the operation.
- Prefer square-on views for layout steps.
- Use multiple images for one step when the sequence matters.
- Show partial assemblies rather than the whole finished model when the user needs to understand one joint.
- Add labels and dimensions for the controlling measurement, not every possible measurement.
- Add close-up or inset views when fasteners are angled, hidden, near opposing fasteners, or close to an edge.

The tote rack front-frame step is a good pattern: it uses multiple custom phase images to show the first bottom rail, post placement, top rail fastening, and second bottom rail sequence more clearly than one final image could.

## Mini-Animations

Mini-animations should use the same Three.js model technology as the 3D builder. This keeps the animated sequence visually consistent with the builder, cut list, and physics model.

Use animations when motion clarifies sequence:

- Exploded components moving into final position.
- Fasteners arriving after the parts are aligned.
- Rows or repeated parts installing in a deliberate order.
- A fit check, such as sliding a tote into runner rails.

Avoid animations when they are visually impressive but constructionally confusing. If parts fly through existing posts or rails, change the approach direction. For example, tote runner rails should animate from the front or back rather than through posts from the side.

Every animation should have:

- A readable starting state.
- A final state that matches the real 3D model.
- Camera and target settings tuned for the construction question.
- A full-screen view if details are hard to inspect in the inline card.
- No stale layout or scrollbars in the full-screen modal.

## Fasteners

Show fasteners when they affect assembly order, strength, or collision risk.

Examples:

- Screws attaching the first bottom frame rail into posts.
- Screws attaching the top rail down into posts.
- Screws attaching the second bottom rail into the first rail.
- Diagonal screws at runner rail ends, especially when screws from opposite sides could collide.
- Caster mounting screws or bolts through caster plates.

Fastener heads should appear on the wood surface, not buried inside the lumber. Screw length should visibly engage the receiving part enough to make structural sense. If a screw is intentionally shorter or offset, the text should explain why.

When adding fasteners, run or extend validation so impossible or risky connections are surfaced. Useful checks include insufficient screw bite, fasteners colliding, unsupported caster plates, and parts intersecting where they should only touch.

## Collision And Fit

Do not rely on visual inspection alone for important clearances. If an object can clip in the model, it can confuse the build instructions.

For tote-style plans, validate:

- The tote lid/lip width separately from the tote body or neck.
- Runner rail clear width against the tote neck.
- Lip bearing on each runner.
- Side clearance between the lid edge and posts.
- Whether the tote can shift far enough to fall between runners.
- Whether runners, posts, and rails touch where they should and avoid overlap where they should not.

For frame-style plans, validate:

- Canvas thickness and frame depth.
- Reveal and rabbet/liner support dimensions.
- Mounting screw or clip fit.
- Miter and support rail stage ordering.

## Camera Guidance

Camera choices should answer the step's construction question.

- Layout step: square-on, low distortion, dimensions readable.
- Runner or rail installation: angled enough to see front-to-back placement.
- Caster step: lower perspective so all caster locations are visible.
- Fit check: look into the bay or opening where the object moves.
- Final inspection: wider three-quarter view.

If a full-screen view needs a different camera than the inline view, prefer adding an option rather than accepting an unreadable default.

## UI Behavior

Build steps currently support an Illustrated/Mini-video tab pattern. Keep that pattern consistent.

- Illustrated should be the default because it is stable and printable.
- Mini-video should supplement the image, not replace essential dimensions.
- Full-screen should open a larger live view without page-level horizontal scrolling.
- Animation resources should be cleaned up when the panel rerenders or the modal closes.
- Avoid visible explanatory UI text about how the app works; put construction guidance in the step instructions.

## Implementation Checklist

Before finishing a build-step change:

- Confirm each step is in the real assembly order.
- Confirm text, dimensions, cut list, and 3D geometry agree.
- Confirm generated values update when plan inputs change.
- Check that illustrated images show necessary measurements and no irrelevant clutter.
- Check animations do not pass parts through existing components.
- Check fasteners sit on surfaces, reach the receiving part, and avoid collisions.
- Check full-screen animation modal sizing on a normal desktop viewport.
- Run `npm test`.
- Run `git diff --check`.

## When To Add New Helpers

Add a custom image helper when the normal staged capture cannot show an important sequence clearly. Add a custom animation type when motion communicates something static images cannot.

Keep helpers plan-specific until at least two plans need the same concept. For example, a generic "exploded part installation" helper may be worth extracting later, but the tote rack's front-frame phases and runner animation are currently specific enough to stay local.
