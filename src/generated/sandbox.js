import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { canonicalToPortalResult } from './adapter.js';
import { generateCanonicalOpenScad } from './openScad.js';
import { createCapabilityRequest, listTemplates } from './schema.js';
import { generateTrayBirdFeederDesign } from './trayBirdFeeder.js';
import { checkPublishability, validateGeneratedDesign } from './validator.js';

export { checkPublishability, createCapabilityRequest, generateCanonicalOpenScad, listTemplates, validateGeneratedDesign };

const DESIGN_PARAMETER_KEYS = ['width_in', 'depth_in', 'side_height_in', 'bottom_thickness_in', 'side_thickness_in', 'material', 'hanging', 'drainage_holes'];

export const SANDBOX_TOOLS = [
  {
    name: 'inspect_scenario',
    description: 'Read the current design scenario, available templates, and the active generated-design state.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'list_templates',
    description: 'List supported deterministic design templates and their parameter constraints.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'generate_design',
    description: 'Generate a canonical design from the scenario template and parameters.',
    input_schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        design_id: { type: 'string' },
        template_id: { type: 'string' },
        parameters: { type: 'object', additionalProperties: true }
      }
    }
  },
  {
    name: 'summarize_design',
    description: 'Summarize the current generated design without exporting files.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'validate_design',
    description: 'Run deterministic schema, geometry, reference, and cut-list checks on the current design.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'revise_design',
    description: 'Regenerate the current design with revised parameters after validation feedback.',
    input_schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        parameters: { type: 'object', additionalProperties: true }
      }
    }
  },
  {
    name: 'export_openscad',
    description: 'Export the current design to canonical OpenSCAD text.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'check_publishability',
    description: 'Check whether the current design has enough validation and export coverage for portal publication.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'export_plan_package',
    description: 'Export the validated design, portal adapter result, publishability report, and OpenSCAD model.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'request_capability',
    description: 'Ask Codex to add a missing sandbox or portal capability when the current tools cannot complete the design.',
    input_schema: {
      type: 'object',
      additionalProperties: true,
      required: ['capability', 'reason'],
      properties: {
        capability: { type: 'string' },
        reason: { type: 'string' },
        evidence: { type: 'array', items: { type: 'string' } }
      }
    }
  }
];

