import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { canonicalToPortalResult } from './adapter.js';
import { getComponent, listComponentCategories, listComponents, searchComponents } from './componentCatalog.js';
import { generateCanonicalOpenScad } from './openScad.js';
import { createCapabilityRequest, listTemplates } from './schema.js';
import { generateTrayBirdFeederDesign } from './trayBirdFeeder.js';
import { checkPublishability, validateGeneratedDesign } from './validator.js';

export { checkPublishability, createCapabilityRequest, generateCanonicalOpenScad, getComponent, listComponentCategories, listComponents, listTemplates, searchComponents, validateGeneratedDesign };

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
    name: 'list_component_categories',
    description: 'List hierarchical generated-design component categories before selecting or requesting components.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'list_components',
    description: 'List reusable generated-design components, optionally scoped to one category.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        category_id: { type: 'string' },
        include_details: { type: 'boolean' }
      }
    }
  },
  {
    name: 'search_components',
    description: 'Search reusable generated-design components by intent, alias, output, or example use before requesting a new component.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['query'],
      properties: {
        query: { type: 'string' },
        category_id: { type: 'string' },
        limit: { type: 'number' }
      }
    }
  },
  {
    name: 'get_component',
    description: 'Inspect one reusable component by exact component_id.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['component_id'],
      properties: {
        component_id: { type: 'string' }
      }
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
    name: 'annotate_design',
    description: 'Apply local-model-authored build guidance to the current design without editing source code.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        step_instructions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['step_id', 'instructions'],
            properties: {
              step_id: { type: 'string' },
              instructions: { type: 'array', items: { type: 'string' } },
              mode: { type: 'string', enum: ['append', 'replace'] }
            }
          }
        },
        part_notes: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['part_id', 'notes'],
            properties: {
              part_id: { type: 'string' },
              notes: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        design_notes: { type: 'array', items: { type: 'string' } }
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

export function annotateDesign(design, annotation = {}) {
  const next = structuredClone(design);
  const stepInstructions = Array.isArray(annotation.step_instructions) ? annotation.step_instructions : [];
  const partNotes = Array.isArray(annotation.part_notes) ? annotation.part_notes : [];
  const designNotes = cleanStringArray(annotation.design_notes);

  for (const patch of stepInstructions) {
    const step = next.assembly_steps?.find((item) => item.id === patch.step_id);
    if (!step) continue;
    const instructions = cleanStringArray(patch.instructions);
    if (!instructions.length) continue;
    step.instructions = patch.mode === 'replace' ? instructions : [...(step.instructions || []), ...instructions];
  }

  for (const patch of partNotes) {
    const part = next.parts?.find((item) => item.id === patch.part_id);
    if (!part) continue;
    const notes = cleanStringArray(patch.notes);
    if (!notes.length) continue;
    part.meta = {
      ...(part.meta || {}),
      guidance_notes: [...(part.meta?.guidance_notes || []), ...notes]
    };
  }

  next.annotations = {
    ...(next.annotations || {}),
    design_notes: [...(next.annotations?.design_notes || []), ...designNotes],
    authored_by: 'local-design-sandbox'
  };
  return next;
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
        component_categories: listComponentCategories(),
        current_design: summarizeGeneratedDesign(nextState.design),
        current_validation: nextState.validation || null,
        current_publishability: nextState.finalPackage?.publishability || null
      }
    };
  }

  if (name === 'list_templates') {
    return { state: nextState, result: { ok: true, templates: listTemplates() } };
  }

  if (name === 'list_component_categories') {
    return { state: nextState, result: { ok: true, categories: listComponentCategories() } };
  }

  if (name === 'list_components') {
    return {
      state: nextState,
      result: {
        ok: true,
        components: listComponents({
          category_id: args.category_id || null,
          include_details: args.include_details === true
        })
      }
    };
  }

  if (name === 'search_components') {
    return {
      state: nextState,
      result: {
        ok: true,
        query: String(args.query || ''),
        components: searchComponents({
          query: args.query,
          category_id: args.category_id || null,
          limit: args.limit
        })
      }
    };
  }

  if (name === 'get_component') {
    const component = getComponent(args.component_id);
    return component
      ? { state: nextState, result: { ok: true, component } }
      : { state: nextState, result: { ok: false, error: `Unknown component_id: ${args.component_id || 'missing'}`, recommended_action: 'search_components' } };
  }

  if (name === 'generate_design') {
    const scenario = scenarioFromToolArguments(nextState.scenario, args);
    const unsupportedTemplate = unsupportedTemplateResult(scenario);
    if (unsupportedTemplate) return { state: nextState, result: unsupportedTemplate };
    nextState.design = generateDesign(scenario);
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
    const unsupportedTemplate = unsupportedTemplateResult(nextState.design);
    if (unsupportedTemplate) return { state: nextState, result: unsupportedTemplate };
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

  if (name === 'annotate_design') {
    if (!nextState.design) return { state: nextState, result: { ok: false, error: 'No design exists yet.' } };
    nextState.design = annotateDesign(nextState.design, args);
    nextState.validation = null;
    nextState.finalPackage = null;
    return {
      state: nextState,
      result: {
        ok: true,
        summary: summarizeGeneratedDesign(nextState.design),
        annotation_summary: summarizeAnnotations(nextState.design)
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
    joint_count: value.joints?.length || 0,
    annotation_count: annotationCount(value)
  };
}

function summarizeAnnotations(design) {
  return {
    design_notes: design.annotations?.design_notes?.length || 0,
    step_instruction_count: (design.assembly_steps || []).reduce((sum, step) => sum + (step.instructions?.length || 0), 0),
    part_note_count: (design.parts || []).reduce((sum, part) => sum + (part.meta?.guidance_notes?.length || 0), 0)
  };
}

function annotationCount(design) {
  return (design.annotations?.design_notes?.length || 0)
    + (design.parts || []).reduce((sum, part) => sum + (part.meta?.guidance_notes?.length || 0), 0);
}

function cleanStringArray(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function normalizeToolArguments(args = {}) {
  if (args.parameters?.parameters && typeof args.parameters.parameters === 'object') {
    return { ...args, parameters: args.parameters.parameters };
  }
  return args;
}

function unsupportedTemplateResult(scenario = {}) {
  if (listTemplates().some((template) => template.template_id === scenario.template_id)) return null;
  const suggestedQueries = componentSearchQueriesForScenario(scenario);
  return {
    ok: false,
    error: `Unsupported template_id: ${scenario.template_id || 'missing'}`,
    recommended_action: 'search_components',
    next_steps: [
      'Search the component catalog for reusable geometry, hardware, pattern, validator, build-step, and rendering components.',
      'Inspect the closest matching component IDs with get_component.',
      'Only then request a missing capability, citing the closest component IDs considered.'
    ],
    suggested_component_queries: suggestedQueries,
    capability: `Add reusable composition support for ${scenario.template_id || 'the requested plan type'}.`,
    available_templates: listTemplates().map((template) => template.template_id)
  };
}

function componentSearchQueriesForScenario(scenario = {}) {
  const values = [
    scenario.template_id,
    scenario.intent,
    ...(Array.isArray(scenario.builder_goals) ? scenario.builder_goals : []),
    ...Object.keys(scenario.parameters || {})
  ].filter(Boolean).join(' ');
  const queries = [];
  if (/key|hook|peg|coat|mug/i.test(values)) queries.push('key hooks pegs repeated hardware pilot holes');
  if (/wall|mount|screw|hanger/i.test(values)) queries.push('wall mount screw holes edge clearance');
  if (/board|panel|back|height|width|thickness/i.test(values)) queries.push('rectangular board panel centered spacing');
  if (!queries.length) queries.push(values || 'reusable generated design components');
  return queries;
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
