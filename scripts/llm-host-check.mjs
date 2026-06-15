import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const commands = [
  { name: 'ollama', candidates: ['ollama', localApp('Programs', 'Ollama', 'ollama.exe')], args: ['--version'] },
  { name: 'lms', candidates: ['lms'], args: ['--version'] },
  { name: 'llama-server', candidates: ['llama-server'], args: ['--version'] },
  { name: 'python', candidates: ['python'], args: ['--version'] },
  { name: 'nvidia-smi', candidates: ['nvidia-smi'], args: ['--query-gpu=name,memory.total,memory.free,driver_version', '--format=csv'] }
];

const endpoints = [
  { name: 'Ollama native', url: 'http://localhost:11434/api/tags' },
  { name: 'Ollama OpenAI-compatible', url: 'http://localhost:11434/v1/models' },
  { name: 'LM Studio OpenAI-compatible', url: 'http://localhost:1234/v1/models' },
  { name: 'vLLM OpenAI-compatible', url: 'http://localhost:8000/v1/models' },
  { name: 'llama.cpp OpenAI-compatible', url: 'http://localhost:8080/v1/models' }
];

console.log('Local command check');
console.log('===================');
for (const command of commands) {
  const { executable, result } = runFirstAvailable(command.candidates, command.args);
  const ok = result.status === 0;
  const output = `${result.stdout || result.stderr || ''}`.trim().split('\n').slice(0, 4).join('\n');
  console.log(`\n${ok ? 'OK' : 'MISS'} ${command.name}`);
  if (ok && executable !== command.name) console.log(`  ${executable}`);
  if (output) console.log(indent(output));
}

console.log('\nLocal endpoint check');
console.log('====================');
for (const endpoint of endpoints) {
  const response = await probe(endpoint.url);
  console.log(`\n${response.ok ? 'OK' : 'MISS'} ${endpoint.name}`);
  console.log(`  ${endpoint.url}`);
  if (response.detail) console.log(indent(response.detail));
}

async function probe(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    const text = await response.text();
    const detail = text ? summarizeJson(text) : `HTTP ${response.status}`;
    return { ok: response.ok, detail };
  } catch (error) {
    return { ok: false, detail: error.message };
  }
}

function summarizeJson(text) {
  try {
    const data = JSON.parse(text);
    const models = data.models || data.data || [];
    if (Array.isArray(models) && models.length) {
      return `models: ${models.map((model) => model.name || model.id || model.model).filter(Boolean).slice(0, 8).join(', ')}`;
    }
    return JSON.stringify(data).slice(0, 300);
  } catch {
    return text.slice(0, 300);
  }
}

function indent(text) {
  return text.split('\n').map((line) => `  ${line}`).join('\n');
}

function runFirstAvailable(candidates, args) {
  let last = null;
  for (const candidate of candidates) {
    if (candidate.includes('\\') && !existsSync(candidate)) continue;
    const result = spawnSync(candidate, args, { encoding: 'utf8', shell: false });
    last = result;
    if (result.status === 0) return { executable: candidate, result };
  }
  return { executable: candidates[0], result: last || { status: 1, stdout: '', stderr: '' } };
}

function localApp(...segments) {
  return process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, ...segments) : '';
}
