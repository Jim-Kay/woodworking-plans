import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  VISUAL_REVIEW_SCHEMA,
  buildVisualReviewInput,
  buildVisualReviewMessages,
  normalizeVisualReview
} from './review.js';
import {
  executeSandboxTool,
  listSandboxTools,
  readJson,
  summarizeGeneratedDesign,
  writeJson,
  writePlanPackage
} from './sandbox.js';
import { findTemplateCandidates } from './schema.js';

const sandboxTools = listSandboxTools();
const sandboxToolNames = sandboxTools.map((tool) => tool.name);
const sandboxToolPromptManifest = sandboxTools.map(compactToolForPrompt);

export const sandboxActionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'rationale', 'tool_call'],
  properties: {
    action: { type: 'string', enum: sandboxToolNames },
    rationale: { type: 'string' },
    tool_call: {
      type: 'object',
      additionalProperties: true,
      required: ['name', 'arguments'],
      properties: {
        name: { type: 'string' },
        arguments: { type: 'object', additionalProperties: true }
      }
    }
  }
};

export async function runLlmSandboxLoop(options = {}) {
  const baseUrl = (options.baseUrl || process.env.LLM_BASE_URL || 'http://localhost:11434/v1').replace(/\/$/, '');
  const model = options.model || process.env.LLM_MODEL || 'qwen3:14b';
  const visionBaseUrl = (options.visionBaseUrl || process.env.LLM_VISION_BASE_URL || baseUrl).replace(/\/$/, '');
  const visionModel = options.visionModel || process.env.LLM_VISION_MODEL || '';
  const visionScreenshot = options.visionScreenshot || process.env.LLM_VISION_SCREENSHOT || '';
  const scenarioPath = options.scenarioPath || 'examples/tray-bird-feeder.scenario.json';
  const outDir = options.outDir || join('generated', 'runs', `llm-${new Date().toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, 'Z')}`);
  const maxIterations = Number(options.maxIterations ?? process.env.LLM_MAX_ITERATIONS ?? 6);
  const numCtx = Number(options.numCtx ?? process.env.LLM_NUM_CTX ?? 16384);
  const requestTimeoutMs = Number(options.requestTimeoutMs ?? process.env.LLM_REQUEST_TIMEOUT_MS ?? 180000);
  const streamModel = options.streamModel === true;
  const onEvent = typeof options.onEvent === 'function' ? options.onEvent : () => {};

  await mkdir(outDir, { recursive: true });
  const scenario = await readJson(scenarioPath);
  await writeJson(join(outDir, 'scenario.json'), scenario);

  const transcript = [];
  let state = {
    scenario,
    design: null,
    validation: null,
    finalPackage: null,
    capabilityRequest: null
  };

  emit(onEvent, 'run_start', { model, vision_model: visionModel || null, base_url: baseUrl, scenario_path: scenarioPath, out_dir: outDir, max_iterations: maxIterations });

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    emit(onEvent, 'iteration_start', { iteration, summary: summarizeGeneratedDesign(state.design), validation: state.validation?.status || null });
    let next = await chooseNextAction({ ...state, transcript }, { baseUrl, model, numCtx, requestTimeoutMs, streamModel, onEvent, iteration });
    next = enforceWorkflowGate(next, { ...state, transcript });
    transcript.push({ iteration, model_action: next });
    emit(onEvent, 'model_action', { iteration, action: next.action, rationale: next.rationale, tool_call: next.tool_call, overridden_model_action: next.overridden_model_action || null });

    const toolCall = { name: next.tool_call?.name || next.action, arguments: next.tool_call?.arguments || {} };
    emit(onEvent, 'tool_start', { iteration, tool_call: toolCall });
    const executed = executeSandboxTool(toolCall, state);
    state = executed.state;
    const redacted = redactToolResult(executed.result);
    transcript.at(-1).tool_result = redacted;
    emit(onEvent, 'tool_result', { iteration, tool_call: toolCall, result: redacted });

    if (state.design && ['generate_design', 'revise_design', 'annotate_design'].includes(toolCall.name)) {
      await writeJson(join(outDir, 'design.json'), state.design);
      emit(onEvent, 'artifact', { iteration, path: join(outDir, 'design.json'), kind: 'design' });
      continue;
    }

    if (state.validation && ['validate_design', 'check_publishability', 'export_plan_package'].includes(toolCall.name)) {
      await writeJson(join(outDir, 'validation.json'), state.validation);
      emit(onEvent, 'artifact', { iteration, path: join(outDir, 'validation.json'), kind: 'validation' });
    }

    if (toolCall.name === 'export_openscad' && executed.result.ok) {
      await writeFile(join(outDir, 'model.scad'), executed.result.openscad, 'utf8');
      emit(onEvent, 'artifact', { iteration, path: join(outDir, 'model.scad'), kind: 'openscad' });
      continue;
    }

    if (toolCall.name === 'check_publishability' && executed.result) {
      await writeJson(join(outDir, 'publishability.json'), executed.result);
      emit(onEvent, 'artifact', { iteration, path: join(outDir, 'publishability.json'), kind: 'publishability' });
      continue;
    }

    if (toolCall.name === 'propose_component_composition' && executed.result.ok && state.compositionProposal) {
      await writeJson(join(outDir, 'composition-proposal.json'), state.compositionProposal);
      emit(onEvent, 'artifact', { iteration, path: join(outDir, 'composition-proposal.json'), kind: 'composition_proposal' });
      continue;
    }

    if (toolCall.name === 'export_plan_package' && state.finalPackage) {
      await writePlanPackage(join(outDir, 'package'), state.finalPackage);
      emit(onEvent, 'artifact', { iteration, path: join(outDir, 'package'), kind: 'package' });
      if (visionScreenshot && visionModel) {
        state.visualReview = await runVisualReview(state.finalPackage, visionScreenshot, { visionBaseUrl, visionModel });
        await writeJson(join(outDir, 'visual-review.json'), state.visualReview);
        emit(onEvent, 'visual_review', { iteration, review: state.visualReview });
      }
      break;
    }

    if (toolCall.name === 'request_capability' && state.capabilityRequest) {
      await writeJson(join(outDir, 'capability-request.json'), state.capabilityRequest);
      emit(onEvent, 'artifact', { iteration, path: join(outDir, 'capability-request.json'), kind: 'capability_request' });
      break;
    }
  }

  if (readyForFinalPackage(state)) {
    const iteration = transcript.length;
    const next = {
      action: 'export_plan_package',
      rationale: [
        'Workflow finalization inserted by the sandbox loop: the iteration budget ended after validation and build-step review passed.',
        'Exporting the package deterministically instead of requiring another local-model turn.'
      ].join(' '),
      tool_call: { name: 'export_plan_package', arguments: {} }
    };
    transcript.push({ iteration, model_action: next });
    emit(onEvent, 'model_action', { iteration, action: next.action, rationale: next.rationale, tool_call: next.tool_call, finalized_on_exhaustion: true });
    emit(onEvent, 'tool_start', { iteration, tool_call: next.tool_call });
    const executed = executeSandboxTool(next.tool_call, state);
    state = executed.state;
    const redacted = redactToolResult(executed.result);
    transcript.at(-1).tool_result = redacted;
    emit(onEvent, 'tool_result', { iteration, tool_call: next.tool_call, result: redacted });
    if (state.finalPackage) {
      await writePlanPackage(join(outDir, 'package'), state.finalPackage);
      emit(onEvent, 'artifact', { iteration, path: join(outDir, 'package'), kind: 'package' });
      if (visionScreenshot && visionModel) {
        state.visualReview = await runVisualReview(state.finalPackage, visionScreenshot, { visionBaseUrl, visionModel });
        await writeJson(join(outDir, 'visual-review.json'), state.visualReview);
        emit(onEvent, 'visual_review', { iteration, review: state.visualReview });
      }
    }
  }

  await writeJson(join(outDir, 'transcript.json'), transcript);
  await writeFile(join(outDir, 'summary.txt'), loopSummary({ model, visionModel, outDir, transcript, state }), 'utf8');
  const summary = loopSummary({ model, visionModel, outDir, transcript, state });
  emit(onEvent, 'run_complete', { summary, out_dir: outDir, transcript_length: transcript.length });
  return { state, transcript, outDir, summary };
}

