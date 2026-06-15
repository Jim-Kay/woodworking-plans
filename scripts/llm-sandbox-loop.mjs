import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  VISUAL_REVIEW_SCHEMA,
  buildVisualReviewInput,
  buildVisualReviewMessages,
  normalizeVisualReview
} from '../src/generated/review.js';
import {
  executeSandboxTool,
  listSandboxTools,
  readJson,
  summarizeGeneratedDesign,
  writeJson,
  writePlanPackage
} from '../src/generated/sandbox.js';

const baseUrl = (process.env.LLM_BASE_URL || 'http://localhost:11434/v1').replace(/\/$/, '');
const model = process.env.LLM_MODEL || 'qwen3:14b';
const visionBaseUrl = (process.env.LLM_VISION_BASE_URL || baseUrl).replace(/\/$/, '');
const visionModel = process.env.LLM_VISION_MODEL || '';
const visionScreenshot = process.env.LLM_VISION_SCREENSHOT || '';
const scenarioPath = process.argv[2] || 'examples/tray-bird-feeder.scenario.json';
const outDir = process.argv[3] || join('generated', 'runs', `llm-${new Date().toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, 'Z')}`);
const maxIterations = Number(process.env.LLM_MAX_ITERATIONS || 6);
const sandboxTools = listSandboxTools();
const sandboxToolNames = sandboxTools.map((tool) => tool.name);

const actionSchema = {
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

for (let iteration = 0; iteration < maxIterations; iteration += 1) {
  const next = await chooseNextAction({ ...state, transcript });
  transcript.push({ iteration, model_action: next });
  const toolCall = { name: next.tool_call?.name || next.action, arguments: next.tool_call?.arguments || {} };
  const executed = executeSandboxTool(toolCall, state);
  state = executed.state;
  transcript.at(-1).tool_result = redactToolResult(executed.result);

  if (state.design && ['generate_design', 'revise_design', 'annotate_design'].includes(toolCall.name)) {
    await writeJson(join(outDir, 'design.json'), state.design);
    continue;
  }

  if (state.validation && ['validate_design', 'check_publishability', 'export_plan_package'].includes(toolCall.name)) {
    await writeJson(join(outDir, 'validation.json'), state.validation);
  }

  if (toolCall.name === 'export_openscad' && executed.result.ok) {
    await writeFile(join(outDir, 'model.scad'), executed.result.openscad, 'utf8');
    continue;
  }

  if (toolCall.name === 'check_publishability' && executed.result) {
    await writeJson(join(outDir, 'publishability.json'), executed.result);
    continue;
  }

  if (toolCall.name === 'export_plan_package' && state.finalPackage) {
    await writePlanPackage(join(outDir, 'package'), state.finalPackage);
    if (visionScreenshot && visionModel) {
      state.visualReview = await runVisualReview(state.finalPackage, visionScreenshot);
      await writeJson(join(outDir, 'visual-review.json'), state.visualReview);
    }
    break;
  }

  if (toolCall.name === 'request_capability' && state.capabilityRequest) {
    await writeJson(join(outDir, 'capability-request.json'), state.capabilityRequest);
    break;
  }
}

await writeJson(join(outDir, 'transcript.json'), transcript);
await writeFile(join(outDir, 'summary.txt'), summary(), 'utf8');
console.log(summary());

async function chooseNextAction(state) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.LLM_API_KEY || 'ollama'}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: [
            'You operate a deterministic woodworking design sandbox.',
            'Choose exactly one next tool action from the available tools.',
            'Do not invent source-code edits. If tools are insufficient, call request_capability.',
            'Use annotate_design when the design is valid but build instructions, drill guidance, labels, or part notes need improvement.',
            'Prefer this sequence unless feedback says otherwise: inspect_scenario, generate_design, validate_design, check_publishability, export_plan_package.',
            'Return JSON only.'
          ].join(' ')
        },
        {
          role: 'user',
          content: JSON.stringify({
            available_tools: sandboxTools,
            scenario: state.scenario,
            current_design_summary: summarizeGeneratedDesign(state.design),
            current_validation: state.validation,
            current_publishability: state.finalPackage?.publishability || null,
            recent_results: state.transcript.slice(-3).map((item) => ({ action: item.model_action.action, tool_result: item.tool_result }))
          }, null, 2)
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'sandbox_action', strict: true, schema: actionSchema }
      }
    })
  });

  if (!response.ok) throw new Error(`LLM request failed with HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  return JSON.parse(content);
}

async function runVisualReview(planPackage, screenshotPath) {
  const imageDataUrl = await readImageDataUrl(screenshotPath);
  const reviewInput = buildVisualReviewInput(planPackage, {
    viewLabel: process.env.VISION_REVIEW_VIEW || 'rendered portal screenshot',
    reviewFocus: process.env.VISION_REVIEW_FOCUS || 'Check whether the screenshot visually matches the generated woodworking design package and builder-facing instructions.'
  });
  const response = await fetch(`${visionBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.LLM_API_KEY || 'ollama'}` },
    body: JSON.stringify({
      model: visionModel,
      temperature: 0,
      messages: buildVisualReviewMessages(reviewInput, imageDataUrl),
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'generated_visual_review',
          strict: true,
          schema: VISUAL_REVIEW_SCHEMA
        }
      }
    })
  });

  if (!response.ok) throw new Error(`Visual review failed with HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return {
    model: visionModel,
    base_url: visionBaseUrl,
    screenshot_path: screenshotPath,
    ...normalizeVisualReview(parseJson(data.choices?.[0]?.message?.content || ''))
  };
}

function redactToolResult(result) {
  if (!result || typeof result !== 'object') return result;
  if (result.design) return { ...result, design: undefined };
  if (result.package) return { ok: result.ok, publishability: result.publishability };
  if (result.openscad) return { ok: result.ok, chars: result.chars };
  return result;
}

function summary() {
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
    if (!match) throw new Error('Visual review response was not parseable JSON.');
    return JSON.parse(match[0]);
  }
}
