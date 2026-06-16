import { defaultParametersForTemplate, GENERATED_DESIGN_SCHEMA_VERSION } from './schema.js';

const TEMPLATE_ID = 'two_step_stool';

export function generateTwoStepStoolDesign(scenario = {}) {
  const parameters = normalizeParameters({ ...defaultParametersForTemplate(TEMPLATE_ID), ...(scenario.parameters || {}) });
  const designId = scenario.design_id || `two_step_stool_${slug(parameters.width_in)}x${slug(parameters.depth_in)}x${slug(parameters.height_in)}`;
  const lowerY = -parameters.depth_in / 2 + parameters.lower_step_depth_in / 2;
  const upperY = parameters.depth_in / 2 - parameters.upper_step_depth_in / 2;
  const legX = parameters.width_in / 2 - parameters.leg_width_in / 2;
  const frontLegY = -parameters.depth_in / 2 + parameters.leg_depth_in / 2;
  const upperFrontY = upperY - parameters.upper_step_depth_in / 2;
  const middleLegY = upperFrontY + parameters.leg_depth_in / 2;
  const backLegY = parameters.depth_in / 2 - parameters.leg_depth_in / 2;
  const railZLower = Math.max(parameters.rail_height_in / 2, parameters.lower_step_height_in - parameters.tread_thickness_in - parameters.rail_height_in / 2);
  const railZUpper = Math.max(parameters.lower_step_height_in + parameters.rail_height_in, parameters.height_in - parameters.tread_thickness_in - parameters.rail_height_in / 2);

  const parts = [
    physicalPart('tread.lower', 'Lower step tread', parameters.material, [parameters.width_in, parameters.lower_step_depth_in, parameters.tread_thickness_in], [0, lowerY, parameters.lower_step_height_in - parameters.tread_thickness_in / 2], 'tread', {
      component_id: 'geometry.step_tread',
      cut: { length_in: parameters.width_in, width_in: parameters.lower_step_depth_in, thickness_in: parameters.tread_thickness_in }
    }),
    physicalPart('tread.upper', 'Upper step tread', parameters.material, [parameters.width_in, parameters.upper_step_depth_in, parameters.tread_thickness_in], [0, upperY, parameters.height_in - parameters.tread_thickness_in / 2], 'tread', {
      component_id: 'geometry.step_tread',
      cut: { length_in: parameters.width_in, width_in: parameters.upper_step_depth_in, thickness_in: parameters.tread_thickness_in }
    }),
    ...legParts(parameters, legX, frontLegY, middleLegY, backLegY),
    physicalPart('rail.front.lower', 'Front lower apron rail', parameters.material, [parameters.width_in - parameters.leg_width_in * 2, parameters.rail_thickness_in, parameters.rail_height_in], [0, frontLegY, railZLower], 'rail', {
      component_id: 'geometry.linear_rail',
      cut: { length_in: parameters.width_in - parameters.leg_width_in * 2, width_in: parameters.rail_height_in, thickness_in: parameters.rail_thickness_in }
    }),
    physicalPart('rail.middle.upper', 'Upper front apron rail', parameters.material, [parameters.width_in - parameters.leg_width_in * 2, parameters.rail_thickness_in, parameters.rail_height_in], [0, middleLegY, railZUpper], 'rail', {
      component_id: 'geometry.linear_rail',
      cut: { length_in: parameters.width_in - parameters.leg_width_in * 2, width_in: parameters.rail_height_in, thickness_in: parameters.rail_thickness_in }
    }),
    physicalPart('rail.back.upper', 'Back upper apron rail', parameters.material, [parameters.width_in - parameters.leg_width_in * 2, parameters.rail_thickness_in, parameters.rail_height_in], [0, backLegY, railZUpper], 'rail', {
      component_id: 'geometry.linear_rail',
      cut: { length_in: parameters.width_in - parameters.leg_width_in * 2, width_in: parameters.rail_height_in, thickness_in: parameters.rail_thickness_in }
    }),
    physicalPart('rail.left.lower', 'Left lower side rail', parameters.material, [parameters.rail_thickness_in, middleLegY - frontLegY, parameters.rail_height_in], [-legX, (frontLegY + middleLegY) / 2, railZLower], 'rail', {
      component_id: 'geometry.linear_rail',
      cut: { length_in: middleLegY - frontLegY, width_in: parameters.rail_height_in, thickness_in: parameters.rail_thickness_in }
    }),
    physicalPart('rail.right.lower', 'Right lower side rail', parameters.material, [parameters.rail_thickness_in, middleLegY - frontLegY, parameters.rail_height_in], [legX, (frontLegY + middleLegY) / 2, railZLower], 'rail', {
      component_id: 'geometry.linear_rail',
      cut: { length_in: middleLegY - frontLegY, width_in: parameters.rail_height_in, thickness_in: parameters.rail_thickness_in }
    }),
    physicalPart('rail.left.upper', 'Left upper side rail', parameters.material, [parameters.rail_thickness_in, backLegY - middleLegY, parameters.rail_height_in], [-legX, (middleLegY + backLegY) / 2, railZUpper], 'rail', {
      component_id: 'geometry.linear_rail',
      cut: { length_in: backLegY - middleLegY, width_in: parameters.rail_height_in, thickness_in: parameters.rail_thickness_in }
    }),
    physicalPart('rail.right.upper', 'Right upper side rail', parameters.material, [parameters.rail_thickness_in, backLegY - middleLegY, parameters.rail_height_in], [legX, (middleLegY + backLegY) / 2, railZUpper], 'rail', {
      component_id: 'geometry.linear_rail',
      cut: { length_in: backLegY - middleLegY, width_in: parameters.rail_height_in, thickness_in: parameters.rail_thickness_in }
    })
  ];

  const joints = [
    joint('joint.lower.tread.front.left', 'fastened', ['tread.lower', 'leg.front.left'], 'lower tread fastened to front left leg'),
    joint('joint.lower.tread.front.right', 'fastened', ['tread.lower', 'leg.front.right'], 'lower tread fastened to front right leg'),
    joint('joint.lower.tread.middle.left', 'fastened', ['tread.lower', 'leg.middle.left'], 'lower tread fastened near its back edge to the left middle leg'),
    joint('joint.lower.tread.middle.right', 'fastened', ['tread.lower', 'leg.middle.right'], 'lower tread fastened near its back edge to the right middle leg'),
    joint('joint.upper.tread.middle.left', 'fastened', ['tread.upper', 'leg.middle.left'], 'upper tread front edge fastened to left middle leg'),
    joint('joint.upper.tread.middle.right', 'fastened', ['tread.upper', 'leg.middle.right'], 'upper tread front edge fastened to right middle leg'),
    joint('joint.upper.tread.back.left', 'fastened', ['tread.upper', 'leg.back.left'], 'upper tread fastened to back left leg'),
    joint('joint.upper.tread.back.right', 'fastened', ['tread.upper', 'leg.back.right'], 'upper tread fastened to back right leg'),
    joint('joint.front.rail', 'fastened', ['rail.front.lower', 'leg.front.left', 'leg.front.right'], 'front lower rail ties front legs together'),
    joint('joint.middle.rail', 'fastened', ['rail.middle.upper', 'leg.middle.left', 'leg.middle.right'], 'upper front rail supports the front edge of the upper tread'),
    joint('joint.back.rail', 'fastened', ['rail.back.upper', 'leg.back.left', 'leg.back.right'], 'back upper rail ties back legs together'),
    joint('joint.left.lower.rail', 'fastened', ['rail.left.lower', 'leg.front.left', 'leg.middle.left'], 'left lower side rail ties front and middle legs together'),
    joint('joint.right.lower.rail', 'fastened', ['rail.right.lower', 'leg.front.right', 'leg.middle.right'], 'right lower side rail ties front and middle legs together'),
    joint('joint.left.upper.rail', 'fastened', ['rail.left.upper', 'leg.middle.left', 'leg.back.left'], 'left upper side rail supports the upper step span'),
    joint('joint.right.upper.rail', 'fastened', ['rail.right.upper', 'leg.middle.right', 'leg.back.right'], 'right upper side rail supports the upper step span')
  ];

  return {
    schema_version: GENERATED_DESIGN_SCHEMA_VERSION,
    design_id: designId,
    template_id: TEMPLATE_ID,
    title: 'Two-Step Stool',
    units: 'in',
    parameters,
    components: [
      'geometry.step_tread',
      'geometry.square_leg_post',
      'geometry.linear_rail',
      'validators.load_bearing_caution',
      'validators.linear_spacing',
      'build_steps.mark_drill_install',
      'rendering.stage_aware_reference_view'
    ],
    materials: [{ id: parameters.material, name: materialName(parameters.material), category: 'wood', outdoor: false }],
    parts,
    joints,
    assembly_steps: buildSteps(parameters),
    cut_list: buildCutList(parts),
    validation: { status: 'not_run', warnings: [], errors: [] },
    estimates: {
      board_feet: estimateBoardFeet(parts),
      active_time_minutes: { min: 120, max: 240 }
    },
    annotations: {
      design_notes: [
        'Generated stool packages are dimensional build aids only; they are not certified for standing load or commercial weight ratings.'
      ],
      authored_by: 'local-design-sandbox'
    },
    exports: {}
  };
}

