const baseUrl = (process.env.LLM_BASE_URL || 'http://localhost:11434/v1').replace(/\/$/, '');
const model = process.env.LLM_MODEL || process.argv[2];

if (!model) {
  console.error('Set LLM_MODEL or pass a model name, for example: npm run llm:benchmark -- qwen3:8b');
  process.exit(1);
}

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'rationale', 'tool_call'],
  properties: {
    action: {
      type: 'string',
      enum: ['generate_design', 'revise_design', 'request_capability']
    },
    rationale: { type: 'string' },
    tool_call: {
      type: 'object',
      additionalProperties: true,
      required: ['name', 'arguments'],
      properties: {
        name: { type: 'string' },
        arguments: { type: 'object', additionalProperties: true }
      }
    }
  }
};

const tasks = [
  {
    name: 'Generate tray feeder',
    expectAction: 'generate_design',
    prompt: [
      'Use the available design sandbox tools to start a tray-style bird feeder.',
      'Available tools: generate_design, validate_design, revise_design, export_plan_package, request_capability.',
      'Generate a 12 in wide, 8 in deep, cedar tray bird feeder with 1.5 in sides, drainage holes, and hanging holes.',
      'Return the next single tool action only.'
    ].join('\n')
  },
  {
    name: 'Revise after validation',
    expectAction: 'revise_design',
    prompt: [
      'A candidate tray bird feeder failed validation.',
      'Validation errors: side_height_in must be at least 0.75; hanging holes are too close to board ends; drainage holes are missing.',
      'Available tools: generate_design, validate_design, revise_design, export_plan_package, request_capability.',
      'Return the next single tool action only.'
    ].join('\n')
  },
  {
    name: 'Request missing capability',
    expectAction: 'request_capability',
    prompt: [
      'The user asks for wind-load simulation for a pole-mounted bird feeder roof.',
      'Available tools: generate_design, validate_design, revise_design, export_plan_package, request_capability.',
      'Existing validators only check dimensions, part references, cut list consistency, OpenSCAD export, and simple assembly references.',
      'Return the next single tool action only.'
    ].join('\n')
  }
];

const results = [];
for (const task of tasks) {
  const started = performance.now();
  const response = await runTask(task);
  const elapsedMs = Math.round(performance.now() - started);
  const parsed = parseJson(response.content);
  const assessment = assessTask(task, parsed);
  results.push({ task: task.name, expected: task.expectAction, ...assessment, elapsedMs, parsed, raw: response.content });
}

console.log(JSON.stringify({
  baseUrl,
  model,
  score: `${results.filter((result) => result.pass).length}/${results.length}`,
  results
}, null, 2));

async function runTask(task) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.LLM_API_KEY || 'ollama'}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: [
            'You operate a deterministic woodworking design sandbox.',
            'Choose exactly one next tool action.',
            'Return JSON matching the requested schema. Do not include markdown.'
          ].join(' ')
        },
        { role: 'user', content: task.prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'sandbox_next_action',
          strict: true,
          schema: responseSchema
        }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${task.name} failed with HTTP ${response.status}: ${text}`);
  }
  const data = await response.json();
  return { content: data.choices?.[0]?.message?.content || '' };
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function assessTask(task, parsed) {
  const notes = [];
  if (!parsed) return { pass: false, quality: 0, notes: ['response was not parseable JSON'] };
  if (parsed.action !== task.expectAction) notes.push(`expected action ${task.expectAction}, got ${parsed.action}`);
  if (!parsed.tool_call?.name) notes.push('missing tool_call.name');
  if (parsed.tool_call?.name && parsed.tool_call.name !== parsed.action) notes.push(`tool_call.name ${parsed.tool_call.name} does not match action ${parsed.action}`);

  if (task.expectAction === 'generate_design') {
    const args = parsed.tool_call?.arguments || {};
    for (const key of ['width', 'depth', 'side_height']) {
      if (typeof args[key] === 'string') notes.push(`${key} is a string; numeric dimensions are preferred`);
      if (typeof args[key] !== 'number') notes.push(`${key} is not a number`);
    }
    if (!/cedar/i.test(String(args.material || ''))) notes.push('material does not mention cedar');
    const features = Array.isArray(args.features) ? args.features.join(' ') : JSON.stringify(args);
    if (!/drainage/i.test(features)) notes.push('drainage feature is missing or unclear');
    if (!/hanging/i.test(features)) notes.push('hanging feature is missing or unclear');
  }

  if (task.expectAction === 'request_capability') {
    const args = parsed.tool_call?.arguments || {};
    const capabilityText = JSON.stringify(args).toLowerCase();
    if (!capabilityText.includes('wind')) notes.push('capability request does not mention wind');
    if (!capabilityText.includes('simulation') && !capabilityText.includes('load')) notes.push('capability request does not explain the simulation/load gap');
  }

  const pass = parsed.action === task.expectAction && Boolean(parsed.tool_call?.name);
  const quality = Math.max(0, 5 - notes.length);
  return { pass, quality, notes };
}
