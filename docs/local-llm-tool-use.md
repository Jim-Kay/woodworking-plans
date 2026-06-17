# Local LLM Tool Use

## Can A Local LLM Handle Tool Use?

Yes, but the answer depends on the model, runtime, and tool protocol.

Many locally runnable models can produce structured JSON tool calls when prompted or constrained. Some runtimes also support OpenAI-compatible tool calling or function-calling conventions. However, local tool use is usually less reliable than frontier hosted models unless the tools are narrow, well-documented, and validated strictly.

For this project, assume a local model can operate tools if:

- tool schemas are small and explicit
- arguments are validated
- failures return concise structured feedback
- the loop is allowed to retry
- tools are deterministic where possible
- dangerous operations are not exposed

## Good Local Model Tools

Good tools for this project:

- `list_templates`
- `generate_design`
- `validate_design`
- `simulate_design`
- `estimate_cost`
- `estimate_time`
- `export_openscad`
- `export_plan`
- `compare_designs`
- `summarize_failures`

Avoid exposing broad tools such as:

- arbitrary shell execution
- arbitrary filesystem writes
- direct source-code editing
- unconstrained network access

Codex can handle source-code changes when the local model discovers a capability gap.

## Recommended Loop

```mermaid
flowchart LR
    Model["Local LLM"] --> Tools["Narrow design tools"]
    Tools --> Result["Structured result"]
    Result --> Model
    Result --> Store["Experiment store"]
    Model --> Escalation["Capability request"]
    Escalation --> Codex["Codex modifies software"]
```

## Runtime Possibilities

Potential local inference runtimes include:

- llama.cpp server
- Ollama
- LM Studio
- vLLM where supported
- custom PyTorch runners

The best runtime can be chosen later. The immediate design requirement is to keep the generator accessible through structured tool calls and file-based design packages.

## Runtime Selection Strategy

Pick the runtime by what the design sandbox needs, not by popularity alone.

For the first local-model pass, prefer a host that provides:

- OpenAI-compatible chat endpoints
- structured JSON output or JSON-schema constrained generation
- tool/function-calling support
- model management that is easy to reproduce
- GPU acceleration on the target workstation
- enough logging to debug malformed tool calls

Practical starting points:

- **Ollama**: best first trial when setup speed matters. It supports local model management, tool calling, and structured outputs. Use it to prove the design loop quickly.
- **LM Studio**: good for interactive model exploration and an OpenAI-compatible local server. Use it when comparing models by hand or when a GUI helps inspect behavior.
- **llama.cpp server**: good when low-level control matters. It supports JSON-schema constrained sampling and OpenAI-style function calling with the right chat template flags.
- **vLLM**: good for higher-throughput serving and some model families with strong tool-calling support, but it is heavier operationally and may be less convenient on Windows.

Recommended evaluation order:

1. Start with Ollama or LM Studio to validate the sandbox contract.
2. Test two or three candidate models against the same scripted design tasks.
3. Score models on valid tool calls, useful revisions after validation feedback, and ability to produce a clear Codex capability request.
4. Move to llama.cpp server or vLLM only if the easier hosts block required tool-calling, context, performance, or reproducibility.

For this project, structured output reliability matters more than raw chat quality. A smaller model that reliably emits valid tool calls is more useful than a larger model that produces persuasive but invalid design JSON.

## Model Selection Strategy

Use separate model tiers rather than expecting one local model to do everything:

- **Fast iteration model**: a 7B/8B or efficient MoE model for cheap generate/validate/revise loops.
- **Planner model**: a stronger 14B-30B class model for interpreting validation failures and choosing next attempts.
- **Vision reviewer**: a vision-language model that pretends to be a first-time builder and checks screenshots for comprehension, package intent, rendered build steps, labels, and instructions.
- **Escalation summarizer**: any reliable structured-output model that can turn repeated failures into a concise Codex feature request.

Candidate families to test first:

- Qwen coder/instruct models with documented function-calling support.
- Qwen VL models for rendered screenshot review.
- Mistral/Devstral coding models designed for agentic tool use.
- Llama-family instruct models where the selected runtime has a reliable tool-call template.

