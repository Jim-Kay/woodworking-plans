export const GENERATED_DESIGN_SCHEMA_VERSION = '0.1';

export const TEMPLATE_DEFINITIONS = [
  {
    template_id: 'tray_bird_feeder',
    title: 'Tray Bird Feeder',
    aliases: ['bird feeder', 'tray feeder', 'outdoor seed tray'],
    parameters: {
      width_in: { type: 'number', min: 6, max: 24, default: 12 },
      depth_in: { type: 'number', min: 5, max: 18, default: 8 },
      side_height_in: { type: 'number', min: 0.75, max: 3, default: 1.5 },
      bottom_thickness_in: { type: 'number', min: 0.25, max: 1, default: 0.75 },
      side_thickness_in: { type: 'number', min: 0.25, max: 1, default: 0.75 },
      material: { type: 'string', default: 'cedar_fence_picket' },
      hanging: { type: 'boolean', default: true },
      drainage_holes: { type: 'boolean', default: true }
    }
  },
  {
    template_id: 'board_with_linear_hardware',
    title: 'Board With Linear Hardware',
    aliases: ['wall_key_rack', 'key rack', 'coat hook rail', 'mug rack', 'peg rail', 'hook board'],
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
    parameters: {
      width_in: { type: 'number', min: 8, max: 48, default: 18 },
      height_in: { type: 'number', min: 2.5, max: 10, default: 4 },
      board_thickness_in: { type: 'number', min: 0.375, max: 1.5, default: 0.75 },
      hook_count: { type: 'number', min: 1, max: 12, default: 5 },
      hook_spacing_in: { type: 'number', min: 1.5, max: 8, default: 3 },
      min_end_inset_in: { type: 'number', min: 0.75, max: 6, default: 1.5 },
      mounting_holes: { type: 'boolean', default: true },
      mount_hole_diameter_in: { type: 'number', min: 0.125, max: 0.5, default: 0.1875 },
      pilot_hole_diameter_in: { type: 'number', min: 0.0625, max: 0.375, default: 0.125 },
      hook_projection_in: { type: 'number', min: 0.5, max: 4, default: 1.25 },
      hardware_type: { type: 'string', default: 'screw_hook' },
      material: { type: 'string', default: 'pine_1x4' }
    }
  },
  {
    template_id: 'wall_panel_with_pocket_and_linear_hardware',
    title: 'Wall Panel With Pocket And Linear Hardware',
    aliases: ['mail_key_organizer', 'mail organizer', 'entry organizer', 'wall pocket with hooks', 'catch tray with hooks'],
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
    parameters: {
      width_in: { type: 'number', min: 10, max: 36, default: 18 },
      height_in: { type: 'number', min: 8, max: 24, default: 10 },
      board_thickness_in: { type: 'number', min: 0.375, max: 1.5, default: 0.75 },
      pocket_depth_in: { type: 'number', min: 1.5, max: 5, default: 2.5 },
      pocket_height_in: { type: 'number', min: 2, max: 8, default: 4 },
      pocket_lip_height_in: { type: 'number', min: 0.75, max: 3, default: 1.5 },
      pocket_stock_thickness_in: { type: 'number', min: 0.25, max: 0.75, default: 0.5 },
      hook_count: { type: 'number', min: 1, max: 10, default: 5 },
      hook_spacing_in: { type: 'number', min: 1.5, max: 6, default: 3 },
      min_end_inset_in: { type: 'number', min: 0.75, max: 6, default: 1.5 },
      mounting_holes: { type: 'boolean', default: true },
      mount_hole_diameter_in: { type: 'number', min: 0.125, max: 0.5, default: 0.1875 },
      pilot_hole_diameter_in: { type: 'number', min: 0.0625, max: 0.375, default: 0.125 },
      hook_projection_in: { type: 'number', min: 0.5, max: 4, default: 1.25 },
      hardware_type: { type: 'string', default: 'screw_hook' },
      material: { type: 'string', default: 'pine_1x6' },
      pocket_material: { type: 'string', default: 'thin_plywood' }
    }
  },
  {
    template_id: 'two_step_stool',
    title: 'Two-Step Stool',
    aliases: ['two-step wooden step stool', 'step stool', 'two step stool', 'stool from photo brief', 'rockport step stool'],
    components: [
      'geometry.step_tread',
      'geometry.square_leg_post',
      'geometry.linear_rail',
      'validators.load_bearing_caution',
      'validators.linear_spacing',
      'build_steps.mark_drill_install',
      'rendering.stage_aware_reference_view'
    ],
    parameters: {
      width_in: { type: 'number', min: 10, max: 30, default: 16 },
      depth_in: { type: 'number', min: 10, max: 30, default: 16 },
      height_in: { type: 'number', min: 8, max: 30, default: 16 },
      lower_step_height_in: { type: 'number', min: 4, max: 18, default: 8 },
      lower_step_depth_in: { type: 'number', min: 5, max: 16, default: 8 },
      upper_step_depth_in: { type: 'number', min: 5, max: 16, default: 8 },
      tread_thickness_in: { type: 'number', min: 0.5, max: 1.5, default: 0.75 },
      leg_width_in: { type: 'number', min: 1, max: 3, default: 1.5 },
      leg_depth_in: { type: 'number', min: 1, max: 3, default: 1.5 },
      rail_height_in: { type: 'number', min: 1, max: 4, default: 1.5 },
      rail_thickness_in: { type: 'number', min: 0.5, max: 1.5, default: 0.75 },
      claimed_capacity_lbs: { type: 'number', min: 0, max: 300, default: 0 },
      material: { type: 'string', default: 'pine' }
    }
  },
  {
    template_id: 'extension_leaf_dining_table',
    title: 'Extension Leaf Dining Table',
    aliases: ['extension table', 'dining table with leaves', 'end leaf table', 'retractable leaf support table', 'table with drawer slide supports', 'table with end leaves'],
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
    parameters: {
      overall_length_extended_in: { type: 'number', min: 36, max: 120, default: 75.5 },
      center_top_length_in: { type: 'number', min: 24, max: 96, default: 51.5 },
      leaf_depth_in: { type: 'number', min: 4, max: 24, default: 12 },
      leaf_count: { type: 'number', min: 0, max: 2, default: 2 },
      width_in: { type: 'number', min: 24, max: 60, default: 40 },
      top_thickness_in: { type: 'number', min: 0.75, max: 2.5, default: 1.75 },
      table_height_in: { type: 'number', min: 24, max: 36, default: 30.5 },
      leg_size_in: { type: 'number', min: 1.5, max: 6, default: 3.75 },
      base_clear_length_between_legs_in: { type: 'number', min: 18, max: 96, default: 64.25 },
      apron_height_in: { type: 'number', min: 2, max: 8, default: 3.5 },
      apron_thickness_in: { type: 'number', min: 0.5, max: 3, default: 1.5 },
      support_arm_count_per_leaf: { type: 'number', min: 2, max: 4, default: 2 },
      support_arm_extension_in: { type: 'number', min: 6, max: 36, default: 16.5 },
      slide_travel_in: { type: 'number', min: 4, max: 30, default: 12 },
      support_arm_stock_width_in: { type: 'number', min: 0.75, max: 3, default: 1.5 },
      support_arm_stock_height_in: { type: 'number', min: 0.75, max: 3, default: 1.5 },
      support_arm_inset_from_edge_in: { type: 'number', min: 2, max: 12, default: 6 },
      claimed_capacity_lbs: { type: 'number', min: 0, max: 500, default: 0 },
      top_material: { type: 'string', default: 'oak_tabletop_stock' },
      base_material: { type: 'string', default: 'oak_leg_and_apron_stock' },
      slide_hardware: { type: 'string', default: 'rated_table_leaf_slide_or_heavy_drawer_slide' },
      finish: { type: 'string', default: 'clear_or_dark_table_finish' }
    }
  }
];

