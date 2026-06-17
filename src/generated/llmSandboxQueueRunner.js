import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { runLlmSandboxLoop } from './llmSandboxLoopRunner.js';
import { writeJson } from './sandbox.js';

export async function runLlmSandboxQueue(options = {}) {
  const queuePath = options.queuePath || 'examples/idea-queue.json';
  const queue = normalizeIdeaQueue(JSON.parse(await readFile(queuePath, 'utf8')));
  const outDir = options.outDir || join('generated', 'runs', `queue-${new Date().toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, 'Z')}`);
  const maxJobs = Number(options.maxJobs || process.env.LLM_QUEUE_MAX_JOBS || queue.jobs.length);
  const onEvent = typeof options.onEvent === 'function' ? options.onEvent : () => {};
  const loopRunner = options.loopRunner || runLlmSandboxLoop;
  const startedAt = new Date().toISOString();
  const results = [];

  await mkdir(outDir, { recursive: true });
  await writeJson(join(outDir, 'queue.json'), queue);
  emit(onEvent, 'queue_start', { queue_path: queuePath, out_dir: outDir, job_count: queue.jobs.length, max_jobs: maxJobs });

  for (const [index, job] of queue.jobs.slice(0, maxJobs).entries()) {
    const jobOutDir = join(outDir, `${String(index + 1).padStart(2, '0')}-${slug(job.id)}`);
    const scenarioPath = await scenarioPathForJob(job, jobOutDir);
    emit(onEvent, 'queue_job_start', { index, job, scenario_path: scenarioPath, out_dir: jobOutDir });

    try {
      const loopResult = await loopRunner({
        ...queue.defaults,
        ...options.loopOptions,
        scenarioPath,
        outDir: jobOutDir,
        model: options.model || job.model || queue.defaults.model,
        baseUrl: options.baseUrl || queue.defaults.baseUrl,
        maxIterations: job.max_iterations || options.maxIterations || queue.defaults.maxIterations,
        streamModel: options.streamModel === true,
        onEvent: (event) => emit(onEvent, 'queue_job_event', { index, job_id: job.id, event })
      });
      const result = summarizeQueueJob({ index, job, jobOutDir, scenarioPath, loopResult });
      results.push(result);
      emit(onEvent, 'queue_job_complete', result);
    } catch (error) {
      const result = {
        index,
        id: job.id,
        title: job.title,
        scenario_path: scenarioPath,
        out_dir: jobOutDir,
        outcome: 'failed_loop',
        error: error.message,
        artifacts: {},
        review_priority: job.priority || 'normal'
      };
      results.push(result);
      emit(onEvent, 'queue_job_error', result);
    }

    await writeJson(join(outDir, 'index.json'), queueIndex({ queuePath, queue, outDir, startedAt, results }));
  }

  const index = queueIndex({ queuePath, queue, outDir, startedAt, results, finishedAt: new Date().toISOString() });
  await writeJson(join(outDir, 'index.json'), index);
  await writeFile(join(outDir, 'summary.txt'), queueSummary(index), 'utf8');
  emit(onEvent, 'queue_complete', index.summary);
  return index;
}

export function normalizeIdeaQueue(value = {}) {
  const rawJobs = Array.isArray(value) ? value : value.jobs || [];
  const defaults = {
    model: value.defaults?.model || process.env.LLM_MODEL || 'qwen3:14b',
    baseUrl: value.defaults?.baseUrl || value.defaults?.base_url || process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
    maxIterations: Number(value.defaults?.maxIterations || value.defaults?.max_iterations || process.env.LLM_MAX_ITERATIONS || 8)
  };
  return {
    schema_version: value.schema_version || '0.1',
    title: value.title || 'Local LLM woodworking idea queue',
    defaults,
    jobs: rawJobs.map((job, index) => normalizeQueueJob(job, index))
  };
}

export function classifyQueueOutcome(loopResult) {
  const state = loopResult?.state || {};
  if (state.finalPackage?.publishability?.ok) return 'published_candidate';
  if (state.compositionProposal) return 'composition_proposal';
  if (state.capabilityRequest) return 'capability_request';
  if (state.design) return 'generated_needs_review';
  return 'failed_loop';
}

function normalizeQueueJob(job = {}, index) {
  const id = job.id || job.design_id || job.scenario?.design_id || job.title || `idea-${index + 1}`;
  return {
    id: slug(id),
    title: job.title || job.intent || job.scenario?.intent || id,
    priority: job.priority || 'normal',
    scenario_path: job.scenario_path || job.scenarioPath || null,
    scenario: job.scenario || null,
    model: job.model || null,
    max_iterations: job.max_iterations || job.maxIterations || null,
    notes: job.notes || ''
  };
}