Do not choose solely from benchmark scores. Use a project-specific benchmark suite with tasks such as:

- generate a tray bird feeder scenario
- repair invalid dimensions after validator feedback
- avoid unsupported operations
- export a valid package
- request a missing capability when no available tool can complete the design

## Local Host Check And Benchmark

This repo includes two small Node scripts for local runtime evaluation:

```powershell
npm run llm:check
```

Checks for common local LLM commands and probes likely local endpoints:

- Ollama native: `http://localhost:11434/api/tags`
- Ollama OpenAI-compatible: `http://localhost:11434/v1/models`
- LM Studio: `http://localhost:1234/v1/models`
- vLLM: `http://localhost:8000/v1/models`
- llama.cpp server: `http://localhost:8080/v1/models`

```powershell
$env:LLM_BASE_URL = 'http://localhost:11434/v1'
$env:LLM_MODEL = 'model-name'
npm run llm:benchmark
```

The benchmark sends the same three structured-output tasks to any OpenAI-compatible local server:

- generate an initial tray bird feeder design action
- revise after validation feedback
- request a missing designer capability

The score is intentionally narrow. It measures whether the model can reliably pick the right sandbox action and emit parseable JSON for that action. It does not measure design quality by itself; deterministic validators and exported plan checks still make that decision.

The first deterministic sandbox tools are available through:

```powershell
npm run sandbox -- list_tools
npm run sandbox -- list_templates
npm run sandbox -- generate_design examples/tray-bird-feeder.scenario.json generated/runs/demo/design.json
npm run sandbox -- validate_design generated/runs/demo/design.json generated/runs/demo/validation.json
npm run sandbox -- export_plan_package generated/runs/demo/design.json generated/runs/demo/package
```

`list_tools` exposes the same tool manifest used by the local-model loop. The current agent-facing surface is:

- `inspect_scenario`
- `list_templates`
- `search_templates`
- `list_component_categories`
- `list_components`
- `search_components`
- `get_component`
- `generate_design`
- `summarize_design`
- `validate_design`
- `review_build_steps`
- `revise_design`
- `annotate_design`
- `export_openscad`
- `check_publishability`
- `export_plan_package`
- `propose_component_composition`
- `request_capability`

The intended model sequence is usually:

1. Inspect the scenario and tool surface.
2. Browse or search the component catalog when composing an unsupported plan family or considering a missing capability.
3. Select exact component IDs with `get_component` before relying on them in a scenario or capability request.
4. Generate a design from the selected template.
5. Validate the generated design.
6. Revise if validation fails.
7. Run `review_build_steps` to check whether the build instructions and rendered step visuals are understandable to a first-time builder.
8. Use `annotate_design` when the design is structurally valid but needs better build guidance, drill instructions, labels, or part notes.
9. Check publishability.
10. Export a plan package, or propose/request a missing capability from Codex.

Codex should generally improve prompts, tool schemas, validators, adapters, and portal support. The local model should make design-level choices through sandbox tools: dimensions, parameter revisions, build guidance, labels, notes, and missing-capability requests. If the model cannot express a desired improvement through the current tools, that is a signal for Codex to add a narrower tool rather than directly hardcoding the design improvement.

The component catalog is the deduplication layer for reusable design capabilities. Before requesting a new component, the model should:

1. Use `list_component_categories` to choose the right area.
2. Use `search_components` with domain language and aliases, such as `key hooks`, `wall screw holes`, or `edge clearance`.
3. Use `get_component` on the closest matches.
4. If no existing component covers the need, call `request_capability` and include the closest component IDs considered.

This avoids creating duplicate components under slightly different names, such as `key_hook_row`, `linear_hook_array`, and `repeated_wall_pegs`.

Catalog search uses a hybrid retrieval strategy. Exact IDs and aliases score highest, but the search layer also expands common woodworking synonyms, tolerates invalid category hints, and uses fuzzy text similarity over descriptions, inputs, outputs, and example uses. The search result is still only a candidate list: the model should select exact `template_id` or `component_id` values and let deterministic generation, proposal review, validation, and publishability checks decide whether the candidate is actually usable.

