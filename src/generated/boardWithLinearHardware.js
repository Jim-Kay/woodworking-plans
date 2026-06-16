import { defaultParametersForTemplate, GENERATED_DESIGN_SCHEMA_VERSION } from './schema.js';

const TEMPLATE_ID = 'board_with_linear_hardware';

export function generateBoardWithLinearHardwareDesign(scenario = {}) {
  const parameters = normalizeParameters({ ...defaultParametersForTemplate(TEMPLATE_ID), ...(scenario.parameters || {}) });
  const designId = scenario.design_id || `${TEMPLATE_ID}_${slug(parameters.width_in)}x${slug(parameters.height_in)}`;
  const title = scenario.title || titleForIntent(scenario.intent, parameters);
  const hookPositions = centeredPositions(parameters.hook_count, parameters.hook_spacing_in);
  const hookZ = parameters.height_in * 0.45;
  const mountZ = parameters.height_in * 0.72;
  const mountInset = Math.max(parameters.min_end_inset_in, 1.25);

  const parts = [
    physicalPart('back.board', 'Back board', parameters.material, [parameters.width_in, parameters.board_thickness_in, parameters.height_in], [0, 0, parameters.height_in / 2], 'panel', {
      component_id: 'geometry.rectangular_panel',
      cut: { length_in: parameters.width_in, width_in: parameters.height_in, thickness_in: parameters.board_thickness_in }
    })
  ];

  hookPositions.forEach((x, index) => {
    const number = index + 1;
    parts.push(referencePart(`hook.pilot.${number}`, 'Hook pilot hole', [parameters.pilot_hole_diameter_in, 0.05, parameters.pilot_hole_diameter_in], [x, frontFaceY(parameters), hookZ], 'pilot_hole', {
      component_id: 'hardware.linear_hook_array',
      host_part_id: 'back.board',
      hardware_type: parameters.hardware_type
    }));
    parts.push(referencePart(`hook.${number}`, hookName(parameters.hardware_type), [0.35, parameters.hook_projection_in, 0.35], [x, frontFaceY(parameters) - parameters.hook_projection_in / 2, hookZ], 'hook', {
      component_id: 'hardware.linear_hook_array',
      pilot_part_id: `hook.pilot.${number}`,
      hardware_type: parameters.hardware_type
    }));
  });

  if (parameters.mounting_holes) {
    [-1, 1].forEach((side, index) => {
      parts.push(referencePart(`mount.hole.${index + 1}`, 'Wall mounting hole', [parameters.mount_hole_diameter_in, 0.05, parameters.mount_hole_diameter_in], [side * (parameters.width_in / 2 - mountInset), frontFaceY(parameters), mountZ], 'mounting_hole', {
        component_id: 'hardware.wall_mount_hole_pair',
        host_part_id: 'back.board'
      }));
    });
  }

  const joints = [
    ...hookPositions.map((_, index) => joint(`joint.hook.${index + 1}`, 'fastened', ['back.board', `hook.${index + 1}`], `hook ${index + 1} fastened to back board`)),
    ...(parameters.mounting_holes ? [joint('joint.wall.mount', 'fastened', ['back.board', 'mount.hole.1'], 'board mounted to wall through screw holes')] : [])
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
      'hardware.linear_hook_array',
      'hardware.wall_mount_hole_pair',
      'patterns.centered_linear_spacing',
      'validators.edge_clearance',
      'validators.linear_spacing',
      'build_steps.mark_drill_install',
      'rendering.stage_aware_reference_view'
    ],
    materials: [
      { id: parameters.material, name: materialName(parameters.material), category: 'wood', outdoor: false },
      { id: parameters.hardware_type, name: hookName(parameters.hardware_type), category: 'hardware', outdoor: false }
    ],
    parts,
    joints,
    assembly_steps: buildSteps(parameters, hookPositions, mountInset),
    cut_list: buildCutList(parts),
    validation: { status: 'not_run', warnings: [], errors: [] },
    estimates: {
      board_feet: estimateBoardFeet(parts),
      active_time_minutes: { min: 30, max: 75 }
    },
    exports: {}
  };
}