function normalizeParameters(parameters) {
  return {
    width_in: number(parameters.width_in, 16),
    depth_in: number(parameters.depth_in, 16),
    height_in: number(parameters.height_in, 16),
    lower_step_height_in: number(parameters.lower_step_height_in, parameters.front_leg_height_in || 8),
    lower_step_depth_in: number(parameters.lower_step_depth_in, 9),
    upper_step_depth_in: number(parameters.upper_step_depth_in, 8),
    tread_thickness_in: number(parameters.tread_thickness_in, 0.75),
    leg_width_in: number(parameters.leg_width_in, 1.5),
    leg_depth_in: number(parameters.leg_depth_in, 1.5),
    rail_height_in: number(parameters.rail_height_in, 1.5),
    rail_thickness_in: number(parameters.rail_thickness_in, 0.75),
    claimed_capacity_lbs: number(parameters.claimed_capacity_lbs, 0),
    material: String(parameters.material || 'pine')
  };
}

function legParts(parameters, legX, frontLegY, middleLegY, backLegY) {
  return [
    ['leg.front.left', 'Front left leg', -legX, frontLegY, parameters.lower_step_height_in],
    ['leg.front.right', 'Front right leg', legX, frontLegY, parameters.lower_step_height_in],
    ['leg.middle.left', 'Left upper-step front support leg', -legX, middleLegY, parameters.height_in],
    ['leg.middle.right', 'Right upper-step front support leg', legX, middleLegY, parameters.height_in],
    ['leg.back.left', 'Back left leg', -legX, backLegY, parameters.height_in],
    ['leg.back.right', 'Back right leg', legX, backLegY, parameters.height_in]
  ].map(([id, name, x, y, height]) => physicalPart(id, name, parameters.material, [parameters.leg_width_in, parameters.leg_depth_in, height], [x, y, height / 2], 'leg', {
    component_id: 'geometry.square_leg_post',
    cut: { length_in: height, width_in: parameters.leg_width_in, thickness_in: parameters.leg_depth_in }
  }));
}

