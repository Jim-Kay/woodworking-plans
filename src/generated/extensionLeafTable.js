import { defaultParametersForTemplate, GENERATED_DESIGN_SCHEMA_VERSION } from './schema.js';

const TEMPLATE_ID = 'extension_leaf_dining_table';

export function generateExtensionLeafTableDesign(scenario = {}) {
  const parameters = normalizeParameters({ ...defaultParametersForTemplate(TEMPLATE_ID), ...(scenario.parameters || {}) });
  const designId = scenario.design_id || `extension_leaf_table_${slug(parameters.center_top_length_in)}_${slug(parameters.leaf_depth_in)}`;
  const topZ = parameters.table_height_in - parameters.top_thickness_in / 2;
  const legHeight = parameters.table_height_in - parameters.top_thickness_in;
  const legX = parameters.base_clear_length_between_legs_in / 2 + parameters.leg_size_in / 2;
  const legY = parameters.width_in / 2 - parameters.leg_size_in / 2;
  const apronZ = legHeight - parameters.apron_height_in / 2;
  const supportZ = legHeight - parameters.apron_height_in - parameters.support_arm_stock_height_in / 2 - 0.25;
  const supportY = Math.max(0, parameters.width_in / 2 - parameters.leg_size_in - parameters.support_arm_stock_width_in);
  const leafOffset = parameters.center_top_length_in / 2 + parameters.leaf_depth_in / 2;
  const supportOffset = parameters.center_top_length_in / 2 + parameters.leaf_depth_in - parameters.support_arm_extension_in / 2;
  const slideZ = supportZ;

  const parts = [
    physicalPart('top.center', 'Fixed center tabletop', parameters.top_material, [parameters.center_top_length_in, parameters.width_in, parameters.top_thickness_in], [0, 0, topZ], 'panel', {
      component_id: 'geometry.extension_tabletop_set',
      cut: { length_in: parameters.center_top_length_in, width_in: parameters.width_in, thickness_in: parameters.top_thickness_in }
    }),
    ...leafParts(parameters, leafOffset, topZ),
    ...legParts(parameters, legX, legY, legHeight),
    ...apronParts(parameters, legX, legY, apronZ),
    ...supportArmParts(parameters, supportOffset, supportY, supportZ),
    ...slideReferenceParts(parameters, supportOffset, supportY, slideZ)
  ];

  const joints = [
    joint('joint.base.long.front', 'fastened', ['apron.front.long', 'leg.left.front', 'leg.right.front'], 'front long apron fastened between front legs'),
    joint('joint.base.long.back', 'fastened', ['apron.back.long', 'leg.left.back', 'leg.right.back'], 'back long apron fastened between back legs'),
    joint('joint.base.left.end', 'fastened', ['apron.left.end', 'leg.left.front', 'leg.left.back'], 'left end apron fastened between left legs'),
    joint('joint.base.right.end', 'fastened', ['apron.right.end', 'leg.right.front', 'leg.right.back'], 'right end apron fastened between right legs'),
    joint('joint.top.center.to.base', 'fastened', ['top.center', 'apron.front.long', 'apron.back.long'], 'fixed center top attached to the apron frame'),
    joint('joint.left.leaf.supported', 'supported', ['top.leaf.left', 'support.left.front', 'support.left.back'], 'left end leaf carried by two retractable support arms'),
    joint('joint.right.leaf.supported', 'supported', ['top.leaf.right', 'support.right.front', 'support.right.back'], 'right end leaf carried by two retractable support arms'),
    joint('joint.left.front.slide', 'sliding', ['support.left.front', 'slide.left.front'], 'left front support arm moves on a telescoping slide'),
    joint('joint.left.back.slide', 'sliding', ['support.left.back', 'slide.left.back'], 'left back support arm moves on a telescoping slide'),
    joint('joint.right.front.slide', 'sliding', ['support.right.front', 'slide.right.front'], 'right front support arm moves on a telescoping slide'),
    joint('joint.right.back.slide', 'sliding', ['support.right.back', 'slide.right.back'], 'right back support arm moves on a telescoping slide')
  ];

  return {
    schema_version: GENERATED_DESIGN_SCHEMA_VERSION,
    design_id: designId,
    template_id: TEMPLATE_ID,
    title: 'Extension Leaf Dining Table',
    units: 'in',
    parameters,
    components: [
      'geometry.extension_tabletop_set',
      'geometry.leg_apron_table_base',
      'hardware.telescoping_leaf_support_slide',
      'validators.extension_leaf_support_path',
      'validators.load_bearing_caution',
      'build_steps.extension_leaf_fit_sequence',
      'rendering.open_closed_state_sequence',
      'rendering.generated_assembly_animation'
    ],
    relationships: [
      'relationship.fixed_contact.apron_to_leg_table_frame',
      'relationship.motion.telescoping_slide_support_under_leaf',
      'relationship.support.extension_leaf_carried_by_slide_supports',
      'relationship.clearance.extension_leaf_slide_travel'
    ],
    materials: [
      { id: parameters.top_material, name: materialName(parameters.top_material), category: 'wood', outdoor: false },
      { id: parameters.base_material, name: materialName(parameters.base_material), category: 'wood', outdoor: false },
      { id: 'slide_hardware', name: 'rated slide or table-leaf hardware', category: 'hardware', load_rated: false }
    ],
    parts,
    joints,
    assembly_steps: buildSteps(parameters),
    cut_list: buildCutList(parts),
    validation: { status: 'not_run', warnings: [], errors: [] },
    estimates: {
      board_feet: estimateBoardFeet(parts),
      active_time_minutes: { min: 360, max: 720 }
    },
    annotations: {
      design_notes: [
        'Generated from multi-photo reference as a dimensional concept for a fixed center top with two removable end leaves.',
        'Retractable supports must be reviewed as a real load path; drawer slides alone are not automatically rated for vertical table-leaf loads.'
      ],
      authored_by: 'local-design-sandbox'
    },
    exports: {}
  };
}

