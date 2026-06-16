import { defaultParametersForTemplate, GENERATED_DESIGN_SCHEMA_VERSION } from './schema.js';

const TEMPLATE_ID = 'wall_panel_with_pocket_and_linear_hardware';

export function generateWallPanelPocketHardwareDesign(scenario = {}) {
  const parameters = normalizeParameters({ ...defaultParametersForTemplate(TEMPLATE_ID), ...(scenario.parameters || {}) });
  const designId = scenario.design_id || `${TEMPLATE_ID}_${slug(parameters.width_in)}x${slug(parameters.height_in)}`;
  const title = scenario.title || titleForIntent(scenario.intent);
  const hookPositions = centeredPositions(parameters.hook_count, parameters.hook_spacing_in);
  const frontY = -parameters.board_thickness_in / 2;
  const pocketBaseZ = Math.max(3, parameters.height_in - parameters.pocket_height_in - 1.25);
  const pocketBottomZ = pocketBaseZ + parameters.pocket_stock_thickness_in / 2;
  const pocketBackZ = pocketBottomZ + parameters.pocket_stock_thickness_in / 2;
  const pocketLipZ = pocketBackZ + parameters.pocket_lip_height_in / 2;
  const hookZ = Math.max(1.25, pocketBaseZ - 1.5);
  const mountZ = parameters.height_in - 1.25;
  const mountInset = Math.max(parameters.min_end_inset_in, 1.25);
  const pocketWidth = Math.max(1, parameters.width_in - parameters.min_end_inset_in * 2);
  const pocketSideHeight = Math.max(parameters.pocket_height_in, parameters.pocket_lip_height_in);

  const parts = [
    physicalPart('back.board', 'Back board', parameters.material, [parameters.width_in, parameters.board_thickness_in, parameters.height_in], [0, 0, parameters.height_in / 2], 'panel', {
      component_id: 'geometry.rectangular_panel',
      cut: { length_in: parameters.width_in, width_in: parameters.height_in, thickness_in: parameters.board_thickness_in }
    }),
    physicalPart('pocket.bottom', 'Pocket bottom shelf', parameters.pocket_material, [pocketWidth, parameters.pocket_depth_in, parameters.pocket_stock_thickness_in], [0, frontY - parameters.pocket_depth_in / 2, pocketBottomZ], 'shelf', {
      component_id: 'geometry.shallow_wall_pocket',
      host_part_id: 'back.board',
      cut: { length_in: pocketWidth, width_in: parameters.pocket_depth_in, thickness_in: parameters.pocket_stock_thickness_in }
    }),
    physicalPart('pocket.front_lip', 'Pocket front lip', parameters.pocket_material, [pocketWidth, parameters.pocket_stock_thickness_in, parameters.pocket_lip_height_in], [0, frontY - parameters.pocket_depth_in + parameters.pocket_stock_thickness_in / 2, pocketLipZ], 'rail', {
      component_id: 'geometry.shallow_wall_pocket',
      host_part_id: 'back.board',
      cut: { length_in: pocketWidth, width_in: parameters.pocket_lip_height_in, thickness_in: parameters.pocket_stock_thickness_in }
    }),
    physicalPart('pocket.left_side', 'Pocket left side cheek', parameters.pocket_material, [parameters.pocket_stock_thickness_in, parameters.pocket_depth_in, pocketSideHeight], [-pocketWidth / 2 + parameters.pocket_stock_thickness_in / 2, frontY - parameters.pocket_depth_in / 2, pocketBaseZ + pocketSideHeight / 2], 'side', {
      component_id: 'geometry.shallow_wall_pocket',
      host_part_id: 'back.board',
      cut: { length_in: parameters.pocket_depth_in, width_in: pocketSideHeight, thickness_in: parameters.pocket_stock_thickness_in }
    }),
    physicalPart('pocket.right_side', 'Pocket right side cheek', parameters.pocket_material, [parameters.pocket_stock_thickness_in, parameters.pocket_depth_in, pocketSideHeight], [pocketWidth / 2 - parameters.pocket_stock_thickness_in / 2, frontY - parameters.pocket_depth_in / 2, pocketBaseZ + pocketSideHeight / 2], 'side', {
      component_id: 'geometry.shallow_wall_pocket',
      host_part_id: 'back.board',
      cut: { length_in: parameters.pocket_depth_in, width_in: pocketSideHeight, thickness_in: parameters.pocket_stock_thickness_in }
    })
  ];

  hookPositions.forEach((x, index) => {
    const number = index + 1;
    parts.push(referencePart(`hook.pilot.${number}`, 'Hook pilot hole', [parameters.pilot_hole_diameter_in, 0.05, parameters.pilot_hole_diameter_in], [x, frontY + 0.025, hookZ], 'pilot_hole', {
      component_id: 'hardware.linear_hook_array',
      host_part_id: 'back.board',
      hardware_type: parameters.hardware_type
    }));
    parts.push(referencePart(`hook.${number}`, hookName(parameters.hardware_type), [0.35, parameters.hook_projection_in, 0.35], [x, frontY - parameters.hook_projection_in / 2, hookZ], 'hook', {
      component_id: 'hardware.linear_hook_array',
      pilot_part_id: `hook.pilot.${number}`,
      hardware_type: parameters.hardware_type
    }));
  });

  if (parameters.mounting_holes) {
    [-1, 1].forEach((side, index) => {
      parts.push(referencePart(`mount.hole.${index + 1}`, 'Wall mounting hole', [parameters.mount_hole_diameter_in, 0.05, parameters.mount_hole_diameter_in], [side * (parameters.width_in / 2 - mountInset), frontY + 0.025, mountZ], 'mounting_hole', {
        component_id: 'hardware.wall_mount_hole_pair',
        host_part_id: 'back.board'
      }));
    });
  }

  const joints = [
    joint('joint.pocket.bottom.back', 'fastened', ['back.board', 'pocket.bottom'], 'pocket bottom fastened to back board'),
    joint('joint.pocket.lip.bottom', 'fastened', ['pocket.bottom', 'pocket.front_lip'], 'front lip fastened to pocket bottom'),
    joint('joint.pocket.left', 'fastened', ['pocket.bottom', 'pocket.left_side'], 'left cheek closes the pocket end'),
    joint('joint.pocket.right', 'fastened', ['pocket.bottom', 'pocket.right_side'], 'right cheek closes the pocket end'),
    ...hookPositions.map((_, index) => joint(`joint.hook.${index + 1}`, 'fastened', ['back.board', `hook.${index + 1}`], `hook ${index + 1} fastened to back board`)),
    ...(parameters.mounting_holes ? [joint('joint.wall.mount', 'fastened', ['back.board', 'mount.hole.1'], 'organizer mounted to wall through screw holes')] : [])
  ];

  return {
    schema_version: GENERATED_DESIGN_SCHEMA_VERSION,
    design_id: designId,
    template_id: TEMPLATE_ID,
    title,
    units: 'in',
    parameters,
    components: [
      'geometry.rectangular_panel',
      'geometry.shallow_wall_pocket',
      'hardware.linear_hook_array',
      'hardware.wall_mount_hole_pair',
      'patterns.centered_linear_spacing',
      'validators.edge_clearance',
      'validators.linear_spacing',
      'validators.host_containment',
      'build_steps.mark_drill_install',
      'rendering.stage_aware_reference_view'
    ],
    materials: [
      { id: parameters.material, name: materialName(parameters.material), category: 'wood', outdoor: false },
      { id: parameters.pocket_material, name: materialName(parameters.pocket_material), category: 'wood', outdoor: false },
      { id: parameters.hardware_type, name: hookName(parameters.hardware_type), category: 'hardware', outdoor: false }
    ],
    parts,
    joints,
    assembly_steps: buildSteps(parameters, hookPositions, mountInset, pocketWidth, hookZ),
    cut_list: buildCutList(parts),
    validation: { status: 'not_run', warnings: [], errors: [] },
    estimates: {
      board_feet: estimateBoardFeet(parts),
      active_time_minutes: { min: 75, max: 140 }
    },
    exports: {}
  };
}