Before proposing a new template, the model should call `search_templates` with the scenario `template_id`, project name, and plain-language intent. This helps map names such as `mail_key_organizer` or `entry organizer with hooks` to existing supported templates instead of creating duplicate composition proposals.

Unsupported templates should recover through component discovery before escalation. For example, a `wall_key_rack` scenario should search for `hardware.linear_hook_array`, `hardware.wall_mount_hole_pair`, `geometry.rectangular_panel`, `patterns.centered_linear_spacing`, and related validators before asking Codex for composition support. A good request is "add composition support using these existing components plus any missing glue," not "add a one-off wall key rack generator."

For unsupported project families that can be described with known building blocks, the local model should use `propose_component_composition` before `request_capability`. The proposal is a review artifact, not executable source code. It should include exact `component_ids`, template parameters, deterministic generation steps, validation rules, build-step intent, renderer requirements, and open questions. The sandbox checks that referenced components exist and that the proposal is complete enough to review, then writes `composition-proposal.json` for Codex. Codex can then approve, revise, or reject the proposal and add deterministic generator/validator/renderer code with tests.

This lets the local model spend cheap tokens on design exploration while preserving quality gates:

1. Qwen searches and inspects existing components.
2. Qwen drafts a composition proposal using exact component IDs.
3. Deterministic sandbox checks reject unknown components or thin proposals.
4. Codex reviews the proposal and implements only the reusable pieces that survive review.
5. Tests, validators, rendered screenshots, and publishability checks decide whether the implementation graduates to the catalog.

The first local-model loop runner uses the same tool surface:

```powershell
$env:LLM_BASE_URL = 'http://localhost:11434/v1'
$env:LLM_MODEL = 'qwen3:14b'
npm run sandbox:loop -- examples/tray-bird-feeder.scenario.json generated/runs/llm-demo
```

To let the local model work through a backlog of ideas, run the queue runner:

```powershell
$env:LLM_BASE_URL = 'http://localhost:11434/v1'
$env:LLM_MODEL = 'qwen3:14b'
npm run sandbox:queue -- examples/idea-queue.json generated/runs/queue-demo
```

The queue runner processes jobs sequentially and writes one folder per idea under the output directory. Its `index.json` groups outcomes into review queues:

- `published_candidates` for packages that passed deterministic publishability checks
- `composition_proposals` for reusable template/component proposals that need Codex review
- `capability_requests` for missing tools, validators, renderers, or components
- `generated_needs_review` for designs that were produced but did not reach a publishable package
- `failed_loops` for jobs whose transcripts should be inspected or discarded

Use `LLM_QUEUE_MAX_JOBS=1` for a quick smoke run, or leave it unset for a longer unattended run. The default queue in `examples/idea-queue.json` uses a slightly larger iteration budget than the single-scenario smoke test so the model has room to browse components, generate, validate, review build steps, annotate, and export. It intentionally mixes known-supported plans with harder unsupported project families, so the output should reveal both publishable candidates and reusable capability gaps.

For long unattended runs, the queue also writes `review.md` next to `index.json` and `summary.txt`. Open `review.md` first after a bulk run; it ranks Codex review items by likely usefulness, putting composition proposals and capability requests ahead of publishable-package review.

If a long queue is interrupted, rerun it with resume enabled:

```powershell
$env:LLM_QUEUE_RESUME = '1'
npm run sandbox:queue -- examples/idea-queue.json generated/runs/queue-demo
```

Resume mode reuses non-failed jobs already present in the output directory's `index.json`, then continues through the remaining jobs. Failed jobs are intentionally not skipped, so prompt/tool fixes can retry them.

The loop can also run an optional visual review immediately after package export when a screenshot and vision model are configured. This review is framed as an end-user comprehension pass: can a builder tell what to do next, locate the relevant parts/features, trust that the text matches the image, and understand whether the view is pre-assembly, partial assembly, or finished assembly?

