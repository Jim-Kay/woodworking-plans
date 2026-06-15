import { canonicalToPortalResult } from './adapter.js';
import { generateCanonicalOpenScad } from './openScad.js';
import { generateTrayBirdFeederDesign } from './trayBirdFeeder.js';
import { checkPublishability, validateGeneratedDesign } from './validator.js';

export function calculateGeneratedPlan(plan) {
  if (plan.build !== 'generated-tray-bird-feeder') {
    return { type: 'generated', ok: false, errors: [`Unsupported generated build: ${plan.build}`], warnings: [], parts: [] };
  }
  const design = generateTrayBirdFeederDesign({
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
  return {
    ...result,
    type: 'generated',
    style: 'tray-bird-feeder',
    title: design.title,
    generatedDesign: design,
    validation,
    publishability,
    openscad,
    feederW: design.parameters.width_in,
    feederD: design.parameters.depth_in,
    feederH: design.parameters.bottom_thickness_in + design.parameters.side_height_in,
    physicalPartCount: physicalParts.length,
    referencePartCount: design.parts.length - physicalParts.length,
    boardFeet: design.estimates.board_feet
  };
}
