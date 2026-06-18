import assert from 'node:assert/strict';
import { canonicalToPortalResult } from '../src/generated/adapter.js';
import { generateCanonicalOpenScad } from '../src/generated/openScad.js';
import { calculateGeneratedPlan } from '../src/generated/portal.js';
import { generateDesign, exportPlanPackage, validateGeneratedDesign, checkPublishability, createCapabilityRequest, executeSandboxTool, listAssemblyRelationshipTypes, listAssemblyRelationships, listComponentCategories, listComponents, listSandboxTools, reviewBuildSteps, searchAssemblyRelationships, searchComponents, searchTemplates } from '../src/generated/sandbox.js';

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

const feederBuildStepReview = reviewBuildSteps(design);
assert.equal(feederBuildStepReview.ok, true);
assert.equal(feederBuildStepReview.quality_gate_passed, false);
assert.equal(feederBuildStepReview.findings.some((finding) => finding.category === 'fastener_guidance' && finding.step_id === 'step.assemble'), true);
assert.equal(feederBuildStepReview.recommended_annotations.step_instructions.some((annotation) => annotation.step_id === 'step.cut'), true);
assert.equal(feederBuildStepReview.recommended_tool_call.name, 'annotate_design');
assert.equal(feederBuildStepReview.missing_capabilities.some((item) => item.capability === 'pre-assembly drill-layout view'), false);
assert.equal(feederBuildStepReview.missing_capabilities.some((item) => item.capability === 'generated build-step mini-video animation'), false);

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
assert.equal(portalResult.buildSteps[1].diagram.preAssembly, true);
assert.equal(portalResult.buildSteps[1].animation.type, 'generated-step-2');
assert.equal(portalResult.buildSteps[1].vis.references, true);
assert.equal(portalResult.buildSteps[2].image, 'stage-specific-diagram');
assert.equal(portalResult.buildSteps[2].diagram.stageSpecific, true);
assert.equal(portalResult.buildSteps[2].animation.type, 'generated-step-3');
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
assert.equal(stepStool.parts.filter((part) => part.role === 'leg').length, 6);
assert.equal(stepStool.parts.filter((part) => part.role === 'rail').length, 7);
assert.equal(stepStool.parts.find((part) => part.id === 'leg.front.left').size.z, 7.25);
assert.equal(stepStool.parts.find((part) => part.id === 'leg.middle.left').size.z, 15.25);
assert.equal(stepStool.parts.find((part) => part.id === 'leg.back.left').size.z, 15.25);
const stepStoolValidation = validateGeneratedDesign(stepStool);
assert.equal(stepStoolValidation.ok, true);
assert.match(stepStoolValidation.warnings.join('\n'), /not load certified/);
assert.equal(exportPlanPackage(stepStool).publishability.ok, true);
assert.match(generateCanonicalOpenScad(stepStool), /tread.upper/);

const portalStepStool = calculateGeneratedPlan({
  build: 'generated-two-step-stool',
  stoolW: 16,
  stoolD: 16,
  stoolH: 16,
  stoolLowerStepH: 8,
  stoolLowerStepD: 8,
  stoolUpperStepD: 8,
  stoolTreadT: 0.75,
  stoolLegW: 1.5,
  stoolLegD: 1.5,
  stoolRailH: 1.5,
  stoolRailT: 0.75,
  stoolMaterial: 'pine'
});
assert.equal(portalStepStool.ok, true);
assert.equal(portalStepStool.style, 'two-step-stool');
assert.equal(portalStepStool.generatedDesign.template_id, 'two_step_stool');
assert.equal(portalStepStool.parts.length, 15);
assert.equal(portalStepStool.physicalPartCount, 15);
assert.equal(portalStepStool.publishability.ok, true);