Before export, the text loop should also call `review_build_steps`. This deterministic tool checks the package against an instruction-quality rubric based on good shop plans: pre-assembly drill-layout views, stage-specific diagrams, mini-video animation intent, dimensions in the diagram, highlighted current parts, host-part callouts for holes, and close-ups for fasteners or caster plates. If the tool recommends annotations, the local model should call `annotate_design` and review again. If the tool reports missing stage-specific, animation, or callout rendering capability, the local model should call `request_capability` and cite the affected step IDs.

To watch the local model while it runs, start the local watcher app:

```powershell
$env:LLM_BASE_URL = 'http://localhost:11434/v1'
$env:LLM_MODEL = 'qwen3:14b'
npm run sandbox:watch
```

Then open `http://localhost:8787`. The page streams visible model output, selected actions, deterministic tool calls, tool results, and artifacts over Server-Sent Events. Treat it as an observability view into the local loop, not a promise of hidden model reasoning. If the local model emits visible reasoning text or a rationale field, the watcher can display it; otherwise the reliable stream is token output plus tool activity.

```powershell
$env:LLM_BASE_URL = 'http://localhost:11434/v1'
$env:LLM_MODEL = 'qwen3:14b'
$env:LLM_VISION_MODEL = 'qwen2.5vl:7b'
$env:LLM_VISION_SCREENSHOT = '.\path\to\screenshot.png'
$env:VISION_REVIEW_VIEW = 'Generated tray feeder drill step'
$env:VISION_REVIEW_FOCUS = 'Review this as a first-time builder. Can the builder understand where to drill before assembly from this screen?'
npm run sandbox:loop -- examples/tray-bird-feeder.scenario.json generated/runs/llm-demo
```

After a package is exported, run a role-based review pass:

```powershell
$env:LLM_BASE_URL = 'http://localhost:11434/v1'
$env:LLM_MODEL = 'qwen3:14b'
npm run sandbox:review -- generated/runs/llm-demo/package generated/runs/llm-demo/package-review.json
```

The review pass runs the package through focused roles:

- Parameter Reviewer
- Design Validator
- Build Planner
- Publication Reviewer
- Capability Scout

These are advisory review passes over the deterministic package. If validation and publishability pass, the reviewers should default to `ok_to_publish=true` and report model-only concerns as warnings, recommended revisions, or missing capabilities unless the package contains a direct contradiction.

If a vision-capable local model is available, run a screenshot review pass against a rendered app or build-step image:

```powershell
$env:LLM_VISION_BASE_URL = 'http://localhost:11434/v1'
$env:LLM_VISION_MODEL = 'qwen2.5vl:7b'
$env:VISION_REVIEW_VIEW = 'Generated tray feeder drill step'
$env:VISION_REVIEW_FOCUS = 'Review this as a first-time builder. Can the builder understand where to drill before assembly, and does the image contradict the text?'
npm run sandbox:vision-review -- generated/runs/llm-demo/package .\path\to\screenshot.png generated/runs/llm-demo/visual-review.json
```

The current text-planner baseline on this workstation uses `qwen3:14b` and `qwen3:8b`, which are not vision models. Use a VL model such as `qwen2.5vl` or `qwen3-vl` for screenshots. The visual review output is advisory and structured for the next loop: it includes builder-comprehension checks, can propose `annotate_design` arguments, can report visual mismatches, or can request a missing capability such as better stage-specific screenshot capture.

## Multi-Photo Design Briefs

Photo-driven generation should start with a structured design brief, not a finished plan. A vision-capable model can inspect multiple photos of the same object, reconcile the views, and output object type, visible parts, measurements, uncertainties, component-search queries, and missing capabilities.

Example photo set:

```json
{
  "photo_set_id": "entry_organizer_reference",
  "known_measurements": [
    { "label": "overall width", "value_in": 18 }
  ],
  "photos": [
    { "photo_id": "front", "view": "front", "path": "front.jpg" },
    { "photo_id": "side", "view": "side", "path": "side.jpg" },
    { "photo_id": "detail_pocket", "view": "detail", "path": "detail-pocket.jpg" },
    { "photo_id": "back", "view": "back", "path": "back.jpg" }
  ]
}
```