function normalizeParameters(parameters) {
  const leafDepth = number(parameters.leaf_depth_in, 12);
  const leafCount = Math.max(0, Math.min(2, Math.round(number(parameters.leaf_count, 2))));
  const centerLength = number(parameters.center_top_length_in, 51.5);
  const inferredOverall = centerLength + leafDepth * leafCount;
  return {
    overall_length_extended_in: number(parameters.overall_length_extended_in, inferredOverall),
    center_top_length_in: centerLength,
    leaf_depth_in: leafDepth,
    leaf_count: leafCount,
    width_in: number(parameters.width_in, 40),
    top_thickness_in: number(parameters.top_thickness_in, 1.75),
    table_height_in: number(parameters.table_height_in || parameters.height_in, 30.5),
    leg_size_in: number(parameters.leg_size_in, 3.75),
    base_clear_length_between_legs_in: number(parameters.base_clear_length_between_legs_in, 64.25),
    apron_height_in: number(parameters.apron_height_in, 3.5),
    apron_thickness_in: number(parameters.apron_thickness_in, 1.5),
    support_arm_count_per_leaf: Math.max(2, Math.round(number(parameters.support_arm_count_per_leaf, 2))),
    support_arm_extension_in: number(parameters.support_arm_extension_in, 16.5),
    slide_travel_in: number(parameters.slide_travel_in, 12),
    support_arm_stock_width_in: number(parameters.support_arm_stock_width_in, 1.5),
    support_arm_stock_height_in: number(parameters.support_arm_stock_height_in, 1.5),
    support_arm_inset_from_edge_in: number(parameters.support_arm_inset_from_edge_in, 6),
    claimed_capacity_lbs: number(parameters.claimed_capacity_lbs, 0),
    top_material: String(parameters.top_material || parameters.material || 'oak_tabletop_stock'),
    base_material: String(parameters.base_material || parameters.material || 'oak_leg_and_apron_stock'),
    slide_hardware: String(parameters.slide_hardware || 'rated_table_leaf_slide_or_heavy_drawer_slide'),
    finish: String(parameters.finish || 'clear_or_dark_table_finish')
  };
}

function leafParts(parameters, leafOffset, topZ) {
  if (parameters.leaf_count <= 0) return [];
  const sides = parameters.leaf_count === 1 ? [['right', 1]] : [['left', -1], ['right', 1]];
  return sides.map(([side, sign]) => physicalPart(`top.leaf.${side}`, `${titleCase(side)} removable end leaf`, parameters.top_material, [parameters.leaf_depth_in, parameters.width_in, parameters.top_thickness_in], [sign * leafOffset, 0, topZ], 'panel', {
    component_id: 'geometry.extension_tabletop_set',
    cut: { length_in: parameters.leaf_depth_in, width_in: parameters.width_in, thickness_in: parameters.top_thickness_in }
  }));
}

