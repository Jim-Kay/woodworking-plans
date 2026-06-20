# Daily Catalog Generation Loop

Use this document as the target instruction file for a recurring automation that tries to add one new non-trivial woodworking project to the catalog each day.

The loop is adapted from the Forward Future [Loop Library](https://signals.forwardfuture.ai/loop-library/), especially its emphasis on repeatable agent workflows with explicit checks, proof, and stopping conditions. The most useful source patterns for this project are:

- [The full product evaluation loop](https://signals.forwardfuture.ai/loop-library/loops/full-product-evaluation-loop/): generate realistic scenarios, define the quality bar up front, evaluate every scenario under the same conditions, fix weak outcomes, and rerun.
- [The quality streak loop](https://signals.forwardfuture.ai/loop-library/loops/quality-streak-loop/): turn each failure into a documented regression or benchmark before restarting the success streak.
- [The self-improving champion loop](https://signals.forwardfuture.ai/loop-library/loops/self-improving-champion-loop/): compare candidate prompt, workflow, or configuration changes against the incumbent and promote only clear wins.
- [The devil's-advocate loop](https://signals.forwardfuture.ai/loop-library/loops/devils-advocate-design-loop/): keep adversarial objections open until evidence resolves or explicitly accepts them.
- [The Loop Harness verification loop](https://signals.forwardfuture.ai/loop-library/loops/loop-harness-verification-loop/): separate generation from verification so one agent does not approve its own work.
- [The Codex completion-contract loop](https://signals.forwardfuture.ai/loop-library/loops/codex-completion-contract-loop/): define completion and evidence before starting so partial output is not mistaken for success.
- [The Revolve versioned-experiment loop](https://signals.forwardfuture.ai/loop-library/loops/revolve-self-improvement-loop/): keep comparable checkpoints when refining prompts, queues, model settings, and scoring rubrics.
- [The recent-feedback sweep](https://signals.forwardfuture.ai/loop-library/loops/recent-feedback-sweep/): convert user corrections into durable failure patterns and regression checks.

## Automation Prompt

```text
You are running the Daily Catalog Generation Loop for D:\GH\woodworking-plans.

Goal: add one new non-trivial woodworking project candidate to the catalog, or produce a high-quality capability request that explains why the sandbox cannot safely publish one today.

First read:

- docs/README.md
- docs/local-llm-tool-use.md
- docs/build-step-authoring.md
- docs/assembly-relationship-catalog.md
- docs/daily-catalog-generation-loop.md

Use the local LLM and sandbox tools for high-volume design work. Use Codex for durable tool, prompt, validator, renderer, adapter, and portal improvements. Do not hardcode a plan directly unless the local loop has produced a clear component composition, target geometry, or capability request that justifies the deterministic implementation.

At the end of the run, commit and push only if the repository has a verified improvement: a publishable catalog plan, a reusable sandbox capability with tests, or a documented dataset/workflow improvement that makes future runs measurably better.
```

## Definition Of Non-Trivial

A daily project is non-trivial when it exercises at least one meaningful composition problem beyond a single static box:

- multiple repeated parts that must be placed, cleared, and fastened consistently
- an adjustable, folding, sliding, hanging, or removable subsystem
- a load-bearing assembly with spans, posts, rails, panels, braces, or fastener patterns
- a photo-derived, target-geometry-derived, or shape-library-derived design brief
- a build sequence where stage-specific diagrams or mini-animations materially help the builder

Do not treat visual complexity as enough. A plan with many decorative parts but no meaningful construction problem is a low-value candidate.

## Daily Loop

1. **Recover The Current State**
   - Run `git status --short`.
   - Review the latest generated queue output if present under `generated/runs`.
   - Review `docs/local-llm-tool-use.md` for the current sandbox tools.
   - Run `npm run llm:check` when the local host status is uncertain.

2. **Build A Small Candidate Queue**
   - Create or update a queue with three to six project ideas.
   - Include at least one safer known-family idea, one component-composition idea, and one stretch idea that may produce a reusable capability request.
   - Prefer ideas that broaden the dataset: storage, jigs, small furniture, wall-mounted projects, shop aids, outdoor items, and mechanisms.
   - Avoid high-risk load-bearing human-support projects unless the validator and component-interface review can reason about the load path.

3. **Run The Local Model**
   - Start the watcher with `npm run sandbox:watch` when interactive monitoring is useful.
   - Run the queue with `npm run sandbox:queue -- <queue-path> <out-dir>`.
   - Use a bounded iteration budget. A daily automation should favor several bounded attempts over one enormous wandering attempt.
   - Let the sandbox gates force target-geometry inspection, primitive fitting, component graph mapping, component-interface review, build-step review, publishability checks, and package export.

4. **Triage Outcomes**
   - Open `<out-dir>/review.md` first.
   - Prioritize in this order:
     - publishable candidates that passed validation, component-interface review when required, build-step review, and publishability
     - component-composition proposals with exact component and relationship IDs
     - capability requests that reveal a reusable missing tool, validator, renderer feature, or portal feature
     - generated designs that need Codex review
     - failed loops only when they reveal a repeated failure pattern

5. **Adversarial Review**
   - For the leading candidate, act as a skeptical builder and reviewer.
   - Ask:
     - Would a first-time builder understand what to do next from each build step?
     - Do the diagrams show the correct stage rather than a finished assembly too early?
     - Are holes, fasteners, clearances, and support points located or constrained well enough?
     - Are hidden or moving support members physically represented?
     - Are parts overlapping except where a joint or fastener intentionally connects them?
     - Is any load-bearing claim unsupported by the current validator?
   - Keep high-impact objections open until there is current evidence from validation, rendered inspection, tests, or explicit accepted risk notes.

6. **Improve One Durable Thing**
   - If a plan is close, improve the plan through sandbox-supported annotations, parameters, composition changes, or target geometry.
   - If the model is blocked, add a reusable tool, component, relationship, renderer mode, validator rule, or prompt improvement that future local runs can use.
   - If neither is possible within the daily budget, save a precise capability request and retry queue rather than forcing a weak catalog entry.

7. **Verify**
   - Run the focused tests for changed modules.
   - Run `npm test` before publishing code or catalog changes.
   - For portal-facing changes, inspect the generated plan in the app when practical, including the catalog card, 3D builder, cut list, build steps, mini-animations, and overall animation.
   - If screenshots are used, ask the visual reviewer to judge them as a first-time builder.

8. **Publish Or Stop Honestly**
   - Publish only when all required evidence is present.
   - If the best outcome is a capability request, record that as the daily output.
   - If the automation is blocked by local model availability, missing credentials, unsafe load uncertainty, or test failure, stop with one exact next action.

## Required Evidence

A daily catalog addition must include:

- a catalog-visible plan title, description, tags, materials, tools, and notes
- generated design package or deterministic generator output
- passing schema and geometry validation
- passing component-interface review when the project has hidden, moving, load-bearing, or photo-derived subsystems
- passing build-step review or documented annotations that address review findings
- stage-specific build-step diagrams
- overall build animation when the renderer supports it
- a 3D-rendered thumbnail, or a documented reason the thumbnail capture is not available yet
- a cut list whose part names and orientations are understandable
- no unexplained overlapping components
- `npm test` output after edits
- a commit and push if repository files changed

A capability-request day must include:

- the attempted project brief
- the closest components, templates, and relationships the local model considered
- the exact missing capability
- evidence that the missing capability is reusable beyond one plan
- the expected tool, component, validator, or renderer contract
- a retry queue or next scenario that should be rerun after the capability exists

## Suggested Daily Queue Mix

Use this shape as a starting point, then rotate domains over time:

```json
{
  "title": "Daily catalog generation queue",
  "defaults": {
    "model": "qwen3:14b",
    "baseUrl": "http://localhost:11434/v1",
    "max_iterations": 8,
    "num_ctx": 32768
  },
  "jobs": [
    {
      "id": "known-family-variant",
      "title": "Known supported family variant",
      "notes": "Exercise an existing deterministic template with a different useful size, material, or mounting scenario."
    },
    {
      "id": "component-composition",
      "title": "Component composition project",
      "notes": "Require exact component and relationship selection before proposing the plan."
    },
    {
      "id": "target-geometry-project",
      "title": "Photo, render, or shape-library derived project",
      "notes": "Start from target geometry, fit primitives, then map into component graph hints."
    },
    {
      "id": "stretch-mechanism",
      "title": "Stretch mechanism",
      "notes": "Expect either a publishable plan or a reusable capability request for missing motion, support, or interface validation."
    }
  ]
}
```

## Scoring Rubric

Score each candidate from 0 to 3 in each category:

- **Buildability**: clear materials, cuts, joints, tools, and safe sequence
- **Geometry**: no unintended overlaps, impossible spans, missing supports, or ambiguous part orientation
- **Instruction Quality**: steps, diagrams, labels, drill/fastener guidance, animations, and notes help a real builder
- **Reuse Value**: adds a reusable component, relationship, validator, renderer capability, or plan family
- **Catalog Value**: useful, appealing, appropriately scoped, and distinct from existing plans
- **Risk Control**: load, motion, sharp edges, hanging, outdoor exposure, and fasteners are handled honestly

Publish only if the candidate scores at least 2 in every category and at least 14 total. If any score is 0, the candidate must become a revision target or capability request.

## Failure Patterns To Watch

Treat these as recurring quality traps:

- finished assemblies shown during pre-assembly drill or cut steps
- build-step animations that jump backward in assembly state
- thumbnails that use abstract SVGs when a 3D render can be captured
- hidden supports omitted because a tabletop, side panel, or cover hides them
- moving hardware represented only as notes, not physical interface parts
- local model requesting a new component when an existing component or relationship has a nearby stable ID
- visually plausible plans with no validated load path
- cut-list parts drawn in misleading proportions or orientations
- vague project descriptions that do not tell a builder why the plan is worth making

When a failure pattern appears twice, prefer adding a validator, reviewer rule, renderer mode, or prompt improvement over fixing only the current plan.

## Stop Conditions

Stop the daily run when one of these is true:

- one publishable non-trivial plan is added, verified, committed, and pushed
- one reusable capability, reviewer rule, renderer feature, validator rule, or prompt improvement is added, verified, committed, and pushed
- one high-quality capability request and retry queue are produced because the current tool surface cannot safely publish the plan
- local model/runtime availability blocks execution after `npm run llm:check`
- tests fail and cannot be fixed within the daily budget
- the same blocker repeats for two bounded attempts with no new evidence

Do not report success because the local model produced persuasive prose. The daily loop succeeds only on verified catalog value, verified system improvement, or a precise blocked artifact that improves the next run.

