import { readFile } from 'node:fs/promises';
import {
  executeSandboxTool,
  listSandboxTools,
  readJson
} from '../src/generated/sandbox.js';

const serverInfo = {
  name: 'woodworking-design-sandbox',
  version: '0.1.0'
};

const scenarioPath = process.argv[2] || process.env.SANDBOX_SCENARIO_PATH || null;
const state = {
  scenario: scenarioPath ? await readJson(scenarioPath) : null,
  design: null,
  validation: null,
  finalPackage: null,
  capabilityRequest: null
};

let buffer = Buffer.alloc(0);

process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  drainMessages().catch((error) => {
    send({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: error.message }
    });
  });
});

process.stdin.resume();

async function drainMessages() {
  for (;;) {
    const parsed = readMessage(buffer);
    if (!parsed) return;
    buffer = parsed.remaining;
    await handleMessage(parsed.message);
  }
}

async function handleMessage(message) {
  if (message.method?.startsWith('notifications/')) return;
  const id = message.id ?? null;
  try {
    if (message.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: message.params?.protocolVersion || '2024-11-05',
          capabilities: { tools: {} },
          serverInfo
        }
      });
      return;
    }

    if (message.method === 'tools/list') {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          tools: listSandboxTools().map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.input_schema
          }))
        }
      });
      return;
    }

    if (message.method === 'tools/call') {
      const params = message.params || {};
      const executed = executeSandboxTool({
        name: params.name,
        arguments: params.arguments || {}
      }, state);
      Object.assign(state, executed.state);
      send({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(executed.result, null, 2)
            }
          ],
          isError: executed.result?.ok === false
        }
      });
      return;
    }

    send({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Unsupported method: ${message.method || 'unknown'}` }
    });
  } catch (error) {
    send({
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: error.message }
    });
  }
}

function readMessage(source) {
  const headerEnd = source.indexOf('\r\n\r\n');
  if (headerEnd >= 0) {
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

  const newline = source.indexOf('\n');
  if (newline < 0) return null;
  const line = source.subarray(0, newline).toString('utf8').trim();
  if (!line) return { message: {}, remaining: source.subarray(newline + 1) };
  return {
    message: JSON.parse(line),
    remaining: source.subarray(newline + 1)
  };
}

function send(message) {
  const body = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`);
}