async function chooseNextAction(state, options) {
  const messages = [
    {
      role: 'system',
      content: [
        'You operate a deterministic woodworking design sandbox.',
        'Choose exactly one next tool action from the available tools.',
        'Do not invent source-code edits. If tools are insufficient, call request_capability.',
        'Before proposing a new template, call search_templates with the project intent or template_id and use any exact or high-scoring supported template first.',
        'Before requesting a new reusable component, use list_component_categories, search_components, or get_component to check whether an existing component already covers the need.',
        'When a design depends on how parts connect, move, support, clear, or locate each other, call search_assembly_relationships before inventing relationship or component names.',
        'When requesting a component capability, cite the closest existing component IDs you considered so Codex can avoid duplicate components.',
        'If a tool result says recommended_action is search_components, you must search components before calling request_capability.',
        'If generate_design reports an unsupported template, do not immediately request a template; search for reusable components that could compose the requested plan.',
        'If generate_design reports compatible_template_ids, generate with the first compatible template before proposing a new composition.',
        'When an unsupported template can be described with existing components and relationships, call propose_component_composition before request_capability. Include exact component_ids, relationship_ids when applicable, deterministic algorithm steps, validation strategy, build steps, renderer requirements, and open questions.',
        'A component composition proposal is not executable code. It is a Codex-review artifact; do not claim it is publishable until Codex adds deterministic implementation support.',
        'If propose_component_composition reports unknown component_ids or relationship_ids, repair the proposal with exact known IDs from the result, search_components, or search_assembly_relationships. Do not request new components based only on invented IDs.',
        'After validate_design succeeds, call review_build_steps before check_publishability or export_plan_package.',
        'If review_build_steps recommends annotations, use annotate_design and then run review_build_steps again.',
        'If review_build_steps reports missing visual, diagram, or renderer capabilities that annotations cannot solve, call request_capability with those details.',
        'Use annotate_design when the design is valid but build instructions, drill guidance, labels, or part notes need improvement.',
        'If check_publishability returns ok=true, portal_integration_notes are advisory follow-ups, not blockers. The next action should be export_plan_package.',
        'Prefer this sequence unless feedback says otherwise: inspect_scenario, search_templates, search_components and search_assembly_relationships when composing an unsupported plan, propose_component_composition if the components and relationships are enough to describe the missing template, generate_design, validate_design, review_build_steps, annotate_design if needed, check_publishability, export_plan_package.',
        'Return JSON only.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        available_tools: sandboxToolPromptManifest,
        scenario: state.scenario,
        current_design_summary: summarizeGeneratedDesign(state.design),
        current_validation: state.validation,
        current_build_step_review: state.buildStepReview || null,
        current_publishability: state.finalPackage?.publishability || null,
        recent_results: state.transcript.slice(-3).map((item) => ({ action: item.model_action.action, tool_result: compactToolResultForPrompt(item.tool_result) }))
      }, null, 2)
    }
  ];

  const body = {
    model: options.model,
    temperature: 0,
    ...(options.numCtx ? { options: { num_ctx: options.numCtx } } : {}),
    messages,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'sandbox_action', strict: true, schema: sandboxActionSchema }
    }
  };

  emit(options.onEvent, 'model_prompt', {
    iteration: options.iteration,
    model: options.model,
    messages,
    response_format: body.response_format
  });

  if (options.streamModel) return chooseNextActionStreaming(body, options);

  const response = await fetch(`${options.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.LLM_API_KEY || 'ollama'}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(options.requestTimeoutMs || 180000)
  });

  if (!response.ok) throw new Error(`LLM request failed with HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  emit(options.onEvent, 'model_content', { iteration: options.iteration, content });
  return JSON.parse(content);
}