async function scenarioPathForJob(job, jobOutDir) {
  await mkdir(jobOutDir, { recursive: true });
  if (job.scenario_path) return job.scenario_path;
  if (!job.scenario) throw new Error(`Queue job ${job.id} needs scenario_path or scenario.`);
  const scenarioPath = join(jobOutDir, 'scenario.input.json');
  await writeJson(scenarioPath, {
    design_id: job.scenario.design_id || job.id,
    ...job.scenario
  });
  return scenarioPath;
}

function summarizeQueueJob({ index, job, jobOutDir, scenarioPath, loopResult }) {
  const outcome = classifyQueueOutcome(loopResult);
  const state = loopResult.state || {};
  return {
    index,
    id: job.id,
    title: job.title,
    scenario_path: scenarioPath,
    out_dir: jobOutDir,
    outcome,
    iterations: loopResult.transcript?.length || 0,
    design_id: state.design?.design_id || state.finalPackage?.design?.design_id || null,
    validation_status: state.validation?.status || state.finalPackage?.validation?.status || null,
    publishable: Boolean(state.finalPackage?.publishability?.ok),
    review_priority: reviewPriorityForOutcome(outcome, job),
    artifacts: {
      design: state.design ? join(jobOutDir, 'design.json') : null,
      package: state.finalPackage ? join(jobOutDir, 'package') : null,
      composition_proposal: state.compositionProposal ? join(jobOutDir, 'composition-proposal.json') : null,
      capability_request: state.capabilityRequest ? join(jobOutDir, 'capability-request.json') : null,
      transcript: join(jobOutDir, 'transcript.json')
    },
    next_action: nextActionForOutcome(outcome)
  };
}

function reviewPriorityForOutcome(outcome, job) {
  if (job.priority && job.priority !== 'normal') return job.priority;
  if (outcome === 'published_candidate') return 'high';
  if (outcome === 'composition_proposal') return 'high';
  if (outcome === 'capability_request') return 'normal';
  return 'low';
}

function nextActionForOutcome(outcome) {
  return ({
    published_candidate: 'Codex/human review of exported package before catalog publication.',
    composition_proposal: 'Codex review of composition proposal; approve, revise, or implement reusable deterministic support.',
    capability_request: 'Codex triage of missing component/tool/renderer request.',
    generated_needs_review: 'Inspect generated design and deterministic reviews; decide whether to continue or request capability.',
    failed_loop: 'Inspect transcript for prompt/tool-schema improvements or discard idea.'
  })[outcome] || 'Inspect transcript.';
}

function queueIndex({ queuePath, queue, outDir, startedAt, results, finishedAt = null }) {
  const counts = {};
  for (const result of results) counts[result.outcome] = (counts[result.outcome] || 0) + 1;
  return {
    schema_version: '0.1',
    queue_path: queuePath,
    title: queue.title,
    out_dir: outDir,
    started_at: startedAt,
    finished_at: finishedAt,
    summary: {
      total_jobs: queue.jobs.length,
      completed_jobs: results.length,
      counts
    },
    review_queues: {
      published_candidates: results.filter((item) => item.outcome === 'published_candidate').map(reviewQueueItem),
      composition_proposals: results.filter((item) => item.outcome === 'composition_proposal').map(reviewQueueItem),
      capability_requests: results.filter((item) => item.outcome === 'capability_request').map(reviewQueueItem),
      generated_needs_review: results.filter((item) => item.outcome === 'generated_needs_review').map(reviewQueueItem),
      failed_loops: results.filter((item) => item.outcome === 'failed_loop').map(reviewQueueItem)
    },
    results
  };
}

function reviewQueueItem(item) {
  return {
    id: item.id,
    title: item.title,
    outcome: item.outcome,
    priority: item.review_priority,
    out_dir: item.out_dir,
    artifacts: item.artifacts,
    next_action: item.next_action
  };
}

function queueSummary(index) {
  const counts = index.summary.counts;
  return [
    `queue=${index.title}`,
    `out_dir=${index.out_dir}`,
    `completed=${index.summary.completed_jobs}/${index.summary.total_jobs}`,
    `published_candidates=${counts.published_candidate || 0}`,
    `composition_proposals=${counts.composition_proposal || 0}`,
    `capability_requests=${counts.capability_request || 0}`,
    `generated_needs_review=${counts.generated_needs_review || 0}`,
    `failed_loops=${counts.failed_loop || 0}`
  ].join('\n');
}

function slug(value) {
  return String(value || 'idea')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'idea';
}

function emit(onEvent, type, data) {
  onEvent({ type, data, at: new Date().toISOString() });
}
