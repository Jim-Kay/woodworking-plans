import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  PACKAGE_REVIEW_ROLES,
  PACKAGE_REVIEW_SCHEMA,
  buildPackageReviewInput,
  buildReviewMessages,
  normalizePackageReview,
  summarizePackageReviews
} from '../src/generated/review.js';
import { readJson, writeJson } from '../src/generated/sandbox.js';

const baseUrl = (process.env.LLM_BASE_URL || 'http://localhost:11434/v1').replace(/\/$/, '');
const model = process.env.LLM_MODEL || 'qwen3:14b';
const packageDir = process.argv[2] || 'generated/runs/qwen-tool-surface-check-2/package';
const outPath = process.argv[3] || join(dirname(packageDir), 'package-review.json');

const planPackage = await readPlanPackage(packageDir);
const reviewInput = buildPackageReviewInput(planPackage);
const reviews = [];

for (const role of PACKAGE_REVIEW_ROLES) {
  const raw = await runRoleReview(role, reviewInput);
  reviews.push(normalizePackageReview(role.id, raw));
}

const report = {
  model,
  base_url: baseUrl,
  package_dir: packageDir,
  reviews,
  summary: summarizePackageReviews(reviews)
};

await writeJson(outPath, report);
console.log(summaryText(report));

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

async function runRoleReview(role, input) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.LLM_API_KEY || 'ollama'}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: buildReviewMessages(role, input),
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'generated_package_review',
          strict: true,
          schema: PACKAGE_REVIEW_SCHEMA
        }
      }
    })
  });

  if (!response.ok) throw new Error(`${role.id} review failed with HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return parseJson(data.choices?.[0]?.message?.content || '');
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Review response was not parseable JSON.');
    return JSON.parse(match[0]);
  }
}

function summaryText(report) {
  return [
    `model=${report.model}`,
    `package=${report.package_dir}`,
    `reviews=${report.summary.review_count}`,
    `ok_to_publish=${report.summary.ok_to_publish}`,
    `errors=${report.summary.error_count}`,
    `warnings=${report.summary.warning_count}`,
    `missing_capabilities=${report.summary.missing_capabilities.length}`,
    `out=${outPath}`
  ].join('\n');
}
