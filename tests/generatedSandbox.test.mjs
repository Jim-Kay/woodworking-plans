import assert from 'node:assert/strict';
import { canonicalToPortalResult } from '../src/generated/adapter.js';
import { generateCanonicalOpenScad } from '../src/generated/openScad.js';
import { calculateGeneratedPlan } from '../src/generated/portal.js';
import { generateDesign, exportPlanPackage, validateGeneratedDesign, checkPublishability, createCapabilityRequest, executeSandboxTool, listComponentCategories, listComponents, listSandboxTools, searchComponents } from '../src/generated/sandbox.js';

const scenario = {
  template_id: 'tray_bird_feeder',
  design_id: 'tray_bird_feeder_test',
  parameters: {
    width_in: 12,
    depth_in: 8,
    side_height_in: 1.5,
    bottom_thickness_in: 0.75,
    side_thickness_in: 0.75,
    material: 'cedar_fence_picket',
    hanging: true,
    drainage_holes: true
  }
};

const design = generateDesign(scenario);
assert.equal(design.schema_version, '0.1');
assert.equal(design.design_id, 'tray_bird_feeder_test');
assert.equal(design.template_id, 'tray_bird_feeder');
assert.equal(design.parts.filter((part) => part.physical).length, 5);
assert.equal(design.cut_list.length, 5);

const validation = validateGeneratedDesign(design);
assert.equal(validation.ok, true);
assert.deepEqual(validation.errors, []);

const partIds = new Set(design.parts.map((part) => part.id));
design.assembly_steps.forEach((step) => {
  step.part_ids.forEach((partId) => assert.equal(partIds.has(partId), true, `${step.id} references ${partId}`));
});
const drillStep = design.assembly_steps.find((step) => step.id === 'step.drill');
assert.match(drillStep.instructions.join('\n'), /3\/8 in drainage holes/);
assert.match(drillStep.instructions.join('\n'), /3 in from the left\/right ends/);
assert.match(drillStep.instructions.join('\n'), /1\.6 in from the front\/back edges/);
assert.match(drillStep.instructions.join('\n'), /at least 1 in from rail ends/);
design.joints.forEach((joint) => {
  joint.part_ids.forEach((partId) => assert.equal(partIds.has(partId), true, `${joint.id} references ${partId}`));
});

const cutListIds = new Set(design.cut_list.map((item) => item.part_id));
design.parts
  .filter((part) => part.physical)
  .forEach((part) => assert.equal(cutListIds.has(part.id), true, `${part.id} missing from cut list`));

const scad = generateCanonicalOpenScad(design);
design.parts
  .filter((part) => part.physical)
  .forEach((part) => assert.match(scad, new RegExp(`"part_id":"${escapeRegExp(part.id)}"`)));

const portalResult = canonicalToPortalResult(design, validation);
assert.equal(portalResult.type, 'generated');
assert.equal(portalResult.ok, true);
assert.equal(portalResult.parts.length, design.cut_list.length);
assert.equal(portalResult.assembly.parts.length, design.parts.length);
assert.equal(portalResult.buildSteps.length, design.assembly_steps.length);
assert.equal(portalResult.buildSteps[0].image, 'cut-layout');
assert.equal(portalResult.buildSteps[0].stage, 1);
assert.equal(portalResult.buildSteps[1].image, 'drill-layout');
assert.equal(portalResult.buildSteps[1].vis.references, true);
assert.equal(portalResult.buildSteps[2].vis.references, false);

const planPackage = exportPlanPackage(design);
assert.equal(planPackage.validation.ok, true);
assert.equal(planPackage.publishability.ok, true);
assert.match(planPackage.exports.openscad, /tray_bird_feeder_test/);

const publishability = checkPublishability(design, validation, { openscad: scad });
assert.equal(publishability.ok, true);

const invalid = generateDesign({
  ...scenario,
  parameters: { ...scenario.parameters, width_in: 2, drainage_holes: false }
});
const invalidValidation = validateGeneratedDesign(invalid);
assert.equal(invalidValidation.ok, false);
assert.match(invalidValidation.errors.join('\n'), /width_in/);
assert.match(invalidValidation.warnings.join('\n'), /drainage/);

const wallRack = generateDesign({
  template_id: 'board_with_linear_hardware',
  design_id: 'wall_key_rack_test',
  intent: 'wall key rack',
  parameters: {
    width_in: 18,
    height_in: 4,
    board_thickness_in: 0.75,
    hook_count: 5,
    hook_spacing_in: 3,
    mounting_holes: true,
    material: 'pine_1x4',
    hardware_type: 'screw_hook'
  }
});
assert.equal(wallRack.template_id, 'board_with_linear_hardware');
assert.equal(wallRack.title, 'Wall Key Rack');
assert.equal(wallRack.components.includes('hardware.linear_hook_array'), true);
assert.equal(wallRack.parts.filter((part) => part.id.startsWith('hook.pilot.')).length, 5);
assert.equal(wallRack.parts.filter((part) => part.id.startsWith('mount.hole.')).length, 2);
assert.equal(validateGeneratedDesign(wallRack).ok, true);
assert.equal(exportPlanPackage(wallRack).publishability.ok, true);

