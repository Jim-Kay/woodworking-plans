import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { canonicalToPortalResult } from './adapter.js';
import { getAssemblyRelationship, listAssemblyRelationshipTypes, listAssemblyRelationships, searchAssemblyRelationships } from './assemblyRelationshipCatalog.js';
import { reviewBuildSteps } from './buildStepQuality.js';
import { reviewComponentInterfaces } from './componentInterfaceReview.js';
import { generateBoardWithLinearHardwareDesign } from './boardWithLinearHardware.js';
import { getComponent, listComponentCategories, listComponents, searchComponents } from './componentCatalog.js';
import { generateExtensionLeafTableDesign } from './extensionLeafTable.js';
import { generateCanonicalOpenScad } from './openScad.js';
import { normalizePhotoDesignBrief, scenarioFromPhotoDesignBrief, summarizePhotoDesignBrief } from './photoBrief.js';
import { createCapabilityRequest, findTemplateCandidates, listTemplates, searchTemplates } from './schema.js';
import { fitPrimitivesToTarget, normalizeTargetGeometry, proposeComponentGraphFromTarget, summarizeTargetGeometry } from './targetGeometry.js';
import { generateTrayBirdFeederDesign } from './trayBirdFeeder.js';
import { generateTwoStepStoolDesign } from './twoStepStool.js';
import { checkPublishability, validateGeneratedDesign } from './validator.js';
import { generateWallPanelPocketHardwareDesign } from './wallPanelPocketHardware.js';

export { checkPublishability, createCapabilityRequest, fitPrimitivesToTarget, generateCanonicalOpenScad, getAssemblyRelationship, getComponent, listAssemblyRelationshipTypes, listAssemblyRelationships, listComponentCategories, listComponents, listTemplates, normalizePhotoDesignBrief, normalizeTargetGeometry, proposeComponentGraphFromTarget, reviewBuildSteps, reviewComponentInterfaces, scenarioFromPhotoDesignBrief, searchAssemblyRelationships, searchComponents, searchTemplates, summarizePhotoDesignBrief, summarizeTargetGeometry, validateGeneratedDesign };

