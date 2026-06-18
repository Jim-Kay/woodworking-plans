import http from 'node:http';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { runLlmSandboxLoop } from '../src/generated/llmSandboxLoopRunner.js';
import { runLlmSandboxQueue } from '../src/generated/llmSandboxQueueRunner.js';

const port = Number(process.env.LLM_WATCH_PORT || process.env.PORT || 8787);
const defaultScenario = process.env.LLM_WATCH_SCENARIO || 'examples/tray-bird-feeder.scenario.json';
const defaultQueue = process.env.LLM_WATCH_QUEUE || 'examples/relationship-stress-queue.json';
const defaultModel = process.env.LLM_MODEL || 'qwen3:14b';
const defaultBaseUrl = process.env.LLM_BASE_URL || 'http://localhost:11434/v1';

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `localhost:${port}`}`);
  if (url.pathname === '/') return sendHtml(response);
  if (url.pathname === '/events') return streamRun(url, request, response);
  if (url.pathname === '/presets') return sendJson(response, await listRunPresets());
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

  const mode = url.searchParams.get('mode') || 'queue';
  const scenarioPath = url.searchParams.get('scenario') || defaultScenario;
  const queuePath = url.searchParams.get('queue') || defaultQueue;
  const model = url.searchParams.get('model') || defaultModel;
  const baseUrl = url.searchParams.get('baseUrl') || defaultBaseUrl;
  const maxIterations = Number(url.searchParams.get('maxIterations') || process.env.LLM_MAX_ITERATIONS || 8);
  const maxJobs = Number(url.searchParams.get('maxJobs') || process.env.LLM_QUEUE_MAX_JOBS || 0) || null;
  const outDir = url.searchParams.get('outDir') || join('generated', 'runs', `watch-${new Date().toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, 'Z')}`);

  const onEvent = (event) => {
    if (closed) return;
    writeEvent(response, event.type, event);
    if (event.type === 'queue_job_event') {
      const inner = event.data?.event;
      if (inner?.type) {
        writeEvent(response, inner.type, {
          ...inner,
          data: {
            ...(inner.data || {}),
            queue_job_id: event.data.job_id,
            queue_job_index: event.data.index
          }
        });
      }
    }
  };

  const run = mode === 'scenario'
    ? runLlmSandboxLoop({
      scenarioPath,
      outDir,
      model,
      baseUrl,
      maxIterations,
      streamModel: true,
      onEvent
    })
    : runLlmSandboxQueue({
      queuePath,
      outDir,
      model,
      baseUrl,
      maxJobs,
      maxIterations,
      streamModel: true,
      onEvent
    });

  run.catch((error) => {
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
      grid-template-columns: 110px minmax(160px, .5fr) minmax(260px, 1fr) minmax(140px, .45fr) 86px 86px 76px 76px;
      gap: 8px;
      width: 100%;
      align-items: center;
      min-width: 0;
    }
    input, select, button {
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
      grid-template-rows: minmax(360px, 1fr) minmax(180px, 30vh);
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
    .tokens, .chat, .log {
      min-width: 0;
      min-height: 0;
      padding: 12px;
      overflow: auto;
      background: var(--code);
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    .tokens { color: #bcebd5; }
    .chat {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .message {
      max-width: 980px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
      background: var(--panel-2);
    }
    .message.prompt {
      align-self: flex-start;
      border-color: #3c5380;
      background: #101a2b;
    }
    .message.model {
      align-self: flex-start;
      border-color: #2f7b62;
      background: #0e201a;
    }
    .message.tool {
      align-self: flex-end;
      border-color: #6f5d2b;
      background: #211c0f;
    }
    .message.result {
      align-self: flex-end;
      border-color: #485266;
      background: #141b28;
    }
    .message.error {
      border-color: #904051;
      background: #27131b;
    }
    .message header {
      position: static;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 0 0 6px;
      border: 0;
      background: transparent;
    }
    .message h3 {
      margin: 0;
      font-size: 13px;
    }
    .message small {
      color: var(--muted);
      overflow-wrap: anywhere;
    }
    .message pre {
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: break-word;
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
      color: #d8e2f0;
    }
    .jobs {
      margin-bottom: 16px;
    }
    .job {
      display: grid;
      gap: 3px;
      padding: 8px 10px;
      border-bottom: 1px solid var(--line);
    }
    .job:last-child { border-bottom: 0; }
    .job small { color: var(--muted); }
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
      <select id="mode" aria-label="Run mode">
        <option value="queue" selected>Queue</option>
        <option value="scenario">Scenario</option>
      </select>
      <select id="preset" aria-label="Preset"></select>
      <input id="path" value="${escapeHtml(defaultQueue)}" aria-label="Scenario or queue path">
      <input id="model" value="${escapeHtml(defaultModel)}" aria-label="Model">
      <input id="maxIterations" value="8" aria-label="Max iterations">
      <input id="maxJobs" value="" aria-label="Max jobs" title="Queue jobs; blank runs all">
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
      <div class="card jobs">
        <h2>Jobs</h2>
        <div id="jobs" class="list"></div>
      </div>
      <div class="card">
        <h2>Actions</h2>
        <div id="actions" class="list"></div>
      </div>
    </aside>
    <section class="console">
      <div>
        <h2>Live Transcript</h2>
        <div id="chat" class="chat"></div>
      </div>
      <div>
        <h2>Event Log</h2>
        <div id="log" class="log"></div>
      </div>
    </section>
  </main>
  <script>
    const form = document.getElementById('runForm');
    const mode = document.getElementById('mode');
    const preset = document.getElementById('preset');
    const path = document.getElementById('path');
    const model = document.getElementById('model');
    const maxIterations = document.getElementById('maxIterations');
    const maxJobs = document.getElementById('maxJobs');
    const stopButton = document.getElementById('stopButton');
    const state = document.getElementById('runState');
    const meta = document.getElementById('runMeta');
    const jobs = document.getElementById('jobs');
    const actions = document.getElementById('actions');
    const chat = document.getElementById('chat');
    const log = document.getElementById('log');
    let source = null;
    let activeModelMessage = null;
    let presets = { queues: [], scenarios: [] };

    loadPresets();

    mode.addEventListener('change', () => {
      path.value = mode.value === 'queue' ? '${escapeJs(defaultQueue)}' : '${escapeJs(defaultScenario)}';
      maxJobs.disabled = mode.value !== 'queue';
      renderPresets();
    });

    preset.addEventListener('change', () => {
      if (preset.value) path.value = preset.value;
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (source) source.close();
      jobs.innerHTML = '';
      actions.innerHTML = '';
      chat.innerHTML = '';
      log.innerHTML = '';
      activeModelMessage = null;
      setState('Running', 'running');
      const params = new URLSearchParams({
        mode: mode.value,
        model: model.value,
        maxIterations: maxIterations.value
      });
      if (mode.value === 'queue') {
        params.set('queue', path.value);
        if (maxJobs.value.trim()) params.set('maxJobs', maxJobs.value.trim());
      } else {
        params.set('scenario', path.value);
      }
      source = new EventSource('/events?' + params.toString());
      const names = [
        'queue_start', 'queue_job_start', 'queue_job_skipped', 'queue_job_complete', 'queue_job_error', 'queue_complete',
        'run_start', 'iteration_start', 'model_prompt', 'model_token', 'model_content', 'model_action',
        'tool_start', 'tool_result', 'artifact', 'visual_review', 'run_complete', 'error'
      ];
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
      if (name === 'model_prompt') {
        activeModelMessage = null;
        addChat('prompt', 'Prompt to local model', promptSummary(payload.data), payload.data.queue_job_id, payload.data.iteration);
      }
      if (name === 'model_token') {
        appendModelToken(payload.data.text, payload.data.queue_job_id, payload.data.iteration);
        return;
      }
      if (name === 'model_content') {
        activeModelMessage = null;
      }
      if (name === 'run_start') {
        meta.textContent = payload.data.out_dir;
        addChat('result', 'Run started', payload.data);
      }
      if (name === 'queue_start') {
        meta.textContent = payload.data.out_dir;
        addChat('result', 'Queue started', payload.data);
      }
      if (name === 'queue_job_start') {
        addJob(payload.data, 'Running');
        addChat('result', 'Queue job started', payload.data);
      }
      if (name === 'queue_job_complete' || name === 'queue_job_error' || name === 'queue_job_skipped') {
        addJob(payload.data, name.replace('queue_job_', ''));
        addChat(name === 'queue_job_error' ? 'error' : 'result', name, payload.data);
      }
      if (name === 'model_action') {
        addAction(payload.data);
        addChat('tool', 'Tool action: ' + (payload.data.action || payload.data.tool_call?.name || 'action'), payload.data, payload.data.queue_job_id, payload.data.iteration);
      }
      if (name === 'tool_result') {
        addChat('result', 'Tool result: ' + (payload.data.tool_call?.name || 'tool'), payload.data.result, payload.data.queue_job_id, payload.data.iteration);
      }
      if (name === 'artifact') addChat('result', 'Artifact written', payload.data, payload.data.queue_job_id, payload.data.iteration);
      if (name === 'run_complete' && !payload.data.queue_job_id) {
        setState('Complete', '');
        if (source) source.close();
      }
      if (name === 'queue_complete') {
        setState('Complete', '');
        addChat('result', 'Queue complete', payload.data);
        if (source) source.close();
      }
      if (name === 'error') {
        setState('Error', 'error');
        addChat('error', 'Error', payload.data || payload);
      }
      addLog(name, payload);
    }

    function promptSummary(data) {
      return {
        model: data.model,
        iteration: data.iteration,
        queue_job_id: data.queue_job_id,
        messages: (data.messages || []).map((message) => ({
          role: message.role,
          content: compactText(message.content, 1800)
        }))
      };
    }

    function appendModelToken(text, jobId, iteration) {
      if (!activeModelMessage) {
        activeModelMessage = addChat('model', 'Model output', '', jobId, iteration);
      }
      const pre = activeModelMessage.querySelector('pre');
      pre.textContent += text;
      chat.scrollTop = chat.scrollHeight;
    }

    function addAction(data) {
      const item = document.createElement('div');
      item.className = 'event';
      item.innerHTML = '<b>' + escapeText(data.action || data.tool_call?.name || 'action') + '</b>'
        + '<small>iteration ' + data.iteration + '</small>'
        + '<pre>' + escapeText(JSON.stringify(data.tool_call || {}, null, 2)) + '</pre>';
      actions.prepend(item);
    }

    function addJob(data, status) {
      const id = data.job?.id || data.job_id || data.id || ('job-' + data.index);
      let item = document.querySelector('[data-job-id="' + cssEscape(id) + '"]');
      if (!item) {
        item = document.createElement('div');
        item.className = 'job';
        item.dataset.jobId = id;
        jobs.prepend(item);
      }
      item.innerHTML = '<b>' + escapeText(data.job?.title || data.title || id) + '</b>'
        + '<small>' + escapeText(status) + ' · ' + escapeText(data.out_dir || '') + '</small>';
    }

    function addChat(kind, title, data, jobId, iteration) {
      const item = document.createElement('article');
      item.className = 'message ' + kind;
      const metaText = [jobId, iteration === undefined ? null : 'iteration ' + iteration].filter(Boolean).join(' · ');
      const body = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      item.innerHTML = '<header><h3>' + escapeText(title) + '</h3><small>' + escapeText(metaText) + '</small></header>'
        + '<pre>' + escapeText(body || '') + '</pre>';
      chat.append(item);
      chat.scrollTop = chat.scrollHeight;
      while (chat.children.length > 160) chat.firstElementChild.remove();
      return item;
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

    async function loadPresets() {
      try {
        const response = await fetch('/presets');
        presets = await response.json();
        renderPresets();
      } catch {
        preset.innerHTML = '<option value="">Manual path</option>';
      }
    }

    function renderPresets() {
      const values = mode.value === 'queue' ? presets.queues : presets.scenarios;
      const current = path.value;
      preset.innerHTML = '<option value="">Manual path</option>' + (values || []).map((item) => {
        const selected = item.path === current ? ' selected' : '';
        return '<option value="' + escapeText(item.path) + '"' + selected + '>' + escapeText(item.label) + '</option>';
      }).join('');
    }

    function escapeText(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }

    function compactText(value, limit) {
      const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      if (text.length <= limit) return text;
      return text.slice(0, limit) + '\\n... trimmed for watcher display ...';
    }

    function cssEscape(value) {
      if (window.CSS?.escape) return CSS.escape(value);
      return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
    }
  </script>
</body>
</html>`);
}

async function listRunPresets() {
  try {
    const files = await readdir('examples');
    const jsonFiles = files.filter((file) => file.endsWith('.json')).sort();
    return {
      queues: jsonFiles
        .filter((file) => /queue/i.test(file))
        .map((file) => presetItem(file)),
      scenarios: jsonFiles
        .filter((file) => /scenario/i.test(file) && !/queue/i.test(file))
        .map((file) => presetItem(file))
    };
  } catch {
    return { queues: [], scenarios: [] };
  }
}

function presetItem(file) {
  return {
    path: `examples/${file}`,
    label: file.replace(/\.json$/i, '').replace(/[._-]+/g, ' ')
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function escapeJs(value) {
  return String(value).replace(/[\\'"]/g, (char) => ({ '\\': '\\\\', "'": "\\'", '"': '\\"' }[char]));
}
