import { canonicalToPortalResult } from './adapter.js';
import { generateBoardWithLinearHardwareDesign } from './boardWithLinearHardware.js';
import { generateExtensionLeafTableDesign } from './extensionLeafTable.js';
import { generateCanonicalOpenScad } from './openScad.js';
import { generateTrayBirdFeederDesign } from './trayBirdFeeder.js';
import { generateTwoStepStoolDesign } from './twoStepStool.js';
import { generateWallPanelPocketHardwareDesign } from './wallPanelPocketHardware.js';
import { checkPublishability, validateGeneratedDesign } from './validator.js';

export function calculateGeneratedPlan(plan) {
  if (!['generated-tray-bird-feeder', 'generated-wall-key-rack', 'generated-wall-mail-organizer', 'generated-two-step-stool', 'generated-extension-leaf-table'].includes(plan.build)) {
    return { type: 'generated', ok: false, errors: [`Unsupported generated build: ${plan.build}`], warnings: [], parts: [] };
  }
  const design = plan.build === 'generated-extension-leaf-table' ? generateExtensionLeafTableDesign({
    design_id: 'portal_extension_leaf_table',
    template_id: 'extension_leaf_dining_table',
    intent: 'extension leaf dining table with retractable end supports',
    parameters: {
      overall_length_extended_in: plan.tableOverallL,
      center_top_length_in: plan.tableCenterL,
      leaf_depth_in: plan.tableLeafD,
      leaf_count: plan.tableLeafCount,
      width_in: plan.tableW,
      top_thickness_in: plan.tableTopT,
      table_height_in: plan.tableH,
      leg_size_in: plan.tableLegSize,
      base_clear_length_between_legs_in: plan.tableBaseClearL,
      apron_height_in: plan.tableApronH,
      apron_thickness_in: plan.tableApronT,
      support_arm_count_per_leaf: plan.tableSupportArmCount,
      support_arm_extension_in: plan.tableSupportArmExt,
      slide_travel_in: plan.tableSlideTravel,
      support_arm_stock_width_in: plan.tableSupportArmW,
      support_arm_stock_height_in: plan.tableSupportArmH,
      top_material: plan.tableTopMaterial,
      base_material: plan.tableBaseMaterial,
      finish: plan.tableFinish
    }
  }) : plan.build === 'generated-two-step-stool' ? generateTwoStepStoolDesign({
    design_id: 'portal_two_step_stool',
    template_id: 'two_step_stool',
    intent: 'two-step wooden step stool',
    parameters: {
      width_in: plan.stoolW,
      depth_in: plan.stoolD,
      height_in: plan.stoolH,
      lower_step_height_in: plan.stoolLowerStepH,
      lower_step_depth_in: plan.stoolLowerStepD,
      upper_step_depth_in: plan.stoolUpperStepD,
      tread_thickness_in: plan.stoolTreadT,
      leg_width_in: plan.stoolLegW,
      leg_depth_in: plan.stoolLegD,
      rail_height_in: plan.stoolRailH,
      rail_thickness_in: plan.stoolRailT,
      material: plan.stoolMaterial
    }
  }) : plan.build === 'generated-wall-mail-organizer' ? generateWallPanelPocketHardwareDesign({
    design_id: 'portal_wall_mail_organizer',
    template_id: 'wall_panel_with_pocket_and_linear_hardware',
    intent: 'wall-mounted mail and key organizer with a shallow pocket and hook row',
    title: 'Generated Wall Mail Organizer',
    parameters: {
      width_in: plan.organizerW,
      height_in: plan.organizerH,
      board_thickness_in: plan.organizerBoardT,
      pocket_depth_in: plan.organizerPocketD,
      pocket_height_in: plan.organizerPocketH,
      pocket_lip_height_in: plan.organizerPocketLipH,
      pocket_stock_thickness_in: plan.organizerPocketStockT,
      hook_count: plan.organizerHookCount,
      hook_spacing_in: plan.organizerHookSpacing,
      min_end_inset_in: plan.organizerEndInset,
      mounting_holes: plan.organizerMountingHoles,
      material: plan.organizerMaterial,
      pocket_material: plan.organizerPocketMaterial,
      hardware_type: plan.organizerHardware
    }
  }) : plan.build === 'generated-wall-key-rack' ? generateBoardWithLinearHardwareDesign({
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
    style: generatedStyle(plan.build),
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
    stoolW: design.parameters.width_in,
    stoolD: design.parameters.depth_in,
    stoolH: design.parameters.height_in,
    lowerStepH: design.parameters.lower_step_height_in,
    organizerW: design.parameters.width_in,
    organizerH: design.parameters.height_in,
    organizerBoardT: design.parameters.board_thickness_in,
    organizerPocketD: design.parameters.pocket_depth_in,
    organizerPocketH: design.parameters.pocket_height_in,
    organizerHookCount: design.parameters.hook_count,
    tableW: design.parameters.width_in,
    tableCenterL: design.parameters.center_top_length_in,
    tableLeafD: design.parameters.leaf_depth_in,
    tableOverallL: design.parameters.overall_length_extended_in,
    tableH: design.parameters.table_height_in,
    tableSupportArmExt: design.parameters.support_arm_extension_in,
    tableSlideTravel: design.parameters.slide_travel_in,
    physicalPartCount: physicalParts.length,
    referencePartCount: design.parts.length - physicalParts.length,
    boardFeet: design.estimates.board_feet
  };
}

function generatedStyle(build) {
  if (build === 'generated-wall-mail-organizer') return 'linear-wall-hardware';
  if (build === 'generated-wall-key-rack') return 'linear-wall-hardware';
  if (build === 'generated-two-step-stool') return 'two-step-stool';
  if (build === 'generated-extension-leaf-table') return 'extension-leaf-table';
  return 'tray-bird-feeder';
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