const cantileveredStepStool = structuredClone(stepStool);
cantileveredStepStool.parts = cantileveredStepStool.parts.filter((part) => !['leg.middle.left', 'leg.middle.right', 'rail.middle.upper'].includes(part.id));
const cantileveredStepStoolValidation = validateGeneratedDesign(cantileveredStepStool);
assert.equal(cantileveredStepStoolValidation.ok, false);
assert.match(cantileveredStepStoolValidation.errors.join('\n'), /upper tread must have front-edge support/);

const clippedStepStool = structuredClone(stepStool);
clippedStepStool.parts.find((part) => part.id === 'leg.front.left').size.z = 8;
clippedStepStool.parts.find((part) => part.id === 'leg.front.left').position.z = 4;
const clippedStepStoolValidation = validateGeneratedDesign(clippedStepStool);
assert.equal(clippedStepStoolValidation.ok, false);
assert.match(clippedStepStoolValidation.errors.join('\n'), /leg\.front\.left.*overlap/);

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
assert.equal(tools.some((tool) => tool.name === 'search_templates'), true);
assert.equal(tools.some((tool) => tool.name === 'search_components'), true);
assert.equal(tools.some((tool) => tool.name === 'search_assembly_relationships'), true);
assert.equal(tools.some((tool) => tool.name === 'review_build_steps'), true);
assert.equal(tools.some((tool) => tool.name === 'propose_component_composition'), true);
assert.equal(tools.some((tool) => tool.name === 'request_capability'), true);

assert.equal(listComponentCategories().some((category) => category.id === 'hardware'), true);
assert.equal(listComponents({ category_id: 'hardware' }).some((component) => component.component_id === 'hardware.linear_hook_array'), true);
assert.equal(listAssemblyRelationshipTypes().some((type) => type.id === 'motion'), true);
assert.equal(listAssemblyRelationships({ type_id: 'support' }).some((relationship) => relationship.relationship_id === 'relationship.support.shelf_between_side_panels'), true);
assert.equal(searchComponents({ query: 'key hooks pilot holes' }).some((component) => component.component_id === 'hardware.linear_hook_array'), true);
assert.equal(searchComponents({ query: 'mail pocket' }).some((component) => component.component_id === 'geometry.shallow_wall_pocket'), true);
assert.equal(searchComponents({ query: 'entryway mail cubby catchall' })[0].component_id, 'geometry.shallow_wall_pocket');
assert.equal(searchComponents({ query: 'mail pocket or shallow shelf', category_id: 'storage_components' }).some((component) => component.component_id === 'geometry.shallow_wall_pocket'), true);
assert.equal(searchComponents({ query: 'step stool leg tread load bearing' }).some((component) => component.component_id === 'geometry.step_tread'), true);
assert.equal(searchComponents({ query: 'step stool leg tread load bearing' }).some((component) => component.component_id === 'geometry.square_leg_post'), true);
assert.equal(searchComponents({ query: 'step stool leg tread load bearing' }).some((component) => component.component_id === 'validators.load_bearing_caution'), true);
assert.equal(searchComponents({ query: 'key hooks pilot holes', category_id: 'hardware' })[0].component_id, 'hardware.linear_hook_array');
assert.equal(searchComponents({ query: '27 gallon tote rack runner rails caster wheels workbench' }).some((component) => component.component_id === 'geometry.tote_runner_pair'), true);
assert.equal(searchComponents({ query: '27 gallon tote rack runner rails caster wheels workbench' }).some((component) => component.component_id === 'hardware.caster_plate_set'), true);
assert.equal(searchComponents({ query: 'PDF style dimensioned build step fastener callout' }).some((component) => component.component_id === 'build_steps.dimensioned_stage_sequence'), true);
assert.equal(searchAssemblyRelationships({ query: 'fold down hinged desk panel support chain swing clearance' })[0].relationship_id, 'relationship.motion.hinge_panel_to_cleat');
assert.equal(searchAssemblyRelationships({ query: 'dowel laundry drying rack wall frame hinge', part_roles: ['dowel', 'side rail', 'wall frame'] })[0].relationship_id, 'relationship.motion.dowel_frame_hinged_to_wall_frame');
assert.equal(searchAssemblyRelationships({ query: 'caster wheels under rolling workbench base plate screws' }).some((relationship) => relationship.relationship_id === 'relationship.support.caster_plate_to_base'), true);
assert.equal(searchTemplates({ query: 'entryway mail cubby hooks' })[0].template_id, 'wall_panel_with_pocket_and_linear_hardware');
assert.equal(searchTemplates({ query: 'rockport step ladder stool' })[0].template_id, 'two_step_stool');