async function chooseNextActionStreaming(body, options) {
  const response = await fetch(`${options.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.LLM_API_KEY || 'ollama'}` },
    body: JSON.stringify({ ...body, stream: true }),
    signal: AbortSignal.timeout(options.requestTimeoutMs || 180000)
  });

  if (!response.ok) throw new Error(`LLM stream failed with HTTP ${response.status}: ${await response.text()}`);
  const content = await readOpenAiStream(response, (chunk) => {
    emit(options.onEvent, 'model_token', { iteration: options.iteration, text: chunk });
  });
  emit(options.onEvent, 'model_content', { iteration: options.iteration, content });
  return parseJson(content);
}

async function readOpenAiStream(response, onToken) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Streaming response did not include a readable body.');
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      const parsed = parseJson(data);
      const chunk = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || '';
      if (!chunk) continue;
      content += chunk;
      onToken(chunk);
    }
  }

  return content;
}

export function enforceWorkflowGate(next, state) {
  const action = next?.tool_call?.name || next?.action;
  if (next?.action === 'request_capability' && action !== 'request_capability') {
    return {
      action: 'request_capability',
      rationale: [
        'Workflow gate inserted by the sandbox loop: the model selected request_capability but supplied a non-existent tool name.',
        'Normalizing the call to the supported request_capability tool.'
      ].join(' '),
      tool_call: {
        name: 'request_capability',
        arguments: capabilityArgumentsFrom(next?.tool_call?.arguments || {})
      },
      overridden_model_action: next
    };
  }
  const publishingAction = ['check_publishability', 'export_plan_package'].includes(action);
  const exactSupportedTemplate = state.design ? null : exactTemplateFromSearchHistory(state.transcript, state.scenario);
  if (exactSupportedTemplate && action !== 'generate_design') {
    return {
      action: 'generate_design',
      rationale: [
        'Workflow gate inserted by the sandbox loop: search_templates found an exact supported template for this scenario.',
        `Generating ${exactSupportedTemplate} before additional component searches or composition proposals.`
      ].join(' '),
      tool_call: {
        name: 'generate_design',
        arguments: {
          template_id: exactSupportedTemplate,
          design_id: state.scenario?.design_id,
          parameters: state.scenario?.parameters || {}
        }
      },
      overridden_model_action: next
    };
  }
  const compatibleTemplate = state.design ? null : lastCompatibleTemplate(state.transcript) || scenarioTemplateAliasCandidate(state.scenario);
  const blockedTemplateRetry = blockedTemplateRetryProposal(next, state);
  if (blockedTemplateRetry) return blockedTemplateRetry;
  if (compatibleTemplate && ['propose_component_composition', 'request_capability'].includes(action)) {
    return {
      action: 'generate_design',
      rationale: [
        'Workflow gate inserted by the sandbox loop: the previous generate_design result reported a compatible supported template.',
        `Trying ${compatibleTemplate} before creating a duplicate composition proposal or capability request.`
      ].join(' '),
      tool_call: {
        name: 'generate_design',
        arguments: {
          template_id: compatibleTemplate,
          design_id: state.scenario?.design_id,
          parameters: state.scenario?.parameters || {}
        }
      },
      overridden_model_action: next
    };
  }
  if (state.design && !state.validation && action !== 'validate_design') {
    return {
      action: 'validate_design',
      rationale: [
        'Workflow gate inserted by the sandbox loop: a design has been generated but deterministic validation has not run yet.',
        'Validate the generated design before additional proposals, capability requests, review, or export.'
      ].join(' '),
      tool_call: { name: 'validate_design', arguments: {} },
      overridden_model_action: next
    };
  }
  if (state.design && state.validation?.ok && !state.buildStepReview && action !== 'review_build_steps') {
    return {
      action: 'review_build_steps',
      rationale: [
        'Workflow gate inserted by the sandbox loop: the design validated successfully but build-step quality review has not run.',
        'Run review_build_steps before proposals, capability requests, publishability checks, or export.'
      ].join(' '),
      tool_call: { name: 'review_build_steps', arguments: {} },
      overridden_model_action: next
    };
  }
  if (state.design && state.validation?.ok && buildStepReviewReady(state.buildStepReview) && !state.finalPackage && action !== 'export_plan_package') {
    return {
      action: 'export_plan_package',
      rationale: [
        'Workflow gate inserted by the sandbox loop: validation and build-step review both passed.',
        'Export the package instead of making a late proposal or capability request.'
      ].join(' '),
      tool_call: { name: 'export_plan_package', arguments: {} },
      overridden_model_action: next
    };
  }
  if (action === 'request_capability' && lastPublishabilityOk(state.transcript)) {
    return {
      action: 'export_plan_package',
      rationale: [
        'Workflow gate inserted by the sandbox loop: check_publishability returned ok=true.',
        'Portal integration notes are advisory follow-ups, so export the publishable package instead of escalating.'
      ].join(' '),
      tool_call: { name: 'export_plan_package', arguments: {} },
      overridden_model_action: next
    };
  }
  if (action === 'annotate_design' && state.buildStepReview?.recommended_tool_call && !hasValidAnnotationArguments(next?.tool_call?.arguments || {})) {
    return {
      action: 'annotate_design',
      rationale: [
        'Workflow gate inserted by the sandbox loop: the model attempted to annotate with arguments that do not match the annotate_design schema.',
        'Using the deterministic review_build_steps recommended_tool_call so the local loop can apply valid step annotations and continue.'
      ].join(' '),
      tool_call: state.buildStepReview.recommended_tool_call,
      overridden_model_action: next
    };
  }
  if (publishingAction && state.design && state.validation?.ok && !state.buildStepReview) {
    return {
      action: 'review_build_steps',
      rationale: [
        'Workflow gate inserted by the sandbox loop: the model attempted to publish before running the deterministic build-step quality review.',
        'Run review_build_steps first so the local loop can catch missing dimensions, stage-specific visuals, callouts, and builder-comprehension issues.'
      ].join(' '),
      tool_call: { name: 'review_build_steps', arguments: {} },
      overridden_model_action: next
    };
  }
  return next;
}

