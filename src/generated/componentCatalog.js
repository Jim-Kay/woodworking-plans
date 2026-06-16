export const COMPONENT_CATALOG_VERSION = '0.1';

export const COMPONENT_CATEGORIES = [
  {
    id: 'geometry',
    title: 'Geometry Primitives',
    description: 'Reusable physical part shapes and layout references.'
  },
  {
    id: 'hardware',
    title: 'Hardware And Fasteners',
    description: 'Reusable purchased hardware, screw, hook, peg, and hole patterns.'
  },
  {
    id: 'patterns',
    title: 'Layout Patterns',
    description: 'Reusable repetition, spacing, mirroring, and centering patterns.'
  },
  {
    id: 'validators',
    title: 'Validation Rules',
    description: 'Reusable checks for clearances, spacing, host containment, and publishability.'
  },
  {
    id: 'build_steps',
    title: 'Build Step Patterns',
    description: 'Reusable instruction sequences and visual-stage conventions.'
  },
  {
    id: 'rendering',
    title: 'Rendering And Review',
    description: 'Reusable visual affordances for diagrams, labels, stage views, and screenshots.'
  }
];

export const COMPONENT_CATALOG = [
  {
    component_id: 'geometry.rectangular_panel',
    category_id: 'geometry',
    title: 'Rectangular Panel Or Board',
    description: 'A rectangular board or flat panel with length, width, thickness, material, position, and cut-list output.',
    aliases: ['board', 'back board', 'panel', 'plank', 'base panel', 'flat stock', '1x board'],
    inputs: ['length_in', 'width_in', 'thickness_in', 'material'],
    outputs: ['physical_part', 'cut_list_item', 'openscad_box'],
    example_uses: ['key rack back board', 'tray feeder bottom panel', 'small shelf side panel']
  },
  {
    component_id: 'geometry.linear_rail',
    category_id: 'geometry',
    title: 'Linear Rail',
    description: 'A long narrow board member with length, height, thickness, material, and orientation.',
    aliases: ['rail', 'side rail', 'stretcher', 'cleat', 'strip', 'edge board'],
    inputs: ['length_in', 'height_in', 'thickness_in', 'material', 'orientation'],
    outputs: ['physical_part', 'cut_list_item', 'openscad_box'],
    example_uses: ['tray feeder sides', 'frame rails', 'wall cleat']
  },
  {
    component_id: 'geometry.shallow_wall_pocket',
    category_id: 'geometry',
    title: 'Shallow Wall Pocket',
    description: 'A shallow open-front pocket or bin assembled from a bottom shelf, front lip, and side cheeks on a wall backer.',
    aliases: ['mail pocket', 'envelope pocket', 'wall bin', 'small wall shelf', 'front lip', 'catch tray'],
    inputs: ['host_part_id', 'width_in', 'depth_in', 'height_in', 'stock_thickness_in', 'lip_height_in', 'material'],
    outputs: ['physical_parts', 'cut_list_items', 'assembly_joints', 'pocket_clearance_guidance'],
    example_uses: ['mail organizer pocket', 'entryway catch tray', 'small wall bin', 'spice packet holder']
  },
  {
    component_id: 'geometry.square_leg_post',
    category_id: 'geometry',
    title: 'Square Leg Or Post',
    description: 'A vertical square or rectangular support post with cut-list output and optional foot/height metadata.',
    aliases: ['leg', 'post', 'front leg', 'back leg', 'upright', 'support post', 'stool leg'],
    inputs: ['height_in', 'width_in', 'depth_in', 'material', 'position'],
    outputs: ['physical_part', 'cut_list_item', 'openscad_box'],
    example_uses: ['step stool legs', 'bench legs', 'small stand uprights']
  },
  {
    component_id: 'geometry.step_tread',
    category_id: 'geometry',
    title: 'Step Tread',
    description: 'A flat load surface for a stool, step, or small platform with length, depth, thickness, and tread height.',
    aliases: ['step board', 'tread', 'platform', 'stool step', 'top step', 'lower step'],
    inputs: ['width_in', 'depth_in', 'thickness_in', 'height_in', 'material'],
    outputs: ['physical_part', 'cut_list_item', 'walking_surface_metadata'],
    example_uses: ['two-step stool lower tread', 'step stool top tread', 'small platform']
  },
  {
    component_id: 'hardware.wall_mount_hole_pair',
    category_id: 'hardware',
    title: 'Wall-Mount Hole Pair',
    description: 'A pair of mounting-hole references placed symmetrically on a host board with edge inset and optional countersink guidance.',
    aliases: ['mounting holes', 'wall screws', 'keyhole holes', 'screw holes', 'hanger holes'],
    inputs: ['host_part_id', 'edge_inset_in', 'hole_diameter_in', 'centerline_offset_in'],
    outputs: ['reference_parts', 'drill_guidance', 'host_containment_check'],
    example_uses: ['key rack wall screws', 'coat hook rail mounting holes', 'small wall shelf backer']
  },
  {
    component_id: 'hardware.linear_hook_array',
    category_id: 'hardware',
    title: 'Linear Hook Or Peg Array',
    description: 'A centered row of repeated hooks, pegs, or hook pilot-hole references along a host board.',
    aliases: ['hooks', 'pegs', 'coat hooks', 'key hooks', 'mug hooks', 'pilot holes', 'repeated hardware'],
    inputs: ['host_part_id', 'count', 'spacing_in', 'end_inset_in', 'pilot_diameter_in', 'hardware_type'],
    outputs: ['hardware_parts_or_references', 'pilot_hole_references', 'spacing_metadata'],
    example_uses: ['key rack hooks', 'mug rack pegs', 'tool holder row']
  },
  {
    component_id: 'hardware.drainage_hole_grid',
    category_id: 'hardware',
    title: 'Drainage Hole Grid',
    description: 'A small grid of nonphysical drilling references on a host panel, with edge-clearance guidance.',
    aliases: ['drainage holes', 'weep holes', 'outdoor holes', 'hole grid'],
    inputs: ['host_part_id', 'columns', 'rows', 'hole_diameter_in', 'edge_clearance_in'],
    outputs: ['reference_parts', 'drill_guidance', 'host_containment_check'],
    example_uses: ['tray bird feeder bottom', 'outdoor planter tray']
  },
  {
    component_id: 'patterns.centered_linear_spacing',
    category_id: 'patterns',
    title: 'Centered Linear Spacing',
    description: 'Places repeated items along one axis, centered on a host span while maintaining minimum end insets.',
    aliases: ['even spacing', 'centered row', 'repeated spacing', 'array spacing', 'linear layout'],
    inputs: ['host_length_in', 'count', 'spacing_in', 'min_end_inset_in'],
    outputs: ['positions', 'spacing_warnings'],
    example_uses: ['key hooks across a board', 'mounting screw locations', 'repeated slats']
  },
  {
    component_id: 'validators.edge_clearance',
    category_id: 'validators',
    title: 'Edge Clearance Validator',
    description: 'Checks that holes, hardware, and references remain at least a minimum distance from host part edges.',
    aliases: ['edge inset', 'minimum edge distance', 'avoid breakout', 'clearance from edge'],
    inputs: ['host_part_id', 'reference_part_ids', 'min_clearance_in'],
    outputs: ['validation_errors', 'validation_warnings'],
    example_uses: ['wall screw holes', 'hook pilot holes', 'drainage holes']
  },
  {
    component_id: 'validators.linear_spacing',
    category_id: 'validators',
    title: 'Linear Spacing Validator',
    description: 'Checks repeated items for count, spacing, end inset, and overlap along a host part.',
    aliases: ['spacing rule', 'hook spacing', 'peg spacing', 'array validation'],
    inputs: ['host_part_id', 'item_ids', 'min_spacing_in', 'min_end_inset_in'],
    outputs: ['validation_errors', 'validation_warnings'],
    example_uses: ['key rack hook row', 'mug rack pegs', 'slat layout']
  },
  {
    component_id: 'validators.host_containment',
    category_id: 'validators',
    title: 'Host Containment Validator',
    description: 'Checks that reference holes, labels, and hardware marks fit within the intended host part footprint.',
    aliases: ['inside host', 'fits on board', 'hole within panel', 'reference containment'],
    inputs: ['host_part_id', 'child_reference_ids'],
    outputs: ['validation_errors'],
    example_uses: ['drainage holes in panel', 'mounting holes on back board', 'pilot holes on hook rail']
  },
  {
    component_id: 'validators.load_bearing_caution',
    category_id: 'validators',
    title: 'Load-Bearing Caution Validator',
    description: 'Flags generated stools, benches, and standing surfaces as requiring conservative dimensions, strong joinery, and human review.',
    aliases: ['load bearing', 'weight capacity', 'standing surface', 'structural caution', 'stool safety'],
    inputs: ['standing_surface_part_ids', 'leg_part_ids', 'rail_part_ids', 'claimed_capacity_lbs'],
    outputs: ['validation_warnings', 'review_requirements'],
    example_uses: ['step stool safety review', 'bench load warning', 'standing platform caution']
  },
  {
    component_id: 'build_steps.mark_drill_install',
    category_id: 'build_steps',
    title: 'Mark, Drill, Install Sequence',
    description: 'A build-step pattern that separates layout marks, pilot drilling, finishing, hardware installation, and mounting.',
    aliases: ['mark and drill', 'pilot hole instructions', 'hardware install steps', 'mounting instructions'],
    inputs: ['layout_reference_ids', 'hardware_part_ids', 'host_part_ids'],
    outputs: ['assembly_steps', 'builder_guidance'],
    example_uses: ['key rack hooks', 'wall mounting holes', 'peg rail']
  },
  {
    component_id: 'rendering.stage_aware_reference_view',
    category_id: 'rendering',
    title: 'Stage-Aware Reference View',
    description: 'A rendered build-step view that can show physical parts, reference holes, labels, and partial assembly state separately.',
    aliases: ['stage view', 'drill layout view', 'reference labels', 'partial assembly image', 'build step screenshot'],
    inputs: ['step_id', 'visible_part_ids', 'reference_part_ids', 'labels'],
    outputs: ['build_step_image', 'vision_review_target'],
    example_uses: ['drill-before-assembly view', 'cut-list part layout', 'mounting-hole callouts']
  }
];

