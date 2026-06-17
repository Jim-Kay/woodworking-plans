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
    component_id: 'geometry.rabbeted_frame_face_set',
    category_id: 'geometry',
    title: 'Rabbeted Floating Frame Face Set',
    description: 'Four mitered picture-frame face members with an inside-back rabbet milled before assembly to form a support ledge around the artwork opening.',
    aliases: ['floating frame face', 'rabbeted frame', 'picture frame rabbet', 'mitered frame rails', 'rabbet ledge'],
    inputs: ['canvas_width_in', 'canvas_height_in', 'reveal_in', 'face_width_in', 'frame_depth_in', 'rabbet_depth_in', 'joinery'],
    outputs: ['physical_parts', 'cut_list_items', 'rabbet_milling_guidance', 'opening_and_reveal_metadata'],
    example_uses: ['floating canvas frame', 'strainer on rabbet frame', 'picture frame with recessed support ledge']
  },
  {
    component_id: 'geometry.strainer_rail_set',
    category_id: 'geometry',
    title: 'Strainer Rail Set Seated On Rabbet',
    description: 'Four thin support rails sized to sit on a rabbet ledge behind a floating frame face while preserving canvas reveal and support depth.',
    aliases: ['strainer rails', 'support rails', 'canvas support ledge', 'rabbet support rails', 'thin liner rails'],
    inputs: ['inner_opening_width_in', 'inner_opening_height_in', 'strainer_width_in', 'strainer_depth_in', 'rabbet_ledge_y_in', 'joinery'],
    outputs: ['physical_parts', 'cut_list_items', 'support_surface_metadata', 'canvas_clearance_guidance'],
    example_uses: ['floating frame strainer', 'canvas support rails on rabbet', 'thin support frame inside picture frame']
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
    component_id: 'geometry.rectangular_frame_bay',
    category_id: 'geometry',
    title: 'Rectangular Frame Bay',
    description: 'A rectangular structural bay made from rails and upright posts, with clear opening dimensions and repeated bay spacing.',
    aliases: ['2x4 frame', 'storage frame', 'rack bay', 'support frame', 'upright frame', 'shelf frame'],
    inputs: ['overall_length_in', 'overall_height_in', 'rail_size', 'post_count', 'bay_spacing_in', 'material'],
    outputs: ['physical_parts', 'cut_list_items', 'assembly_joints', 'bay_clearance_metadata'],
    example_uses: ['tote storage rack side frame', 'workbench base frame', 'rolling storage rack']
  },
  {
    component_id: 'geometry.tote_runner_pair',
    category_id: 'geometry',
    title: 'Tote Runner Pair',
    description: 'A pair of parallel runner rails that support a tote lip or bin flange with configurable clear width, pitch, and inset.',
    aliases: ['tote runners', 'bin rails', 'storage tote supports', 'sliding tote rails', 'runner supports'],
    inputs: ['tote_lip_width_in', 'clearance_in', 'runner_length_in', 'runner_spacing_in', 'runner_height_in', 'material'],
    outputs: ['physical_parts', 'cut_list_items', 'tote_fit_guidance', 'runner_clearance_metadata'],
    example_uses: ['27 gallon tote rack', 'plastic bin storage shelf', 'garage tote organizer']
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
    component_id: 'hardware.caster_plate_set',
    category_id: 'hardware',
    title: 'Caster Plate Set',
    description: 'A set of plate-mounted caster wheels with bolt or screw-hole references, edge insets, and base-reinforcement guidance.',
    aliases: ['caster wheels', 'swivel casters', 'rolling base', 'wheel plates', 'mobile rack wheels'],
    inputs: ['caster_count', 'plate_width_in', 'plate_depth_in', 'edge_inset_in', 'fastener_diameter_in', 'load_rating_lbs'],
    outputs: ['hardware_parts_or_references', 'mounting_hole_references', 'base_reinforcement_guidance'],
    example_uses: ['mobile tote rack', 'rolling workbench', 'shop cart base']
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
    component_id: 'validators.rabbet_strainer_fit',
    category_id: 'validators',
    title: 'Rabbet And Strainer Fit Validator',
    description: 'Checks rabbet depth, strainer thickness, canvas thickness, reveal, and support ledge dimensions for a floating frame using seated strainer rails.',
    aliases: ['rabbet fit', 'strainer fit', 'canvas reveal check', 'frame ledge clearance', 'support rail clearance'],
    inputs: ['rabbeted_face_part_ids', 'strainer_part_ids', 'canvas_dimensions', 'reveal_in', 'support_depth_in'],
    outputs: ['validation_errors', 'validation_warnings', 'fit_guidance'],
    example_uses: ['floating frame strainer on rabbet', 'picture frame support ledge check', 'canvas clearance validation']
  },
  {
    component_id: 'validators.physical_part_overlap',
    category_id: 'validators',
    title: 'Physical Part Overlap Validator',
    description: 'Checks physical board and panel bounding boxes for unintended volume overlap while exempting holes, fasteners, references, and guides.',
    aliases: ['collision check', 'overlap check', 'clipping check', 'part intersection', 'component collision'],
    inputs: ['physical_part_ids', 'exempt_reference_ids'],
    outputs: ['validation_errors'],
    example_uses: ['step stool leg and tread clipping', 'tray rail overlap', 'storage rack runner interference']
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
    component_id: 'build_steps.dimensioned_stage_sequence',
    category_id: 'build_steps',
    title: 'Dimensioned Stage Sequence',
    description: 'A build-step pattern that pairs each operation with dimensions, highlighted newly added parts, fastener notes, and verification checks.',
    aliases: ['instruction grade steps', 'dimensioned diagrams', 'highlight current parts', 'step-by-step construction drawings'],
    inputs: ['assembly_step_ids', 'critical_dimensions', 'fastener_reference_ids', 'verification_checks'],
    outputs: ['assembly_steps', 'diagram_requirements', 'review_rubric'],
    example_uses: ['tote rack PDF-style instructions', 'frame assembly sequence', 'caster mounting step']
  },
  {
    component_id: 'build_steps.mill_rabbet_then_assemble_frame',
    category_id: 'build_steps',
    title: 'Mill Rabbet Then Assemble Floating Frame',
    description: 'A build-step pattern for machining rabbeted frame stock before final miters, dry fitting the frame, seating strainer rails, spacing the canvas reveal, and adding mounting hardware.',
    aliases: ['rabbet milling step', 'picture frame build order', 'strainer frame assembly', 'floating frame assembly sequence'],
    inputs: ['rabbeted_face_part_ids', 'strainer_part_ids', 'canvas_reference_id', 'mounting_hardware_ids'],
    outputs: ['assembly_steps', 'machining_step_requirements', 'dry_fit_checks', 'stage_visual_requirements'],
    example_uses: ['floating frame strainer on rabbet', 'canvas frame with support ledge', 'rabbeted picture frame instructions']
  },
  {
    component_id: 'rendering.stage_aware_reference_view',
    category_id: 'rendering',
    title: 'Stage-Aware Reference View',
    description: 'A rendered build-step view that can show physical parts, reference holes, labels, highlighted current parts, and partial assembly state separately.',
    aliases: ['stage view', 'stage-specific diagram', 'drill layout view', 'pre-assembly drill guide', 'reference labels', 'partial assembly image', 'build step screenshot'],
    inputs: ['step_id', 'visible_part_ids', 'reference_part_ids', 'labels'],
    outputs: ['build_step_image', 'preassembly_drill_layout', 'vision_review_target'],
    example_uses: ['drill-before-assembly view', 'highlighted assembly step', 'cut-list part layout', 'mounting-hole callouts']
  },
  {
    component_id: 'rendering.generated_assembly_animation',
    category_id: 'rendering',
    title: 'Generated Assembly Animation',
    description: 'A reusable mini-video mode that animates generated-plan parts from assembly_steps.part_ids, including one overall build sequence and per-step motion.',
    aliases: ['mini-video', 'assembly animation', 'piece by piece build', 'overall build sequence', 'animated build step'],
    inputs: ['assembly_step_ids', 'part_ids', 'stage_order'],
    outputs: ['build_step_animation', 'overall_build_animation', 'sequence_review_target'],
    example_uses: ['tray feeder rails coming together', 'wall rack hooks appearing after layout', 'step stool subassemblies in build order']
  },
  {
    component_id: 'rendering.rabbet_milling_operation_view',
    category_id: 'rendering',
    title: 'Rabbet Milling Operation View',
    description: 'A pre-assembly machining diagram or mini-animation that shows rectangular stock, highlighted rabbet waste, cutter travel, and the resulting ledge/notch before frame assembly.',
    aliases: ['rabbet cut animation', 'milling operation view', 'router rabbet diagram', 'table saw rabbet view', 'notched board animation'],
    inputs: ['host_part_id', 'rabbet_width_in', 'rabbet_depth_in', 'cut_edge', 'tool_method'],
    outputs: ['build_step_image', 'build_step_animation', 'machining_guidance'],
    example_uses: ['mill rabbet before assembly', 'floating frame stock prep', 'pre-assembly rabbet cut visual']
  },
  {
    component_id: 'rendering.dimensioned_callout_view',
    category_id: 'rendering',
    title: 'Dimensioned Callout View',
    description: 'A rendered diagram mode with measurement arrows, labels, highlighted parts, screw paths, and optional close-up inset views.',
    aliases: ['dimension arrows', 'callout labels', 'screw callout', 'close-up inset', 'PDF-style diagram'],
    inputs: ['visible_part_ids', 'dimension_pairs', 'label_targets', 'fastener_paths', 'inset_camera'],
    outputs: ['build_step_image', 'printable_diagram', 'vision_review_target'],
    example_uses: ['caster screw layout', 'diagonal pocket screw warning', 'tote runner spacing diagram']
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