function legParts(parameters, legX, legY, height) {
  return [
    ['leg.left.front', 'Left front leg', -legX, -legY],
    ['leg.right.front', 'Right front leg', legX, -legY],
    ['leg.left.back', 'Left back leg', -legX, legY],
    ['leg.right.back', 'Right back leg', legX, legY]
  ].map(([id, name, x, y]) => physicalPart(id, name, parameters.base_material, [parameters.leg_size_in, parameters.leg_size_in, height], [x, y, height / 2], 'leg', {
    component_id: 'geometry.leg_apron_table_base',
    cut: { length_in: height, width_in: parameters.leg_size_in, thickness_in: parameters.leg_size_in }
  }));
}

function apronParts(parameters, legX, legY, apronZ) {
  const shortLength = Math.max(1, parameters.width_in - parameters.leg_size_in * 2);
  const shortX = legX - parameters.leg_size_in / 2 - parameters.apron_thickness_in / 2;
  return [
    physicalPart('apron.front.long', 'Front long apron', parameters.base_material, [parameters.base_clear_length_between_legs_in, parameters.apron_thickness_in, parameters.apron_height_in], [0, -legY, apronZ], 'rail', {
      component_id: 'geometry.leg_apron_table_base',
      cut: { length_in: parameters.base_clear_length_between_legs_in, width_in: parameters.apron_height_in, thickness_in: parameters.apron_thickness_in }
    }),
    physicalPart('apron.back.long', 'Back long apron', parameters.base_material, [parameters.base_clear_length_between_legs_in, parameters.apron_thickness_in, parameters.apron_height_in], [0, legY, apronZ], 'rail', {
      component_id: 'geometry.leg_apron_table_base',
      cut: { length_in: parameters.base_clear_length_between_legs_in, width_in: parameters.apron_height_in, thickness_in: parameters.apron_thickness_in }
    }),
    physicalPart('apron.left.end', 'Left end apron', parameters.base_material, [parameters.apron_thickness_in, shortLength, parameters.apron_height_in], [-shortX, 0, apronZ], 'rail', {
      component_id: 'geometry.leg_apron_table_base',
      cut: { length_in: shortLength, width_in: parameters.apron_height_in, thickness_in: parameters.apron_thickness_in }
    }),
    physicalPart('apron.right.end', 'Right end apron', parameters.base_material, [parameters.apron_thickness_in, shortLength, parameters.apron_height_in], [shortX, 0, apronZ], 'rail', {
      component_id: 'geometry.leg_apron_table_base',
      cut: { length_in: shortLength, width_in: parameters.apron_height_in, thickness_in: parameters.apron_thickness_in }
    })
  ];
}

function supportArmParts(parameters, supportOffset, supportY, supportZ) {
  const sides = parameters.leaf_count === 1 ? [['right', 1]] : [['left', -1], ['right', 1]];
  return sides.flatMap(([side, sign]) => [
    supportArmPart(`support.${side}.front`, `${titleCase(side)} front retractable support arm`, parameters, sign * supportOffset, -supportY, supportZ),
    supportArmPart(`support.${side}.back`, `${titleCase(side)} back retractable support arm`, parameters, sign * supportOffset, supportY, supportZ)
  ]);
}

function supportArmPart(id, name, parameters, x, y, z) {
  return physicalPart(id, name, parameters.base_material, [parameters.support_arm_extension_in, parameters.support_arm_stock_width_in, parameters.support_arm_stock_height_in], [x, y, z], 'rail', {
    component_id: 'hardware.telescoping_leaf_support_slide',
    cut: { length_in: parameters.support_arm_extension_in, width_in: parameters.support_arm_stock_width_in, thickness_in: parameters.support_arm_stock_height_in },
    motion: 'telescoping',
    extended_support_length_in: parameters.support_arm_extension_in,
    slide_travel_in: parameters.slide_travel_in
  });
}

function slideReferenceParts(parameters, supportOffset, supportY, slideZ) {
  const sides = parameters.leaf_count === 1 ? [['right', 1]] : [['left', -1], ['right', 1]];
  return sides.flatMap(([side, sign]) => [
    slideReferencePart(`slide.${side}.front`, `${titleCase(side)} front slide reference`, parameters, sign * supportOffset, -supportY, slideZ, `support.${side}.front`),
    slideReferencePart(`slide.${side}.back`, `${titleCase(side)} back slide reference`, parameters, sign * supportOffset, supportY, slideZ, `support.${side}.back`)
  ]);
}