export function listTemplates() {
  return TEMPLATE_DEFINITIONS.map((template) => ({
    template_id: template.template_id,
    title: template.title,
    aliases: template.aliases || [],
    components: template.components || [],
    parameters: template.parameters
  }));
}

export function searchTemplates({ query = '', limit = 6 } = {}) {
  const profile = buildSearchProfile(query);
  return TEMPLATE_DEFINITIONS
    .map((template) => ({ template, score: templateScore(template, profile) }))
    .filter((item) => item.score > 0 || profile.terms.length === 0)
    .sort((a, b) => b.score - a.score || a.template.template_id.localeCompare(b.template.template_id))
    .slice(0, Math.max(1, Number(limit) || 6))
    .map(({ template, score }) => ({
      template_id: template.template_id,
      title: template.title,
      aliases: template.aliases || [],
      components: template.components || [],
      parameters: template.parameters,
      score
    }));
}

export function findTemplateCandidates(value) {
  return searchTemplates({ query: value, limit: TEMPLATE_DEFINITIONS.length })
    .filter((template) => template.score >= 8)
    .map((template) => template.template_id);
}

export function getTemplateDefinition(templateId) {
  return TEMPLATE_DEFINITIONS.find((template) => template.template_id === templateId) || null;
}

export function defaultParametersForTemplate(templateId) {
  const template = getTemplateDefinition(templateId);
  if (!template) return {};
  return Object.fromEntries(Object.entries(template.parameters).map(([key, definition]) => [key, definition.default]));
}

