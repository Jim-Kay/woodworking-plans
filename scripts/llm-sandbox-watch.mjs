import http from 'node:http';
import { join } from 'node:path';
import { runLlmSandboxLoop } from '../src/generated/llmSandboxLoopRunner.js';

const port = Number(process.env.LLM_WATCH_PORT || process.env.PORT || 8787);
const defaultScenario = process.env.LLM_WATCH_SCENARIO || 'examples/tray-bird-feeder.scenario.json';
const defaultModel = process.env.LLM_MODEL || 'qwen3:14b';
const defaultBaseUrl = process.env.LLM_BASE_URL || 'http://localhost:11434/v1';

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `localhost:${port}`}`);
  if (url.pathname === '/') return sendHtml(response);
  if (url.pathname === '/events') return streamRun(url, request, response);
  if (url.pathname === '/health') return sendJson(response, { ok: true });
  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  response.end('Not found');
});

server.listen(port, () => {
  console.log(`LLM sandbox watcher: http://localhost:${port}`);
});

function streamRun(url, request, response) {
  response.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no'
  });
  response.write(': connected\n\n');

  let closed = false;
  request.on('close', () => {
    closed = true;
  });

  const scenarioPath = url.searchParams.get('scenario') || defaultScenario;
  const model = url.searchParams.get('model') || defaultModel;
  const baseUrl = url.searchParams.get('baseUrl') || defaultBaseUrl;
  const maxIterations = Number(url.searchParams.get('maxIterations') || process.env.LLM_MAX_ITERATIONS || 8);
  const outDir = url.searchParams.get('outDir') || join('generated', 'runs', `watch-${new Date().toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, 'Z')}`);

  runLlmSandboxLoop({
    scenarioPath,
    outDir,
    model,
    baseUrl,
    maxIterations,
    streamModel: true,
    onEvent: (event) => {
      if (!closed) writeEvent(response, event.type, event);
    }
  }).catch((error) => {
    if (!closed) writeEvent(response, 'error', { type: 'error', at: new Date().toISOString(), data: { message: error.message, stack: error.stack } });
  }).finally(() => {
    if (!closed) response.end();
  });
}