let toolState = { scenario };
let executed = executeSandboxTool({ name: 'inspect_scenario', arguments: {} }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.result.templates.some((template) => template.template_id === 'tray_bird_feeder'), true);
assert.equal(executed.result.component_categories.some((category) => category.id === 'patterns'), true);
toolState = executed.state;

executed = executeSandboxTool({ name: 'search_components', arguments: { query: 'wall mount screw holes', limit: 3 } }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.result.components.some((component) => component.component_id === 'hardware.wall_mount_hole_pair'), true);

executed = executeSandboxTool({ name: 'search_templates', arguments: { query: 'mail and key organizer', limit: 3 } }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.result.templates[0].template_id, 'wall_panel_with_pocket_and_linear_hardware');

executed = executeSandboxTool({ name: 'search_assembly_relationships', arguments: { query: 'rail fastened to panel face', part_roles: ['rail', 'panel'], limit: 3 } }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.result.relationships[0].relationship_id, 'relationship.fixed_contact.panel_to_rail');

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
  ],
  component_searches: [
    { query: 'wooden step tread', purpose: 'Find a tread component', category_id: 'wooden_steps' }
  ]
};
executed = executeSandboxTool({ name: 'inspect_photo_brief', arguments: { brief: stoolPhotoBrief } }, toolState);
assert.equal(executed.result.brief.component_searches.find((search) => search.query === 'wooden step tread')?.category_id, undefined);
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
  name: 'generate_design',
  arguments: { template_id: 'fold_down_entry_shelf', design_id: 'unsupported_fold_down_test' }
}, {
  scenario: {
    template_id: 'fold_down_entry_shelf',
    design_id: 'unsupported_fold_down_test',
    intent: 'Wall-mounted fold-down shelf with hinged panel, side chains, swing clearance, and conservative load warning.',
    builder_goals: ['search relationships for hinged panel motion and stop support'],
    parameters: { width_in: 24, depth_open_in: 10 }
  }
});
assert.equal(executed.result.ok, false);
assert.equal(executed.result.compatible_template_ids.length, 0);
assert.equal(executed.result.compatible_template_blockers.some((blocker) => /motion|hinge|swing/i.test(blocker)), true);
assert.equal(executed.result.suggested_relationship_queries.some((query) => /hinged panel/.test(query)), true);

executed = executeSandboxTool({
  name: 'generate_design',
  arguments: { template_id: 'wall_panel_with_pocket_and_linear_hardware', design_id: 'wrong_supported_template_test' }
}, {
  scenario: {
    template_id: 'fold_down_entry_shelf',
    design_id: 'wrong_supported_template_test',
    intent: 'Wall-mounted fold-down shelf with hinged panel, side chains, swing clearance, and conservative load warning.',
    builder_goals: ['do not force this through a wall organizer template'],
    parameters: { width_in: 24, height_in: 12, board_thickness_in: 0.75 }
  }
});
assert.equal(executed.result.ok, false);
assert.match(executed.result.error, /does not fit this scenario/);
assert.equal(executed.result.recommended_action, 'search_assembly_relationships');
assert.equal(executed.state.design, undefined);