function normalizeParameters(parameters) {
  return {
    width_in: number(parameters.width_in, 18),
    height_in: number(parameters.height_in, 10),
    board_thickness_in: number(parameters.board_thickness_in, 0.75),
    pocket_depth_in: number(parameters.pocket_depth_in, 2.5),
    pocket_height_in: number(parameters.pocket_height_in, 4),
    pocket_lip_height_in: number(parameters.pocket_lip_height_in, 1.5),
    pocket_stock_thickness_in: number(parameters.pocket_stock_thickness_in, 0.5),
    hook_count: Math.round(number(parameters.hook_count, 5)),
    hook_spacing_in: number(parameters.hook_spacing_in, 3),
    min_end_inset_in: number(parameters.min_end_inset_in, 1.5),
    mounting_holes: parameters.mounting_holes !== false,
    mount_hole_diameter_in: number(parameters.mount_hole_diameter_in, 0.1875),
    pilot_hole_diameter_in: number(parameters.pilot_hole_diameter_in, 0.125),
    hook_projection_in: number(parameters.hook_projection_in, 1.25),
    hardware_type: String(parameters.hardware_type || 'screw_hook'),
    material: String(parameters.material || 'pine_1x6'),
    pocket_material: String(parameters.pocket_material || 'thin_plywood')
  };
}