const portalWallRack = calculateGeneratedPlan({
  build: 'generated-wall-key-rack',
  rackW: 18,
  rackH: 4,
  rackT: 0.75,
  rackHookCount: 5,
  rackHookSpacing: 3,
  rackEndInset: 1.5,
  rackMountingHoles: true,
  rackMaterial: 'pine_1x4',
  rackHardware: 'screw_hook'
});
assert.equal(portalWallRack.ok, true);
assert.equal(portalWallRack.style, 'linear-wall-hardware');
assert.equal(portalWallRack.publishability.ok, true);
assert.equal(portalWallRack.buildSteps.some((step) => step.image === 'linear-hardware-drill-layout'), true);

const mailKeyOrganizer = generateDesign({
  template_id: 'wall_panel_with_pocket_and_linear_hardware',
  design_id: 'mail_key_organizer_test',
  intent: 'wall-mounted mail and key organizer',
  parameters: {
    width_in: 18,
    height_in: 10,
    board_thickness_in: 0.75,
    pocket_depth_in: 2.5,
    pocket_height_in: 4,
    hook_count: 5,
    hook_spacing_in: 3,
    mounting_holes: true,
    material: 'pine_1x6',
    pocket_material: 'thin_plywood',
    hardware_type: 'screw_hook'
  }
});
assert.equal(mailKeyOrganizer.template_id, 'wall_panel_with_pocket_and_linear_hardware');
assert.equal(mailKeyOrganizer.components.includes('geometry.shallow_wall_pocket'), true);
assert.equal(mailKeyOrganizer.parts.some((part) => part.id === 'pocket.front_lip'), true);
assert.equal(mailKeyOrganizer.parts.filter((part) => part.id.startsWith('hook.pilot.')).length, 5);
assert.equal(mailKeyOrganizer.parts.find((part) => part.id === 'hook.pilot.1').position.z < mailKeyOrganizer.parts.find((part) => part.id === 'pocket.bottom').position.z, true);
assert.equal(validateGeneratedDesign(mailKeyOrganizer).ok, true);
assert.equal(checkPublishability(mailKeyOrganizer, validateGeneratedDesign(mailKeyOrganizer)).ok, true);
assert.match(generateCanonicalOpenScad(mailKeyOrganizer), /pocket.front_lip/);

const duplicatePocketRequest = executeSandboxTool({
  name: 'request_capability',
  arguments: {
    capability: 'Add reusable mail pocket component',
    reason: 'Need a mail pocket for this organizer.',
    evidence: ['mail pocket not found']
  }
}, { scenario, design: mailKeyOrganizer });
assert.equal(duplicatePocketRequest.result.ok, false);
assert.equal(duplicatePocketRequest.result.existing_component_id, 'geometry.shallow_wall_pocket');
assert.equal(duplicatePocketRequest.result.recommended_action, 'validate_design');

const stepStool = generateDesign({
  template_id: 'two_step_stool',
  design_id: 'two_step_stool_test',
  intent: 'two-step wooden step stool',
  parameters: {
    width_in: 16,
    depth_in: 16,
    height_in: 16,
    lower_step_height_in: 8,
    leg_width_in: 1.5,
    leg_depth_in: 1.5,
    material: 'pine'
  }
});
assert.equal(stepStool.template_id, 'two_step_stool');
assert.equal(stepStool.components.includes('geometry.step_tread'), true);
assert.equal(stepStool.components.includes('geometry.square_leg_post'), true);
assert.equal(stepStool.parts.filter((part) => part.role === 'tread').length, 2);
assert.equal(stepStool.parts.filter((part) => part.role === 'leg').length, 4);
assert.equal(stepStool.parts.find((part) => part.id === 'leg.front.left').size.z, 8);
assert.equal(stepStool.parts.find((part) => part.id === 'leg.back.left').size.z, 16);
const stepStoolValidation = validateGeneratedDesign(stepStool);
assert.equal(stepStoolValidation.ok, true);
assert.match(stepStoolValidation.warnings.join('\n'), /not load certified/);
assert.equal(exportPlanPackage(stepStool).publishability.ok, true);
assert.match(generateCanonicalOpenScad(stepStool), /tread.upper/);

const badReferenceHost = structuredClone(design);
const badReference = badReferenceHost.parts.find((part) => part.id === 'drainage.hole.1');
badReference.position.x = 100;
const badReferenceValidation = validateGeneratedDesign(badReferenceHost);
assert.equal(badReferenceValidation.ok, false);
assert.match(badReferenceValidation.errors.join('\n'), /drainage\.hole\.1 must fit within host part bottom\.panel/);