executed = executeSandboxTool({
  name: 'generate_design',
  arguments: { template_id: 'mobile_tote_rack_workbench', design_id: 'unsupported_tote_rack_test' }
}, toolState);
assert.equal(executed.result.ok, false);
assert.equal(executed.result.suggested_component_queries.some((query) => /tote rack runner/.test(query)), true);
assert.equal(executed.result.suggested_component_queries.some((query) => /caster wheels/.test(query)), true);

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
    capability: 'mobile tote rack template',
    considered_components: ['geometry.rectangular_frame_bay', 'hardware.caster_plate_set']
  }
}, { scenario: { design_id: 'considered_components_test' } });
assert.match(executed.result.request.evidence.join('\n'), /geometry\.rectangular_frame_bay/);
assert.match(executed.result.request.evidence.join('\n'), /hardware\.caster_plate_set/);

executed = executeSandboxTool({
  name: 'request_capability',
  arguments: {
    capability_name: 'photo to template mapping'
  }
}, { scenario: { design_id: 'capability_reason_fallback_test' } });
assert.match(executed.result.request.reason, /photo to template mapping/);

executed = executeSandboxTool({
  name: 'request_capability',
  arguments: {
    capability_type: 'template_support',
    template_id: 'floating_frame_strainer_on_rabbet',
    existing_component_ids: ['geometry.rabbeted_frame_face_set', 'geometry.strainer_rail_set']
  }
}, { scenario: { design_id: 'capability_template_alias_test' } });
assert.equal(executed.result.request.capability, 'Add template_support for floating_frame_strainer_on_rabbet');
assert.match(executed.result.request.reason, /floating_frame_strainer_on_rabbet/);
assert.match(executed.result.request.evidence.join('\n'), /geometry\.rabbeted_frame_face_set/);

executed = executeSandboxTool({
  name: 'propose_component_composition',
  arguments: {
    template_id: 'floating_frame_strainer_on_rabbet',
    title: 'Floating Frame Strainer On Rabbet',
    component_ids: ['geometry.rabbeted_frame_face_set', 'geometry.strainer_rail_set', 'validators.rabbet_strainer_fit', 'build_steps.mill_rabbet_then_assemble_frame', 'rendering.rabbet_milling_operation_view'],
    relationship_ids: ['relationship.clearance.reveal_between_frame_and_insert', 'relationship.support.rabbet_ledge_supports_strainer'],
    parameters: {
      canvas_width_in: { type: 'number', default: 16 },
      canvas_height_in: { type: 'number', default: 20 },
      reveal_in: { type: 'number', default: 0.25 },
      rabbet_depth_in: { type: 'number', default: 0.125 }
    },
    design_algorithm: [
      'Compute inner opening from canvas dimensions plus reveal.',
      'Generate four rabbeted mitered face members around the opening.',
      'Generate four strainer rails seated on the rabbet ledge.',
      'Place canvas reference and mounting hardware after dry fit.'
    ],
    validation_strategy: [
      'Check rabbet depth and strainer depth leave a usable support ledge.',
      'Check canvas reveal is positive and consistent on all sides.',
      'Check all physical parts are represented in the cut list.'
    ],
    build_steps: [
      { id: 'step.mill_rabbet', title: 'Mill rabbeted frame stock', component_ids: ['geometry.rabbeted_frame_face_set'], instructions: ['Mill the rabbet before final miters.'] },
      { id: 'step.seat_strainer', title: 'Seat strainer rails', component_ids: ['geometry.strainer_rail_set'], instructions: ['Dry fit the strainer rails on the rabbet ledge.'] }
    ],
    renderer_requirements: ['Show rabbet milling operation before assembly.', 'Show strainer rails seating on the rabbet ledge.'],
    open_questions: ['Confirm safest default rabbet depth for common frame stock.']
  }
}, { scenario: { design_id: 'composition_proposal_test' } });
assert.equal(executed.result.ok, true);
assert.equal(executed.result.approval_status, 'codex_review_required');
assert.equal(executed.state.compositionProposal.template_id, 'floating_frame_strainer_on_rabbet');
assert.equal(executed.state.compositionProposal.relationship_ids.includes('relationship.support.rabbet_ledge_supports_strainer'), true);
assert.equal(executed.result.review.relationship_summaries.some((item) => item.relationship_id === 'relationship.support.rabbet_ledge_supports_strainer'), true);
assert.match(executed.result.capability_request_arguments.evidence.join('\n'), /composition_proposal_id/);
assert.match(executed.result.capability_request_arguments.evidence.join('\n'), /relationship_ids=.*relationship\.support\.rabbet_ledge_supports_strainer/);
const validCompositionProposal = executed.state.compositionProposal;
const proposalState = executed.state;

