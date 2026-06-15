import { join } from 'node:path';
import {
  checkPublishability,
  createCapabilityRequest,
  executeSandboxTool,
  exportPlanPackage,
  generateCanonicalOpenScad,
  generateDesign,
  getComponent,
  listComponentCategories,
  listComponents,
  listSandboxTools,
  listTemplates,
  readJson,
  reviseDesign,
  searchComponents,
  validateGeneratedDesign,
  writeJson,
  writePlanPackage
} from '../src/generated/sandbox.js';

const [command, ...args] = process.argv.slice(2);

try {
  const output = await dispatch(command, args);
  if (output !== undefined) console.log(typeof output === 'string' ? output : JSON.stringify(output, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

async function dispatch(name, args) {
  if (name === 'list_tools') return listSandboxTools();
  if (name === 'list_templates') return listTemplates();
  if (name === 'list_component_categories') return listComponentCategories();
  if (name === 'list_components') {
    const [categoryId, includeDetails] = args;
    return listComponents({ category_id: categoryId || null, include_details: includeDetails === '--details' });
  }
  if (name === 'search_components') {
    const query = required(args.join(' '), 'search query');
    return searchComponents({ query });
  }
  if (name === 'get_component') {
    return getComponent(required(args[0], 'component_id')) || { ok: false, error: `Unknown component_id: ${args[0] || 'missing'}` };
  }

  if (name === 'generate_design') {
    const [scenarioPath, outPath] = args;
    const design = generateDesign(await readJson(required(scenarioPath, 'scenario path')));
    if (outPath) await writeJson(outPath, design);
    return design;
  }

  if (name === 'validate_design') {
    const [designPath, outPath] = args;
    const validation = validateGeneratedDesign(await readJson(required(designPath, 'design path')));
    if (outPath) await writeJson(outPath, validation);
    return validation;
  }

  if (name === 'revise_design') {
    const [designPath, revisionPath, outPath] = args;
    const design = await readJson(required(designPath, 'design path'));
    const revision = revisionPath ? await readJson(revisionPath) : {};
    const revised = reviseDesign(design, revision);
    if (outPath) await writeJson(outPath, revised);
    return revised;
  }

  if (name === 'export_openscad') {
    const [designPath, outPath] = args;
    const scad = generateCanonicalOpenScad(await readJson(required(designPath, 'design path')));
    if (outPath) {
      const { mkdir, writeFile } = await import('node:fs/promises');
      const { dirname } = await import('node:path');
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, scad, 'utf8');
    }
    return scad;
  }

  if (name === 'export_plan_package') {
    const [designPath, outDir = defaultRunDir()] = args;
    const planPackage = exportPlanPackage(await readJson(required(designPath, 'design path')));
    await writePlanPackage(outDir, planPackage);
    return { ok: true, out_dir: outDir, publishability: planPackage.publishability };
  }

  if (name === 'check_publishability') {
    const [designPath, outPath] = args;
    const design = await readJson(required(designPath, 'design path'));
    const publishability = checkPublishability(design, validateGeneratedDesign(design), design.exports);
    if (outPath) await writeJson(outPath, publishability);
    return publishability;
  }

  if (name === 'request_capability') {
    const [requestPath, outPath] = args;
    const request = createCapabilityRequest(await readJson(required(requestPath, 'request path')));
    if (outPath) await writeJson(outPath, request);
    return request;
  }

  if (name === 'run_tool') {
    const [toolCallPath, scenarioPath, outPath] = args;
    const toolCall = await readJson(required(toolCallPath, 'tool call path'));
    const scenario = scenarioPath ? await readJson(scenarioPath) : null;
    const executed = executeSandboxTool(toolCall, { scenario });
    if (outPath) await writeJson(outPath, executed.result);
    return executed.result;
  }

  return usage();
}

function usage() {
  return [
    'Usage:',
    '  node scripts/design-sandbox.mjs list_tools',
    '  node scripts/design-sandbox.mjs list_templates',
    '  node scripts/design-sandbox.mjs list_component_categories',
    '  node scripts/design-sandbox.mjs list_components [category_id] [--details]',
    '  node scripts/design-sandbox.mjs search_components query terms...',
    '  node scripts/design-sandbox.mjs get_component component_id',
    '  node scripts/design-sandbox.mjs generate_design scenario.json [design.json]',
    '  node scripts/design-sandbox.mjs validate_design design.json [validation.json]',
    '  node scripts/design-sandbox.mjs revise_design design.json revision.json [design.json]',
    '  node scripts/design-sandbox.mjs export_openscad design.json [model.scad]',
    '  node scripts/design-sandbox.mjs export_plan_package design.json [out-dir]',
    '  node scripts/design-sandbox.mjs check_publishability design.json [publishability.json]',
    '  node scripts/design-sandbox.mjs request_capability request.json [capability-request.json]',
    '  node scripts/design-sandbox.mjs run_tool tool-call.json [scenario.json] [tool-result.json]'
  ].join('\n');
}

function required(value, label) {
  if (!value) throw new Error(`Missing ${label}.`);
  return value;
}

function defaultRunDir() {
  return join('generated', 'runs', new Date().toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, 'Z'));
}