const capabilityRequest = createCapabilityRequest({
  capability: 'wind-load simulation',
  reason: 'Existing validators cannot evaluate wind pressure on a pole-mounted feeder roof.',
  design_id: design.design_id,
  evidence: ['pole-mounted roof request']
});
assert.equal(capabilityRequest.type, 'capability_request');
assert.equal(capabilityRequest.capability, 'wind-load simulation');
assert.match(capabilityRequest.reason, /wind pressure/);

const tools = listSandboxTools();
assert.equal(tools.some((tool) => tool.name === 'generate_design'), true);
assert.equal(tools.some((tool) => tool.name === 'search_components'), true);
assert.equal(tools.some((tool) => tool.name === 'request_capability'), true);

assert.equal(listComponentCategories().some((category) => category.id === 'hardware'), true);
assert.equal(listComponents({ category_id: 'hardware' }).some((component) => component.component_id === 'hardware.linear_hook_array'), true);
assert.equal(searchComponents({ query: 'key hooks pilot holes' }).some((component) => component.component_id === 'hardware.linear_hook_array'), true);
assert.equal(searchComponents({ query: 'mail pocket' }).some((component) => component.component_id === 'geometry.shallow_wall_pocket'), true);
assert.equal(searchComponents({ query: 'step stool leg tread load bearing' }).some((component) => component.component_id === 'geometry.step_tread'), true);
assert.equal(searchComponents({ query: 'step stool leg tread load bearing' }).some((component) => component.component_id === 'geometry.square_leg_post'), true);
assert.equal(searchComponents({ query: 'step stool leg tread load bearing' }).some((component) => component.component_id === 'validators.load_bearing_caution'), true);
assert.equal(searchComponents({ query: 'key hooks pilot holes', category_id: 'hardware' })[0].component_id, 'hardware.linear_hook_array');

let toolState = { scenario };
let executed = executeSandboxTool({ name: 'inspect_scenario', arguments: {} }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.result.templates.some((template) => template.template_id === 'tray_bird_feeder'), true);
assert.equal(executed.result.component_categories.some((category) => category.id === 'patterns'), true);
toolState = executed.state;

executed = executeSandboxTool({ name: 'search_components', arguments: { query: 'wall mount screw holes', limit: 3 } }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.result.components.some((component) => component.component_id === 'hardware.wall_mount_hole_pair'), true);

executed = executeSandboxTool({ name: 'get_component', arguments: { component_id: 'hardware.linear_hook_array' } }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.result.component.aliases.includes('key hooks'), true);

const photoBrief = {
  photo_set_id: 'mail_key_photo_set',
  object_type: 'wall mail and key organizer',
  confidence: 'high',
  photos: [{ photo_id: 'front', view: 'front', description: 'Shows back board, mail pocket, hooks, and mounting holes.' }],
  parts: [
    { name: 'back board', role: 'wall backer', seen_in: ['front'], component_query: 'rectangular back board panel', confidence: 'high' },
    { name: 'mail pocket', role: 'shallow envelope pocket', seen_in: ['front'], component_query: 'mail pocket shallow wall shelf', confidence: 'high' },
    { name: 'key hooks', role: 'linear hook row', seen_in: ['front'], component_query: 'key hooks linear hook array', confidence: 'high', notes: ['5 hooks visible'] }
  ],
  known_measurements: [{ label: 'overall width', value_in: 18 }],
  inferred_dimensions: [{ label: 'overall height', estimate_in: 10, confidence: 'medium', basis: 'photo proportion' }],
  component_searches: [{ query: 'mail pocket shallow wall shelf', purpose: 'Find pocket component', category_id: 'geometry' }]
};

executed = executeSandboxTool({ name: 'inspect_photo_brief', arguments: { brief: photoBrief } }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.result.summary.photo_count, 1);
toolState = executed.state;

executed = executeSandboxTool({ name: 'search_photo_brief_components', arguments: { limit: 3 } }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.result.searches.some((search) => search.components.some((component) => component.component_id === 'geometry.shallow_wall_pocket')), true);
toolState = executed.state;

executed = executeSandboxTool({ name: 'photo_brief_to_scenario', arguments: {} }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.result.scenario.template_id, 'wall_panel_with_pocket_and_linear_hardware');
assert.equal(executed.result.scenario.parameters.width_in, 18);
toolState = { scenario };