function buildSteps(parameters, hookPositions, mountInset, pocketWidth, hookZ) {
  return [
    step('step.cut', 'Cut back board and pocket parts', ['back.board', 'pocket.bottom', 'pocket.front_lip', 'pocket.left_side', 'pocket.right_side'], [
      `Cut the back board to ${cleanNumber(parameters.width_in)} in by ${cleanNumber(parameters.height_in)} in.`,
      `Cut the shallow pocket parts to fit a pocket about ${cleanNumber(pocketWidth)} in wide by ${cleanNumber(parameters.pocket_depth_in)} in deep.`
    ]),
    step('step.layout', 'Mark hook and mounting layout', ['back.board', ...featurePartIds(parameters)], [
      `Draw the hook centerline about ${cleanNumber(hookZ)} in up from the bottom edge, below the mail pocket.`,
      `Mark ${parameters.hook_count} hook pilot holes centered at ${cleanNumber(parameters.hook_spacing_in)} in spacing.`,
      parameters.mounting_holes ? `Mark wall mounting holes about ${cleanNumber(mountInset)} in from the board ends near the top of the back board.` : 'No wall mounting holes are selected for this version.'
    ]),
    step('step.drill', 'Drill pilot and mounting holes', ['back.board', ...featurePartIds(parameters)], [
      `Drill hook pilot holes with a ${fraction(parameters.pilot_hole_diameter_in)} in bit or the bit recommended for the selected hooks.`,
      parameters.mounting_holes ? `Drill wall mounting holes with a ${fraction(parameters.mount_hole_diameter_in)} in bit and countersink if needed.` : 'Skip wall mounting holes if a different hanger style is used.',
      `Keep holes at least ${cleanNumber(parameters.min_end_inset_in)} in from board ends and away from pocket fasteners.`
    ]),
    step('step.assemble_pocket', 'Assemble shallow pocket', ['back.board', 'pocket.bottom', 'pocket.front_lip', 'pocket.left_side', 'pocket.right_side'], [
      'Fasten the pocket bottom to the back board first, keeping it level.',
      'Attach the front lip to the pocket bottom, then add the left and right side cheeks to close the pocket ends.'
    ]),
    step('step.finish', 'Sand and finish', ['back.board', 'pocket.bottom', 'pocket.front_lip', 'pocket.left_side', 'pocket.right_side'], [
      'Sand the pocket edges smooth so envelopes do not catch. Apply finish before installing hooks if desired.'
    ]),
    step('step.install', 'Install hooks and mount organizer', ['back.board', ...hookPositions.map((_, index) => `hook.${index + 1}`)], [
      'Install hooks into the pilot holes by hand so they stay square to the back board.',
      'Mount the organizer level using screws into framing where possible, or anchors rated for the expected load.'
    ])
  ];
}

function featurePartIds(parameters) {
  const hookIds = Array.from({ length: parameters.hook_count }, (_, index) => `hook.pilot.${index + 1}`);
  return parameters.mounting_holes ? [...hookIds, 'mount.hole.1', 'mount.hole.2'] : hookIds;
}

function centeredPositions(count, spacing) {
  const start = -((count - 1) * spacing) / 2;
  return Array.from({ length: count }, (_, index) => start + index * spacing);
}

function physicalPart(id, name, material, size, position, role, meta = {}) {
  return { id, name, role, material, physical: true, size: vector(size), position: vector(position), rotation: vector([0, 0, 0]), meta };
}

function referencePart(id, name, size, position, role, meta = {}) {
  return { id, name, role, material: 'reference', physical: false, size: vector(size), position: vector(position), rotation: vector([0, 0, 0]), meta: { exported_as: 'machining reference', ...meta } };
}

function vector([x, y, z]) {
  return { x, y, z };
}

function joint(id, type, part_ids, label) {
  return { id, type, part_ids, label };
}

function step(id, title, part_ids, instructions) {
  return { id, title, part_ids, instructions };
}

function buildCutList(parts) {
  return parts
    .filter((part) => part.physical)
    .map((part) => ({
      part_id: part.id,
      name: part.name,
      qty: 1,
      length_in: part.meta.cut.length_in,
      width_in: part.meta.cut.width_in,
      thickness_in: part.meta.cut.thickness_in,
      material: part.material
    }));
}

function estimateBoardFeet(parts) {
  return parts.reduce((sum, part) => {
    if (!part.physical) return sum;
    return sum + (part.size.x * part.size.y * part.size.z) / 144;
  }, 0);
}

function titleForIntent(intent) {
  const text = String(intent || '').toLowerCase();
  if (text.includes('spice')) return 'Wall Spice Pocket With Hooks';
  if (text.includes('entry')) return 'Entry Organizer With Hooks';
  return 'Wall Mail And Key Organizer';
}

function hookName(type) {
  if (String(type).includes('peg')) return 'Wood peg';
  if (String(type).includes('coat')) return 'Coat hook';
  return 'Screw hook';
}

function materialName(id) {
  return id.replaceAll('_', ' ');
}

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function slug(value) {
  return String(value).replace(/[^0-9a-z]+/gi, '_');
}

function cleanNumber(value) {
  return Number(value.toFixed(3)).toString();
}

function fraction(value) {
  if (Math.abs(value - 0.125) < 1e-6) return '1/8';
  if (Math.abs(value - 0.1875) < 1e-6) return '3/16';
  if (Math.abs(value - 0.25) < 1e-6) return '1/4';
  return cleanNumber(value);
}
