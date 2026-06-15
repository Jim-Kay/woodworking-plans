import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const child = spawn(process.execPath, ['scripts/design-sandbox-mcp.mjs', 'examples/tray-bird-feeder.scenario.json'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = Buffer.alloc(0);
const responses = new Map();

child.stdout.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  drainResponses();
});

let stderr = '';
child.stderr.on('data', (chunk) => {
  stderr += chunk.toString('utf8');
});

try {
  const initialized = await request('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'sandbox-test', version: '0.1.0' }
  });
  assert.equal(initialized.serverInfo.name, 'woodworking-design-sandbox');
  assert.equal(initialized.capabilities.tools instanceof Object, true);

  notify('notifications/initialized', {});

  const listed = await request('tools/list', {});
  assert.equal(listed.tools.some((tool) => tool.name === 'generate_design'), true);
  assert.equal(listed.tools.some((tool) => tool.name === 'export_plan_package'), true);

  const generated = await callTool('generate_design', { parameters: { width_in: 14 } });
  assert.equal(generated.ok, true);
  assert.equal(generated.summary.parameters.width_in, 14);

  const validation = await callTool('validate_design', {});
  assert.equal(validation.ok, true);
  assert.equal(validation.status, 'valid');

  const exported = await callTool('export_plan_package', {});
  assert.equal(exported.ok, true);
  assert.equal(exported.publishability.ok, true);

  child.stdin.end();
  child.kill();
} catch (error) {
  child.kill();
  throw error;
}

const closed = once(child, 'close');
const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('MCP server did not exit.')), 3000));
await Promise.race([closed, timeout]);
assert.equal(stderr.trim(), '');
console.log('sandbox MCP server tests passed');

function callTool(name, args) {
  return request('tools/call', { name, arguments: args }).then((result) => {
    assert.equal(Array.isArray(result.content), true);
    const text = result.content.find((item) => item.type === 'text')?.text;
    assert.equal(typeof text, 'string');
    return JSON.parse(text);
  });
}

function request(method, params) {
  const id = responses.size + 1;
  const message = { jsonrpc: '2.0', id, method, params };
  writeMessage(message);
  return new Promise((resolve, reject) => {
    responses.set(id, { resolve, reject });
    setTimeout(() => {
      if (!responses.has(id)) return;
      responses.delete(id);
      reject(new Error(`Timed out waiting for ${method}.`));
    }, 5000);
  });
}

function notify(method, params) {
  writeMessage({ jsonrpc: '2.0', method, params });
}

function writeMessage(message) {
  const body = JSON.stringify(message);
  child.stdin.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`);
}

function drainResponses() {
  for (;;) {
    const parsed = readMessage(buffer);
    if (!parsed) return;
    buffer = parsed.remaining;
    const pending = responses.get(parsed.message.id);
    if (!pending) continue;
    responses.delete(parsed.message.id);
    if (parsed.message.error) pending.reject(new Error(parsed.message.error.message));
    else pending.resolve(parsed.message.result);
  }
}

function readMessage(source) {
  const headerEnd = source.indexOf('\r\n\r\n');
  if (headerEnd < 0) return null;
  const header = source.subarray(0, headerEnd).toString('utf8');
  const match = /^Content-Length:\s*(\d+)/im.exec(header);
  if (!match) throw new Error('Missing Content-Length header.');
  const length = Number(match[1]);
  const bodyStart = headerEnd + 4;
  const bodyEnd = bodyStart + length;
  if (source.length < bodyEnd) return null;
  return {
    message: JSON.parse(source.subarray(bodyStart, bodyEnd).toString('utf8')),
    remaining: source.subarray(bodyEnd)
  };
}