function writeEvent(response, eventName, payload) {
  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function sendJson(response, value) {
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function sendHtml(response) {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Local LLM Sandbox Watcher</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b0f16;
      --panel: #121824;
      --panel-2: #171f2d;
      --text: #e7edf7;
      --muted: #98a6ba;
      --line: #273244;
      --accent: #66d9a5;
      --warn: #f8c36a;
      --error: #ff7a90;
      --code: #0e141f;
    }
    * { box-sizing: border-box; }
    html {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }
    body {
      margin: 0;
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
      background: var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
    }
    header {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 16px;
      align-items: center;
      padding: 14px 18px;
      border-bottom: 1px solid var(--line);
      background: #0d121b;
      position: sticky;
      top: 0;
      z-index: 2;
    }
    h1 {
      min-width: max-content;
      font-size: 17px;
      margin: 0;
      font-weight: 700;
      letter-spacing: 0;
    }
    form {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) minmax(150px, .6fr) 100px 76px 76px;
      gap: 8px;
      width: 100%;
      align-items: center;
      min-width: 0;
    }
    input, button {
      height: 36px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel);
      color: var(--text);
      padding: 0 10px;
      font: inherit;
      min-width: 0;
    }
    button {
      background: #1d6f4f;
      border-color: #2f9f73;
      cursor: pointer;
      font-weight: 700;
    }
    button.secondary {
      background: var(--panel-2);
      border-color: var(--line);
    }
    main {
      display: grid;
      grid-template-columns: minmax(300px, 440px) 1fr;
      width: 100%;
      max-width: 100%;
      min-height: calc(100vh - 65px);
      overflow: hidden;
    }
    aside, section {
      min-width: 0;
      padding: 16px;
    }
    aside {
      border-right: 1px solid var(--line);
      background: #0d121b;
    }
    .status {
      display: grid;
      gap: 10px;
      margin-bottom: 16px;
      min-width: 0;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      max-width: 100%;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 4px 9px;
      color: var(--muted);
      background: var(--panel);
      overflow-wrap: anywhere;
    }
    .pill.running { color: var(--accent); border-color: #2f9f73; }
    .pill.error { color: var(--error); border-color: #904051; }
    .card {
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      overflow: hidden;
    }
    .card h2 {
      margin: 0;
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      font-size: 13px;
      color: var(--muted);
      text-transform: uppercase;
    }
    .list {
      display: grid;
      gap: 8px;
      padding: 10px;
      max-height: 52vh;
      overflow: auto;
      min-width: 0;
    }
    .event {
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel-2);
      padding: 8px;
    }
    .event b { display: block; margin-bottom: 5px; }
    .event small { color: var(--muted); }
    pre {
      max-width: 100%;
      min-width: 0;
      overflow-x: auto;
    }
    .event pre, .log pre, .tokens {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: break-word;
      margin: 6px 0 0;
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
      color: #d8e2f0;
    }
    .console {
      display: grid;
      grid-template-rows: minmax(220px, 45vh) minmax(220px, 1fr);
      gap: 16px;
      height: calc(100vh - 97px);
      min-width: 0;
      overflow: hidden;
    }
    .console > div {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }
    .console h2 {
      margin: 0 0 10px;
    }
    .tokens, .log {
      min-width: 0;
      min-height: 0;
      padding: 12px;
      overflow: auto;
      background: var(--code);
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    .tokens { color: #bcebd5; }
    .log-line {
      min-width: 0;
      border-bottom: 1px solid rgba(255,255,255,.06);
      padding: 8px 0;
    }
    .log-line:last-child { border-bottom: 0; }
    .warn { color: var(--warn); }
    .error { color: var(--error); }
    @media (max-width: 860px) {
      header { display: grid; }
      form { grid-template-columns: 1fr; }
      main { grid-template-columns: 1fr; }
      aside { border-right: 0; border-bottom: 1px solid var(--line); }
      .console { height: auto; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Local LLM Sandbox Watcher</h1>
    <form id="runForm">
      <input id="scenario" value="${escapeHtml(defaultScenario)}" aria-label="Scenario path">
      <input id="model" value="${escapeHtml(defaultModel)}" aria-label="Model">
      <input id="maxIterations" value="8" aria-label="Max iterations">
      <button id="startButton" type="submit">Start</button>
      <button class="secondary" id="stopButton" type="button">Stop</button>
    </form>
  </header>
  <main>
    <aside>
      <div class="status">
        <span id="runState" class="pill">Idle</span>
        <span id="runMeta" class="pill">No run yet</span>
      </div>
      <div class="card">
        <h2>Actions</h2>
        <div id="actions" class="list"></div>
      </div>
    </aside>
    <section class="console">
      <div>
        <h2>Model Stream</h2>
        <div id="tokens" class="tokens"></div>
      </div>
      <div>
        <h2>Event Log</h2>
        <div id="log" class="log"></div>
      </div>
    </section>
  </main>
  <script>
    const form = document.getElementById('runForm');
    const scenario = document.getElementById('scenario');
    const model = document.getElementById('model');
    const maxIterations = document.getElementById('maxIterations');
    const stopButton = document.getElementById('stopButton');
    const state = document.getElementById('runState');
    const meta = document.getElementById('runMeta');
    const actions = document.getElementById('actions');
    const tokens = document.getElementById('tokens');
    const log = document.getElementById('log');
    let source = null;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (source) source.close();
      actions.innerHTML = '';
      tokens.textContent = '';
      log.innerHTML = '';
      setState('Running', 'running');
      const params = new URLSearchParams({
        scenario: scenario.value,
        model: model.value,
        maxIterations: maxIterations.value
      });
      source = new EventSource('/events?' + params.toString());
      const names = ['run_start', 'iteration_start', 'model_token', 'model_content', 'model_action', 'tool_start', 'tool_result', 'artifact', 'visual_review', 'run_complete', 'error'];
      for (const name of names) source.addEventListener(name, (event) => handleEvent(name, JSON.parse(event.data)));
      source.onerror = () => {
        if (state.textContent !== 'Complete') setState('Disconnected', 'error');
      };
    });

    stopButton.addEventListener('click', () => {
      if (source) source.close();
      source = null;
      setState('Stopped', '');
    });

    function handleEvent(name, payload) {
      if (name === 'model_token') {
        tokens.textContent += payload.data.text;
        tokens.scrollTop = tokens.scrollHeight;
        return;
      }
      if (name === 'run_start') {
        meta.textContent = payload.data.out_dir;
      }
      if (name === 'model_action') addAction(payload.data);
      if (name === 'run_complete') {
        setState('Complete', '');
        if (source) source.close();
      }
      if (name === 'error') setState('Error', 'error');
      addLog(name, payload);
    }

    function addAction(data) {
      const item = document.createElement('div');
      item.className = 'event';
      item.innerHTML = '<b>' + escapeText(data.action || data.tool_call?.name || 'action') + '</b>'
        + '<small>iteration ' + data.iteration + '</small>'
        + '<pre>' + escapeText(JSON.stringify(data.tool_call || {}, null, 2)) + '</pre>';
      actions.prepend(item);
    }

    function addLog(name, payload) {
      const item = document.createElement('div');
      item.className = 'log-line' + (name === 'error' ? ' error' : '');
      item.innerHTML = '<b>' + escapeText(name) + '</b> <small>' + escapeText(payload.at || '') + '</small>'
        + '<pre>' + escapeText(JSON.stringify(payload.data, null, 2)) + '</pre>';
      log.prepend(item);
    }

    function setState(text, klass) {
      state.textContent = text;
      state.className = 'pill ' + klass;
    }

    function escapeText(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }
  </script>
</body>
</html>`);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