function lastPublishabilityOk(transcript = []) {
  for (const item of transcript.slice().reverse()) {
    const action = item.model_action?.tool_call?.name || item.model_action?.action;
    if (action !== 'check_publishability') continue;
    return item.tool_result?.ok === true;
  }
  return false;
}

function buildStepReviewReady(review) {
  return review?.quality_gate_passed === true || review?.status === 'ready';
}

export function readyForFinalPackage(state = {}) {
  return Boolean(state.design && state.validation?.ok && buildStepReviewReady(state.buildStepReview) && !state.finalPackage && !state.capabilityRequest && !state.compositionProposal);
}

function exactTemplateFromSearchHistory(transcript = [], scenario = {}) {
  const last = transcript.at(-1);
  const action = last?.model_action?.tool_call?.name || last?.model_action?.action;
  if (action !== 'search_templates') return null;
  const scenarioTemplateId = scenario?.template_id;
  if (!scenarioTemplateId) return null;
  const templates = last.tool_result?.templates;
  if (!Array.isArray(templates)) return null;
  const match = templates.find((template) => template?.template_id === scenarioTemplateId);
  return match ? scenarioTemplateId : null;
}

function lastCompatibleTemplate(transcript = []) {
  const last = transcript.at(-1);
  const action = last?.model_action?.tool_call?.name || last?.model_action?.action;
  if (action !== 'generate_design') return null;
  const blockers = last.tool_result?.compatible_template_blockers;
  if (Array.isArray(blockers) && blockers.length > 0) return null;
  const compatible = last.tool_result?.compatible_template_ids;
  if (!Array.isArray(compatible) || compatible.length === 0) return null;
  return compatible.find((templateId) => typeof templateId === 'string' && templateId.length) || null;
}