export function listSandboxTools() {
  return SANDBOX_TOOLS.map((tool) => ({ ...tool, input_schema: { ...tool.input_schema } }));
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function generateDesign(scenario) {
  if (scenario.template_id === 'tray_bird_feeder') return generateTrayBirdFeederDesign(scenario);
  throw new Error(`Unsupported template_id: ${scenario.template_id}`);
}

export function reviseDesign(design, revision = {}) {
  const scenario = {
    design_id: design.design_id,
    template_id: design.template_id,
    parameters: { ...(design.parameters || {}), ...(revision.parameters || {}) }
  };
  return generateDesign(scenario);
}

export function exportPlanPackage(design) {
  const validation = validateGeneratedDesign(design);
  const openscad = generateCanonicalOpenScad(design);
  const portalResult = canonicalToPortalResult({ ...design, validation }, validation);
  const publishability = checkPublishability(design, validation, { openscad });
  return {
    package_schema_version: '0.1',
    design: { ...design, validation, exports: { openscad: 'model.scad' } },
    validation,
    exports: {
      openscad,
      portal_result: portalResult
    },
    publishability
  };
}

export function executeSandboxTool(toolCall, state = {}) {
  const name = toolCall?.name || toolCall?.action;
  const args = normalizeToolArguments(toolCall?.arguments || toolCall?.parameters || {});
  const nextState = { ...state };

  if (name === 'inspect_scenario') {
    return {
      state: nextState,
      result: {
        ok: true,
        scenario: nextState.scenario || null,
        templates: listTemplates(),
        current_design: summarizeGeneratedDesign(nextState.design),
        current_validation: nextState.validation || null,
        current_publishability: nextState.finalPackage?.publishability || null
      }
    };
  }

  if (name === 'list_templates') {
    return { state: nextState, result: { ok: true, templates: listTemplates() } };
  }

  if (name === 'generate_design') {
    nextState.design = generateDesign(scenarioFromToolArguments(nextState.scenario, args));
    nextState.validation = null;
    nextState.finalPackage = null;
    return {
      state: nextState,
      result: {
        ok: true,
        design: nextState.design,
        summary: summarizeGeneratedDesign(nextState.design)
      }
    };
  }

  if (name === 'summarize_design') {
    if (!nextState.design) return { state: nextState, result: { ok: false, error: 'No design exists yet.' } };
    return { state: nextState, result: { ok: true, summary: summarizeGeneratedDesign(nextState.design) } };
  }

  if (name === 'validate_design') {
    if (!nextState.design) return { state: nextState, result: { ok: false, error: 'No design exists yet.' } };
    nextState.validation = validateGeneratedDesign(nextState.design);
    return { state: nextState, result: nextState.validation };
  }

  if (name === 'revise_design') {
    if (!nextState.design) return { state: nextState, result: { ok: false, error: 'No design exists yet.' } };
    nextState.design = reviseDesign(nextState.design, { parameters: parameterArguments(args) });
    nextState.validation = null;
    nextState.finalPackage = null;
    return {
      state: nextState,
      result: {
        ok: true,
        design: nextState.design,
        summary: summarizeGeneratedDesign(nextState.design)
      }
    };
  }

  if (name === 'export_openscad') {
    if (!nextState.design) return { state: nextState, result: { ok: false, error: 'No design exists yet.' } };
    const openscad = generateCanonicalOpenScad(nextState.design);
    return {
      state: nextState,
      result: {
        ok: true,
        openscad,
        chars: openscad.length
      }
    };
  }

  if (name === 'check_publishability') {
    if (!nextState.design) return { state: nextState, result: { ok: false, error: 'No design exists yet.' } };
    const validation = nextState.validation || validateGeneratedDesign(nextState.design);
    const openscad = generateCanonicalOpenScad(nextState.design);
    const publishability = checkPublishability(nextState.design, validation, { openscad });
    nextState.validation = validation;
    return { state: nextState, result: publishability };
  }

  if (name === 'export_plan_package') {
    if (!nextState.design) return { state: nextState, result: { ok: false, error: 'No design exists yet.' } };
    nextState.finalPackage = exportPlanPackage(nextState.design);
    nextState.validation = nextState.finalPackage.validation;
    return {
      state: nextState,
      result: {
        ok: true,
        package: nextState.finalPackage,
        publishability: nextState.finalPackage.publishability
      }
    };
  }

  if (name === 'request_capability') {
    const request = createCapabilityRequest({
      ...args,
      design_id: args.design_id || nextState.design?.design_id || nextState.scenario?.design_id || null,
      scenario: args.scenario || nextState.scenario || null
    });
    nextState.capabilityRequest = request;
    return { state: nextState, result: { ok: true, request } };
  }

  return {
    state: nextState,
    result: {
      ok: false,
      error: `Unsupported sandbox tool: ${name || 'unknown'}`,
      available_tools: SANDBOX_TOOLS.map((tool) => tool.name)
    }
  };
}

export function scenarioFromToolArguments(scenario = {}, args = {}) {
  return {
    design_id: args.design_id || scenario.design_id,
    template_id: args.template_id || scenario.template_id,
    parameters: { ...(scenario.parameters || {}), ...parameterArguments(args) }
  };
}

export function parameterArguments(args = {}) {
  const source = args.parameters && typeof args.parameters === 'object' ? args.parameters : args;
  return Object.fromEntries(Object.entries(source).filter(([key]) => DESIGN_PARAMETER_KEYS.includes(key)));
}

export function summarizeGeneratedDesign(value) {
  if (!value) return null;
  return {
    design_id: value.design_id,
    template_id: value.template_id,
    parameters: value.parameters,
    part_count: value.parts?.length || 0,
    physical_part_count: value.parts?.filter((part) => part.physical !== false).length || 0,
    reference_part_count: value.parts?.filter((part) => part.physical === false).length || 0,
    cut_list_count: value.cut_list?.length || 0,
    assembly_step_count: value.assembly_steps?.length || 0,
    joint_count: value.joints?.length || 0
  };
}

function normalizeToolArguments(args = {}) {
  if (args.parameters?.parameters && typeof args.parameters.parameters === 'object') {
    return { ...args, parameters: args.parameters.parameters };
  }
  return args;
}

export async function writePlanPackage(outDir, planPackage) {
  await mkdir(outDir, { recursive: true });
  await writeJson(join(outDir, 'design.json'), planPackage.design);
  await writeJson(join(outDir, 'validation.json'), planPackage.validation);
  await writeJson(join(outDir, 'portal-result.json'), planPackage.exports.portal_result);
  await writeJson(join(outDir, 'publishability.json'), planPackage.publishability);
  await writeFile(join(outDir, 'model.scad'), planPackage.exports.openscad, 'utf8');
  await writeJson(join(outDir, 'package.json'), {
    package_schema_version: planPackage.package_schema_version,
    files: ['design.json', 'validation.json', 'portal-result.json', 'publishability.json', 'model.scad']
  });
}
