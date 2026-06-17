import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classifyQueueOutcome, normalizeIdeaQueue, runLlmSandboxQueue } from '../src/generated/llmSandboxQueueRunner.js';
import { writeJson } from '../src/generated/sandbox.js';

assert.equal(classifyQueueOutcome({ state: { finalPackage: { publishability: { ok: true } } } }), 'published_candidate');
assert.equal(classifyQueueOutcome({ state: { compositionProposal: {} } }), 'composition_proposal');
assert.equal(classifyQueueOutcome({ state: { capabilityRequest: {} } }), 'capability_request');
assert.equal(classifyQueueOutcome({ state: { design: {} } }), 'generated_needs_review');
assert.equal(classifyQueueOutcome({ state: {} }), 'failed_loop');

const normalized = normalizeIdeaQueue({
  title: 'Queue Test',
  defaults: { model: 'qwen-test', base_url: 'http://localhost:1234/v1', max_iterations: 3 },
  jobs: [
    {
      title: 'Inline Plan',
      scenario: {
        template_id: 'tray_bird_feeder',
        design_id: 'inline_plan'
      }
    },
    {
      id: 'path-job',
      scenario_path: 'examples/tray-bird-feeder.scenario.json'
    }
  ]
});
assert.equal(normalized.title, 'Queue Test');
assert.equal(normalized.defaults.model, 'qwen-test');
assert.equal(normalized.defaults.baseUrl, 'http://localhost:1234/v1');
assert.equal(normalized.defaults.maxIterations, 3);
assert.equal(normalized.jobs[0].id, 'inline-plan');
assert.equal(normalized.jobs[1].scenario_path, 'examples/tray-bird-feeder.scenario.json');

const tempRoot = await mkdtemp(join(tmpdir(), 'woodworking-queue-test-'));
const queuePath = join(tempRoot, 'queue.json');
const outDir = join(tempRoot, 'out');
await writeJson(queuePath, {
  title: 'Fake LLM Queue',
  defaults: { model: 'fake-model', baseUrl: 'http://fake.local/v1', maxIterations: 2 },
  jobs: [
    {
      id: 'publishable-job',
      title: 'Publishable Job',
      scenario: { template_id: 'tray_bird_feeder', design_id: 'publishable_job' }
    },
    {
      id: 'proposal-job',
      title: 'Proposal Job',
      scenario: { template_id: 'floating_frame_strainer_on_rabbet', design_id: 'proposal_job' }
    }
  ]
});

const calls = [];
const events = [];
const index = await runLlmSandboxQueue({
  queuePath,
  outDir,
  loopRunner: async (options) => {
    calls.push(options);
    if (calls.length === 1) {
      return {
        transcript: [{ action: 'export_plan_package' }],
        state: {
          finalPackage: {
            design: { design_id: 'publishable_job' },
            validation: { status: 'valid' },
            publishability: { ok: true }
          }
        }
      };
    }
    return {
      transcript: [{ action: 'propose_component_composition' }],
      state: {
        compositionProposal: {
          template_id: 'floating_frame_strainer_on_rabbet'
        }
      }
    };
  },
  onEvent: (event) => events.push(event)
});

assert.equal(calls.length, 2);
assert.match(calls[0].scenarioPath, /scenario\.input\.json$/);
assert.equal(calls[0].model, 'fake-model');
assert.equal(calls[0].maxIterations, 2);
assert.equal(index.summary.completed_jobs, 2);
assert.equal(index.summary.counts.published_candidate, 1);
assert.equal(index.summary.counts.composition_proposal, 1);
assert.equal(index.review_queues.published_candidates[0].id, 'publishable-job');
assert.equal(index.review_queues.composition_proposals[0].id, 'proposal-job');
assert.equal(index.review_items[0].id, 'proposal-job');
assert.equal(index.review_items[1].id, 'publishable-job');
assert.equal(index.results[0].artifacts.package.endsWith(join('01-publishable-job', 'package')), true);
assert.equal(typeof index.results[0].duration_ms, 'number');
assert.equal(events.some((event) => event.type === 'queue_complete'), true);

const writtenIndex = JSON.parse(await readFile(join(outDir, 'index.json'), 'utf8'));
assert.equal(writtenIndex.title, 'Fake LLM Queue');
const summary = await readFile(join(outDir, 'summary.txt'), 'utf8');
assert.match(summary, /published_candidates=1/);
assert.match(summary, /composition_proposals=1/);
assert.match(summary, /generated_needs_review=0/);
const review = await readFile(join(outDir, 'review.md'), 'utf8');
assert.match(review, /# Fake LLM Queue/);
assert.match(review, /Composition proposal/);

const resumeCalls = [];
const resumed = await runLlmSandboxQueue({
  queuePath,
  outDir,
  resume: true,
  loopRunner: async (options) => {
    resumeCalls.push(options);
    return { transcript: [], state: {} };
  }
});
assert.equal(resumeCalls.length, 0);
assert.equal(resumed.results.length, 2);
assert.equal(resumed.results.every((result) => result.resumed === true), true);
assert.equal(resumed.review_queues.published_candidates[0].resumed, true);

console.log('llm sandbox queue tests passed');