export function listComponentCategories() {
  return COMPONENT_CATEGORIES.map((category) => ({ ...category }));
}

export function listComponents({ category_id = null, include_details = false } = {}) {
  return COMPONENT_CATALOG
    .filter((component) => !category_id || component.category_id === category_id)
    .map((component) => componentSummary(component, include_details));
}

export function getComponent(componentId) {
  const component = COMPONENT_CATALOG.find((item) => item.component_id === componentId);
  return component ? structuredClone(component) : null;
}

export function searchComponents({ query = '', category_id = null, limit = 8 } = {}) {
  const terms = tokenize(query);
  const scored = COMPONENT_CATALOG
    .filter((component) => !category_id || component.category_id === category_id)
    .map((component) => ({ component, score: componentScore(component, terms) }))
    .filter((item) => item.score > 0 || terms.length === 0)
    .sort((a, b) => b.score - a.score || a.component.component_id.localeCompare(b.component.component_id))
    .slice(0, Math.max(1, Number(limit) || 8));
  return scored.map(({ component, score }) => ({ ...componentSummary(component, true), score }));
}

function componentSummary(component, includeDetails) {
  const summary = {
    component_id: component.component_id,
    category_id: component.category_id,
    title: component.title,
    description: component.description,
    aliases: component.aliases
  };
  if (!includeDetails) return summary;
  return {
    ...summary,
    inputs: component.inputs,
    outputs: component.outputs,
    example_uses: component.example_uses
  };
}

function componentScore(component, terms) {
  if (!terms.length) return 1;
  const searchable = [
    component.component_id,
    component.category_id,
    component.title,
    component.description,
    ...(component.aliases || []),
    ...(component.inputs || []),
    ...(component.outputs || []),
    ...(component.example_uses || [])
  ].join(' ').toLowerCase();
  return terms.reduce((score, term) => score + (searchable.includes(term) ? 1 : 0), 0);
}

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9_.-]+/)
    .filter(Boolean);
}