const DESIGN_PARAMETER_KEYS = [
  'width_in',
  'depth_in',
  'lower_step_height_in',
  'front_leg_height_in',
  'back_leg_height_in',
  'lower_step_depth_in',
  'upper_step_depth_in',
  'tread_thickness_in',
  'leg_width_in',
  'leg_depth_in',
  'rail_height_in',
  'rail_thickness_in',
  'claimed_capacity_lbs',
  'side_height_in',
  'bottom_thickness_in',
  'side_thickness_in',
  'height_in',
  'overall_length_extended_in',
  'center_top_length_in',
  'leaf_depth_in',
  'leaf_count',
  'top_thickness_in',
  'table_height_in',
  'leg_size_in',
  'base_clear_length_between_legs_in',
  'apron_height_in',
  'apron_thickness_in',
  'support_arm_count_per_leaf',
  'support_arm_extension_in',
  'slide_travel_in',
  'support_arm_stock_width_in',
  'support_arm_stock_height_in',
  'board_thickness_in',
  'pocket_depth_in',
  'pocket_height_in',
  'pocket_lip_height_in',
  'pocket_stock_thickness_in',
  'hook_count',
  'hook_spacing_in',
  'min_end_inset_in',
  'mounting_holes',
  'mount_hole_diameter_in',
  'pilot_hole_diameter_in',
  'hook_projection_in',
  'hardware_type',
  'pocket_material',
  'material',
  'hanging',
  'drainage_holes'
];

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
    name: 'search_templates',
    description: 'Search supported deterministic design templates by intent, alias, component family, or parameter names before proposing a new template.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['query'],
      properties: {
        query: { type: 'string' },
        limit: { type: 'number' }
      }
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
    name: 'list_assembly_relationship_types',
    description: 'List relationship taxonomy types such as fixed contact, support, motion, layout reference, and clearance.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'list_assembly_relationships',
    description: 'List reusable assembly relationship records, optionally scoped to one relationship type.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type_id: { type: 'string' },
        include_details: { type: 'boolean' }
      }
    }
  },
  {
    name: 'search_assembly_relationships',
    description: 'Search reusable part-to-part relationships by intent, part roles, motion, contact, clearance, or support needs before inventing component names.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['query'],
      properties: {
        query: { type: 'string' },
        part_roles: { type: 'array', items: { type: 'string' } },
        type_id: { type: 'string' },
        limit: { type: 'number' }
      }
    }
  },
  {
    name: 'get_assembly_relationship',
    description: 'Inspect one assembly relationship by exact relationship_id.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['relationship_id'],
      properties: {
        relationship_id: { type: 'string' }
      }
    }
  },
  {
    name: 'inspect_photo_brief',
    description: 'Normalize and summarize a multi-photo design brief before mapping it to components or a scenario.',
    input_schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        brief: { type: 'object', additionalProperties: true }
      }
    }
  },
  {
    name: 'search_photo_brief_components',
    description: 'Run the component searches proposed by a photo-derived design brief.',
    input_schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        brief: { type: 'object', additionalProperties: true },
        limit: { type: 'number' }
      }
    }
  },
  {
    name: 'photo_brief_to_scenario',
    description: 'Convert a normalized multi-photo design brief into a candidate generated-design scenario.',
    input_schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        brief: { type: 'object', additionalProperties: true },
        template_id: { type: 'string' },
        design_id: { type: 'string' }
      }
    }
  },
  {
    name: 'inspect_target_geometry',
    description: 'Normalize a coarse target geometry extracted from photos or clean object renders before fitting woodworking primitives.',
    input_schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        target_geometry: { type: 'object', additionalProperties: true }
      }
    }
  },
  {
    name: 'fit_primitives_to_target',
    description: 'Fit woodworking-friendly primitives such as panels, rails, posts, support arms, and hardware tracks to a normalized target geometry.',
    input_schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        target_geometry: { type: 'object', additionalProperties: true }
      }
    }
  },
  {
    name: 'target_geometry_to_component_graph',
    description: 'Convert fitted target primitives into component and relationship search hints before generating or proposing a plan.',
    input_schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        target_geometry: { type: 'object', additionalProperties: true }
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
    name: 'review_build_steps',
    description: 'Review whether assembly steps and portal step visuals are builder-grade before publication, using a PDF-style instruction rubric.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'review_component_interfaces',
    description: 'Review whether complex generated designs are decomposed into independent subsystems with explicit support, motion, clearance, and mounting interfaces before relying on the full assembled model.',
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
    name: 'propose_component_composition',
    description: 'Draft a Codex-reviewable template or component-composition proposal from exact existing component IDs before requesting implementation support.',
    input_schema: {
      type: 'object',
      additionalProperties: true,
      required: ['template_id', 'title', 'component_ids', 'parameters', 'design_algorithm', 'validation_strategy', 'build_steps'],
      properties: {
        template_id: { type: 'string' },
        title: { type: 'string' },
        component_ids: { type: 'array', items: { type: 'string' } },
        relationship_ids: { type: 'array', items: { type: 'string' } },
        parameters: { type: 'object', additionalProperties: true },
        design_algorithm: { type: 'array', items: { type: 'string' } },
        validation_strategy: { type: 'array', items: { type: 'string' } },
        build_steps: { type: 'array', items: { type: 'object', additionalProperties: true } },
        renderer_requirements: { type: 'array', items: { type: 'string' } },
        open_questions: { type: 'array', items: { type: 'string' } }
      }
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
  if (scenario.template_id === 'board_with_linear_hardware') return generateBoardWithLinearHardwareDesign(scenario);
  if (scenario.template_id === 'wall_panel_with_pocket_and_linear_hardware') return generateWallPanelPocketHardwareDesign(scenario);
  if (scenario.template_id === 'two_step_stool') return generateTwoStepStoolDesign(scenario);
  if (scenario.template_id === 'extension_leaf_dining_table') return generateExtensionLeafTableDesign(scenario);
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
        assembly_relationship_types: listAssemblyRelationshipTypes(),
        current_design: summarizeGeneratedDesign(nextState.design),
        current_validation: nextState.validation || null,
        current_build_step_review: nextState.buildStepReview || null,
        current_publishability: nextState.finalPackage?.publishability || null
      }
    };
  }

  if (name === 'list_templates') {
    return { state: nextState, result: { ok: true, templates: listTemplates() } };
  }

  if (name === 'search_templates') {
    return {
      state: nextState,
      result: {
        ok: true,
        query: String(args.query || ''),
        templates: searchTemplates({ query: args.query, limit: args.limit })
      }
    };
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

  if (name === 'list_assembly_relationship_types') {
    return { state: nextState, result: { ok: true, types: listAssemblyRelationshipTypes() } };
  }

  if (name === 'list_assembly_relationships') {
    return {
      state: nextState,
      result: {
        ok: true,
        relationships: listAssemblyRelationships({
          type_id: args.type_id || null,
          include_details: args.include_details === true
        })
      }
    };
  }

  if (name === 'search_assembly_relationships') {
    return {
      state: nextState,
      result: {
        ok: true,
        query: String(args.query || ''),
        relationships: searchAssemblyRelationships({
          query: args.query,
          part_roles: args.part_roles || [],
          type_id: args.type_id || null,
          limit: args.limit
        })
      }
    };
  }

  if (name === 'get_assembly_relationship') {
    const relationship = getAssemblyRelationship(args.relationship_id);
    return relationship
      ? { state: nextState, result: { ok: true, relationship } }
      : { state: nextState, result: { ok: false, error: `Unknown relationship_id: ${args.relationship_id || 'missing'}`, recommended_action: 'search_assembly_relationships' } };
  }

  if (name === 'inspect_photo_brief') {
    const brief = normalizePhotoDesignBrief(args.brief || nextState.photoBrief || nextState.scenario?.photo_design_brief || {}, { photoSet: nextState.scenario?.photo_set });
    nextState.photoBrief = brief;
    return { state: nextState, result: { ok: true, brief, summary: summarizePhotoDesignBrief(brief), recommended_action: 'search_photo_brief_components' } };
  }

  if (name === 'search_photo_brief_components') {
    const brief = normalizePhotoDesignBrief(args.brief || nextState.photoBrief || nextState.scenario?.photo_design_brief || {}, { photoSet: nextState.scenario?.photo_set });
    nextState.photoBrief = brief;
    const limit = Number(args.limit) || 5;
    const searches = brief.component_searches.map((search) => ({
      ...search,
      components: searchComponents({ query: search.query, category_id: search.category_id || null, limit })
    }));
    return { state: nextState, result: { ok: true, photo_set_id: brief.photo_set_id, searches, recommended_action: 'photo_brief_to_scenario' } };
  }

  if (name === 'photo_brief_to_scenario') {
    const brief = normalizePhotoDesignBrief(args.brief || nextState.photoBrief || nextState.scenario?.photo_design_brief || {}, { photoSet: nextState.scenario?.photo_set });
    nextState.photoBrief = brief;
    nextState.scenario = scenarioFromPhotoDesignBrief(brief, { template_id: args.template_id, design_id: args.design_id });
    return { state: nextState, result: { ok: true, scenario: nextState.scenario, summary: summarizePhotoDesignBrief(brief), recommended_action: 'generate_design' } };
  }

  if (name === 'inspect_target_geometry') {
    const targetGeometry = normalizeTargetGeometry(args.target_geometry || nextState.targetGeometry || nextState.scenario?.target_geometry || {}, { photoSet: nextState.scenario?.photo_set });
    nextState.targetGeometry = targetGeometry;
    return { state: nextState, result: { ok: true, target_geometry: targetGeometry, summary: summarizeTargetGeometry(targetGeometry), recommended_action: 'fit_primitives_to_target' } };
  }

  if (name === 'fit_primitives_to_target') {
    const targetGeometry = normalizeTargetGeometry(args.target_geometry || nextState.targetGeometry || nextState.scenario?.target_geometry || {}, { photoSet: nextState.scenario?.photo_set });
    nextState.targetGeometry = targetGeometry;
    nextState.primitiveFit = fitPrimitivesToTarget(targetGeometry);
    return { state: nextState, result: nextState.primitiveFit };
  }

  if (name === 'target_geometry_to_component_graph') {
    const targetGeometry = normalizeTargetGeometry(args.target_geometry || nextState.targetGeometry || nextState.scenario?.target_geometry || {}, { photoSet: nextState.scenario?.photo_set });
    nextState.targetGeometry = targetGeometry;
    nextState.primitiveFit = nextState.primitiveFit || fitPrimitivesToTarget(targetGeometry);
    nextState.componentGraph = proposeComponentGraphFromTarget(targetGeometry, nextState.primitiveFit);
    return { state: nextState, result: nextState.componentGraph };
  }

  if (name === 'generate_design') {
    const scenario = scenarioFromToolArguments(nextState.scenario, args);
    const unsupportedTemplate = unsupportedTemplateResult(scenario);
    if (unsupportedTemplate) return { state: nextState, result: unsupportedTemplate };
    const scenarioFit = supportedTemplateScenarioFit(scenario);
    if (!scenarioFit.ok) return { state: nextState, result: scenarioFit };
    nextState.design = generateDesign(scenario);
    nextState.validation = null;
    nextState.finalPackage = null;
    nextState.buildStepReview = null;
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

  if (name === 'review_component_interfaces') {
    if (!nextState.design) return { state: nextState, result: { ok: false, error: 'No design exists yet.' } };
    nextState.componentInterfaceReview = reviewComponentInterfaces(nextState.design);
    return { state: nextState, result: nextState.componentInterfaceReview };
  }

  if (name === 'review_build_steps') {
    if (!nextState.design) return { state: nextState, result: { ok: false, error: 'No design exists yet.' } };
    nextState.buildStepReview = reviewBuildSteps(nextState.design);
    return { state: nextState, result: nextState.buildStepReview };
  }

  if (name === 'revise_design') {
    if (!nextState.design) return { state: nextState, result: { ok: false, error: 'No design exists yet.' } };
    const unsupportedTemplate = unsupportedTemplateResult(nextState.design);
    if (unsupportedTemplate) return { state: nextState, result: unsupportedTemplate };
    nextState.design = reviseDesign(nextState.design, { parameters: parameterArguments(args) });
    nextState.validation = null;
    nextState.finalPackage = null;
    nextState.buildStepReview = null;
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
    if (!hasAnnotationPayload(args)) {
      return {
        state: nextState,
        result: {
          ok: false,
          error: 'annotate_design requires step_instructions, part_notes, or design_notes. Use exact step_id and part_id values from the current design.',
          expected_shape: SANDBOX_TOOLS.find((tool) => tool.name === 'annotate_design')?.input_schema,
          recommended_action: 'annotate_design'
        }
      };
    }
    nextState.design = annotateDesign(nextState.design, args);
    nextState.validation = null;
    nextState.finalPackage = null;
    nextState.buildStepReview = null;
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

  if (name === 'propose_component_composition') {
    const proposal = normalizeComponentCompositionProposal(args, nextState.scenario);
    const review = reviewComponentCompositionProposal(proposal, nextState.scenario);
    if (review.errors.length === 0) nextState.compositionProposal = proposal;
    nextState.compositionProposalAttempt = proposal;
    return {
      state: nextState,
      result: {
        ok: review.errors.length === 0,
        proposal,
        review,
        approval_status: 'codex_review_required',
        recommended_action: review.errors.length ? 'propose_component_composition' : 'request_capability',
        known_component_ids: review.errors.length ? listComponents().map((component) => component.component_id) : null,
        known_relationship_ids: review.errors.length ? listAssemblyRelationships().map((relationship) => relationship.relationship_id) : null,
        capability_request_arguments: review.errors.length ? null : {
          capability: `Implement component composition template ${proposal.template_id}`,
          reason: `Qwen proposed a reusable composition using ${proposal.component_ids.join(', ')}. Codex should review the proposal, add deterministic generator/validator/renderer support, and reject or revise unsafe assumptions.`,
          evidence: [
            `composition_proposal_id=${proposal.proposal_id}`,
            `component_ids=${proposal.component_ids.join(', ')}`,
            `relationship_ids=${proposal.relationship_ids.join(', ') || 'none'}`,
            `approval_status=${proposal.approval_status}`
          ]
        }
      }
    };
  }

  if (name === 'request_capability') {
    const capabilityArgs = enrichCapabilityArgumentsWithProposal(normalizeCapabilityArguments(args), nextState.compositionProposal);
    const duplicateCapability = duplicateCapabilityResult(nextState.design, capabilityArgs);
    if (duplicateCapability) return { state: nextState, result: duplicateCapability };
    const request = createCapabilityRequest({
      ...capabilityArgs,
      design_id: capabilityArgs.design_id || nextState.design?.design_id || nextState.scenario?.design_id || null,
      scenario: capabilityArgs.scenario || nextState.scenario || null
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

function normalizeComponentCompositionProposal(args = {}, scenario = {}) {
  const templateId = String(args.template_id || scenario?.template_id || '').trim();
  const rawComponentIds = uniqueStrings(args.component_ids || args.components || args.existing_component_ids);
  const existingComponentIds = rawComponentIds.filter((id) => getComponent(id));
  const missingComponentIds = rawComponentIds.filter((id) => !getComponent(id));
  const rawRelationshipIds = uniqueStrings(args.relationship_ids || args.relationships || args.assembly_relationship_ids);
  const existingRelationshipIds = rawRelationshipIds.filter((id) => getAssemblyRelationship(id));
  const missingRelationshipIds = rawRelationshipIds.filter((id) => !getAssemblyRelationship(id));
  return {
    type: 'component_composition_proposal',
    schema_version: '0.1',
    proposal_id: String(args.proposal_id || `${templateId || 'composition'}_proposal`).trim(),
    template_id: templateId,
    title: String(args.title || args.name || templateId || 'Untitled composition').trim(),
    intent: String(args.intent || scenario?.intent || '').trim(),
    source_design_id: args.design_id || scenario?.design_id || null,
    component_ids: existingComponentIds,
    requested_missing_component_ids: uniqueStrings([...(args.requested_missing_component_ids || []), ...missingComponentIds]),
    relationship_ids: existingRelationshipIds,
    requested_missing_relationship_ids: uniqueStrings([...(args.requested_missing_relationship_ids || []), ...missingRelationshipIds]),
    parameters: normalizeProposalParameters(args.parameters || scenario?.parameters || {}),
    design_algorithm: cleanStringArray(args.design_algorithm || args.algorithm || args.generation_steps),
    validation_strategy: cleanStringArray(args.validation_strategy || args.validators || args.validation),
    build_steps: normalizeProposalBuildSteps(args.build_steps || args.assembly_steps),
    renderer_requirements: cleanStringArray(args.renderer_requirements || args.rendering || args.visual_requirements),
    open_questions: cleanStringArray(args.open_questions || args.risks || args.unknowns),
    approval_status: 'codex_review_required'
  };
}

function reviewComponentCompositionProposal(proposal, scenario = {}) {
  const errors = [];
  const warnings = [];
  const existing = proposal.component_ids.map((id) => ({ id, component: getComponent(id) }));
  const existingRelationships = proposal.relationship_ids.map((id) => ({ id, relationship: getAssemblyRelationship(id) }));
  const unknownRendererComponentIds = proposal.renderer_requirements
    .filter((item) => /^[a-z_]+\.[a-z0-9_.-]+$/i.test(item))
    .filter((item) => !getComponent(item));
  if (!proposal.template_id) errors.push('template_id is required.');
  if (!proposal.title) errors.push('title is required.');
  if (!proposal.component_ids.length) errors.push('component_ids must name exact existing component IDs.');
  if (proposal.requested_missing_relationship_ids.length) warnings.push(`Unknown relationship IDs requested: ${proposal.requested_missing_relationship_ids.join(', ')}. Use search_assembly_relationships before inventing relationship IDs.`);
  if (!proposal.relationship_ids.length) warnings.push('Consider adding exact relationship_ids from search_assembly_relationships so Codex can review how parts connect, not just which components exist.');
  if (!Object.keys(proposal.parameters || {}).length) errors.push('parameters must describe the proposed template inputs.');
  if (proposal.design_algorithm.length < 3) errors.push('design_algorithm should include at least three deterministic generation steps.');
  if (proposal.validation_strategy.length < 2) errors.push('validation_strategy should include at least two deterministic checks.');
  if (proposal.build_steps.length < 2) errors.push('build_steps should describe at least two builder-facing stages.');
  const emptyInstructionSteps = proposal.build_steps.filter((step) => !step.instructions.length).map((step) => step.id);
  if (emptyInstructionSteps.length) errors.push(`Build steps need builder-facing instructions: ${emptyInstructionSteps.join(', ')}`);
  if (!proposal.renderer_requirements.length) warnings.push('renderer_requirements is empty; Codex will need to infer visual support.');
  if (!proposal.open_questions.length) warnings.push('open_questions is empty; proposals should surface uncertainties for Codex review.');
  if (proposal.requested_missing_component_ids.length) warnings.push(`Requested missing component IDs need Codex review before implementation: ${proposal.requested_missing_component_ids.join(', ')}`);
  if (unknownRendererComponentIds.length) warnings.push(`Renderer requirements mention missing component IDs: ${unknownRendererComponentIds.join(', ')}`);
  warnings.push(...domainCoverageWarnings(proposal, scenario));
  const suggestedExistingComponents = suggestExistingComponentsForMissingIds(proposal);
  if (suggestedExistingComponents.length) {
    warnings.push(`Some requested missing component IDs look close to existing catalog entries: ${suggestedExistingComponents.map((item) => `${item.requested_id} -> ${item.suggested_component_id}`).join(', ')}`);
  }
  const scenarioParameters = scenario?.parameters || {};
  const missingScenarioParameters = Object.keys(scenarioParameters)
    .filter((key) => proposal.parameters?.[key] === undefined);
  if (missingScenarioParameters.length) errors.push(`Proposal parameters must preserve scenario parameter keys: ${missingScenarioParameters.join(', ')}`);
  const driftedParameters = Object.entries(scenarioParameters)
    .filter(([key, value]) => proposal.parameters?.[key]?.default !== undefined && proposal.parameters[key].default !== value)
    .map(([key]) => key);
  if (driftedParameters.length) warnings.push(`Parameter defaults differ from scenario values: ${driftedParameters.join(', ')}`);
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    component_summaries: existing
      .filter((item) => item.component)
      .map((item) => ({
        component_id: item.component.component_id,
        category_id: item.component.category_id,
        outputs: item.component.outputs || []
      })),
    relationship_summaries: existingRelationships
      .filter((item) => item.relationship)
      .map((item) => ({
        relationship_id: item.relationship.relationship_id,
        type_id: item.relationship.type_id,
        validator_hints: item.relationship.validator_hints || [],
        component_hints: item.relationship.component_hints || []
      })),
    suggested_existing_components: suggestedExistingComponents,
    required_codex_review: [
      'Confirm formula correctness and generated part geometry.',
      'Add deterministic tests for schema, cut list, validation, and portal adapter output.',
      'Review woodworking safety, load assumptions, and build-step clarity before publishing.'
    ]
  };
}

function domainCoverageWarnings(proposal, scenario = {}) {
  const warnings = [];
  const componentIds = new Set(proposal.component_ids);
  const relationshipIds = new Set(proposal.relationship_ids);
  const text = [
    proposal.template_id,
    proposal.title,
    proposal.intent,
    scenario?.template_id,
    scenario?.intent,
    ...(Array.isArray(scenario?.builder_goals) ? scenario.builder_goals : []),
    ...proposal.design_algorithm,
    ...proposal.validation_strategy,
    ...proposal.renderer_requirements
  ].join(' ').toLowerCase();
  const parameters = { ...(scenario?.parameters || {}), ...(proposal.parameters || {}) };
  const requiresDrainage = parameterValue(parameters, 'drainage_holes') === true || /\bdrainage|weep hole|outdoor planter|planter\b/.test(text);
  if (requiresDrainage && !componentIds.has('hardware.drainage_hole_grid')) {
    warnings.push('Scenario appears to require drainage holes; include exact component_id hardware.drainage_hole_grid if the generated template drills bottom-panel holes.');
  }
  if (requiresDrainage && !relationshipIds.has('relationship.layout_reference.drainage_holes_in_panel')) {
    warnings.push('Scenario appears to require drainage holes; include relationship.layout_reference.drainage_holes_in_panel so Codex can validate host containment and edge clearance.');
  }
  const requiresSlats = /\bslat|slats|slatted|crate|planter\b/.test(text)
    || parameterValue(parameters, 'slat_count_per_side') !== undefined
    || parameterValue(parameters, 'side_slat_count') !== undefined
    || parameterValue(parameters, 'bottom_slat_count') !== undefined;
  if (requiresSlats && !componentIds.has('geometry.slatted_panel_set')) {
    warnings.push('Scenario appears to require repeated slats; include exact component_id geometry.slatted_panel_set instead of representing slatted walls only as generic rails or frame bays.');
  }
  const requiresBottomSupport = /\bbottom panel|crate floor|planter bottom|bottom slats\b/.test(text);
  if (requiresBottomSupport && !relationshipIds.has('relationship.support.bottom_panel_supported_by_box_sides')) {
    warnings.push('Scenario appears to require a supported bottom panel or crate floor; include relationship.support.bottom_panel_supported_by_box_sides when the bottom is carried by side walls, rails, posts, or slats.');
  }
  const requiresExtensionLeaves = /\b(extension leaf|end leaf|end leaves|table leaf|table leaves|leaf support|drawer slide|telescoping|retractable support|slide travel|support arm)\b/.test(text)
    || parameterValue(parameters, 'leaf_depth_in') !== undefined
    || parameterValue(parameters, 'support_arm_extension_in') !== undefined
    || parameterValue(parameters, 'slide_travel_in') !== undefined;
  if (requiresExtensionLeaves && !componentIds.has('geometry.extension_tabletop_set')) {
    warnings.push('Scenario appears to require a fixed tabletop plus end leaves; include exact component_id geometry.extension_tabletop_set instead of modeling leaves as generic or slatted panels.');
  }
  if (requiresExtensionLeaves && !componentIds.has('geometry.leg_apron_table_base')) {
    warnings.push('Scenario appears to require a four-leg table base; include exact component_id geometry.leg_apron_table_base for the leg-and-apron frame.');
  }
  if (requiresExtensionLeaves && !componentIds.has('hardware.telescoping_leaf_support_slide')) {
    warnings.push('Scenario appears to require retractable leaf supports; include exact component_id hardware.telescoping_leaf_support_slide for drawer-slide style support arms and travel metadata.');
  }
  if (requiresExtensionLeaves && !componentIds.has('validators.extension_leaf_support_path')) {
    warnings.push('Scenario appears to require load-path and clearance review for supported table leaves; include validators.extension_leaf_support_path.');
  }
  if (requiresExtensionLeaves && !componentIds.has('build_steps.extension_leaf_fit_sequence')) {
    warnings.push('Scenario appears to require open/closed slide fitting steps; include build_steps.extension_leaf_fit_sequence.');
  }
  if (requiresExtensionLeaves && !componentIds.has('rendering.open_closed_state_sequence')) {
    warnings.push('Scenario appears to require closed, support-extended, leaf-installed, and fully-open diagrams; include rendering.open_closed_state_sequence.');
  }
  const extensionRelationshipIds = [
    'relationship.fixed_contact.apron_to_leg_table_frame',
    'relationship.motion.telescoping_slide_support_under_leaf',
    'relationship.support.extension_leaf_carried_by_slide_supports',
    'relationship.clearance.extension_leaf_slide_travel'
  ];
  if (requiresExtensionLeaves) {
    const missingRelationships = extensionRelationshipIds.filter((relationshipId) => !relationshipIds.has(relationshipId));
    if (missingRelationships.length) {
      warnings.push(`Scenario appears to require extension-table relationships; include exact relationship_ids ${missingRelationships.join(', ')} when proposing the composition.`);
    }
  }
  return warnings;
}

function parameterValue(parameters, key) {
  const value = parameters?.[key];
  return value && typeof value === 'object' && 'default' in value ? value.default : value;
}

function suggestExistingComponentsForMissingIds(proposal) {
  const existingIds = new Set(proposal.component_ids);
  return proposal.requested_missing_component_ids
    .map((requestedId) => {
      const query = requestedId.split(/[._-]+/).join(' ');
      const [candidate] = searchComponents({ query, limit: 1 });
      if (!candidate || existingIds.has(candidate.component_id) || candidate.score < 8) return null;
      return {
        requested_id: requestedId,
        suggested_component_id: candidate.component_id,
        score: candidate.score
      };
    })
    .filter(Boolean);
}

function normalizeProposalParameters(parameters = {}) {
  return Object.fromEntries(Object.entries(parameters || {}).map(([key, value]) => [
    key,
    typeof value === 'object' && value !== null ? value : { default: value }
  ]));
}

function normalizeProposalBuildSteps(steps = []) {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((step, index) => {
      if (typeof step === 'string') {
        return {
          id: `step.${index + 1}`,
          title: `Step ${index + 1}`,
          component_ids: [],
          instructions: cleanStringArray(step),
          visual_requirements: []
        };
      }
      return {
        id: String(step.id || `step.${index + 1}`).trim(),
        title: String(step.title || step.name || step.step || `Step ${index + 1}`).trim(),
        component_ids: uniqueStrings(step.component_ids || step.components),
        instructions: cleanStringArray(step.instructions || step.notes || step.description || step.guidance),
        visual_requirements: cleanStringArray(step.visual_requirements || step.rendering)
      };
    })
    .filter((step) => step.title || step.instructions.length);
}

function uniqueStrings(values = []) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function enrichCapabilityArgumentsWithProposal(args = {}, proposal = null) {
  if (!proposal) return args;
  const evidence = Array.isArray(args.evidence) ? [...args.evidence] : [];
  evidence.push(`composition_proposal_id=${proposal.proposal_id}`);
  evidence.push(`composition_component_ids=${proposal.component_ids.join(', ')}`);
  return {
    ...args,
    evidence: [...new Set(evidence)]
  };
}

function normalizeCapabilityArguments(args = {}) {
  const evidence = Array.isArray(args.evidence) ? [...args.evidence] : [];
  if (Array.isArray(args.component_ids) && args.component_ids.length) evidence.push(`Closest component IDs considered: ${args.component_ids.join(', ')}`);
  if (Array.isArray(args.considered_components) && args.considered_components.length) evidence.push(`Closest component IDs considered: ${args.considered_components.join(', ')}`);
  if (Array.isArray(args.existing_component_ids) && args.existing_component_ids.length) evidence.push(`Closest component IDs considered: ${args.existing_component_ids.join(', ')}`);
  const capability = args.capability || args.capability_name || capabilityFromAliasArguments(args);
  return {
    ...args,
    capability,
    reason: args.reason || args.rationale || (capability ? `Existing sandbox tools cannot complete this design without ${capability}.` : ''),
    evidence
  };
}

function capabilityFromAliasArguments(args = {}) {
  if (args.template_id && args.capability_type) return `Add ${args.capability_type} for ${args.template_id}`;
  if (args.template_id) return `Add reusable composition support for ${args.template_id}`;
  if (args.capability_type) return `Add ${args.capability_type}`;
  return '';
}

function duplicateCapabilityResult(design, args = {}) {
  if (!design) return null;
  const text = [
    args.capability,
    args.reason,
    ...(Array.isArray(args.evidence) ? args.evidence : [])
  ].join(' ').toLowerCase();
  const duplicateMatches = [
    {
      component_id: 'geometry.shallow_wall_pocket',
      terms: ['mail pocket', 'shallow pocket', 'wall pocket', 'shelf lip', 'wall bin', 'pocket']
    },
    {
      component_id: 'hardware.linear_hook_array',
      terms: ['key hook', 'linear hook', 'hook array', 'repeated hook']
    },
    {
      component_id: 'hardware.wall_mount_hole_pair',
      terms: ['mounting hole', 'wall mount', 'wall screw']
    }
  ];
  const match = duplicateMatches.find((item) => design.components?.includes(item.component_id) && item.terms.some((term) => text.includes(term)));
  if (!match) return null;
  return {
    ok: false,
    error: `Capability request duplicates existing component already used by current design: ${match.component_id}.`,
    recommended_action: design.validation?.ok ? 'check_publishability' : 'validate_design',
    existing_component_id: match.component_id,
    current_design_summary: summarizeGeneratedDesign(design)
  };
}

export function scenarioFromToolArguments(scenario = {}, args = {}) {
  return {
    design_id: args.design_id || scenario.design_id,
    template_id: args.template_id || scenario.template_id,
    title: args.title || scenario.title,
    intent: args.intent || scenario.intent,
    builder_goals: args.builder_goals || scenario.builder_goals,
    source_brief: args.source_brief || scenario.source_brief,
    photo_design_brief: args.photo_design_brief || scenario.photo_design_brief,
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
  return (Array.isArray(value) ? value : typeof value === 'string' ? [value] : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function hasAnnotationPayload(args = {}) {
  return (Array.isArray(args.step_instructions) && args.step_instructions.some((item) => item?.step_id && Array.isArray(item.instructions) && item.instructions.length))
    || (Array.isArray(args.part_notes) && args.part_notes.some((item) => item?.part_id && Array.isArray(item.notes) && item.notes.length))
    || (Array.isArray(args.design_notes) && args.design_notes.length);
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
  const templateFit = compatibleTemplateFit(scenario);
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
    suggested_relationship_queries: assemblyRelationshipQueriesForScenario(scenario),
    compatible_template_ids: templateFit.compatible_template_ids,
    compatible_template_blockers: templateFit.blockers,
    capability: `Add reusable composition support for ${scenario.template_id || 'the requested plan type'}.`,
    available_templates: listTemplates().map((template) => template.template_id)
  };
}

function compatibleTemplateFit(scenario = {}) {
  const candidates = findTemplateCandidates(scenario.template_id);
  const blockers = unsupportedRelationshipBlockers(scenario, candidates);

  return {
    compatible_template_ids: blockers.length ? [] : candidates,
    blockers
  };
}

function supportedTemplateScenarioFit(scenario = {}) {
  const blockers = unsupportedRelationshipBlockers(scenario, [scenario.template_id]);
  if (!blockers.length) return { ok: true };
  return {
    ok: false,
    error: `Template ${scenario.template_id} is supported but does not fit this scenario's required assembly relationships.`,
    recommended_action: 'search_assembly_relationships',
    next_steps: [
      'Search assembly relationships for the required motion, support, clearance, or layout relationships.',
      'Search components for reusable physical parts and validators.',
      'Use propose_component_composition with exact component_ids and relationship_ids, or request a missing capability with the closest IDs considered.'
    ],
    attempted_template_id: scenario.template_id,
    template_fit_blockers: blockers,
    suggested_component_queries: componentSearchQueriesForScenario(scenario),
    suggested_relationship_queries: assemblyRelationshipQueriesForScenario(scenario)
  };
}

function unsupportedRelationshipBlockers(scenario = {}, candidateTemplateIds = []) {
  const text = scenarioSearchText(scenario);
  const candidateComponents = new Set(
    listTemplates()
      .filter((template) => candidateTemplateIds.includes(template.template_id))
      .flatMap((template) => template.components || [])
  );
  const hasExtensionLeafSupport = candidateComponents.has('geometry.extension_tabletop_set') && candidateComponents.has('hardware.telescoping_leaf_support_slide');
  const blockers = [];

  if (/\b(hinge|hinged|fold|folding|fold-down|fold down|swing|rotate|chain|brace|bracket|open state|closed state)\b/i.test(text) && !hasExtensionLeafSupport) {
    blockers.push('Scenario requires motion, hinge, swing, or support-stop relationships that no supported deterministic template currently represents.');
  }
  if (/\b(dowel|rod|round rail|cylinder)\b/i.test(text)) {
    blockers.push('Scenario requires round dowel or captured-rod geometry that no supported deterministic template currently represents.');
  }
  if (/\b(caster|casters|wheel|wheels|rolling|mobile)\b/i.test(text) && !candidateComponents.has('hardware.caster_plate_set')) {
    blockers.push('Scenario requires caster or rolling-base relationships that no supported deterministic template currently represents.');
  }
  if (/\b(extension leaf|end leaf|end leaves|table leaf|table leaves|drawer slide|telescoping|retractable support|slide travel|support arm)\b/i.test(text) && !hasExtensionLeafSupport) {
    blockers.push('Scenario requires extension-table leaf motion, slide-travel clearance, and leaf load-path relationships that no supported deterministic template currently represents.');
  }
  const hasFreestandingShelfSupport = candidateComponents.has('geometry.step_tread') && candidateComponents.has('geometry.square_leg_post');
  if (/\b(monitor|riser|desktop riser|center divider|anti-rack|anti rack)\b/i.test(text) && !hasFreestandingShelfSupport) {
    blockers.push('Scenario requires freestanding shelf/divider support relationships that no supported deterministic template currently represents.');
  }

  return blockers;
}

function componentSearchQueriesForScenario(scenario = {}) {
  const values = scenarioSearchText(scenario);
  const queries = [];
  if (/key|hook|peg|coat|mug/i.test(values)) queries.push('key hooks pegs repeated hardware pilot holes');
  if (/wall|mount|screw|hanger/i.test(values)) queries.push('wall mount screw holes edge clearance');
  if (/stool|step|tread|leg|load|standing/i.test(values)) queries.push('step stool tread leg rail load bearing');
  if (/table|tabletop|dining|leaf|leaves|extension|telescoping|drawer slide|retractable|support arm|apron/i.test(values)) queries.push('extension tabletop set end leaves leg apron table base telescoping leaf support slide');
  if (/tote|bin|storage|rack|runner|garage|workbench|shelf/i.test(values)) queries.push('storage tote rack runner rails rectangular frame bay');
  if (/floating|picture|canvas|frame|rabbet|strainer|miter|reveal/i.test(values)) queries.push('floating frame rabbet strainer rails miter canvas reveal');
  if (/caster|wheel|mobile|rolling/i.test(values)) queries.push('caster wheels plate mounting holes rolling base');
  if (/instruction|diagram|pdf|build step|callout|highlight|dimension|fastener/i.test(values)) queries.push('dimensioned stage sequence highlighted parts fastener callout diagrams');
  if (/board|panel|back|height|width|thickness/i.test(values)) queries.push('rectangular board panel centered spacing');
  if (!queries.length) queries.push(values || 'reusable generated design components');
  return queries;
}

function assemblyRelationshipQueriesForScenario(scenario = {}) {
  const values = scenarioSearchText(scenario);
  const queries = [];
  if (/hinge|fold|folding|fold-down|fold down|swing|chain|brace|bracket/i.test(values)) queries.push('hinged panel to cleat swing clearance stop support');
  if (/dowel|drying rack|rod|parallel/i.test(values)) queries.push('dowel frame hinged to wall frame parallel dowels stop chain');
  if (/slat|crate|planter|air gap|open side/i.test(values)) queries.push('slats fastened to corner posts repeated gaps edge clearance');
  if (/shelf|riser|bookcase|cubby|divider/i.test(values)) queries.push('shelf between side panels supported shelf clear opening');
  if (/caster|wheel|rolling|mobile|cart/i.test(values)) queries.push('caster plate to reinforced base rolling frame screw layout');
  if (/table|tabletop|dining|leaf|leaves|extension|telescoping|drawer slide|retractable|support arm|apron/i.test(values)) {
    queries.push('telescoping slide support under leaf drawer slide support arm travel clearance');
    queries.push('extension leaf carried by slide supports bearing edge load path');
    queries.push('apron to leg table frame fixed contact');
  }
  if (/rabbet|strainer|floating|reveal|canvas/i.test(values)) queries.push('rabbet ledge supports strainer reveal between frame and insert');
  if (/rail|post|frame|stretcher|bay/i.test(values)) queries.push('rail to post butt joint rectangular frame bay');
  if (/wall|mount|cleat|screw/i.test(values)) queries.push('wall mount holes on backer edge clearance');
  return [...new Set(queries)];
}

function scenarioSearchText(scenario = {}) {
  return [
    scenario.template_id,
    scenario.title,
    scenario.intent,
    ...(Array.isArray(scenario.builder_goals) ? scenario.builder_goals : []),
    ...Object.keys(scenario.parameters || {})
  ].filter(Boolean).join(' ');
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
