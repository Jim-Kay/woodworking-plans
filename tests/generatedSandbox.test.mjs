import assert from 'node:assert/strict';
import { canonicalToPortalResult } from '../src/generated/adapter.js';
import { generateCanonicalOpenScad } from '../src/generated/openScad.js';
import { generateDesign, exportPlanPackage, validateGeneratedDesign, checkPublishability, createCapabilityRequest, executeSandboxTool, listSandboxTools } from '../src/generated/sandbox.js';

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
assert.equal(tools.some((tool) => tool.name === 'request_capability'), true);

let toolState = { scenario };
let executed = executeSandboxTool({ name: 'inspect_scenario', arguments: {} }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.result.templates.some((template) => template.template_id === 'tray_bird_feeder'), true);
toolState = executed.state;

executed = executeSandboxTool({ name: 'generate_design', arguments: { parameters: { width_in: 13 } } }, toolState);
assert.equal(executed.result.ok, true);
assert.equal(executed.state.design.parameters.width_in, 13);
toolState = executed.state;

executed = executeSandboxTool({ name: 'validate_design', arguments: {} }, toolState);
assert.equal(executed.result.ok, true);
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