executed = executeSandboxTool({
  name: 'request_capability',
  arguments: {
    capability: 'Implement frame composition',
    reason: 'Need deterministic implementation.'
  }
}, proposalState);
assert.match(executed.result.request.evidence.join('\n'), /composition_proposal_id=floating_frame_strainer_on_rabbet_proposal/);

executed = executeSandboxTool({
  name: 'propose_component_composition',
  arguments: {
    template_id: 'bad_template',
    title: 'Bad Template',
    component_ids: ['geometry.does_not_exist'],
    parameters: {},
    design_algorithm: ['Do one vague thing.'],
    validation_strategy: [],
    build_steps: []
  }
}, { scenario: { design_id: 'bad_composition_proposal_test' } });
assert.equal(executed.result.ok, false);
assert.match(executed.result.review.errors.join('\n'), /component_ids must name exact existing/);
assert.equal(executed.state.compositionProposal, undefined);
assert.equal(executed.result.known_component_ids.includes('geometry.rabbeted_frame_face_set'), true);
assert.equal(executed.result.known_relationship_ids.includes('relationship.support.rabbet_ledge_supports_strainer'), true);
assert.equal(validCompositionProposal.template_id, 'floating_frame_strainer_on_rabbet');

executed = executeSandboxTool({
  name: 'propose_component_composition',
  arguments: {
    template_id: 'missing_parameter_template',
    title: 'Missing Parameter Template',
    component_ids: ['geometry.rabbeted_frame_face_set', 'geometry.strainer_rail_set'],
    parameters: { canvas_width: { default: 16 } },
    design_algorithm: ['Calculate opening.', 'Generate frame members.', 'Generate support rails.'],
    validation_strategy: ['Check reveal.', 'Check cut list.'],
    build_steps: ['Mill the rabbet.', 'Seat the strainer rails.'],
    renderer_requirements: ['Show rabbet milling operation.'],
    open_questions: ['Confirm default material.']
  }
}, { scenario: { design_id: 'missing_parameter_proposal_test', parameters: { canvas_width_in: 16 } } });
assert.equal(executed.result.ok, false);
assert.match(executed.result.review.errors.join('\n'), /preserve scenario parameter keys/);

executed = executeSandboxTool({
  name: 'propose_component_composition',
  arguments: {
    template_id: 'bad_renderer_template',
    title: 'Bad Renderer Template',
    component_ids: ['geometry.rabbeted_frame_face_set', 'geometry.strainer_rail_set'],
    parameters: { width_in: { default: 16 } },
    design_algorithm: ['Calculate opening.', 'Generate parts.', 'Generate steps.'],
    validation_strategy: ['Check fit.', 'Check cut list.'],
    build_steps: [
      { id: 'step.empty', title: 'Empty Step', instructions: [] },
      { id: 'step.ok', title: 'OK Step', instructions: ['Do the work.'] }
    ],
    renderer_requirements: ['rendering.not_a_real_component']
  }
}, { scenario: { design_id: 'bad_renderer_proposal_test' } });
assert.equal(executed.result.ok, false);
assert.match(executed.result.review.warnings.join('\n'), /Renderer requirements mention missing component IDs/);
assert.match(executed.result.review.errors.join('\n'), /Build steps need builder-facing instructions/);