export function createCapabilityRequest({ capability, reason, design_id = null, scenario = null, evidence = [] }) {
  return {
    type: 'capability_request',
    schema_version: GENERATED_DESIGN_SCHEMA_VERSION,
    capability: String(capability || '').trim(),
    reason: String(reason || '').trim(),
    design_id,
    scenario,
    evidence,
    requested_by: 'local-design-sandbox'
  };
}

function templateScore(template, profile) {
  if (!profile.terms.length) return 1;
  const document = buildDocumentProfile([
    template.template_id,
    template.title,
    ...(template.aliases || []),
    ...(template.components || []),
    ...Object.keys(template.parameters || {})
  ]);
  let score = 0;
  if (document.exactPhrases.has(profile.normalized)) score += 20;
  if (document.exactPhrases.has(profile.normalized.replaceAll(' ', '_'))) score += 16;
  for (const term of profile.terms) {
    if (document.terms.has(term)) score += 3;
    else if (document.text.includes(term)) score += 1.5;
  }
  for (const term of profile.expandedTerms) {
    if (document.terms.has(term)) score += 1;
    else if (document.text.includes(term)) score += 0.4;
  }
  score += 6 * jaccard(profile.trigrams, document.trigrams);
  return Number(score.toFixed(3));
}

function buildDocumentProfile(fields) {
  const normalizedFields = fields.map(normalizeText).filter(Boolean);
  const text = normalizedFields.join(' ');
  return {
    text,
    terms: new Set(tokenize(text).flatMap(expandTerm)),
    exactPhrases: new Set(normalizedFields),
    trigrams: charNgrams(text, 3)
  };
}

function buildSearchProfile(query) {
  const normalized = normalizeText(query);
  const terms = tokenize(normalized);
  return {
    normalized,
    terms,
    expandedTerms: [...new Set(terms.flatMap(expandTerm).filter((term) => !terms.includes(term)))],
    trigrams: charNgrams(normalized, 3)
  };
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9. ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeText(value).split(/[^a-z0-9.]+/).filter(Boolean);
}

function expandTerm(term) {
  const normalized = normalizeText(term);
  const group = SYNONYM_GROUPS.find((items) => items.includes(normalized));
  return group || [normalized];
}

function charNgrams(value, size) {
  const text = normalizeText(value);
  if (!text) return new Set();
  if (text.length <= size) return new Set([text]);
  const grams = new Set();
  for (let index = 0; index <= text.length - size; index += 1) grams.add(text.slice(index, index + size));
  return grams;
}

function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

const SYNONYM_GROUPS = [
  ['pocket', 'cubby', 'bin', 'tray', 'catchall', 'catch', 'mail', 'envelope', 'shelf'],
  ['hook', 'hooks', 'peg', 'pegs', 'hanger', 'hangers'],
  ['board', 'panel', 'plank', 'backer', 'base'],
  ['frame', 'picture', 'canvas', 'floating', 'miter', 'strainer'],
  ['step', 'stool', 'tread', 'platform'],
  ['feeder', 'bird', 'seed', 'tray'],
  ['table', 'dining', 'worktable', 'desk'],
  ['leaf', 'leaves', 'extension', 'extendable', 'removable'],
  ['slide', 'slides', 'telescoping', 'drawer', 'retractable', 'travel'],
  ['apron', 'base', 'leg', 'frame', 'support']
];