function normalizeParameters(parameters) {
  return {
    width_in: number(parameters.width_in, 18),
    height_in: number(parameters.height_in, 4),
    board_thickness_in: number(parameters.board_thickness_in, 0.75),
    hook_count: Math.round(number(parameters.hook_count, 5)),
    hook_spacing_in: number(parameters.hook_spacing_in, 3),
    min_end_inset_in: number(parameters.min_end_inset_in, 1.5),
    mounting_holes: parameters.mounting_holes !== false,
    mount_hole_diameter_in: number(parameters.mount_hole_diameter_in, 0.1875),
    pilot_hole_diameter_in: number(parameters.pilot_hole_diameter_in, 0.125),
    hook_projection_in: number(parameters.hook_projection_in, 1.25),
    hardware_type: String(parameters.hardware_type || 'screw_hook'),
    material: String(parameters.material || 'pine_1x4')
  };
}

function buildSteps(parameters, hookPositions, mountInset) {
  const hookLine = cleanNumber(parameters.height_in * 0.45);
  return [
    step('step.cut', 'Cut back board', ['back.board'], [
      `Cut one back board to ${cleanNumber(parameters.width_in)} in long by ${cleanNumber(parameters.height_in)} in tall. Sand the faces and ease the front edges.`
    ]),
    step('step.layout', 'Mark hook and mounting layout', ['back.board', ...hookPositions.map((_, index) => `hook.pilot.${index + 1}`), ...(parameters.mounting_holes ? ['mount.hole.1', 'mount.hole.2'] : [])], [
      `Draw a light horizontal hook centerline about ${hookLine} in up from the bottom edge.`,
      `Mark ${parameters.hook_count} hook positions centered on the board at ${cleanNumber(parameters.hook_spacing_in)} in spacing.`,
      parameters.mounting_holes ? `Mark two wall mounting holes about ${cleanNumber(mountInset)} in from the left and right ends, above the hook line.` : 'No wall mounting holes are selected for this version.'
    ]),
    step('step.drill', 'Drill pilot and mounting holes', ['back.board', ...featurePartIds(parameters)], [
      `Drill hook pilot holes at the marked hook positions with a ${fraction(parameters.pilot_hole_diameter_in)} in bit or the bit recommended for the selected hardware.`,
      parameters.mounting_holes ? `Drill wall mounting holes with a ${fraction(parameters.mount_hole_diameter_in)} in bit and countersink if using flat-head screws.` : 'Skip wall mounting holes if using separate hanging hardware.',
      `Keep every drilled hole at least ${cleanNumber(parameters.min_end_inset_in)} in from board ends to reduce splitting.`
    ]),
    step('step.finish', 'Finish board', ['back.board'], [
      'Apply finish before installing hardware if you want clean edges around the hooks.'
    ]),
    step('step.install', 'Install hooks and mount', ['back.board', ...hookPositions.map((_, index) => `hook.${index + 1}`)], [
      'Install hooks or pegs into the pilot holes by hand so they stay square to the board.',
      'Mount the board level on the wall using screws appropriate for the wall framing or anchors.'
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

function frontFaceY(parameters) {
  return -parameters.board_thickness_in / 2 + 0.025;
}

function physicalPart(id, name, material, size, position, role, meta = {}) {
  return {
    id,
    name,
    role,
    material,
    physical: true,
    size: vector(size),
    position: vector(position),
    rotation: vector([0, 0, 0]),
    meta
  };
}

function referencePart(id, name, size, position, role, meta = {}) {
  return {
    id,
    name,
    role,
    material: 'reference',
    physical: false,
    size: vector(size),
    position: vector(position),
    rotation: vector([0, 0, 0]),
    meta: { exported_as: 'machining reference', ...meta }
  };
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

function titleForIntent(intent, parameters) {
  const text = String(intent || '').toLowerCase();
  if (text.includes('coat')) return 'Wall Coat Hook Rail';
  if (text.includes('mug')) return 'Wall Mug Hook Rail';
  if (text.includes('peg')) return 'Wall Peg Rail';
  if (parameters.hardware_type.includes('peg')) return 'Wall Peg Rail';
  return 'Wall Key Rack';
}

function hookName(type) {
  if (String(type).includes('peg')) return 'Wood peg';
  if (String(type).includes('coat')) return 'Coat hook';
  return 'Screw hook';
}

function materialName(id) {
  if (id === 'pine_1x4') return 'Pine 1x4';
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