function blockedTemplateRetryProposal(next, state = {}) {
  const action = next?.tool_call?.name || next?.action;
  if (action !== 'generate_design') return null;
  const args = next?.tool_call?.arguments || {};
  const blocked = lastTemplateFitBlocker(state.transcript);
  if (!blocked || blocked.attempted_template_id !== args.template_id) return null;
  const proposal = compositionProposalFromSearchHistory(state, blocked);
  if (!proposal) return null;
  return {
    action: 'propose_component_composition',
    rationale: [
      'Workflow gate inserted by the sandbox loop: the model retried a supported template that deterministic scenario-fit checks already rejected.',
      'Using the relationship/component searches from this run to draft a Codex-reviewable composition proposal instead of repeating the blocked generate_design call.'
    ].join(' '),
    tool_call: {
      name: 'propose_component_composition',
      arguments: proposal
    },
    overridden_model_action: next
  };
}

function lastTemplateFitBlocker(transcript = []) {
  for (const item of transcript.slice().reverse()) {
    const action = item.model_action?.tool_call?.name || item.model_action?.action;
    if (action !== 'generate_design') continue;
    const result = item.tool_result || {};
    const blockers = result.template_fit_blockers || result.compatible_template_blockers;
    if (Array.isArray(blockers) && blockers.length) {
      return {
        attempted_template_id: result.attempted_template_id || item.model_action?.tool_call?.arguments?.template_id || null,
        blockers
      };
    }
  }
  return null;
}

