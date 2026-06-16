import { canonicalToPortalResult } from './adapter.js';
import { generateBoardWithLinearHardwareDesign } from './boardWithLinearHardware.js';
import { generateCanonicalOpenScad } from './openScad.js';
import { generateTrayBirdFeederDesign } from './trayBirdFeeder.js';
import { checkPublishability, validateGeneratedDesign } from './validator.js';

export function calculateGeneratedPlan(plan) {
  if (plan.build !== 'generated-tray-bird-feeder' && plan.build !== 'generated-wall-key-rack') {
    return { type: 'generated', ok: false, errors: [`Unsupported generated build: ${plan.build}`], warnings: [], parts: [] };
  }
  const design = plan.build === 'generated-wall-key-rack' ? generateBoardWithLinearHardwareDesign({
    design_id: 'portal_wall_key_rack',
    template_id: 'board_with_linear_hardware',
    intent: 'wall key rack',
    parameters: {
      width_in: plan.rackW,
      height_in: plan.rackH,
      board_thickness_in: plan.rackT,
      hook_count: plan.rackHookCount,
      hook_spacing_in: plan.rackHookSpacing,
      min_end_inset_in: plan.rackEndInset,
      mounting_holes: plan.rackMountingHoles,
      material: plan.rackMaterial,
      hardware_type: plan.rackHardware
    }
  }) : generateTrayBirdFeederDesign({
    design_id: 'portal_tray_bird_feeder',
    template_id: 'tray_bird_feeder',
    parameters: {
      width_in: plan.feederW,
      depth_in: plan.feederD,
      side_height_in: plan.feederSideH,
      bottom_thickness_in: plan.feederBottomT,
      side_thickness_in: plan.feederSideT,
      material: plan.feederMaterial,
      hanging: plan.feederHanging,
      drainage_holes: plan.feederDrainage
    }
  });
  const validation = validateGeneratedDesign(design);
  const openscad = generateCanonicalOpenScad(design);
  const publishability = checkPublishability(design, validation, { openscad });
  const result = canonicalToPortalResult({ ...design, validation, exports: { openscad: 'model.scad' } }, validation);
  const physicalParts = design.parts.filter((part) => part.physical !== false);
  const bounds = modelBounds(design.parts);
  return {
    ...result,
    type: 'generated',
    style: plan.build === 'generated-wall-key-rack' ? 'linear-wall-hardware' : 'tray-bird-feeder',
    title: design.title,
    generatedDesign: design,
    validation,
    publishability,
    openscad,
    feederW: design.parameters.width_in,
    feederD: design.parameters.depth_in || bounds.depth,
    feederH: (design.parameters.bottom_thickness_in && design.parameters.side_height_in) ? design.parameters.bottom_thickness_in + design.parameters.side_height_in : bounds.height,
    modelW: bounds.width,
    modelD: bounds.depth,
    modelH: bounds.height,
    rackW: design.parameters.width_in,
    rackH: design.parameters.height_in,
    rackT: design.parameters.board_thickness_in,
    hookCount: design.parameters.hook_count,
    physicalPartCount: physicalParts.length,
    referencePartCount: design.parts.length - physicalParts.length,
    boardFeet: design.estimates.board_feet
  };
}

function modelBounds(parts = []) {
  if (!parts.length) return { width: 1, depth: 1, height: 1 };
  const ranges = ['x', 'y', 'z'].map((axis) => {
    const mins = parts.map((part) => Number(part.position?.[axis]) - Number(part.size?.[axis]) / 2);
    const maxs = parts.map((part) => Number(part.position?.[axis]) + Number(part.size?.[axis]) / 2);
    return Math.max(...maxs) - Math.min(...mins);
  });
  return { width: ranges[0], depth: ranges[1], height: ranges[2] };
}
