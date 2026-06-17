import { join } from 'node:path';
import { runLlmSandboxQueue } from '../src/generated/llmSandboxQueueRunner.js';

const queuePath = process.argv[2] || 'examples/idea-queue.json';
const outDir = process.argv[3] || join('generated', 'runs', `queue-${new Date().toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, 'Z')}`);

const result = await runLlmSandboxQueue({
  queuePath,
  outDir,
  maxJobs: process.env.LLM_QUEUE_MAX_JOBS,
  maxIterations: process.env.LLM_MAX_ITERATIONS,
  model: process.env.LLM_MODEL,
  baseUrl: process.env.LLM_BASE_URL,
  resume: process.env.LLM_QUEUE_RESUME === '1',
  streamModel: process.env.LLM_QUEUE_STREAM === '1',
  onEvent: (event) => {
    if (event.type === 'queue_job_start') {
      console.log(`start ${event.data.index + 1}: ${event.data.job.title}`);
    }
    if (event.type === 'queue_job_skipped') {
      console.log(`skip ${event.data.index + 1}: ${event.data.id} -> ${event.data.outcome}`);
    }
    if (event.type === 'queue_job_complete') {
      console.log(`done ${event.data.index + 1}: ${event.data.id} -> ${event.data.outcome}`);
    }
    if (event.type === 'queue_job_error') {
      console.log(`error ${event.data.index + 1}: ${event.data.id} -> ${event.data.error}`);
    }
  }
});

console.log([
  `queue=${result.title}`,
  `out_dir=${result.out_dir}`,
  `completed=${result.summary.completed_jobs}/${result.summary.total_jobs}`,
  `outcomes=${JSON.stringify(result.summary.counts)}`
].join('\n'));