function compositionProposalFromSearchHistory(state = {}, blocked = {}) {
  const componentIds = new Set();
  const relationshipIds = new Set();
  const requestedMissingComponentIds = new Set();

  for (const item of state.transcript || []) {
    const result = item.tool_result || {};
    for (const component of result.components || []) if (component.component_id) componentIds.add(component.component_id);
    for (const relationship of result.relationships || []) {
      if (relationship.relationship_id) relationshipIds.add(relationship.relationship_id);
      for (const componentId of relationship.component_hints || []) componentIds.add(componentId);
      for (const capability of relationship.missing_capability_hints || []) requestedMissingComponentIds.add(capabilityToMissingComponentId(capability));
    }
  }

  const scenario = state.scenario || {};
  const scenarioText = [
    scenario.template_id,
    scenario.intent,
    ...(Array.isArray(scenario.builder_goals) ? scenario.builder_goals : [])
  ].join(' ').toLowerCase();

  if (/hinge|fold|swing/.test(scenarioText)) {
    requestedMissingComponentIds.add('hardware.hinge_pair');
    requestedMissingComponentIds.add('hardware.support_chain_or_stay');
  }
  if (/dowel|rod/.test(scenarioText)) requestedMissingComponentIds.add('geometry.round_dowel');

  if (!componentIds.size && !relationshipIds.size) return null;
  return {
    template_id: scenario.template_id || 'unsupported_relationship_composition',
    title: scenario.title || titleFromTemplateId(scenario.template_id) || 'Relationship-Based Composition',
    intent: scenario.intent || '',
    component_ids: [...componentIds].slice(0, 10),
    requested_missing_component_ids: [...requestedMissingComponentIds].filter(Boolean).slice(0, 8),
    relationship_ids: [...relationshipIds].slice(0, 8),
    parameters: scenario.parameters || {},
    design_algorithm: [
      'Use the scenario dimensions to place the primary panel, cleat, frame, or support parts.',
      'Apply the selected assembly relationships to locate contact faces, motion axes, clearances, and support points.',
      'Generate reference holes, hardware locations, and stage metadata from the selected components and relationships.',
      'Refuse publishability until Codex adds deterministic geometry, validation, and renderer support for missing relationship capabilities.'
    ],
    validation_strategy: [
      'Validate part overlap, edge clearance, and host containment for all fixed-contact and layout relationships.',
      'Validate required motion, clearance, support-stop, or load-path assumptions before any generated plan can be published.',
      'Require human/Codex review for load-bearing, hinged, folding, or moving assemblies.'
    ],
    build_steps: [
      {
        id: 'step.layout',
        title: 'Lay out fixed parts and references',
        instructions: ['Mark the fixed panel, cleat, frame, mounting holes, and hardware references before assembly.']
      },
      {
        id: 'step.motion_support',
        title: 'Fit motion and support hardware',
        instructions: ['Dry fit the moving panel or support relationship, check swing/clearance, and do not publish until deterministic motion validation exists.']
      }
    ],
    renderer_requirements: [
      'Show fixed-contact parts separately from moving/support hardware.',
      'Show open and closed or staged positions when motion relationships are involved.',
      'Highlight blocked template-fit reasons and missing deterministic validators.'
    ],
    open_questions: blocked.blockers || ['Confirm missing relationship support before implementation.']
  };
}