executed = executeSandboxTool({
  name: 'propose_component_composition',
  arguments: {
    template_id: 'string_step_template',
    title: 'String Step Template',
    component_ids: ['geometry.rabbeted_frame_face_set', 'geometry.strainer_rail_set'],
    parameters: { width_in: 16 },
    design_algorithm: ['Calculate opening.', 'Generate frame members.', 'Generate support rails.'],
    validation_strategy: ['Check reveal.', 'Check cut list.'],
    build_steps: [
      { step: 'Mill rabbets', instructions: 'Cut a consistent rabbet before assembly.' },
      'Dry fit the strainer rails on the rabbet ledge.'
    ],
    renderer_requirements: ['Show rabbet milling operation.'],
    open_questions: ['Confirm default material.']
  }
}, { scenario: { design_id: 'string_step_proposal_test' } });
assert.equal(executed.result.ok, true);
assert.equal(executed.state.compositionProposal.build_steps[0].instructions[0], 'Cut a consistent rabbet before assembly.');
assert.equal(executed.state.compositionProposal.build_steps[1].instructions[0], 'Dry fit the strainer rails on the rabbet ledge.');

executed = executeSandboxTool({
  name: 'propose_component_composition',
  arguments: {
    template_id: 'rolling_tote_rack_workbench',
    title: 'Rolling Tote Rack Workbench',
    component_ids: ['hardware.caster_plate_set'],
    requested_missing_component_ids: ['frame.rectangular_frame_bay', 'dimensioning.dimensioned_stage_sequence'],
    parameters: { width_in: 69, depth_in: 27, height_in: 34 },
    design_algorithm: ['Calculate frame dimensions.', 'Place casters.', 'Place tote runners.'],
    validation_strategy: ['Check frame clearance.', 'Check caster layout.'],
    build_steps: [
      { id: 'step.frame', title: 'Build frame', instructions: ['Assemble rectangular frame.'] },
      { id: 'step.casters', title: 'Install casters', instructions: ['Attach caster plates.'] }
    ],
    renderer_requirements: ['Show caster plate layout.'],
    open_questions: ['Confirm tote runner spacing.']
  }
}, { scenario: { design_id: 'duplicate_missing_hint_test' } });
assert.equal(executed.result.ok, true);
assert.equal(executed.result.review.suggested_existing_components.some((item) => item.requested_id === 'frame.rectangular_frame_bay' && item.suggested_component_id === 'geometry.rectangular_frame_bay'), true);
assert.equal(executed.result.review.suggested_existing_components.some((item) => item.requested_id === 'dimensioning.dimensioned_stage_sequence' && item.suggested_component_id === 'build_steps.dimensioned_stage_sequence'), true);

executed = executeSandboxTool({ name: 'generate_design', arguments: { parameters: { width_in: 13 } } }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.state.design.parameters.width_in, 13);
toolState = executed.state;

executed = executeSandboxTool({ name: 'validate_design', arguments: {} }, toolState);
assert.equal(executed.result.ok, true);
toolState = executed.state;

executed = executeSandboxTool({ name: 'review_build_steps', arguments: {} }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.result.status, 'needs_revision');
assert.equal(executed.result.recommended_annotations.step_instructions.some((annotation) => annotation.step_id === 'step.cut'), true);
assert.match(executed.result.recommended_annotations.step_instructions.find((annotation) => annotation.step_id === 'step.cut').instructions.join('\n'), /Bottom panel: 13 in long/);
toolState = executed.state;

executed = executeSandboxTool({
  name: 'annotate_design',
  arguments: {
    annotations: [{ step_id: 'step.cut', content: 'This old shape should fail.' }]
  }
}, toolState);
assert.equal(executed.result.ok, false);
assert.match(executed.result.error, /requires step_instructions/);

executed = executeSandboxTool({
  name: 'annotate_design',
  arguments: {
    step_instructions: [{ step_id: 'step.cut', instructions: 'This string should fail.' }]
  }
}, toolState);
assert.equal(executed.result.ok, false);

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
