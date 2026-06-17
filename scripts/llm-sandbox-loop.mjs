import { join } from 'node:path';
import { runLlmSandboxLoop } from '../src/generated/llmSandboxLoopRunner.js';

const scenarioPath = process.argv[2] || 'examples/tray-bird-feeder.scenario.json';
const outDir = process.argv[3] || join('generated', 'runs', `llm-${new Date().toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, 'Z')}`);

const result = await runLlmSandboxLoop({ scenarioPath, outDir });
console.log(result.summary);