function capabilityToMissingComponentId(value) {
  const text = String(value || '').toLowerCase();
  if (/hinge/.test(text)) return 'hardware.hinge_pair';
  if (/closed state|open\/closed|motion|folding frame/.test(text)) return 'rendering.motion_state_view';
  if (/load/.test(text)) return 'validators.load_path';
  if (/dowel|round/.test(text)) return 'geometry.round_dowel';
  return '';
}

function titleFromTemplateId(value) {
  return String(value || '')
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(' ');
}

function scenarioTemplateAliasCandidate(scenario = {}) {
  if (!scenario?.template_id) return null;
  const candidates = findTemplateCandidates(scenario.template_id);
  const compatible = candidates.find((templateId) => templateId !== scenario.template_id);
  return compatible || null;
}

function capabilityArgumentsFrom(args = {}) {
  if (args.capability || args.capability_name || args.reason || args.rationale) return args;
  const missing = Array.isArray(args.missing_capabilities) ? args.missing_capabilities : [];
  const labels = missing.map((item) => typeof item === 'string' ? item : item?.capability).filter(Boolean);
  const reasons = missing.map((item) => typeof item === 'string' ? item : item?.reason).filter(Boolean);
  return {
    capability: labels.length ? labels.join('; ') : 'missing generated-design capability',
    reason: reasons.length ? reasons.join(' ') : 'The local loop selected request_capability but did not provide a supported capability payload.',
    evidence: [
      ...(Array.isArray(args.related_component_ids) ? [`Related component IDs: ${args.related_component_ids.join(', ')}`] : []),
      ...(Array.isArray(args.considered_components) ? [`Closest component IDs considered: ${args.considered_components.join(', ')}`] : [])
    ]
  };
}

function hasValidAnnotationArguments(args = {}) {
  return (Array.isArray(args.step_instructions) && args.step_instructions.some((item) => item?.step_id && Array.isArray(item.instructions) && item.instructions.length))
    || (Array.isArray(args.part_notes) && args.part_notes.some((item) => item?.part_id && Array.isArray(item.notes) && item.notes.length))
    || (Array.isArray(args.design_notes) && args.design_notes.length);
}