Run the vision brief pass when a local VL model is available:

```powershell
$env:LLM_VISION_MODEL='qwen2.5vl:7b'
npm run sandbox:photo-brief -- examples/photo-sets/mail-key-organizer.photo-set.json generated/runs/photo-brief/mail-key-organizer.brief.json
```

Then convert or inspect the brief with deterministic tools:

```powershell
npm run sandbox -- inspect_photo_brief generated/runs/photo-brief/mail-key-organizer.brief.json
npm run sandbox -- photo_brief_to_scenario generated/runs/photo-brief/mail-key-organizer.brief.json generated/runs/photo-brief/mail-key-organizer.scenario.json
```

The local text model should use the brief's `component_searches` before generating a design. If the brief identifies a feature that no component can express, the model should request a reusable component or validator rather than asking Codex for a one-off project implementation.

## MCP Server

The sandbox dispatcher is also exposed as a small stdio MCP server:

```powershell
npm run sandbox:mcp -- examples/tray-bird-feeder.scenario.json
```

The server supports the standard JSON-RPC MCP methods needed for tool use:

- `initialize`
- `tools/list`
- `tools/call`

It keeps design state for the life of the process. A client can call `generate_design`, then `validate_design`, then `export_plan_package` without resending the generated design on each turn. Start the server with a scenario path, or set `SANDBOX_SCENARIO_PATH` when launching it from a client configuration.

The MCP server is intentionally dependency-free and wraps the same `executeSandboxTool(...)` dispatcher used by the CLI and local Qwen loop. That keeps CLI, scripted model loop, and future agent integrations on one tool contract.

The loop runner writes:

- `scenario.json`
- `design.json`
- `validation.json`
- `transcript.json`
- `summary.txt`
- `package/` with `design.json`, `validation.json`, `portal-result.json`, `publishability.json`, and `model.scad`

Generated run outputs are intentionally ignored by git under `generated/runs/`.

## Current Workstation Baseline

Initial local check on this workstation:

- OS: Windows 11 Pro
- GPU: NVIDIA GeForce RTX 5060 Ti, about 16 GB VRAM
- System RAM: about 34 GB
- Installed host: Ollama 0.30.6
- Pulled models: `qwen3:8b`, `qwen3:14b`

Initial benchmark, 8B baseline:

```text
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen3:8b
npm run llm:benchmark
```

Result:

- Score: 3/3
- Warm quality notes: generation action used string values for dimensions, so downstream tools should coerce or reject invalid argument types.
- Generate initial design action: pass
- Revise after validation action: pass
- Request missing capability action: pass
- Cold first response: about 50 seconds
- Warm follow-up responses: about 4-6 seconds

Second benchmark, 14B comparison:

```text
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen3:14b
npm run llm:benchmark
```

Result:

- Score: 3/3
- Warm quality notes: no benchmark warnings; generation action used numeric dimensions and explicit features.
- Generate initial design action: pass
- Revise after validation action: pass
- Request missing capability action: pass
- Cold first response: about 24 seconds
- Warm follow-up responses: about 7-9 seconds
- Generated cleaner numeric arguments than the 8B run in the first design action.

Current recommendation:

- Use `qwen3:14b` as the default sandbox planner while the deterministic design tools are being built.
- Keep `qwen3:8b` as the fast fallback for smoke tests and quick iteration.
- Re-run this benchmark after the real sandbox tools exist, then add tests with actual validator feedback and exported design packages before treating any model as final.

## Practical Reliability Strategy

Treat local model output as proposals, not truth.

Every proposed design should pass:

- JSON schema validation
- geometry validation
- construction validation
- model export validation
- cost/time sanity checks

If the local model produces invalid tool arguments, the tool should return a compact correction message rather than failing silently.

## MCP Implication

If the generator is implemented as an MCP server, a local model-capable agent can call it through a standard tool surface. The server can be written in any language with MCP support or an MCP wrapper.

For early development, a CLI/file contract is enough. MCP can wrap the same commands after the contracts stabilize.