function buildSteps(parameters) {
  const allPartIds = ['tread.lower', 'tread.upper', 'leg.front.left', 'leg.front.right', 'leg.middle.left', 'leg.middle.right', 'leg.back.left', 'leg.back.right', 'rail.front.lower', 'rail.middle.upper', 'rail.back.upper', 'rail.left.lower', 'rail.right.lower', 'rail.left.upper', 'rail.right.upper'];
  return [
    step('step.cut', 'Cut stool parts', allPartIds, [
      `Cut two treads, two ${cleanNumber(parameters.lower_step_height_in)} in front legs, four ${cleanNumber(parameters.height_in)} in upper-step support legs, and seven apron or stretcher rails.`,
      'Keep paired legs exactly the same length so the stool sits flat.'
    ]),
    step('step.layout', 'Mark rail and tread locations', ['leg.front.left', 'leg.front.right', 'leg.middle.left', 'leg.middle.right', 'leg.back.left', 'leg.back.right'], [
      `Mark the lower tread height at ${cleanNumber(parameters.lower_step_height_in)} in and the upper tread height at ${cleanNumber(parameters.height_in)} in.`,
      'Lay out the middle support legs under the front edge of the upper tread, not behind it.',
      'Mark rail locations square across matching legs before drilling or fastening.'
    ]),
    step('step.assemble_frame', 'Assemble leg and rail frames', ['leg.front.left', 'leg.front.right', 'leg.middle.left', 'leg.middle.right', 'leg.back.left', 'leg.back.right', 'rail.front.lower', 'rail.middle.upper', 'rail.back.upper', 'rail.left.lower', 'rail.right.lower', 'rail.left.upper', 'rail.right.upper'], [
      'Fasten the front lower legs together with the front apron, then fasten the two middle support legs together with the upper front apron.',
      'Fasten the rear legs together with the back upper apron.',
      'Add lower side rails between the front and middle legs, then upper side rails between the middle and rear legs. Check for square before tightening fasteners.'
    ]),
    step('step.install_treads', 'Install step treads', allPartIds, [
      'Fasten the lower tread to the front legs and the middle support legs so both its front and back edges are supported.',
      'Fasten the upper tread to the middle support legs, rear legs, and upper side rails so its front edge is not cantilevered.',
      'Use glue and mechanical fasteners or joinery appropriate for a standing surface.'
    ]),
    step('step.finish_review', 'Sand, finish, and review load safety', ['tread.lower', 'tread.upper'], [
      'Ease tread edges, sand smooth, and apply finish.',
      'Before use, have the joinery and material choice reviewed by a qualified person; this generated plan does not certify a weight rating.'
    ])
  ];
}

function physicalPart(id, name, material, size, position, role, meta = {}) {
  return { id, name, role, material, physical: true, size: vector(size), position: vector(position), rotation: vector([0, 0, 0]), meta };
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
  return parts.reduce((sum, part) => sum + (part.size.x * part.size.y * part.size.z) / 144, 0);
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