function slideReferencePart(id, name, parameters, x, y, z, hostPartId) {
  return {
    id,
    name,
    role: 'hardware',
    material: 'guide',
    physical: false,
    size: vector([parameters.slide_travel_in, 0.5, 0.5]),
    position: vector([x, y, z]),
    rotation: vector([0, 0, 0]),
    meta: {
      component_id: 'hardware.telescoping_leaf_support_slide',
      host_part_id: hostPartId,
      exported_as: 'slide hardware reference',
      travel_in: parameters.slide_travel_in,
      requires_load_rating_review: true
    }
  };
}

function buildSteps(parameters) {
  const baseParts = ['leg.left.front', 'leg.right.front', 'leg.left.back', 'leg.right.back', 'apron.front.long', 'apron.back.long', 'apron.left.end', 'apron.right.end'];
  const topParts = ['top.center', 'top.leaf.left', 'top.leaf.right'].filter((id) => parameters.leaf_count === 2 || !id.includes('left'));
  const supports = ['support.left.front', 'support.left.back', 'support.right.front', 'support.right.back'].filter((id) => parameters.leaf_count === 2 || !id.includes('left'));
  const slides = ['slide.left.front', 'slide.left.back', 'slide.right.front', 'slide.right.back'].filter((id) => parameters.leaf_count === 2 || !id.includes('left'));
  return [
    step('step.cut', 'Cut and label table parts', [...topParts, ...baseParts, ...supports], [
      `Cut the fixed center top to ${cleanNumber(parameters.center_top_length_in)} in x ${cleanNumber(parameters.width_in)} in and each end leaf to ${cleanNumber(parameters.leaf_depth_in)} in x ${cleanNumber(parameters.width_in)} in.`,
      `Cut four ${cleanNumber(parameters.table_height_in - parameters.top_thickness_in)} in legs, four aprons, and ${supports.length} retractable support arms.`,
      'Label left/right leaves, front/back support arms, and slide pairs before drilling so each part returns to the same location during test fitting.'
    ]),
    step('step.base', 'Build the leg and apron base', baseParts, [
      `Assemble the four legs with long aprons spanning ${cleanNumber(parameters.base_clear_length_between_legs_in)} in between the inside leg faces.`,
      'Install the short end aprons between each front/back leg pair and check both diagonals before tightening fasteners.',
      'Keep apron tops flush so the center tabletop has a flat bearing surface.'
    ]),
    step('step.center_top', 'Attach the fixed center top', ['top.center', ...baseParts], [
      'Center the fixed tabletop on the base and confirm the overhang is even at the front and back.',
      'Fasten the center top to the aprons using tabletop fasteners, figure-eight clips, buttons, or elongated screw holes that allow seasonal movement.',
      'Do not fasten the end leaves permanently at this stage.'
    ]),
    step('step.slides', 'Install retractable slide supports', [...supports, ...slides, 'apron.front.long', 'apron.back.long'], [
      `Mount each slide so the support arm can extend about ${cleanNumber(parameters.slide_travel_in)} in and still keep at least ${cleanNumber(Math.max(2, parameters.support_arm_extension_in - parameters.leaf_depth_in))} in of arm under the fixed table structure.`,
      'Keep each front/back support pair parallel, level, and below the tabletop enough to slide without rubbing.',
      'Add positive stops so the support arms cannot pull free, and use hardware rated for the expected leaf load rather than assuming drawer slides are sufficient.'
    ]),
    step('step.fit_leaves', 'Fit the end leaves and support path', [...topParts, ...supports], [
      'Deploy the support arms, set each leaf on the arms, and adjust until the leaf is flush with the fixed center top.',
      'Check that both front and back support arms carry the leaf evenly; shim or adjust before adding alignment pins, cleats, or latches.',
      'Retract and redeploy the supports several times with the leaves removed first, then with the leaves installed, checking for rubbing, sag, or binding.'
    ]),
    step('step.finish_review', 'Finish and review load safety', topParts, [
      `Sand and finish the table with the leaves fitted, then finish hidden support parts before final installation.`,
      'Treat the generated capacity as unknown. Verify slide ratings, fastener schedule, wood species, and leaf load path before placing heavy objects or people on the leaves.',
      'If the table will carry heavy loads, replace drawer-slide assumptions with rated table-leaf hardware or add mechanical legs/brackets under each leaf.'
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
  return parts.filter((part) => part.physical).reduce((sum, part) => sum + (part.size.x * part.size.y * part.size.z) / 144, 0);
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

function titleCase(value) {
  return `${String(value).charAt(0).toUpperCase()}${String(value).slice(1)}`;
}
