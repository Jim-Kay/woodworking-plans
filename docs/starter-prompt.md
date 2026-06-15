# Starter Prompt For New Functionality

Use this prompt with a fresh Codex instance in `D:\GH\woodworking-plans`.

```text
You are working in D:\GH\woodworking-plans.

Goal: begin implementing the generated-design sandbox that a local LLM can use to attempt woodworking designs, iterate against deterministic tools, and produce a plan package that can later be published through the existing portal.

First, read these docs:

- docs/README.md
- docs/domain-model-evaluation.md
- docs/generator-architecture.md
- docs/first-generated-project-research.md
- docs/local-llm-tool-use.md
- docs/parametric-design-loop/README.md
- docs/parametric-design-loop/product-paths.md
- docs/parametric-design-loop/existing-portal-integration.md
- docs/parametric-design-loop/3d-model-export.md

Important context:

- The existing app is a no-build native ES module browser app.
- It already has a Three.js viewer, build-stage controls, cut lists, OpenSCAD export, printable output, share links, and some physics diagnostics.
- The existing result/assembly model is useful as a portal adapter target, but should not be treated as the long-term canonical generated-design model.
- The new work should introduce a canonical generated-design package, deterministic generation/validation tools, and an adapter into the existing portal result/assembly shape.
- The local LLM should not be asked to directly edit source files for every design attempt. It should interact through narrow tools such as generate, validate, revise, export, and publish-package checks.
- Codex should not directly hardcode design judgments, dimensions, hole placement advice, labels, or build-instruction improvements unless the user explicitly asks for that. Prefer adding or improving prompts, tools, schemas, validators, adapters, and instructions so the local LLM can make those design-level changes through structured tool calls.
- If a design is valid but needs better builder-facing guidance, the local LLM should use an annotation/revision tool to add instructions or notes to the generated design package. If no suitable tool exists, it should emit a structured capability request for Codex.
- The local LLM should iterate as far as it can with the available tools. If the tools are insufficient, it should produce a structured request for Codex describing the missing designer capability, why it is needed, and the design attempt that exposed the gap.
- The first generated project should be a simple tray-style bird feeder, not a load-bearing stool. It should prove the canonical schema, sandbox loop, validation, OpenSCAD export, and portal-publish pathway with low structural risk.
- A simple storage shelf can be the second generated project, used to compare against the existing shelf implementation.
- Avoid a major tooling migration. Prefer clean native JS modules and Node tests for the first pass.
- Keep existing plans working.
- The portal integration is the publishing target, not the only design surface. Expect that portal enhancements may be needed after the canonical package and adapter are proven.

Suggested first milestone:

1. Add a canonical design schema module for generated designs.
2. Add a deterministic tray bird feeder generator that accepts dimensions and material choices.
3. Add sandbox functions or CLI commands that can:
   - generate a candidate design from scenario JSON
   - validate a candidate design
   - apply model-authored annotations such as build guidance, drill notes, and part notes without editing source code
   - export OpenSCAD and a simple plan package
   - report missing tool/capability requests in a Codex-readable format
4. Generate canonical parts, joints/connections, assembly steps, validation warnings, and a simple cut list.
5. Add an adapter from canonical generated design into the current app's result/assembly shape.
6. Add a publishability check that confirms the generated package has the data the portal needs, even if some portal UI enhancements remain.
7. Add tests proving:
   - every assembly step references valid parts
   - every connection references valid parts
   - generated cut list matches generated parts
   - OpenSCAD output includes every physical part ID
   - invalid dimensions produce useful errors or warnings
   - the sandbox can emit a structured missing-capability request
   - the generated package passes the publishability check
8. Add the generated bird feeder to the plan catalog or add a clear generated-package loading path without breaking existing plans.
9. Run npm test.

Before editing, inspect the current code paths:

- src/plans.js
- src/frameMath.js
- src/shelfMath.js
- src/assembly.js
- src/openScad.js
- src/viewer3d.js
- src/app.js
- index.html
- tests/frameMath.test.mjs

Implementation preference:

- Add new modules rather than overloading shelfMath.js.
- Keep canonical generated design separate from browser UI state.
- Add adapter functions with explicit names so future Python/C#/MCP generators can emit the same canonical JSON.
- Keep the sandbox deterministic and testable without a live local LLM.
- Prefer file-based scenario/design/package records for the first pass before adding a long-running service.
- If portal support requires changes, keep them thin and adapter-driven rather than making the canonical model copy the current UI state shape.
- Do not remove or rewrite existing hand-authored plans.

After implementation, summarize:

- files changed
- how the canonical model maps into the existing portal model
- how a local LLM would iterate through the sandbox tools
- how to test it
- what portal publishing support exists and what enhancements remain
- what remains before live local LLM tool use can be added
```