const stoolPhotoBrief = {
  photo_set_id: 'rockport_step_stool_reference',
  object_type: 'two-step wooden step stool',
  confidence: 'high',
  photos: [{ photo_id: 'front', view: 'front', description: 'Shows two treads, legs, and side rails.' }],
  parts: [
    { name: 'Step', role: 'primary', seen_in: ['front'], component_query: 'two-step wooden step stool', confidence: 'high' },
    { name: 'Front Leg', role: 'structural', seen_in: ['front'], component_query: 'wooden leg for two-step stool front', confidence: 'high' },
    { name: 'Back Leg', role: 'structural', seen_in: ['front'], component_query: 'wooden leg for two-step stool back', confidence: 'high' },
    { name: 'Side Rail', role: 'connective', seen_in: ['front'], component_query: 'wooden side rail for two-step stool', confidence: 'high' }
  ],
  known_measurements: [
    { label: 'overall width', value_in: 16 },
    { label: 'overall depth', value_in: 16 },
    { label: 'overall height', value_in: 16 },
    { label: 'front leg height', value_in: 8 },
    { label: 'leg width', value_in: 1.5 },
    { label: 'leg depth', value_in: 1.5 }
  ]
};
executed = executeSandboxTool({ name: 'inspect_photo_brief', arguments: { brief: stoolPhotoBrief } }, toolState);
toolState = executed.state;
executed = executeSandboxTool({ name: 'photo_brief_to_scenario', arguments: {} }, toolState);
assert.equal(executed.result.scenario.template_id, 'two_step_stool');
assert.equal(executed.result.scenario.parameters.lower_step_height_in, 8);
toolState = executed.state;
executed = executeSandboxTool({ name: 'generate_design', arguments: {} }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.state.design.template_id, 'two_step_stool');
toolState = { scenario };

executed = executeSandboxTool({
  name: 'generate_design',
  arguments: { template_id: 'wall_key_rack', design_id: 'unsupported_test' }
}, toolState);
assert.equal(executed.result.ok, false);
assert.equal(executed.result.recommended_action, 'search_components');
assert.match(executed.result.error, /Unsupported template_id/);
assert.equal(executed.result.suggested_component_queries.some((query) => /key hooks/.test(query)), true);
assert.equal(executed.result.compatible_template_ids.includes('board_with_linear_hardware'), true);

executed = executeSandboxTool({
  name: 'generate_design',
  arguments: { template_id: 'mail_key_organizer', design_id: 'unsupported_mail_test' }
}, toolState);
assert.equal(executed.result.ok, false);
assert.equal(executed.result.compatible_template_ids.includes('wall_panel_with_pocket_and_linear_hardware'), true);

executed = executeSandboxTool({
  name: 'request_capability',
  arguments: {
    capability_name: 'step stool structural template',
    rationale: 'No current template supports a load-bearing two-step stool.',
    component_ids: ['geometry.rectangular_panel', 'geometry.linear_rail']
  }
}, { scenario: { design_id: 'capability_alias_test' } });
assert.equal(executed.result.ok, true);
assert.equal(executed.result.request.capability, 'step stool structural template');
assert.equal(executed.result.request.reason, 'No current template supports a load-bearing two-step stool.');
assert.match(executed.result.request.evidence.join('\n'), /geometry\.linear_rail/);

executed = executeSandboxTool({
  name: 'request_capability',
  arguments: {
    capability_name: 'photo to template mapping'
  }
}, { scenario: { design_id: 'capability_reason_fallback_test' } });
assert.match(executed.result.request.reason, /photo to template mapping/);

executed = executeSandboxTool({ name: 'generate_design', arguments: { parameters: { width_in: 13 } } }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.state.design.parameters.width_in, 13);
toolState = executed.state;

executed = executeSandboxTool({ name: 'validate_design', arguments: {} }, toolState);
assert.equal(executed.result.ok, true);
toolState = executed.state;

executed = executeSandboxTool({
  name: 'annotate_design',
  arguments: {
    step_instructions: [
      {
        step_id: 'step.drill',
        instructions: ['Qwen-authored note: drill test holes in scrap before drilling the feeder parts.']
      }
    ],
    part_notes: [
      {
        part_id: 'bottom.panel',
        notes: ['Qwen-authored note: mark drainage holes from the panel edges before drilling.']
      }
    ],
    design_notes: ['Qwen reviewed the package and added drill-layout guidance.']
  }
}, toolState);
assert.equal(executed.result.ok, true);
assert.match(executed.state.design.assembly_steps.find((step) => step.id === 'step.drill').instructions.join('\n'), /Qwen-authored note/);
assert.match(executed.state.design.parts.find((part) => part.id === 'bottom.panel').meta.guidance_notes.join('\n'), /mark drainage holes/);
toolState = executed.state;

executed = executeSandboxTool({ name: 'check_publishability', arguments: {} }, toolState);
assert.equal(executed.result.ok, true);
toolState = executed.state;

executed = executeSandboxTool({ name: 'export_plan_package', arguments: {} }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.result.publishability.ok, true);

console.log('generated sandbox tests passed');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
