import { defaultParametersForTemplate, GENERATED_DESIGN_SCHEMA_VERSION } from './schema.js';

const TEMPLATE_ID = 'tray_bird_feeder';

export function generateTrayBirdFeederDesign(scenario = {}) {
  const parameters = normalizeParameters({ ...defaultParametersForTemplate(TEMPLATE_ID), ...(scenario.parameters || {}) });
  const width = parameters.width_in;
  const depth = parameters.depth_in;
  const sideHeight = parameters.side_height_in;
  const bottomT = parameters.bottom_thickness_in;
  const sideT = parameters.side_thickness_in;
  const materialId = parameters.material;
  const designId = scenario.design_id || `tray_bird_feeder_${slug(width)}x${slug(depth)}`;

  const parts = [
    physicalPart('bottom.panel', 'Bottom panel', materialId, [width, depth, bottomT], [0, 0, bottomT / 2], 'panel', { cut: { length_in: width, width_in: depth, thickness_in: bottomT } }),
    physicalPart('side.front', 'Front side rail', materialId, [width, sideT, sideHeight], [0, -depth / 2 + sideT / 2, bottomT + sideHeight / 2], 'rail', { cut: { length_in: width, width_in: sideHeight, thickness_in: sideT } }),
    physicalPart('side.back', 'Back side rail', materialId, [width, sideT, sideHeight], [0, depth / 2 - sideT / 2, bottomT + sideHeight / 2], 'rail', { cut: { length_in: width, width_in: sideHeight, thickness_in: sideT } }),
    physicalPart('side.left', 'Left end rail', materialId, [sideT, Math.max(0, depth - sideT * 2), sideHeight], [-width / 2 + sideT / 2, 0, bottomT + sideHeight / 2], 'rail', { cut: { length_in: Math.max(0, depth - sideT * 2), width_in: sideHeight, thickness_in: sideT } }),
    physicalPart('side.right', 'Right end rail', materialId, [sideT, Math.max(0, depth - sideT * 2), sideHeight], [width / 2 - sideT / 2, 0, bottomT + sideHeight / 2], 'rail', { cut: { length_in: Math.max(0, depth - sideT * 2), width_in: sideHeight, thickness_in: sideT } })
  ];

  if (parameters.drainage_holes) {
    [
      [-width * 0.25, -depth * 0.2],
      [width * 0.25, -depth * 0.2],
      [-width * 0.25, depth * 0.2],
      [width * 0.25, depth * 0.2]
    ].forEach(([x, y], index) => {
      parts.push(referencePart(`drainage.hole.${index + 1}`, 'Drainage hole', [0.375, 0.375, bottomT], [x, y, bottomT / 2], 'drainage', { host_part_id: 'bottom.panel' }));
    });
  }

  if (parameters.hanging) {
    const inset = Math.max(1, sideT * 1.5);
    [
      [-width / 2 + inset, depth / 2 - sideT / 2],
      [width / 2 - inset, depth / 2 - sideT / 2],
      [-width / 2 + inset, -depth / 2 + sideT / 2],
      [width / 2 - inset, -depth / 2 + sideT / 2]
    ].forEach(([x, y], index) => {
      parts.push(referencePart(`hanging.hole.${index + 1}`, 'Hanging cord hole', [0.25, 0.25, sideHeight], [x, y, bottomT + sideHeight / 2], 'hanging', { host_part_id: y > 0 ? 'side.back' : 'side.front' }));
    });
  }

  const joints = [
    joint('joint.front.bottom', 'fastened', ['bottom.panel', 'side.front'], 'front rail fastened to bottom panel'),
    joint('joint.back.bottom', 'fastened', ['bottom.panel', 'side.back'], 'back rail fastened to bottom panel'),
    joint('joint.left.bottom', 'fastened', ['bottom.panel', 'side.left'], 'left end rail fastened to bottom panel'),
    joint('joint.right.bottom', 'fastened', ['bottom.panel', 'side.right'], 'right end rail fastened to bottom panel'),
    joint('joint.left.front', 'butt', ['side.left', 'side.front'], 'left rail butts into front rail'),
    joint('joint.right.front', 'butt', ['side.right', 'side.front'], 'right rail butts into front rail'),
    joint('joint.left.back', 'butt', ['side.left', 'side.back'], 'left rail butts into back rail'),
    joint('joint.right.back', 'butt', ['side.right', 'side.back'], 'right rail butts into back rail')
  ];

  const assemblySteps = [
    step('step.cut', 'Cut parts', ['bottom.panel', 'side.front', 'side.back', 'side.left', 'side.right'], ['Cut the bottom panel and four tray rails from the selected outdoor-friendly stock.']),
    step('step.drill', 'Drill outdoor holes', featurePartIds(parts), ['Drill drainage and hanging holes before assembly while the pieces are easy to support.']),
    step('step.assemble', 'Assemble tray', ['bottom.panel', 'side.front', 'side.back', 'side.left', 'side.right'], ['Fasten the long rails to the bottom panel, then fit the end rails between them.']),
    step('step.finish', 'Sand and finish', ['bottom.panel', 'side.front', 'side.back', 'side.left', 'side.right'], ['Ease sharp edges and apply an exterior-safe finish if desired.'])
  ];

  return {
    schema_version: GENERATED_DESIGN_SCHEMA_VERSION,
    design_id: designId,
    template_id: TEMPLATE_ID,
    title: 'Tray Bird Feeder',
    units: 'in',
    parameters,
    materials: [
      {
        id: materialId,
        name: materialName(materialId),
        category: 'wood',
        outdoor: true
      }
    ],
    parts,
    joints,
    assembly_steps: assemblySteps,
    cut_list: buildCutList(parts),
    validation: { status: 'not_run', warnings: [], errors: [] },
    estimates: {
      board_feet: estimateBoardFeet(parts),
      active_time_minutes: { min: 45, max: 90 }
    },
    exports: {}
  };
}

function normalizeParameters(parameters) {
  return {
    width_in: number(parameters.width_in, 12),
    depth_in: number(parameters.depth_in, 8),
    side_height_in: number(parameters.side_height_in, 1.5),
    bottom_thickness_in: number(parameters.bottom_thickness_in, 0.75),
    side_thickness_in: number(parameters.side_thickness_in, 0.75),
    material: String(parameters.material || 'cedar_fence_picket'),
    hanging: Boolean(parameters.hanging),
    drainage_holes: Boolean(parameters.drainage_holes)
  };
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

function featurePartIds(parts) {
  return parts.filter((part) => !part.physical).map((part) => part.id);
}

function materialName(id) {
  if (id === 'cedar_fence_picket') return 'Cedar fence picket';
  return id.replaceAll('_', ' ');
}

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function slug(value) {
  return String(value).replace(/[^0-9a-z]+/gi, '_');
}