async function runVisualReview(planPackage, screenshotPath, options) {
  const imageDataUrl = await readImageDataUrl(screenshotPath);
  const reviewInput = buildVisualReviewInput(planPackage, {
    viewLabel: process.env.VISION_REVIEW_VIEW || 'rendered portal screenshot',
    reviewFocus: process.env.VISION_REVIEW_FOCUS || 'Check whether the screenshot visually matches the generated woodworking design package and builder-facing instructions.'
  });
  const response = await fetch(`${options.visionBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.LLM_API_KEY || 'ollama'}` },
    body: JSON.stringify({
      model: options.visionModel,
      temperature: 0,
      messages: buildVisualReviewMessages(reviewInput, imageDataUrl),
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'generated_visual_review', strict: true, schema: VISUAL_REVIEW_SCHEMA }
      }
    })
  });

  if (!response.ok) throw new Error(`Visual review failed with HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return {
    model: options.visionModel,
    base_url: options.visionBaseUrl,
    screenshot_path: screenshotPath,
    ...normalizeVisualReview(parseJson(data.choices?.[0]?.message?.content || ''), {
      viewLabel: reviewInput.view_label,
      validStepIds: (planPackage.design?.assembly_steps || []).map((step) => step.id),
      validPartIds: (planPackage.design?.parts || []).map((part) => part.id)
    })
  };
}

function redactToolResult(result) {
  if (!result || typeof result !== 'object') return result;
  if (result.design) return { ...result, design: undefined };
  if (result.package) return { ok: result.ok, publishability: result.publishability };
  if (result.openscad) return { ok: result.ok, chars: result.chars };
  return result;
}

function compactToolForPrompt(tool) {
  const properties = tool.input_schema?.properties || {};
  return {
    name: tool.name,
    description: tool.description,
    required: tool.input_schema?.required || [],
    arguments: Object.fromEntries(Object.entries(properties).map(([key, definition]) => [key, definition.type || 'value']))
  };
}

function compactToolResultForPrompt(result) {
  if (!result || typeof result !== 'object') return result;
  if (Array.isArray(result.components)) {
    return {
      ok: result.ok,
      query: result.query,
      components: result.components.slice(0, 5).map((item) => ({
        component_id: item.component_id,
        title: item.title,
        score: item.score
      }))
    };
  }
  if (Array.isArray(result.relationships)) {
    return {
      ok: result.ok,
      query: result.query,
      relationships: result.relationships.slice(0, 5).map((item) => ({
        relationship_id: item.relationship_id,
        type_id: item.type_id,
        title: item.title,
        score: item.score
      }))
    };
  }
  if (Array.isArray(result.templates)) {
    return {
      ok: result.ok,
      query: result.query,
      templates: result.templates.slice(0, 5).map((item) => ({
        template_id: item.template_id,
        title: item.title,
        score: item.score
      }))
    };
  }
  if (result.available_templates || result.suggested_component_queries || result.suggested_relationship_queries) {
    return {
      ok: result.ok,
      error: result.error,
      recommended_action: result.recommended_action,
      compatible_template_ids: result.compatible_template_ids,
      compatible_template_blockers: result.compatible_template_blockers,
      template_fit_blockers: result.template_fit_blockers,
      suggested_component_queries: result.suggested_component_queries,
      suggested_relationship_queries: result.suggested_relationship_queries
    };
  }
  if (result.proposal && result.review) {
    return {
      ok: result.ok,
      approval_status: result.approval_status,
      proposal: {
        template_id: result.proposal.template_id,
        component_ids: result.proposal.component_ids,
        relationship_ids: result.proposal.relationship_ids,
        requested_missing_component_ids: result.proposal.requested_missing_component_ids,
        requested_missing_relationship_ids: result.proposal.requested_missing_relationship_ids
      },
      review: {
        ok: result.review.ok,
        errors: result.review.errors,
        warnings: result.review.warnings,
        suggested_existing_components: result.review.suggested_existing_components
      },
      recommended_action: result.recommended_action,
      capability_request_arguments: result.capability_request_arguments
    };
  }
  return result;
}

function loopSummary({ model, visionModel, outDir, transcript, state }) {
  return [
    `model=${model}`,
    `vision_model=${visionModel || 'not_configured'}`,
    `out_dir=${outDir}`,
    `iterations=${transcript.length}`,
    `design=${state.design?.design_id || 'none'}`,
    `validation=${state.validation?.status || state.finalPackage?.validation?.status || 'not_run'}`,
    `publishable=${state.finalPackage?.publishability?.ok ?? false}`,
    `visual_review=${state.visualReview ? state.visualReview.matches_intent : 'not_run'}`
  ].join('\n');
}

async function readImageDataUrl(path) {
  const bytes = await readFile(path);
  return `data:${mimeType(path)};base64,${bytes.toString('base64')}`;
}

function mimeType(path) {
  const ext = extname(path).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('LLM response was not parseable JSON.');
    return JSON.parse(match[0]);
  }
}

function emit(onEvent, type, data) {
  onEvent({ type, data, at: new Date().toISOString() });
}
