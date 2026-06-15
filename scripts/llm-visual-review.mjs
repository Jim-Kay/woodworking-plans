import { readFile } from 'node:fs/promises';
import { extname, dirname, join } from 'node:path';
import {
  VISUAL_REVIEW_SCHEMA,
  buildVisualReviewInput,
  buildVisualReviewMessages,
  normalizeVisualReview
} from '../src/generated/review.js';
import { readJson, writeJson } from '../src/generated/sandbox.js';

const baseUrl = (process.env.LLM_VISION_BASE_URL || process.env.LLM_BASE_URL || 'http://localhost:11434/v1').replace(/\/$/, '');
const model = process.env.LLM_VISION_MODEL || process.env.LLM_MODEL || 'qwen2.5vl:7b';
const packageDir = process.argv[2];
const screenshotPath = process.argv[3];
const outPath = process.argv[4] || (packageDir ? join(dirname(packageDir), 'visual-review.json') : null);
const viewLabel = process.env.VISION_REVIEW_VIEW || 'rendered portal screenshot';
const reviewFocus = process.env.VISION_REVIEW_FOCUS || '';

if (!packageDir || !screenshotPath || !outPath) {
  console.error([
    'Usage:',
    '  node scripts/llm-visual-review.mjs <package-dir> <screenshot.png|jpg|webp> [out.json]',
    '',
    'Environment:',
    '  LLM_VISION_MODEL=qwen2.5vl:7b',
    '  LLM_VISION_BASE_URL=http://localhost:11434/v1',
    '  VISION_REVIEW_VIEW="Generated tray feeder build step 2"',
    '  VISION_REVIEW_FOCUS="Check whether the drill-step screenshot shows pre-assembly drill guidance."'
  ].join('\n'));
  process.exit(1);
}

const planPackage = await readPlanPackage(packageDir);
const imageDataUrl = await readImageDataUrl(screenshotPath);
const reviewInput = buildVisualReviewInput(planPackage, { viewLabel, reviewFocus });
const raw = await runVisualReview(reviewInput, imageDataUrl);
const review = {
  model,
  base_url: baseUrl,
  package_dir: packageDir,
  screenshot_path: screenshotPath,
  ...normalizeVisualReview(raw, visualReviewContext(planPackage, reviewInput))
};

await writeJson(outPath, review);
console.log(summaryText(review));

async function readPlanPackage(dir) {
  const design = await readJson(join(dir, 'design.json'));
  const validation = await readJson(join(dir, 'validation.json'));
  const portalResult = await readJson(join(dir, 'portal-result.json'));
  const publishability = await readJson(join(dir, 'publishability.json'));
  let openscad = '';
  try {
    openscad = await readFile(join(dir, 'model.scad'), 'utf8');
  } catch {
    openscad = '';
  }
  return {
    package_schema_version: '0.1',
    design,
    validation,
    publishability,
    exports: {
      openscad,
      portal_result: portalResult
    }
  };
}

async function readImageDataUrl(path) {
  const bytes = await readFile(path);
  return `data:${mimeType(path)};base64,${bytes.toString('base64')}`;
}

async function runVisualReview(reviewInput, imageDataUrl) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.LLM_API_KEY || 'ollama'}` },
    body: JSON.stringify({
      model,
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
  return parseJson(data.choices?.[0]?.message?.content || '');
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

function mimeType(path) {
  const ext = extname(path).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

function summaryText(review) {
  return [
    `model=${review.model}`,
    `package=${review.package_dir}`,
    `screenshot=${review.screenshot_path}`,
    `view=${review.view_label}`,
    `matches_intent=${review.matches_intent}`,
    `confidence=${review.confidence}`,
    `can_identify_next_action=${review.builder_comprehension.can_identify_next_action}`,
    `text_matches_image=${review.builder_comprehension.text_matches_image}`,
    `confusion_points=${review.builder_comprehension.confusion_points.length}`,
    `findings=${review.findings.length}`,
    `proposed_step_annotations=${review.proposed_annotations.step_instructions.length}`,
    `missing_capabilities=${review.missing_capabilities.length}`,
    `out=${outPath}`
  ].join('\n');
}

function visualReviewContext(planPackage, reviewInput) {
  return {
    viewLabel: reviewInput.view_label,
    validStepIds: (planPackage.design?.assembly_steps || []).map((step) => step.id),
    validPartIds: (planPackage.design?.parts || []).map((part) => part.id)
  };
}
